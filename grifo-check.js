'use strict';

/**
 * ============================================
 * DEBUG MODE
 * ============================================
 * Set DEBUG to true to enable detailed console logging
 * Set DEBUG to false to disable all debug output
 * 
 * Debug logs will show:
 * - Teletrabalho auto-fill operations
 * - Previous balance retrieval (Chrome compatibility fixes)
 * - Calculation summaries and results
 * - Step-by-step execution flow
 */
const DEBUG = true;

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
      saldoCurrent: 0,
      saldoJornadaAcumHj: 0,
      idxHoje: 0,
      totalDias: 0,
      horMin: GRIFO_CONFIG.DEFAULT_HOURS.MIN,
      horMax: GRIFO_CONFIG.DEFAULT_HOURS.MAX,
      strNome: '',
      cctNome: '',
      idCookiePeriodo: '',
      idCookieConfig: ''
    };

    this.observer = null;
    this.init();
  }

  /**
   * Initialize the extension
   */
  init() {
    this.extractUserInfo();
    this.setupObserver();
    this.startMonitoring();
  }

  /**
   * Extract user information from page
   */
  extractUserInfo() {
    try {
      const headerElement = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.HEADER_NAME);
      if (!headerElement) return;

      const headerText = GrifoUtils.safeText(headerElement);
      const nameParts = headerText.split(',');

      if (nameParts.length > 1) {
        this.state.strNome = nameParts[1].toUpperCase().trim();
        this.state.cctNome = nameParts[1].trim().replaceAll(' ', '');
      }

      const dateInput = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.DATE_INPUT);
      const dateValue = dateInput ? dateInput.val() : '';

      this.state.idCookiePeriodo = `${this.state.cctNome}-grifo_saldo-${dateValue}`;
      this.state.idCookieConfig = `${this.state.cctNome}-grifo_saldo`;

      const tableRows = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.TABLE_ROWS);
      this.state.totalDias = tableRows ? tableRows.length : 0;
    } catch (error) {
      console.error('Error extracting user info:', error);
    }
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
    const resultSection = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.RESULT_SECTION);
    const containerExists = $(`#${GRIFO_CONFIG.IDS.CONTAINER_TOTAL}`).length > 0;

    if (!resultSection || containerExists) return;

    const editPessoa = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.EDIT_PESSOA);
    const shouldProceed = !editPessoa ||
      (editPessoa.val().trim() === this.state.strNome.trim());

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
    setInterval(() => this.checkAndStart(), GRIFO_CONFIG.TIME.CHECK_INTERVAL);
  }

  /**
   * Get original work schedule data for the month
   * @returns {Object} Arrays of original schedules and times
   */
  getDadosMesOrig() {
    const arrJornadasOrig = [];
    const arrHorariosOrig = [];
    let contador = 1;

    const today = new Date();
    const strHoje = GrifoUtils.formatDate(today, 'dd/MM/yy');

    // Remove old containers
    $(`.${GRIFO_CONFIG.CLASSES.CONTAINER_SALDO}, .${GRIFO_CONFIG.CLASSES.CONTAINER_JORNADA}`).remove();

    const tableRows = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.TABLE_ROWS);
    if (!tableRows) return { arrJornadasOrig, arrHorariosOrig };

    tableRows.each((index, row) => {
      const $row = $(row);

      // Process schedules (jornadas)
      arrJornadasOrig.push(this.getJornadaDiaOrig($row));
      $row.find('td:eq(1)').append(
        `<br class="${GRIFO_CONFIG.CLASSES.CONTAINER_JORNADA}">` +
        `<span class="${GRIFO_CONFIG.CLASSES.CONTAINER_JORNADA}" id="conteinerjornada${contador}"></span>`
      );

      // Process time entries (horarios)
      arrHorariosOrig.push(this.getHorariosDiaOrig($row));
      $row.find('td:eq(2)').append(
        `<br class="${GRIFO_CONFIG.CLASSES.CONTAINER_SALDO}">` +
        `<span class="${GRIFO_CONFIG.CLASSES.CONTAINER_SALDO}" id="conteinerdia${contador}"></span>`
      );

      // Check if this is today's row
      const dateText = $row.find('td:eq(0)').text().trim().split(' ');
      if (dateText[0] === strHoje) {
        this.state.idxHoje = contador;
      }

      contador++;
    });

    return { arrJornadasOrig, arrHorariosOrig };
  }

  /**
   * Get work schedule (jornada) for a specific day
   * @param {jQuery} rowElement - Table row element
   * @returns {string} Work schedule time (e.g., "08:00")
   */
  getJornadaDiaOrig(rowElement) {
    let jornadaDia = '00:00';

    try {
      const cellContent = rowElement.find('td:eq(1)');
      if (!GrifoUtils.safeText(cellContent)) return jornadaDia;

      const content = cellContent.clone();
      content.find('img').remove();

      const htmlContent = content.html().replaceAll('<br>', '#');
      const scheduleParts = htmlContent.trim().split('#');
      let totalTime = 0;

      scheduleParts.forEach(part => {
        const times = part.split(' - ').map(t => t.trim().replaceAll('&nbsp;', ''));

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
      const cellContent = rowElement.find('td:eq(2)');
      if (!GrifoUtils.safeText(cellContent)) return arrDiaHorarios;

      const content = cellContent.clone();
      content.find('img').remove();

      const htmlContent = content.html().replaceAll('<br>', '#');
      const timeParts = htmlContent.trim().split('#');

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

    // Load time interval config from cookies
    const arrCookieConfig = this.getConfigCookie();
    this.state.horMin = arrCookieConfig.hor_min || GRIFO_CONFIG.DEFAULT_HOURS.MIN;
    this.state.horMax = arrCookieConfig.hor_max || GRIFO_CONFIG.DEFAULT_HOURS.MAX;

    // Update UI with interval values
    $(`#${GRIFO_CONFIG.IDS.HOR_MIN}`).val(this.state.horMin);
    $(`#${GRIFO_CONFIG.IDS.HOR_MAX}`).val(this.state.horMax);

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
        arrHorariosResult[dia][0] = ['', ''];
        arrHorariosOrig[dia][0] = ['', ''];
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

    if (arrCookie.length > 0) {
      return {
        arr_jornadas_ck: arrCookie[0],
        arr_horarios_ck: arrCookie[1]
      };
    }

    return {};
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
   * Get configuration from cookies
   * @returns {Object} Configuration data
   */
  getConfigCookie() {
    const arrCookie = GrifoUtils.cookies.get(this.state.idCookieConfig);

    if (arrCookie.length > 0) {
      return {
        hor_min: arrCookie[0],
        hor_max: arrCookie[1]
      };
    }

    return {};
  }

  /**
   * Save configuration to cookies
   * @param {Object} config - Configuration to save
   */
  setConfigCookie(config) {
    const arrCookie = [config.hor_min, config.hor_max];
    GrifoUtils.cookies.set(arrCookie, this.state.idCookieConfig);
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
        <input size="5" 
               style="background-color:${colorChange}" 
               class="${GRIFO_CONFIG.CLASSES.MINHA_JORNADA} dia${contadorDia}" 
               id="minhaJornada${contadorDia}" 
               value="${jDia || ''}" 
               val-orig="${jDiaOrig || ''}">
        <br class="${GRIFO_CONFIG.CLASSES.MINHA_JORNADA}">
      `;

      $(`#conteinerjornada${contadorDia}`).append(html);
      contadorDia++;
    });

    this.state.saldoJornadaMesAt = saldoJornadaMesAt;
    this.state.saldoJornadaAcumHj = saldoJornadaAcumHj;

    return { saldoJornadaMesAt, saldoCurrent: this.state.saldoCurrent };
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

    $(`.${GRIFO_CONFIG.CLASSES.MEU_PONTO}, .${GRIFO_CONFIG.CLASSES.MEU_SALDO}`).remove();

    arrHorarios.forEach((diaHorarios, dia) => {
      const jornadaDia = GrifoUtils.diffDate('00:00', arrJornadas[dia]);
      let saldoHorarioDia = 0;
      let html = '';
      let contadorBatida = 1;

      if (this.state.idxHoje === contadorDia) contadorHoje++;

      diaHorarios.forEach((batida, index) => {
        let b1 = batida[0];
        let b2 = batida[1];

        // Apply time limits
        if (index === 0) {
          b1 = GrifoUtils.diffDate('00:00', b1) < GrifoUtils.diffDate('00:00', this.state.horMin) ?
            this.state.horMin : b1;
        }
        if (index === diaHorarios.length - 1) {
          b2 = GrifoUtils.diffDate('00:00', b2) > GrifoUtils.diffDate('00:00', this.state.horMax) ?
            this.state.horMax : b2;
        }

        const b1Orig = arrHorariosOrig[dia]?.[index]?.[0] || '';
        const b2Orig = arrHorariosOrig[dia]?.[index]?.[1] || '';

        const colorB1 = b1 !== b1Orig ? GRIFO_CONFIG.COLORS.HIGHLIGHT : GRIFO_CONFIG.COLORS.WHITE;
        const colorB2 = b2 !== b2Orig ? GRIFO_CONFIG.COLORS.HIGHLIGHT : GRIFO_CONFIG.COLORS.WHITE;

        html += `<input size="5" 
                        style="background-color:${colorB1}" 
                        class="${GRIFO_CONFIG.CLASSES.MEU_PONTO} dia${contadorDia}" 
                        id="meuPonto${contadorDia}-${contadorBatida}-1" 
                        value="${b1 || ''}" 
                        val-orig="${b1Orig || ''}">`;
        html += `<input size="5" 
                        style="background-color:${colorB2}" 
                        class="${GRIFO_CONFIG.CLASSES.MEU_PONTO} dia${contadorDia}" 
                        id="meuPonto${contadorDia}-${contadorBatida}-2" 
                        value="${b2 || ''}" 
                        val-orig="${b2Orig || ''}">`;

        let saldoBatida = '';
        let cssErro = '';
        let strAlert = '';

        if (GrifoUtils.isValidTime(b1) && GrifoUtils.isValidTime(b2)) {
          saldoBatida = GrifoUtils.formatMsec(GrifoUtils.diffDate(b1, b2));
          saldoHorarioDia += GrifoUtils.diffDate(b1, b2);

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
        } else {
          const saldoRest = jornadaDia - (saldoHorarioDia || 0);
          const horaDebito = GrifoUtils.formatMsec(Math.abs(saldoRest));

          cssErro = contadorHoje > 0 ?
            GRIFO_CONFIG.COLORS.DISABLED :
            (saldoRest > 0 ? GRIFO_CONFIG.COLORS.ERROR : GRIFO_CONFIG.COLORS.LIGHT_ERROR);

          if (GrifoUtils.isValidTime(b1) || GrifoUtils.isValidTime(b2)) {
            const saidaSugerida = GrifoUtils.formatDate(
              GrifoUtils.sumDateMsec(b1, saldoRest),
              'HH:mm'
            );
            const sinal = saldoRest <= 0 ? '+' : '-';
            strAlert = `<span class="${GRIFO_CONFIG.CLASSES.MEU_SALDO}" 
                              style="color:${GRIFO_CONFIG.COLORS.ERROR}">
                          (${sinal}${horaDebito}) Saida ${saidaSugerida}
                        </span>`;
            if (contadorHoje < 1) contadorErro++;
          }
        }

        html += `<input size="5" 
                        class="${GRIFO_CONFIG.CLASSES.MEU_SALDO}" 
                        disabled 
                        style="${cssErro ? 'background-color:' + cssErro : ''}" 
                        id="meuPonto${contadorDia}-${contadorBatida}-saldo" 
                        value="${saldoBatida}">
                 ${strAlert}
                 <br class="${GRIFO_CONFIG.CLASSES.MEU_SALDO}">`;

        contadorBatida++;
      });

      const cssSaldo = (jornadaDia > saldoHorarioDia && contadorHoje <= 0) ?
        `color:${GRIFO_CONFIG.COLORS.ERROR}` : '';

      html += `<input size="4" 
                      class="${GRIFO_CONFIG.CLASSES.MEU_SALDO}" 
                      style="margin-left:98px;font-weight:bold;${cssSaldo}" 
                      disabled 
                      id="meuPonto${contadorDia}-${contadorBatida}-saldo_horario_dia" 
                      value="${GrifoUtils.formatMsec(saldoHorarioDia)}">`;

      $(`#conteinerdia${contadorDia}`).append(html);
      contadorDia++;
    });

    return { saldoHorarioMes, cnt_erro: contadorErro, cnt_hoje: contadorHoje };
  }

  /**
   * Execute all calculations and display results
   * @param {number} saldoJornadaMesAt - Total work schedule for month
   * @param {number} saldoCurrent - Current balance
   * @param {number} saldoHorarioMes - Total worked hours for month
   * @param {number} cntErro - Error count
   * @param {number} cntHoje - Today counter
   */
  executaCalculo(saldoJornadaMesAt, saldoCurrent, saldoHorarioMes, cntErro, cntHoje) {
    debugLog('\n=== executaCalculo START ===');
    debugLog(`  saldoJornadaMesAt: ${GrifoUtils.formatMsec(saldoJornadaMesAt)}`);
    debugLog(`  saldoHorarioMes: ${GrifoUtils.formatMsec(saldoHorarioMes)}`);
    debugLog(`  saldoJornadaAcumHj: ${GrifoUtils.formatMsec(this.state.saldoJornadaAcumHj)}`);
    
    // Try multiple methods to get previous balance
    let previousBalanceText = '';
    let $balanceElement = null;
    
    // Method 1: Original selector
    $balanceElement = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.PREVIOUS_BALANCE);
    previousBalanceText = GrifoUtils.safeText($balanceElement);
    debugLog(`  Method 1 (original selector): "${previousBalanceText}"`);
    
    // Method 2: Without tbody (Chrome compatibility)
    if (!previousBalanceText) {
      $balanceElement = $('#divSecaoSaldoMesAnterior > fieldset > table > tr:eq(0) > td:eq(1)');
      previousBalanceText = GrifoUtils.safeText($balanceElement);
      debugLog(`  Method 2 (no tbody): "${previousBalanceText}"`);
    }
    
    // Method 3: Find by text content
    if (!previousBalanceText) {
      $('#divSecaoSaldoMesAnterior table tr').each((index, row) => {
        const $row = $(row);
        const firstCell = $row.find('td:eq(0)').text().trim();
        if (firstCell.includes('Banco de horas anterior')) {
          previousBalanceText = $row.find('td:eq(1)').text().trim();
          debugLog(`  Method 3 (find by text): "${previousBalanceText}"`);
          return false; // break
        }
      });
    }
    
    debugLog(`  Final previousBalanceText: "${previousBalanceText}"`);
    const saldoBHoras = GrifoUtils.diffHoraMsec(previousBalanceText);
    debugLog(`  saldoBHoras (in msec): ${saldoBHoras} (${GrifoUtils.formatMsec(saldoBHoras)})`);
    
    const saldoCurrentCalc = saldoHorarioMes - this.state.saldoJornadaAcumHj;
    debugLog(`  saldoCurrentCalc: ${GrifoUtils.formatMsec(saldoCurrentCalc)}`);

    // Remove existing container and store position
    let top = '10px';
    let left = 'calc(50% - 150px)';
    const existingContainer = $(`#${GRIFO_CONFIG.IDS.CONTAINER_TOTAL}`);

    if (existingContainer.length) {
      const position = existingContainer.position();
      top = `${position.top}px`;
      left = `${position.left}px`;
      existingContainer.remove();
    }

    const inputMin = `<input id="${GRIFO_CONFIG.IDS.HOR_MIN}" 
                             style="font-size:12px;text-align:center" 
                             class="${GRIFO_CONFIG.CLASSES.MEU_INTERVALO}" 
                             size="4" 
                             value="${this.state.horMin || ''}" 
                             val-ant="${this.state.horMin || ''}">`;

    const inputMax = `<input id="${GRIFO_CONFIG.IDS.HOR_MAX}" 
                             style="font-size:12px;text-align:center" 
                             class="${GRIFO_CONFIG.CLASSES.MEU_INTERVALO}" 
                             size="4" 
                             value="${this.state.horMax || ''}" 
                             val-ant="${this.state.horMax || ''}">`;

    const faltaSobra = saldoJornadaMesAt > saldoHorarioMes ? 'Falta' : 'Sobra';
    const colorDiff = saldoJornadaMesAt - saldoHorarioMes > 0 ?
      GRIFO_CONFIG.COLORS.ERROR :
      GRIFO_CONFIG.COLORS.SUCCESS;

    const colorCurrent = saldoCurrentCalc < 0 ?
      GRIFO_CONFIG.COLORS.ERROR :
      GRIFO_CONFIG.COLORS.SUCCESS;

    const colorFinal = saldoHorarioMes - saldoJornadaMesAt + saldoBHoras < 0 ?
      GRIFO_CONFIG.COLORS.ERROR :
      GRIFO_CONFIG.COLORS.SUCCESS;

    const colorBanco = saldoBHoras < 0 ?
      GRIFO_CONFIG.COLORS.ERROR :
      GRIFO_CONFIG.COLORS.SUCCESS;

    const containerHTML = `
      <div id="${GRIFO_CONFIG.IDS.CONTAINER_TOTAL}" 
        style="position:fixed;z-index:99999;left:${left};cursor:move;top:${top};
                  width:300px;padding:20px;background-color:${GRIFO_CONFIG.COLORS.HIGHLIGHT};
                  opacity:0.9;line-height:30px;font-weight:bold;font-size:15px;border-radius:5px">
        <span style="font-size:20px;color:${GRIFO_CONFIG.COLORS.PRIMARY};padding:20px">
          <img style="height:30px;float:left" src="${GRIFO_CONFIG.LOGO_SVG}">
          Grifo Check
        </span>
        <br>
        <spam style="padding:20px">Jornada: ${GrifoUtils.formatMsec(saldoJornadaMesAt)}</spam>
        <br>
        <div>Limite: ${inputMin}&nbsp;-&nbsp;${inputMax}</div>
        <br>
        <div style="border-top:2px solid #0012FF;border-bottom:2px solid #0012FF;font-weight:normal">
          Até o momento você esteve presente por 
          <span style="font-weight:bold">${GrifoUtils.formatMsec(saldoHorarioMes)}h</span>
          ${this.state.saldoJornadaAcumHj !== 0 ? `
            de um total de <span style="font-weight:bold">${GrifoUtils.formatMsec(this.state.saldoJornadaAcumHj)}h</span>.
            <br>
            <span style="font-weight:bold;color:${GRIFO_CONFIG.COLORS.SECONDARY}">Seu saldo corrente é </span>
            <span style="font-weight:bold;text-decoration:underline;color:${colorCurrent}">
              ${saldoCurrentCalc < 0 ? '' : '+'}${GrifoUtils.formatMsec(saldoCurrentCalc)}h
            </span>
          ` : ''}
        </div>
        <br>
        ${faltaSobra}: <span style="color:${colorDiff}">
          ${GrifoUtils.formatMsec(saldoHorarioMes - saldoJornadaMesAt)}
        </span> [${this.state.totalDias - this.state.idxHoje} dia(s)]
        ${saldoBHoras ? `
          <br>
          <span style="color:${GRIFO_CONFIG.COLORS.SECONDARY}">
            Banco horas: <span style="color:${colorBanco}">
              ${previousBalanceText}
            </span>
          </span>
          <br>
          <span style="color:${GRIFO_CONFIG.COLORS.SECONDARY}">
            Saldo final: <span style="color:${colorFinal}">
              ${GrifoUtils.formatMsec(saldoHorarioMes - saldoJornadaMesAt + saldoBHoras)}
            </span>
          </span>
        ` : ''}
        ${cntErro > 0 ? `
          <br>
          <span style="color:${GRIFO_CONFIG.COLORS.ERROR}">
            Corrigir: ${cntErro}
          </span>
        ` : ''}
        <br><br>
        <a style="padding:3px;background-color:#0012FF;color:#FFF;cursor:pointer" 
           id="${GRIFO_CONFIG.IDS.BTN_RELOAD}">
          Recalcular
        </a>
      </div>
    `;

    const tableHeader = GrifoUtils.safeSelect(GRIFO_CONFIG.SELECTORS.TABLE_HEADER);
    if (tableHeader) {
      tableHeader.append(containerHTML);
    }

    $(`#${GRIFO_CONFIG.IDS.CONTAINER_TOTAL}`).draggable();

    // Debug summary
    debugLog('\\n--- CALCULATION SUMMARY ---');
    debugLog(`  Jornada Total: ${GrifoUtils.formatMsec(saldoJornadaMesAt)}`);
    debugLog(`  Horas Trabalhadas: ${GrifoUtils.formatMsec(saldoHorarioMes)}`);
    debugLog(`  Jornada Acumulada até Hoje: ${GrifoUtils.formatMsec(this.state.saldoJornadaAcumHj)}`);
    debugLog(`  Saldo Corrente: ${GrifoUtils.formatMsec(saldoCurrentCalc)}`);
    debugLog(`  ${faltaSobra}: ${GrifoUtils.formatMsec(saldoHorarioMes - saldoJornadaMesAt)}`);
    debugLog(`  Banco de Horas Anterior: ${previousBalanceText} (${GrifoUtils.formatMsec(saldoBHoras)})`);
    debugLog(`  Saldo Final: ${GrifoUtils.formatMsec(saldoHorarioMes - saldoJornadaMesAt + saldoBHoras)}`);
    debugLog(`  Erros: ${cntErro}`);
    debugLog('=== executaCalculo END ===\\n');

    this.setupEventHandlers();
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

        if (event.keyCode === 13) { // Enter key
          $(`#${GRIFO_CONFIG.IDS.BTN_RELOAD}`).click();
        }
      });
    });

    $(`.${GRIFO_CONFIG.CLASSES.MEU_INTERVALO}`).each((index, elem) => {
      const $elem = $(elem);
      $elem.mask('00:00');

      $elem.off('keyup').on('keyup', (event) => {
        if (event.keyCode === 13) { // Enter key
          this.redefineIntervalo();
        }
      });
    });
  }

  /**
   * Redefine work time interval limits
   */
  redefineIntervalo() {
    const horMinInput = $(`#${GRIFO_CONFIG.IDS.HOR_MIN}`);
    const horMaxInput = $(`#${GRIFO_CONFIG.IDS.HOR_MAX}`);

    if (!horMinInput.length || !horMaxInput.length) return;

    const newMin = horMinInput.val();
    const newMax = horMaxInput.val();

    this.state.horMin = newMin === this.state.horMin ? this.state.horMin : newMin;
    this.state.horMax = newMax === this.state.horMax ? this.state.horMax : newMax;

    // Ensure max is greater than min
    if (GrifoUtils.diffDate('00:00', this.state.horMax) <=
      GrifoUtils.diffDate('00:00', this.state.horMin)) {
      this.state.horMax = GrifoUtils.formatMsec(
        GrifoUtils.diffDate('00:00', this.state.horMin) + GRIFO_CONFIG.TIME.ONE_HOUR
      );
    }

    // Clear inputs that match old limits
    const oldMin = horMinInput.attr('val-ant');
    const oldMax = horMaxInput.attr('val-ant');

    $(`.${GRIFO_CONFIG.CLASSES.MEU_PONTO}[value="${oldMin}"]`).val('');
    $(`.${GRIFO_CONFIG.CLASSES.MEU_PONTO}[value="${oldMax}"]`).val('');

    this.setConfigCookie({
      hor_min: this.state.horMin,
      hor_max: this.state.horMax
    });

    $(`#${GRIFO_CONFIG.IDS.BTN_RELOAD}`).click();
  }

  /**
   * Auto-fill time entries for days with "Teletrabalho" observation
   * Checks each day's observation and if "Teletrabalho" is found,
   * fills the empty time boxes with the schedule times
   */
  autoFillTeletrabalho() {
    debugLog('\\n=== Starting autoFillTeletrabalho ===');
    
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
          debugLog(`\\n  Row ${contador}: ✓ TELETRABALHO FOUND`);
          
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
    
    this.saveCookieInputValues();
    
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
    debugLog(`  Result - cnt_erro: ${arrResultH.cnt_erro}, cnt_hoje: ${arrResultH.cnt_hoje}`);

    // Auto-fill time entries for days with Teletrabalho observation
    this.autoFillTeletrabalho();

    this.executaCalculo(
      arrResultJ.saldoJornadaMesAt,
      arrResultJ.saldoCurrent,
      arrResultH.saldoHorarioMes,
      arrResultH.cnt_erro,
      arrResultH.cnt_hoje
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
    }, 1000);
  });
} else {
  console.error('Grifo Check: jQuery is not loaded');
}
