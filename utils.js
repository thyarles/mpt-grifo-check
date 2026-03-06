'use strict';

/**
 * Utility functions for Grifo Check extension
 */
const GrifoUtils = {
  /**
   * Calculate time difference between two times in milliseconds
   * @param {string} time1 - First time in format "HH:mm"
   * @param {string} time2 - Second time in format "HH:mm"
   * @returns {number} Difference in milliseconds
   */
  diffDate(time1, time2) {
    try {
      const baseDate = '2015-08-05';
      const date1 = new Date(`${baseDate} ${time1}:00`);
      const date2 = new Date(`${baseDate} ${time2}:00`);
      return date2.getTime() - date1.getTime();
    } catch (error) {
      console.error('Error calculating time difference:', error);
      return 0;
    }
  },

  /**
   * Convert time string with optional negative sign to milliseconds
   * @param {string} timeStr - Time string (e.g., "-08:30", "08:30", or "39:57")
   * @returns {number} Time in milliseconds (negative if time was negative)
   */
  diffHoraMsec(timeStr) {
    try {
      if (!timeStr || timeStr.trim() === '') return 0;
      
      const factor = timeStr.indexOf('-') !== -1 ? -1 : 1;
      const cleanTime = factor < 0 ? timeStr.substring(1).trim() : timeStr.trim();
      
      // Parse HH:mm manually to support hours > 23
      const timeParts = cleanTime.split(':');
      if (timeParts.length !== 2) return 0;
      
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      if (isNaN(hours) || isNaN(minutes)) return 0;
      
      // Convert to milliseconds
      const totalMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
      const result = totalMs * factor;
      
      // Debug logging (if DEBUG is defined globally)
      if (typeof DEBUG !== 'undefined' && DEBUG) {
        console.log(`[Grifo Debug] diffHoraMsec: "${timeStr}" → ${hours}h ${minutes}m → ${result}ms (${this.formatMsec(result)})`);
      }
      
      return result;
    } catch (error) {
      console.error('Error converting time to milliseconds:', error);
      return 0;
    }
  },

  /**
   * Add milliseconds to a time string
   * @param {string} time - Time in format "HH:mm"
   * @param {number} msec - Milliseconds to add
   * @returns {number} New time as timestamp
   */
  sumDateMsec(time, msec) {
    try {
      const baseDate = '2015-08-05';
      const date = new Date(`${baseDate} ${time}:00`);
      return date.getTime() + msec;
    } catch (error) {
      console.error('Error adding milliseconds to time:', error);
      return 0;
    }
  },

  /**
   * Format milliseconds to time string
   * @param {number} msec - Milliseconds (can be negative)
   * @returns {string} Formatted time "HH:mm"
   */
  formatMsec(msec) {
    const sign = msec < 0 ? '-' : '';
    const absMsec = Math.abs(msec);
    
    const hours = Math.floor(absMsec / (1000 * 60 * 60));
    const minutes = Math.floor((absMsec % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${sign}${this.pad(hours, 2)}:${this.pad(minutes, 2)}`;
  },

  /**
   * Pad number with zeros
   * @param {number} num - Number to pad
   * @param {number} width - Desired width
   * @param {string} char - Character to pad with (default '0')
   * @returns {string} Padded string
   */
  pad(num, width, char = '0') {
    const numStr = String(num);
    return numStr.length >= width 
      ? numStr 
      : new Array(width - numStr.length + 1).join(char) + numStr;
  },

  /**
   * Format date/time based on format string
   * @param {number|Date} time - Date object or timestamp
   * @param {string} format - Format string (yyyy, yy, MM, dd, HH, mm, ss)
   * @returns {string} Formatted date string
   */
  formatDate(time, format) {
    const date = new Date(time);
    const formatters = {
      yyyy: () => this.pad(date.getFullYear(), 4),
      yy: () => String(date.getFullYear()).substring(2, 4),
      MM: () => this.pad(date.getMonth() + 1, 2),
      mm: () => this.pad(date.getMinutes(), 2),
      dd: () => this.pad(date.getDate(), 2),
      HH: () => this.pad(date.getHours(), 2),
      ss: () => this.pad(date.getSeconds(), 2)
    };

    return format.replace(/yyyy|yy|MM|dd|HH|mm|ss/g, match => 
      formatters[match] ? formatters[match]() : match
    );
  },

  /**
   * Trim all strings in an array
   * @param {string[]} arr - Array of strings
   * @returns {string[]} Array with trimmed strings
   */
  trimArray(arr) {
    return arr.map(item => item.trim());
  },

  /**
   * Cookie management utilities
   */
  cookies: {
    /**
     * Set cookie with JSON data
     * @param {Array} data - Data to store
     * @param {string} cookieId - Cookie identifier
     * @returns {boolean} Success status
     */
    set(data, cookieId) {
      try {
        const jsonString = JSON.stringify(data);
        Cookies.remove(cookieId);
        Cookies.set(cookieId, jsonString, { expires: GRIFO_CONFIG.TIME.COOKIE_EXPIRY_DAYS });
        return true;
      } catch (error) {
        console.error('Error setting cookie:', error);
        return false;
      }
    },

    /**
     * Get cookie and parse JSON
     * @param {string} cookieId - Cookie identifier
     * @returns {Array} Parsed data or empty array
     */
    get(cookieId) {
      try {
        const cookieValue = Cookies.get(cookieId);
        return cookieValue ? JSON.parse(cookieValue) : [];
      } catch (error) {
        console.error('Error getting cookie:', error);
        return [];
      }
    }
  },

  /**
   * Safe DOM element selector with error handling
   * @param {string} selector - jQuery selector
   * @returns {jQuery|null} jQuery object or null
   */
  safeSelect(selector) {
    try {
      const element = $(selector);
      if (element.length <= 0) {
        console.warn(`Wrong select element: ${selector}`);
      }
      return element.length > 0 ? element : null;
    } catch (error) {
      console.error(`Error selecting element: ${selector}`, error);
      return null;
    }
  },

  /**
   * Check if time string matches valid format
   * @param {string} time - Time string to validate
   * @returns {boolean} True if valid time format
   */
  isValidTime(time) {
    return GRIFO_CONFIG.PATTERNS.TIME_FORMAT.test(time);
  },

  /**
   * Get text from element safely
   * @param {jQuery} element - jQuery element
   * @returns {string} Trimmed text or empty string
   */
  safeText(element) {
    try {
      return element && element.length > 0 ? element.text().trim() : '';
    } catch (error) {
      console.error('Error getting element text:', error);
      return '';
    }
  }
};
