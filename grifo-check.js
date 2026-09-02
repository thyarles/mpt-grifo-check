'use strict';

/**
 * ============================================
 * DEBUG MODE
 * ============================================
 * Two ways to turn logging on:
 *
 *   1. Flip DEBUG below and reload the extension.
 *   2. Without touching the source, run this in the page console and reload:
 *        localStorage.setItem('grifo-debug', '1')      // '0' to turn it off
 *
 * Use the localStorage form from the normal console. Content scripts run in an
 * isolated world, so grifoDebug() is NOT reachable from the page's default
 * console context - you would have to switch the console's context dropdown to
 * this extension first. localStorage is shared with the page, so it always works.
 *
 * Debug logs will show:
 * - Teletrabalho auto-fill operations
 * - Previous balance retrieval (Chrome compatibility fixes)
 * - Calculation summaries and results
 * - Step-by-step execution flow
 */
let DEBUG = false;
try {
  // Only override the value above when a choice has actually been stored,
  // otherwise editing DEBUG by hand would be silently undone on every load.
  const storedDebug = localStorage.getItem('grifo-debug');
  if (storedDebug !== null) DEBUG = storedDebug === '1';
} catch (error) {
  // localStorage can throw on restricted origins; stay quiet and keep DEBUG off
}

/**
 * Turn debug logging on or off from the console
 * @param {boolean} on - true to enable logging
 */
function grifoDebug(on = true) {
  DEBUG = on;
  try {
    localStorage.setItem('grifo-debug', on ? '1' : '0');
  } catch (error) {
    console.warn('Grifo Check: could not persist the debug flag', error);
  }
  console.log(`[Grifo] debug ${on ? 'ON' : 'OFF'}`);
}

/**
 * Debug logging helper
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
function debugLog(message, data = null) {
  if (DEBUG) {
    if (data !== null) {
      console.log(`[Grifo Debug] ${message}`, data);
    } else {
      console.log(`[Grifo Debug] ${message}`);
    }
  }
}

/**
 * Grifo Check - Main Application Class
 * Chrome extension for calculating work hours and balances
 * Refactored for Chrome with modern JavaScript (ES6+)
 */
class GrifoCheck {
  constructor() {
    this.state = {
      saldoJornadaMesAt: 0,
      saldoJornadaAcumHj: 0,
      idxHoje: 0,
      totalDias: 0,
      strNome: '',
      cctNome: '',
      idCookiePeriodo: '',
      enabled: true,
      arrJornadasOrigSaved: null,
      arrHorariosOrigSaved: null,
      periodKey: null
    };

    this.observer = null;
    this.pollTimer = null;
    this.ENABLED_COOKIE_NAME = 'grifo-check-enabled';
    this.loadEnabledState();
    
    // Always add the toggle, even when disabled
    this.addToggleToHistorico();
    
    if (this.state.enabled) {
      this.init();
    } else {
      debugLog('Grifo Check is disabled. Not initializing.');
    }
  }

  /**
   * Initialize the extension
   */
  init() {
    // Idempotent: enable() calls init() again, and without this each toggle-on
    // would leave behind an extra observer and an extra polling interval
    this.stopMonitoring();
    this.extractUserInfo();
    this.setupObserver();
    this.startMonitoring();
  }

