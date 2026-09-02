'use strict';

/**
 * Unit tests for GrifoUtils - run with: node --test
 *
 * constants.js and utils.js are content-script globals, not modules. Under
 * 'use strict' a top-level `const` does not become a property of the vm
 * context's global object, so each source is evaluated with an explicit
 * export line appended. No bundler, no dependencies, no changes to the
 * shipped files.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const load = () => {
  const ctx = vm.createContext({ console });
  const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
  vm.runInContext(read('constants.js') + ';globalThis.GRIFO_CONFIG = GRIFO_CONFIG;', ctx);
  vm.runInContext(read('utils.js') + ';globalThis.GrifoUtils = GrifoUtils;', ctx);
  return { U: ctx.GrifoUtils, CONFIG: ctx.GRIFO_CONFIG };
};

const { U, CONFIG } = load();
const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

test('diffHoraMsec parses accumulated balances beyond 24h', () => {
  assert.equal(U.diffHoraMsec('38:22'), 38 * HOUR + 22 * MIN);
  assert.equal(U.diffHoraMsec('-139:34'), -(139 * HOUR + 34 * MIN));
  assert.equal(U.diffHoraMsec('00:00'), 0);
});

test('diffHoraMsec treats unparseable text as zero, not NaN', () => {
  // This is the "(Aguardando Fechamento da Freqüência)" case that the pending
  // Banco card keys off: it must be 0 so bancoPendente can distinguish it.
  assert.equal(U.diffHoraMsec('(Aguardando Fechamento da Freqüência)'), 0);
  assert.equal(U.diffHoraMsec(''), 0);
  assert.equal(U.diffHoraMsec('   '), 0);
  assert.equal(U.diffHoraMsec(null), 0);
  assert.equal(U.diffHoraMsec('abc:def'), 0);
});

test('BALANCE_FORMAT separates a real balance from the pending message', () => {
  // This is what drives the "freq. nao fechada" card: TIME_FORMAT caps at 23h
  // and cannot validate an accumulated balance, which is why the extra pattern
  // exists. Anything it rejects is treated as "frequency not closed yet".
  const re = CONFIG.PATTERNS.BALANCE_FORMAT;
  for (const ok of ['38:22', '-139:34', '00:00', '147:00']) {
    assert.ok(re.test(ok), `${ok} should be a balance`);
  }
  for (const no of ['(Aguardando Fechamento da Frequencia)', '', 'abc', '38:7', '38:60']) {
    assert.ok(!re.test(no), `${no} should not be a balance`);
  }
});

test('formatMsec round-trips through diffHoraMsec', () => {
  for (const s of ['00:00', '07:26', '38:22', '147:00']) {
    assert.equal(U.formatMsec(U.diffHoraMsec(s)), s);
  }
  assert.equal(U.formatMsec(-(139 * HOUR + 34 * MIN)), '-139:34');
  assert.equal(U.formatMsec(0), '00:00');
});

test('isValidTime accepts only a 24-hour HH:mm clock time', () => {
  assert.ok(U.isValidTime('00:00'));
  assert.ok(U.isValidTime('23:59'));
  assert.ok(U.isValidTime('08:00'));
  assert.ok(!U.isValidTime('24:00'));
  assert.ok(!U.isValidTime('9:00'), 'must be zero-padded');
  assert.ok(!U.isValidTime('08:60'));
  assert.ok(!U.isValidTime('38:22'), 'a balance is not a clock time');
  assert.ok(!U.isValidTime(''));
});

test('isValidTime has no lastIndex hazard when called repeatedly', () => {
  // The pattern must not be /g, or alternating calls would flip-flop.
  for (let i = 0; i < 5; i++) assert.ok(U.isValidTime('08:00'), `call ${i}`);
});

test('sanitizeTime passes clean times and drops everything else', () => {
  assert.equal(U.sanitizeTime('08:00'), '08:00');
  assert.equal(U.sanitizeTime(''), '');
  assert.equal(U.sanitizeTime(null), '');
  assert.equal(U.sanitizeTime(undefined), '');
  // The injection payload this guards against
  assert.equal(U.sanitizeTime('" onfocus=alert(1) x="'), '');
  assert.equal(U.sanitizeTime('9:00'), '');
});

test('escapeHtml neutralizes attribute and tag breakouts', () => {
  assert.equal(U.escapeHtml('" onfocus=alert(1) x="'), '&quot; onfocus=alert(1) x=&quot;');
  assert.equal(U.escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(U.escapeHtml("it's"), 'it&#39;s');
  assert.equal(U.escapeHtml('a & b'), 'a &amp; b');
  assert.equal(U.escapeHtml(null), '');
  assert.equal(U.escapeHtml(undefined), '');
});

test('escapeHtml escapes the ampersand first, not twice', () => {
  assert.equal(U.escapeHtml('&lt;'), '&amp;lt;');
});

test('escapeHtml leaves the pending-balance message readable', () => {
  const msg = '(Aguardando Fechamento da Freqüência)';
  assert.equal(U.escapeHtml(msg), msg, 'no special chars, must pass through intact');
});

test('diffDate measures an interval within one day', () => {
  assert.equal(U.diffDate('08:00', '12:00'), 4 * HOUR);
  assert.equal(U.diffDate('00:00', '07:00'), 7 * HOUR);
  assert.equal(U.diffDate('12:00', '08:00'), -4 * HOUR);
  assert.equal(U.diffDate('08:00', '08:00'), 0);
});

test('diffDate pins the non-ISO date parse this code relies on', () => {
  // `new Date('2015-08-05 08:00:00')` is implementation-defined. If a runtime
  // ever stops accepting it, diffDate silently returns 0 and every total on
  // the timesheet reads as zero - so lock the behaviour down here.
  assert.equal(U.diffDate('00:00', '01:00'), HOUR);
  assert.ok(!Number.isNaN(U.diffDate('00:00', '01:00')));
});

test('sumDateMsec advances a time by a duration', () => {
  assert.equal(U.formatDate(U.sumDateMsec('08:00', 4 * HOUR), 'HH:mm'), '12:00');
  assert.equal(U.formatDate(U.sumDateMsec('17:30', 90 * MIN), 'HH:mm'), '19:00');
});

test('pad left-fills to the requested width', () => {
  assert.equal(U.pad(7, 2), '07');
  assert.equal(U.pad(147, 2), '147', 'never truncates');
  assert.equal(U.pad(0, 2), '00');
});

test('trimArray trims every element', () => {
  assert.deepEqual(U.trimArray([' a ', 'b  ', '  c']), ['a', 'b', 'c']);
});

test('formatMsec still works when the method is detached', () => {
  // A bare `const f = GrifoUtils.formatMsec` throws, because formatMsec calls
  // this.pad(). That broke every input handler for a whole commit, but only
  // when DEBUG was on, so nothing else caught it.
  // Note: the error crosses a vm realm boundary, so it is not `instanceof` the
  // host's TypeError - match on the message instead.
  const detached = U.formatMsec;
  assert.throws(() => detached(3600000), /pad/,
    'detaching is expected to throw - bind or wrap it at the call site');
  const wrapped = ms => U.formatMsec(ms);
  assert.equal(wrapped(3600000), '01:00');
});
