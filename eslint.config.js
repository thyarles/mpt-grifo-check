'use strict';

/**
 * Scope is an explicit file list, not an ignore list: the four vendored
 * libraries in the repo root would otherwise need their own exclusions.
 */
module.exports = [
  {
    files: ['constants.js', 'utils.js', 'grifo-check.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        // vendored libraries
        $: 'readonly',
        jQuery: 'readonly',
        Cookies: 'readonly',
        // browser
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        MutationObserver: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        // our own cross-file globals
        GRIFO_CONFIG: 'writable',
        GrifoUtils: 'writable',
        GrifoCheck: 'writable',
        DEBUG: 'writable',
        debugLog: 'readonly',
        grifoDebug: 'readonly'
      }
    },
    rules: {
      // GRIFO_CONFIG/GrifoUtils/GrifoCheck are declared in one file and consumed
      // in another; grifoDebug is a console-facing API. ESLint cannot see across
      // content-script files, so exempt those names rather than the rule.
      'no-unused-vars': ['error', {
        args: 'after-used',
        caughtErrors: 'none',
        varsIgnorePattern: '^(GRIFO_CONFIG|GrifoUtils|GrifoCheck|grifoDebug)$'
      }],
      'no-undef': 'error',
      eqeqeq: 'error',
      'no-console': 'off'
    }
  },
  {
    files: ['utils.test.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { require: 'readonly', __dirname: 'readonly', console: 'readonly' }
    },
    rules: { 'no-unused-vars': 'error', 'no-undef': 'error' }
  }
];