  /**
   * Tear down the observer and the polling interval
   */
  stopMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      debugLog('Observer disconnected');
    }
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      debugLog('Polling stopped');
    }
  }

  /**
   * Add toggle switch to div.historico (stays visible when disabled)
   */
  addToggleToHistorico() {
    // Check if toggle already exists
    if ($('#grifo-toggle-historico').length > 0) {
      debugLog('Toggle already exists in historico');
      return;
    }

    // Wait for the historico div to be available
    const checkHistorico = setInterval(() => {
      const $historico = $('.historico');
      if ($historico.length > 0) {
        clearInterval(checkHistorico);
        
        const toggleHTML = `
          <div id="grifo-toggle-historico" class="gc-toggle-wrap">
            <span class="gc-toggle-caption">Grifo Check:</span>
            <label class="gc-toggle">
              <input type="checkbox" id="grifo-toggle" class="gc-toggle__input"
                     ${this.state.enabled ? 'checked' : ''}>
              <span class="gc-toggle__slider">
                <span class="gc-toggle__knob"></span>
              </span>
            </label>
          </div>
        `;

        $historico.append(toggleHTML);

        // Setup toggle event handler
        this.setupToggleHandler();
        
        debugLog('Toggle added to historico');
      }
    }, GRIFO_CONFIG.TIME.TOGGLE_POLL_INTERVAL);

    // Give up waiting for the page to render the toolbar
    setTimeout(() => clearInterval(checkHistorico), GRIFO_CONFIG.TIME.TOGGLE_POLL_TIMEOUT);
  }

  /**
   * Setup toggle switch event handler
   */
  setupToggleHandler() {
    $('#grifo-toggle').off('change').on('change', (e) => {
      const isChecked = $(e.target).is(':checked');
      
      if (isChecked === this.state.enabled) return;

      // enable()/disable() handle the reload themselves
      if (isChecked) {
        this.enable();
      } else {
        this.disable();
      }
    });
  }

  /**
   * Click the Consultar button to refresh the page
   */
  clickConsultarButton() {
    // Find the Consultar button by its attributes
    const $consultarBtn = $('button[name="botao_operacao"][value="consultar"]');
    if ($consultarBtn.length === 0) {
      debugLog('Consultar button not found');
      return false;
    }

    debugLog('Clicking Consultar button...');
    setTimeout(() => {
      // Native click rather than jQuery's .click(). Measured against the live
      // page: both produce exactly one navigation, so this is NOT a fix for
      // double submission - jQuery guards its own re-dispatch. Kept only
      // because it is the more direct call.
      $consultarBtn[0].click();
    }, 200);
    return true;
  }

  /**
   * Load enabled state from cookies
   */
  loadEnabledState() {
    const savedState = Cookies.get(this.ENABLED_COOKIE_NAME);
    if (savedState !== undefined) {
      this.state.enabled = savedState === 'true';
      debugLog(`Loaded enabled state: ${this.state.enabled}`);
    } else {
      this.state.enabled = true;
      debugLog('No saved state found, defaulting to enabled');
    }
  }

  /**
   * Save enabled state to cookies
   */
  saveEnabledState() {
    Cookies.set(this.ENABLED_COOKIE_NAME, String(this.state.enabled), {
      expires: GRIFO_CONFIG.TIME.COOKIE_EXPIRY_DAYS
    });
    debugLog(`Saved enabled state: ${this.state.enabled}`);
  }

  /**
   * Enable the extension
   */
  enable() {
    debugLog('Enabling Grifo Check...');
    this.state.enabled = true;
    this.saveEnabledState();

    // Same reasoning as disable(): the reload re-runs the whole extension from
    // a clean page, so initialising here as well would just paint a panel that
    // is discarded a moment later.
    if (!this.clickConsultarButton()) {
      this.init();
    }
  }

  /**
   * Disable the extension
   */
  disable() {
    debugLog('Disabling Grifo Check...');
    this.state.enabled = false;
    this.saveEnabledState();
    this.stopMonitoring();

    // A reload is the only way to get the original punch cells back, since
    // getDadosMesOrig replaces them with our own containers. Only tear down by
    // hand when we cannot reload - doing both would render a frame that the
    // reload throws away 200ms later, which is the visible blink.
    if (!this.clickConsultarButton()) {
      this.removeInjectedUi();
    }
  }

  /**
   * Remove every element the extension injected into the page
   */
  removeInjectedUi() {
    $(`#${GRIFO_CONFIG.IDS.CONTAINER_TOTAL}`).remove();
    $(`.${GRIFO_CONFIG.CLASSES.CONTAINER_SALDO}`).remove();
    $(`.${GRIFO_CONFIG.CLASSES.CONTAINER_JORNADA}`).remove();
    $(`.${GRIFO_CONFIG.CLASSES.MEU_PONTO}`).remove();
    $(`.${GRIFO_CONFIG.CLASSES.MINHA_JORNADA}`).remove();
    $(`.${GRIFO_CONFIG.CLASSES.MEU_SALDO}`).remove();
    debugLog('All UI elements removed');
  }

  /**
   * Toggle extension on/off
   */
  toggle() {
    if (this.state.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Extract user information from page
   */
  extractUserInfo() {
    try {
      const headerElement = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.HEADER_NAME);
      if (!headerElement) {
        debugLog('extractUserInfo: Header element not found');
        return;
      }

      const headerText = GrifoUtils.safeText(headerElement);
      const nameParts = headerText.split(',');

      if (nameParts.length > 1) {
        this.state.strNome = nameParts[1].toUpperCase().trim();
        this.state.cctNome = nameParts[1].trim().replaceAll(' ', '');
        debugLog(`extractUserInfo: User name extracted: "${this.state.strNome}"`);
      }

      const dateInput = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.DATE_INPUT);
      const dateValue = dateInput ? dateInput.val() : '';

      this.state.idCookiePeriodo = `${this.state.cctNome}-grifo_saldo-${dateValue}`;

      const tableRows = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.TABLE_ROWS);
      this.state.totalDias = tableRows ? tableRows.length : 0;
      debugLog(`extractUserInfo: Total days found: ${this.state.totalDias}`);
    } catch (error) {
      console.error('Error extracting user info:', error);
    }
  }

  /**
   * Detect a change of displayed period and drop everything scoped to the old one.
   * extractUserInfo only runs from init(), so without this the cookie key and the
   * day count stay frozen at first load and edits land under the previous month.
   * @returns {boolean} True if the period changed
   */
  refreshPeriodContext() {
    const dateInput = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.DATE_INPUT);
    const dateValue = dateInput ? dateInput.val() : '';
    const tableRows = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.TABLE_ROWS);
    const periodKey = `${dateValue}|${tableRows ? tableRows.length : 0}`;

    if (periodKey === this.state.periodKey) return false;

    debugLog(`Period changed: "${this.state.periodKey}" -> "${periodKey}" (invalidating caches)`);
    this.state.periodKey = periodKey;
    this.state.arrJornadasOrigSaved = null;
    this.state.arrHorariosOrigSaved = null;
    this.state.idxHoje = 0;
    this.extractUserInfo();

    return true;
  }

  /**
   * Setup MutationObserver to watch for DOM changes
   */
  setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      const hasRelevantChanges = mutations.some(mutation =>
        mutation.target.matches?.(GRIFO_CONFIG.SELECTORS.RESULT_SECTION) ||
        mutation.target.querySelector?.(GRIFO_CONFIG.SELECTORS.RESULT_SECTION)
      );

      if (hasRelevantChanges) {
        this.checkAndStart();
      }
    });

    const config = {
      childList: true,
      subtree: true,
      attributes: false
    };

    this.observer.observe(document.body, config);
  }

  /**
   * Check if conditions are met to start calculations
   */
  checkAndStart() {
    if (!this.state.enabled) return;

    const resultSection = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.RESULT_SECTION);
    const containerExists = $(`#${GRIFO_CONFIG.IDS.CONTAINER_TOTAL}`).length > 0;

    if (!resultSection || containerExists) return;

    // Three shapes the name has appeared in across Grifo versions
    const pageUserName = GrifoUtils.firstMatch([
      () => $(GRIFO_CONFIG.SELECTORS.EDIT_PESSOA).val()?.trim().toUpperCase() || '',
      () => GrifoUtils.safeText($(GRIFO_CONFIG.SELECTORS.HEADER_NAME_ALT)).toUpperCase(),
      () => GrifoUtils.safeText($(GRIFO_CONFIG.SELECTORS.HEADER_NAME_ALT_NO_TBODY)).toUpperCase()
    ]);
    debugLog(`checkAndStart: pageUserName="${pageUserName}"`);

    // If no user element found, proceed anyway (some pages might not have it)
    const shouldProceed = !pageUserName || (pageUserName === this.state.strNome.trim());
    
    debugLog(`checkAndStart: strNome="${this.state.strNome}", pageUserName="${pageUserName}", shouldProceed=${shouldProceed}`);

    if (shouldProceed) {
      this.start();
    }
  }

  /**
   * Start monitoring with fallback to polling (for compatibility)
   */
  startMonitoring() {
    this.checkAndStart();

    // Fallback polling for edge cases
    if (this.pollTimer === null) {
      this.pollTimer = setInterval(() => this.checkAndStart(), GRIFO_CONFIG.TIME.CHECK_INTERVAL);
    }
  }

  /**
   * Get original work schedule data for the month
   * @returns {Object} Arrays of original schedules and times
   */
  getDadosMesOrig() {
    // If we've already saved the original values, reuse them (don't remove containers or re-read table)
    if (this.state.arrJornadasOrigSaved !== null && this.state.arrHorariosOrigSaved !== null) {
      debugLog('Using saved original values');
      return {
        arrJornadasOrig: this.state.arrJornadasOrigSaved,
        arrHorariosOrig: this.state.arrHorariosOrigSaved
      };
    }

    const arrJornadasOrig = [];
    const arrHorariosOrig = [];
    let contador = 1;

    const today = new Date();
    const strHoje = GrifoUtils.formatDate(today, 'dd/MM/yy');

    // Remove old containers (only on first load)
    $(`.${GRIFO_CONFIG.CLASSES.CONTAINER_SALDO}, .${GRIFO_CONFIG.CLASSES.CONTAINER_JORNADA}`).remove();

    const tableRows = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.TABLE_ROWS);
    if (!tableRows) return { arrJornadasOrig, arrHorariosOrig };

    tableRows.each((index, row) => {
      const $row = $(row);

      // Process schedules (jornadas)
      arrJornadasOrig.push(this.getJornadaDiaOrig($row));
      $row.find('td:eq(1)').append(
        `<span class="${GRIFO_CONFIG.CLASSES.CONTAINER_JORNADA}" id="conteinerjornada${contador}"></span>`
      );

      // Process time entries (horarios)
      arrHorariosOrig.push(this.getHorariosDiaOrig($row));
      $row.find('td:eq(2)').html(
        `<span class="${GRIFO_CONFIG.CLASSES.CONTAINER_SALDO}" id="conteinerdia${contador}"></span>`
      );

      // Check if this is today's row
      const dateText = $row.find('td:eq(0)').text().trim().split(' ');
      if (dateText[0] === strHoje) {
        this.state.idxHoje = contador;
      }

      contador++;
    });

    // Save the original values for future use
    this.state.arrJornadasOrigSaved = arrJornadasOrig;
    this.state.arrHorariosOrigSaved = arrHorariosOrig;
    debugLog('Saved original values for future recalculations');

    return { arrJornadasOrig, arrHorariosOrig };
  }

  /**
   * Get work schedule (jornada) for a specific day
   * @param {jQuery} rowElement - Table row element
   * @returns {string} Work schedule time (e.g., "08:00")
   */
  /**
   * Clone a row cell, drop its images, and split it into visual lines.
   * Empty lines are preserved on purpose - callers rely on the count to decide
   * how many input boxes a day renders.
   * @param {jQuery} rowElement - The table row
   * @param {number} cellIndex - Zero-based column index
   * @returns {string[]} Trimmed lines, with &nbsp; normalized to spaces
   */
  splitCellLines(rowElement, cellIndex) {
    const cellContent = rowElement.find(`td:eq(${cellIndex})`);
    if (!GrifoUtils.safeText(cellContent)) return [];

    const content = cellContent.clone();
    content.find('img').remove();

    // Trim BEFORE converting <br>, not after. The original trimmed a string in
    // which the separators were '#', so edge separators survived the trim and a
    // leading/trailing <br> produced an empty line - which is one extra pair of
    // input boxes for that day. Trimming after the conversion would eat those
    // and silently change how many boxes render.
    return content.html()
      .trim()
      .replace(/<br\s*\/?>/gi, '\n')
      .split('\n')
      .map(line => line.replace(/&nbsp;/gi, ' ').trim());
  }

  getJornadaDiaOrig(rowElement) {
    let jornadaDia = '00:00';

    try {
      const scheduleParts = this.splitCellLines(rowElement, 1);
      let totalTime = 0;

      scheduleParts.forEach(part => {
        const times = part.split(' - ').map(t => t.trim());

        if (times.length >= 2 &&
          GrifoUtils.isValidTime(times[0]) &&
          GrifoUtils.isValidTime(times[1])) {
          totalTime += GrifoUtils.diffDate(times[0], times[1]);
        }
      });

      jornadaDia = GrifoUtils.formatMsec(totalTime);
    } catch (error) {
      console.error('Error getting jornada:', error);
      debugLog('ERROR in getJornadaDiaOrig', error);
    }

    return jornadaDia;
  }

  /**
   * Get time entries (horarios) for a specific day
   * @param {jQuery} rowElement - Table row element
   * @returns {Array} Array of time pairs [[start, end], ...]
   */
  getHorariosDiaOrig(rowElement) {
    const arrDiaHorarios = [];

    try {
      const timeParts = this.splitCellLines(rowElement, 2);

      timeParts.forEach(part => {
        const times = part.split(' - ').map(t => t.trim());
        arrDiaHorarios.push(times);
      });
    } catch (error) {
      console.error('Error getting horarios:', error);
    }

    return arrDiaHorarios;
  }

  /**
   * Save current input values to cookies
   */
  saveCookieInputValues() {
    const jornadaInputs = $(`.${GRIFO_CONFIG.CLASSES.MINHA_JORNADA}`);
    const pontoInputs = $(`.${GRIFO_CONFIG.CLASSES.MEU_PONTO}`);

    if (!jornadaInputs.length || !pontoInputs.length) return;

    const arrJornadasInput = [];
    const arrHorariosInput = [];

    for (let dia = 0; dia < this.state.totalDias; dia++) {
      const arrDiaHorariosInput = [];
      let backupVal = '';
      let contador = 0;

      // Process time entries for this day
      $(`.${GRIFO_CONFIG.CLASSES.MEU_PONTO}.dia${dia + 1}`).each((index, elem) => {
        const inputVal = $(elem).val();

        if (index % 2 === 0) {
          backupVal = inputVal;
        } else {
          arrDiaHorariosInput[contador] = [backupVal, inputVal];
          contador++;
        }
      });

      arrHorariosInput.push(arrDiaHorariosInput);

      // Process work schedule for this day
      $(`.${GRIFO_CONFIG.CLASSES.MINHA_JORNADA}.dia${dia + 1}`).each((index, elem) => {
        arrJornadasInput.push($(elem).val());
      });
    }

    // Store in cookies
    this.setJornadasHorariosCookie({
      arr_jornadas_ck: arrJornadasInput,
      arr_horarios_ck: arrHorariosInput
    });
  }

  /**
   * Get combined result data from cookies and original data
   * @returns {Object} Combined arrays of schedules and times
   */
  getArrResultCk() {
    const arrDadosOrig = this.getDadosMesOrig();
    const arrJornadasOrig = arrDadosOrig.arrJornadasOrig;
    const arrHorariosOrig = arrDadosOrig.arrHorariosOrig;

    // Get data from cookies
    const arrCookie = this.getJornadasHorariosCookie();
    const arrJornadasCk = arrCookie.arr_jornadas_ck || [];
    const arrHorariosCk = arrCookie.arr_horarios_ck || [];

    const arrJornadasResult = [];
    const arrHorariosResult = [];

    // Merge schedules: cookie > original
    arrJornadasOrig.forEach((jornadaOrig, dia) => {
      arrJornadasResult[dia] = arrJornadasCk[dia] || jornadaOrig;
    });

    // Merge time entries: cookie > original
    for (let dia = 0; dia < this.state.totalDias; dia++) {
      const cookieHorarios = arrHorariosCk[dia] || [];
      const origHorarios = arrHorariosOrig[dia] || [];
      const maxLength = Math.max(cookieHorarios.length, origHorarios.length);

      arrHorariosResult[dia] = [];

      if (maxLength) {
        for (let batida = 0; batida < maxLength; batida++) {
          const b1 = cookieHorarios[batida]?.[0] || origHorarios[batida]?.[0] || '';
          const b2 = cookieHorarios[batida]?.[1] || origHorarios[batida]?.[1] || '';
          arrHorariosResult[dia][batida] = [b1, b2];
        }
      } else {
        // Deliberately not writing back into arrHorariosOrig here: it is the cached
        // originals array, and clobbering it would kill the "modified" highlight.
        // setInputHorarios already reads it with optional chaining.
        arrHorariosResult[dia][0] = ['', ''];
      }
    }

    return {
      arrJornadas: arrJornadasResult,
      arrHorarios: arrHorariosResult,
      arrJornadasOrig,
      arrHorariosOrig
    };
  }

  /**
   * Get schedules and times from cookies
   * @returns {Object} Cookie data
   */
  getJornadasHorariosCookie() {
    const arrCookie = GrifoUtils.cookies.get(this.state.idCookiePeriodo);

    if (!Array.isArray(arrCookie) || arrCookie.length === 0) return {};

    // Normalize on read. These values only ever originate from mask('00:00')
    // inputs, so anything that is not "HH:mm" is corruption: reject it here
    // rather than letting it reach the markup or the arithmetic.
    const jornadas = Array.isArray(arrCookie[0]) ? arrCookie[0] : [];
    const horarios = Array.isArray(arrCookie[1]) ? arrCookie[1] : [];

    return {
      arr_jornadas_ck: jornadas.map(jornada => GrifoUtils.sanitizeTime(jornada)),
      arr_horarios_ck: horarios.map(dia =>
        (Array.isArray(dia) ? dia : []).map(batida => [
          GrifoUtils.sanitizeTime(batida?.[0]),
          GrifoUtils.sanitizeTime(batida?.[1])
        ])
      )
    };
  }

  /**
   * Save schedules and times to cookies
   * @param {Object} data - Data to save
   */
  setJornadasHorariosCookie(data) {
    const arrCookie = [data.arr_jornadas_ck, data.arr_horarios_ck];
    GrifoUtils.cookies.set(arrCookie, this.state.idCookiePeriodo);
  }



  /**
   * Create input fields for work schedules (jornadas)
   * @param {Array} arrJornadas - Work schedules
   * @param {Array} arrJornadasOrig - Original work schedules
   * @param {Array} arrHorarios - Time entries
   * @returns {Object} Calculation results
   */
  setInputJornadas(arrJornadas, arrJornadasOrig, arrHorarios) {
    let saldoJornadaMesAt = 0;
    let saldoJornadaAcumHj = 0;
    let contadorDia = 1;
    let contadorHoje = 0;

    // Remove existing inputs
    $(`.${GRIFO_CONFIG.CLASSES.MINHA_JORNADA}`).remove();

    arrJornadas.forEach((jornada, dia) => {
      const jDia = GrifoUtils.isValidTime(jornada) ? jornada : '00:00';
      const jDiaOrig = GrifoUtils.isValidTime(arrJornadasOrig[dia]) ? arrJornadasOrig[dia] : '00:00';

      const colorChange = jDia !== jDiaOrig ?
        GRIFO_CONFIG.COLORS.HIGHLIGHT :
        GRIFO_CONFIG.COLORS.WHITE;

      // Check if all time entries for today are filled
      let isCompleteForToday = true;
      if (this.state.idxHoje === contadorDia) contadorHoje++;

      if (contadorHoje) {
        arrHorarios[dia].forEach(batida => {
          const b1 = batida[0];
          const b2 = batida[1];
          isCompleteForToday = isCompleteForToday &&
            GrifoUtils.isValidTime(b1) &&
            GrifoUtils.isValidTime(b2);
        });
      }

      // Calculate work schedule load
      const cargaJornada = GrifoUtils.diffDate('00:00', jDia);
      saldoJornadaMesAt += cargaJornada;
      saldoJornadaAcumHj += isCompleteForToday ? cargaJornada : 0;

      const html = `
        <input type="hidden" 
               style="background-color:${colorChange}" 
               class="${GRIFO_CONFIG.CLASSES.MINHA_JORNADA} dia${contadorDia}" 
               id="minhaJornada${contadorDia}" 
               value="${GrifoUtils.escapeHtml(jDia)}" 
               val-orig="${GrifoUtils.escapeHtml(jDiaOrig)}">
      `;

      $(`#conteinerjornada${contadorDia}`).append(html);
      contadorDia++;
    });

    this.state.saldoJornadaMesAt = saldoJornadaMesAt;
    this.state.saldoJornadaAcumHj = saldoJornadaAcumHj;

    return { saldoJornadaMesAt };
  }

  /**
   * Create input fields for time entries (horarios)
   * @param {Array} arrJornadas - Work schedules
   * @param {Array} arrHorarios - Time entries
   * @param {Array} arrHorariosOrig - Original time entries
   * @returns {Object} Calculation results
   */
  setInputHorarios(arrJornadas, arrHorarios, arrHorariosOrig) {
    let contadorDia = 1;
    let saldoHorarioMes = 0;
    let contadorErro = 0;
    let contadorHoje = 0;
    const MAX_DAILY_HOURS_MS = GRIFO_CONFIG.RULES.MAX_DAILY_HOURS_MS;

    $(`.${GRIFO_CONFIG.CLASSES.MEU_PONTO}, .${GRIFO_CONFIG.CLASSES.MEU_SALDO}`).remove();

    arrHorarios.forEach((diaHorarios, dia) => {
      const jornadaDia = GrifoUtils.diffDate('00:00', arrJornadas[dia]);
      let saldoHorarioDia = 0;
      let saldoHorarioDiaRaw = 0; // Track raw hours before cap
      let html = '';
      let contadorBatida = 1;

      if (this.state.idxHoje === contadorDia) contadorHoje++;

      diaHorarios.forEach((batida, index) => {
        let b1 = batida[0];
        let b2 = batida[1];

        const b1Orig = arrHorariosOrig[dia]?.[index]?.[0] || '';
        const b2Orig = arrHorariosOrig[dia]?.[index]?.[1] || '';

        const colorB1 = b1 !== b1Orig ? GRIFO_CONFIG.COLORS.HIGHLIGHT : GRIFO_CONFIG.COLORS.WHITE;
        const colorB2 = b2 !== b2Orig ? GRIFO_CONFIG.COLORS.HIGHLIGHT : GRIFO_CONFIG.COLORS.WHITE;

        html += `<input size="5" class="gc-input ${GRIFO_CONFIG.CLASSES.MEU_PONTO} dia${contadorDia}"
                        style="background-color:${colorB1}"
                        id="meuPonto${contadorDia}-${contadorBatida}-1"
                        value="${GrifoUtils.escapeHtml(b1)}"
                        val-orig="${GrifoUtils.escapeHtml(b1Orig)}">`;
        html += `<input size="5" class="gc-input ${GRIFO_CONFIG.CLASSES.MEU_PONTO} dia${contadorDia}"
                        style="background-color:${colorB2}"
                        id="meuPonto${contadorDia}-${contadorBatida}-2"
                        value="${GrifoUtils.escapeHtml(b2)}"
                        val-orig="${GrifoUtils.escapeHtml(b2Orig)}">`;

        if (GrifoUtils.isValidTime(b1) && GrifoUtils.isValidTime(b2)) {
          const batidaDiff = GrifoUtils.diffDate(b1, b2);
          saldoHorarioDiaRaw += batidaDiff;
          saldoHorarioDia += batidaDiff;

          // Check if all times for today are filled
          let isCompleteForToday = true;
          if (contadorHoje) {
            diaHorarios.forEach(bat => {
              isCompleteForToday = isCompleteForToday &&
                GrifoUtils.isValidTime(bat[0]) &&
                GrifoUtils.isValidTime(bat[1]);
            });
          }

          saldoHorarioMes += isCompleteForToday ? GrifoUtils.diffDate(b1, b2) : 0;
        } else if (GrifoUtils.isValidTime(b1) || GrifoUtils.isValidTime(b2)) {
          // Exactly one of the pair is filled: the day needs correcting, unless
          // it is today and still in progress. The per-batida saldo box that
          // used to render here was disabled long ago; everything that fed it
          // has been removed (see git history to restore it).
          if (contadorHoje < 1) contadorErro++;
        }


        contadorBatida++;
      });

      // Apply 10-hour daily cap
      let cappedWarning = '';
      if (saldoHorarioDiaRaw > MAX_DAILY_HOURS_MS) {
        const extraMs = saldoHorarioDiaRaw - MAX_DAILY_HOURS_MS;
        const extraHours = GrifoUtils.formatMsec(extraMs);
        saldoHorarioDia = MAX_DAILY_HOURS_MS;
        saldoHorarioMes -= extraMs;
        const capLabel = `${MAX_DAILY_HOURS_MS / 3600000}h`;
        cappedWarning = `<br><span class="${GRIFO_CONFIG.CLASSES.MEU_SALDO}" style="color:${GRIFO_CONFIG.COLORS.ERROR};font-size:11px">⚠ Limitado a ${capLabel} (${extraHours} ignorado)</span>`;
        debugLog(`  Day ${contadorDia}: Capped at 10h, ignored ${extraHours}`);
      }

      const cssSaldo = (jornadaDia > saldoHorarioDia && contadorHoje <= 0) ?
        `color:${GRIFO_CONFIG.COLORS.ERROR}` : '';

      html += `<input size="4" disabled
                      class="gc-input gc-input--total ${GRIFO_CONFIG.CLASSES.MEU_SALDO}"
                      style="${cssSaldo}"
                      id="meuPonto${contadorDia}-${contadorBatida}-saldo_horario_dia"
                      value="${GrifoUtils.formatMsec(saldoHorarioDia)}">${cappedWarning}`;

      $(`#conteinerdia${contadorDia}`).append(html);
      contadorDia++;
    });

    return { saldoHorarioMes, cntErro: contadorErro, cntHoje: contadorHoje };
  }

  /**
   * Pick the colour class for a signed duration.
   * Note the sign: callers pass the value they DISPLAY, so "Falta" passes
   * (worked - scheduled), which is the negation of the test it used to inline.
   * @param {number} ms - Signed milliseconds
   * @returns {string} CSS class
   */
  tone(ms) {
    return ms < 0 ? 'gc-neg' : 'gc-pos';
  }

  /**
   * One half-width tile in the two-column summary row
   * @param {string} label - Uppercase caption
   * @param {string} value - Pre-escaped HTML for the value
   * @param {{tone?: string, note?: string, title?: string}} [opts]
   * @returns {string} HTML
   */
  renderTile(label, value, opts = {}) {
    const { tone = '', note = '', title = '' } = opts;
    return `
      <div class="gc-card gc-card--tile"${title ? ` title="${GrifoUtils.escapeHtml(title)}"` : ''}>
        <div class="gc-label gc-label--tile">${label}</div>
        <div class="gc-value gc-value--tile ${tone}">${value}</div>
        ${note ? `<div class="gc-note">${note}</div>` : ''}
      </div>`;
  }

  /**
   * The suggested end-of-day time, or the reason there isn't one
   * @param {number} saldoCurrentCalc - Current balance in ms
   * @param {string} ultimaEntrada - Today's last open check-in "HH:mm"
   * @param {string} jornadaDoDia - Today's scheduled hours "HH:mm"
   * @param {number} horasTrabalhadasHojeMs - Closed intervals worked today
   * @returns {string} HTML
   */
  renderSaidaIdeal(saldoCurrentCalc, ultimaEntrada, jornadaDoDia, horasTrabalhadasHojeMs) {
    const { SAIDA_IDEAL_MIN_MS, SAIDA_IDEAL_MAX_MS } = GRIFO_CONFIG.RULES;

    const podeSugerir = ultimaEntrada &&
      GrifoUtils.isValidTime(ultimaEntrada) &&
      saldoCurrentCalc > SAIDA_IDEAL_MIN_MS &&
      saldoCurrentCalc <= SAIDA_IDEAL_MAX_MS;

    if (!podeSugerir) {
      return '<div class="gc-hint">Preencha <b>Teletrabalho</b> na nota dos dias remotos.</div>';
    }

    const jornadaMs = GrifoUtils.diffDate('00:00', jornadaDoDia || '00:00');
    const remainingMs = jornadaMs - horasTrabalhadasHojeMs - saldoCurrentCalc;

    if (remainingMs <= 0) {
      return '<div class="gc-hint">Você está trabalhando demais, não acha?</div>';
    }

    const horarioSugerido = GrifoUtils.formatDate(
      GrifoUtils.sumDateMsec(ultimaEntrada, remainingMs),
      'HH:mm'
    );
    // The original wrapped this whole line in <b>, so the label is bold too
    return `<div class="gc-hint"><b>Saída ideal: <strong>${horarioSugerido}</strong>.</b></div>`;
  }

  /**
   * Find a value cell by the text of the label cell next to it
   * @param {string} rowSelector - Selector matching candidate rows
   * @param {string} label - Substring to look for in the first cell
   * @returns {string} The second cell's text, or ''
   */
  findRowValueByLabel(rowSelector, label) {
    let value = '';
    $(rowSelector).each((index, row) => {
      const $row = $(row);
      if ($row.find('td:eq(0)').text().trim().includes(label)) {
        value = $row.find('td:eq(1)').text().trim();
        return false; // break
      }
    });
    return value;
  }

  /**
   * Execute all calculations and display results
   * @param {number} saldoJornadaMesAt - Total work schedule for month
   * @param {number} saldoHorarioMes - Total worked hours for month
   * @param {number} cntErro - Error count
   * @param {string} ultimaEntrada - Last open check-in time for today (e.g. "08:00")
   * @param {string} jornadaDoDia - Today's scheduled work hours (e.g. "07:00")
   * @param {number} horasTrabalhadasHojeMs - Milliseconds already worked today in closed intervals (before ultimaEntrada)
   */
  executaCalculo(saldoJornadaMesAt, saldoHorarioMes, cntErro, ultimaEntrada = '', jornadaDoDia = '00:00', horasTrabalhadasHojeMs = 0) {
    debugLog('\n=== executaCalculo START ===');
    debugLog(`  saldoJornadaMesAt: ${GrifoUtils.formatMsec(saldoJornadaMesAt)}`);
    debugLog(`  saldoHorarioMes: ${GrifoUtils.formatMsec(saldoHorarioMes)}`);
    debugLog(`  saldoJornadaAcumHj: ${GrifoUtils.formatMsec(this.state.saldoJornadaAcumHj)}`);
    
    // The balance cell has moved between Grifo versions; try each known shape
    const previousBalanceText = GrifoUtils.firstMatch([
      GRIFO_CONFIG.SELECTORS.PREVIOUS_BALANCE,
      GRIFO_CONFIG.SELECTORS.PREVIOUS_BALANCE_NO_TBODY,
      () => this.findRowValueByLabel('#divSecaoSaldoMesAnterior table tr', 'Banco de horas anterior')
    ]);

    debugLog(`  Final previousBalanceText: "${previousBalanceText}"`);
    const saldoBHoras = GrifoUtils.diffHoraMsec(previousBalanceText);
    debugLog(`  saldoBHoras (in msec): ${saldoBHoras} (${GrifoUtils.formatMsec(saldoBHoras)})`);

    // Grifo shows "(Aguardando Fechamento da Freqüência)" instead of a time when
    // the previous month is still open, so there is no bank balance to display yet
    const bancoPendente = previousBalanceText !== '' &&
      !GRIFO_CONFIG.PATTERNS.BALANCE_FORMAT.test(previousBalanceText);
    debugLog(`  bancoPendente: ${bancoPendente}`);

    const saldoCurrentCalc = saldoHorarioMes - this.state.saldoJornadaAcumHj;
    debugLog(`  saldoCurrentCalc: ${GrifoUtils.formatMsec(saldoCurrentCalc)}`);

    // Remove existing container and store position
    let top = '60px';
    let left = 'calc(77% - 150px)';
    const existingContainer = $(`#${GRIFO_CONFIG.IDS.CONTAINER_TOTAL}`);

    if (existingContainer.length) {
      // getBoundingClientRect() is the coordinate space these fixed-position
      // top/left values are consumed in. Note jQuery's .position() special-cases
      // position:fixed and returns the same numbers - measured identical on the
      // live page - so this is NOT a drift fix, despite appearances. The clamp
      // is the part that earns its keep: it stops a window resize from
      // stranding the panel off-screen.
      const rect = existingContainer[0].getBoundingClientRect();
      top = `${Math.max(0, Math.min(rect.top, window.innerHeight - 60))}px`;
      left = `${Math.max(0, Math.min(rect.left, window.innerWidth - 120))}px`;
      existingContainer.remove();
    }

    const faltaSobra = saldoJornadaMesAt > saldoHorarioMes ? 'Falta' : 'Sobra';
    const temJornadaHoje = this.state.saldoJornadaAcumHj !== 0;

    const containerHTML = `
      <div id="${GRIFO_CONFIG.IDS.CONTAINER_TOTAL}" class="gc-panel" style="left:${left};top:${top};">

        <div class="gc-header">
          <img class="gc-header__logo" src="${GRIFO_CONFIG.LOGO_SVG}">
          <div class="gc-header__text">
            <div class="gc-header__title">Grifo Check</div>
            <div class="gc-header__subtitle">Controle de Jornada</div>
          </div>
        </div>

        <div class="gc-body">

          <div class="gc-card">
            <div class="gc-label">Jornada Total</div>
            <div class="gc-value">${GrifoUtils.formatMsec(saldoJornadaMesAt)}</div>
          </div>

          <div class="gc-card gc-card--status">
            <div class="gc-status-text">
              Trabalhou
              <strong class="gc-worked">${GrifoUtils.formatMsec(saldoHorarioMes)}</strong>
              ${temJornadaHoje ? `de <strong>${GrifoUtils.formatMsec(this.state.saldoJornadaAcumHj)}</strong>.` : ''}
            </div>
            ${temJornadaHoje ? `
              <div class="gc-divider">
                <div class="gc-label gc-label--plain">SALDO CORRENTE</div>
                <div class="gc-value gc-value--current ${this.tone(saldoCurrentCalc)}">
                  ${saldoCurrentCalc < 0 ? '' : '+'}${GrifoUtils.formatMsec(saldoCurrentCalc)}
                </div>
                ${this.renderSaidaIdeal(saldoCurrentCalc, ultimaEntrada, jornadaDoDia, horasTrabalhadasHojeMs)}
              </div>
            ` : ''}
          </div>

          <div class="gc-grid">
            ${this.renderTile(faltaSobra, GrifoUtils.formatMsec(saldoHorarioMes - saldoJornadaMesAt), {
              tone: this.tone(saldoHorarioMes - saldoJornadaMesAt),
              note: `${this.state.totalDias - this.state.idxHoje} dia(s)`
            })}
            ${saldoBHoras
              ? this.renderTile('Banco', GrifoUtils.escapeHtml(previousBalanceText), { tone: this.tone(saldoBHoras) })
              : bancoPendente
                ? this.renderTile('Banco', '&mdash;&nbsp;:&nbsp;&mdash;', {
                    tone: 'gc-pending', note: 'freq. não fechada', title: previousBalanceText
                  })
                : ''}
          </div>

          ${saldoBHoras ? `
            <div class="gc-card gc-card--total">
              <div class="gc-label gc-label--plain gc-label--total">SALDO FINAL DO PERÍODO</div>
              <div class="gc-value gc-value--total ${this.tone(saldoHorarioMes - saldoJornadaMesAt + saldoBHoras)}">
                ${GrifoUtils.formatMsec(saldoHorarioMes - saldoJornadaMesAt + saldoBHoras)}
              </div>
            </div>
          ` : ''}

          ${cntErro > 0 ? `
            <div class="gc-alert"><strong>${cntErro}</strong> dia(s) para corrigir</div>
          ` : ''}

          <button id="${GRIFO_CONFIG.IDS.BTN_RELOAD}" class="gc-btn">🔄 Recalcular</button>
        </div>
      </div>
    `;

    const tableHeader = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.TABLE_HEADER);
    if (tableHeader) {
      tableHeader.append(containerHTML);
    }

    $(`#${GRIFO_CONFIG.IDS.CONTAINER_TOTAL}`).draggable();

    this.logCalculation({
      saldoJornadaMesAt, saldoHorarioMes, saldoCurrentCalc, faltaSobra,
      previousBalanceText, saldoBHoras, cntErro
    });

    this.setupEventHandlers();
  }

  /**
   * Emit the end-of-calculation debug summary
   * @param {object} vm - The numbers just computed
   */
  logCalculation(vm) {
    if (!DEBUG) return;
    const f = GrifoUtils.formatMsec;
    debugLog('\n--- CALCULATION SUMMARY ---');
    debugLog(`  Jornada Total: ${f(vm.saldoJornadaMesAt)}`);
    debugLog(`  Horas Trabalhadas: ${f(vm.saldoHorarioMes)}`);
    debugLog(`  Jornada Acumulada até Hoje: ${f(this.state.saldoJornadaAcumHj)}`);
    debugLog(`  Saldo Corrente: ${f(vm.saldoCurrentCalc)}`);
    debugLog(`  ${vm.faltaSobra}: ${f(vm.saldoHorarioMes - vm.saldoJornadaMesAt)}`);
    debugLog(`  Banco de Horas Anterior: ${vm.previousBalanceText} (${f(vm.saldoBHoras)})`);
    debugLog(`  Saldo Final: ${f(vm.saldoHorarioMes - vm.saldoJornadaMesAt + vm.saldoBHoras)}`);
    debugLog(`  Erros: ${vm.cntErro}`);
    debugLog('=== executaCalculo END ===\n');
  }

  /**
   * Setup event handlers for inputs and buttons
   */
  setupEventHandlers() {
    $(`#${GRIFO_CONFIG.IDS.BTN_RELOAD}`).off('click').on('click', () => {
      this.start();
    });

    const pontoInputs = `.${GRIFO_CONFIG.CLASSES.MEU_PONTO}`;
    const jornadaInputs = `.${GRIFO_CONFIG.CLASSES.MINHA_JORNADA}`;

    $(`${pontoInputs}, ${jornadaInputs}`).each((index, elem) => {
      const $elem = $(elem);
      $elem.mask('00:00');

      $elem.off('keyup').on('keyup', (event) => {
        const currentVal = $elem.val();
        const origVal = $elem.attr('val-orig');

        if (currentVal !== origVal) {
          $elem.css('background-color', GRIFO_CONFIG.COLORS.HIGHLIGHT);
        } else {
          $elem.css('background-color', GRIFO_CONFIG.COLORS.WHITE);
        }

        if (event.key === 'Enter') {
          $(`#${GRIFO_CONFIG.IDS.BTN_RELOAD}`).click();
        }
      });
    });
  }



  /**
   * Auto-fill time entries for days with "Teletrabalho" observation
   * Checks each day's observation and if "Teletrabalho" is found,
   * fills the empty time boxes with the schedule times
   */
  autoFillTeletrabalho() {
    debugLog('\n=== Starting autoFillTeletrabalho ===');
    
    const tableRows = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.TABLE_ROWS);
    if (!tableRows) {
      debugLog('ERROR: No table rows found!');
      return;
    }

    debugLog(`Found ${tableRows.length} table rows`);
    let contador = 1;
    let filledCount = 0;

    tableRows.each((index, row) => {
      const $row = $(row);
      
      // Find observation image by title attribute
      const $observationImg = $row.find('img[title*="Detalhar"]');
      debugLog(`  Observation img found: ${$observationImg.length > 0}`);
      
      if ($observationImg.length > 0) {
        // Get the onmouseover attribute to check for "Teletrabalho"
        const onmouseover = $observationImg.attr('onmouseover') || '';
        const hasTeletrabalho = onmouseover.toLowerCase().includes('teletrabalho');
        
        if (hasTeletrabalho) {
          debugLog(`\n  Row ${contador}: ✓ TELETRABALHO FOUND`);
          
          // Extract schedule times from column 2 (td:eq(1))
          const scheduleCell = $row.find('td:eq(1)');
          const scheduleText = scheduleCell.text().trim();
          debugLog(`    Schedule: "${scheduleText}"`);
          
          // Parse the schedule (e.g., "12:00 - 19:00")
          const scheduleMatch = scheduleText.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
          
          if (scheduleMatch) {
            const startTime = scheduleMatch[1];
            const endTime = scheduleMatch[2];
            debugLog(`    Times: ${startTime} - ${endTime}`);
            
            // Get the first two input boxes for this day
            const input1ID = `meuPonto${contador}-1-1`;
            const input2ID = `meuPonto${contador}-1-2`;
            
            const input1 = $(`#${input1ID}`);
            const input2 = $(`#${input2ID}`);
            
            // Only fill if the boxes are empty
            let filled = false;
            if (input1.length > 0 && !input1.val()) {
              debugLog(`    → Filling ${input1ID} with ${startTime}`);
              input1.val(startTime);
              input1.attr('val-orig', '');
              input1.css('background-color', GRIFO_CONFIG.COLORS.HIGHLIGHT);
              filled = true;
            }
            
            if (input2.length > 0 && !input2.val()) {
              debugLog(`    → Filling ${input2ID} with ${endTime}`);
              input2.val(endTime);
              input2.attr('val-orig', '');
              input2.css('background-color', GRIFO_CONFIG.COLORS.HIGHLIGHT);
              filled = true;
            }
            
            if (filled) filledCount++;
          } else {
            debugLog('    ✗ Could not parse schedule times');
          }
        }
      }
      
      contador++;
    });
    
    debugLog(`\n=== Finished autoFillTeletrabalho - Filled ${filledCount} days ===\n`);
    
    // Trigger recalculation if any fields were filled
    if (filledCount > 0) {
      debugLog('Triggering recalculation...');
      setTimeout(() => {
        $(`#${GRIFO_CONFIG.IDS.BTN_RELOAD}`).click();
      }, 100);
    }
  }

  /**
   * Main start function - coordina all operations
   */
  start() {
    debugLog('\n\n========== GRIFO CHECK START ==========');

    // Must run before saving: on a month change the inputs on screen belong to
    // the new period, and saving them first would write them under the old key
    const periodChanged = this.refreshPeriodContext();
    if (!periodChanged) {
      this.saveCookieInputValues();
    }

    debugLog('Getting array data from cookies...');
    const arrDados = this.getArrResultCk();
    
    debugLog('Setting input jornadas...');
    const arrResultJ = this.setInputJornadas(
      arrDados.arrJornadas,
      arrDados.arrJornadasOrig,
      arrDados.arrHorarios
    );
    debugLog(`  Result - saldoJornadaMesAt: ${GrifoUtils.formatMsec(arrResultJ.saldoJornadaMesAt)}`);
    
    debugLog('Setting input horarios...');
    const arrResultH = this.setInputHorarios(
      arrDados.arrJornadas,
      arrDados.arrHorarios,
      arrDados.arrHorariosOrig
    );
    debugLog(`  Result - saldoHorarioMes: ${GrifoUtils.formatMsec(arrResultH.saldoHorarioMes)}`);
    debugLog(`  Result - cntErro: ${arrResultH.cntErro}, cntHoje: ${arrResultH.cntHoje}`);

    // Auto-fill time entries for days with Teletrabalho observation
    this.autoFillTeletrabalho();

    // Compute today's last open check-in (has check-in but no checkout)
    let ultimaEntrada = '';
    let jornadaDoDia = '00:00';
    let horasTrabalhadasHojeMs = 0;
    if (this.state.idxHoje > 0) {
      const todayIdx = this.state.idxHoje - 1;
      const todayHorarios = arrDados.arrHorarios[todayIdx] || [];
      jornadaDoDia = arrDados.arrJornadas[todayIdx] || '00:00';
      for (let i = todayHorarios.length - 1; i >= 0; i--) {
        const b1 = todayHorarios[i][0];
        const b2 = todayHorarios[i][1];
        if (GrifoUtils.isValidTime(b1) && !GrifoUtils.isValidTime(b2)) {
          ultimaEntrada = b1;
          break;
        }
      }
      // Sum hours already worked today in closed intervals (e.g. before lunch break)
      todayHorarios.forEach(batida => {
        const b1 = batida[0];
        const b2 = batida[1];
        if (GrifoUtils.isValidTime(b1) && GrifoUtils.isValidTime(b2)) {
          horasTrabalhadasHojeMs += GrifoUtils.diffDate(b1, b2);
        }
      });
    }

    this.executaCalculo(
      arrResultJ.saldoJornadaMesAt,
      arrResultH.saldoHorarioMes,
      arrResultH.cntErro,
      ultimaEntrada,
      jornadaDoDia,
      horasTrabalhadasHojeMs
    );
    
    debugLog('========== GRIFO CHECK END ==========\n\n');
  }
}

// Initialize the extension when DOM is ready
if (typeof jQuery !== 'undefined') {
  $(document).ready(() => {
    // Small delay to ensure page is fully loaded
    setTimeout(() => {
      window.grifoCheck = new GrifoCheck();
    }, GRIFO_CONFIG.TIME.BOOT_DELAY);
  });
} else {
  console.error('Grifo Check: jQuery is not loaded');
}
