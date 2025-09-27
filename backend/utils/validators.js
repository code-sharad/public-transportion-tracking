/**
 * Validation utilities for GPS and other data
 */

/**
 * Validate GPS data packet
 * @param {Object} data - GPS data object
 * @returns {boolean} - Whether the data is valid
 */
function validateGPSData(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Required fields
  const requiredFields = ['id', 'lat', 'lng'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      return false;
    }
  }

  // Validate coordinates
  if (!isValidLatitude(data.lat) || !isValidLongitude(data.lng)) {
    return false;
  }

  // Validate speed (if present)
  if ('spd' in data && (data.spd < 0 || data.spd > 150)) {
    return false;
  }

  // Validate heading (if present)
  if ('hdg' in data && (data.hdg < 0 || data.hdg > 360)) {
    return false;
  }

  // Validate HDOP (if present)
  if ('hdop' in data && (data.hdop < 0 || data.hdop > 50)) {
    return false;
  }

  // Validate satellites (if present)
  if ('sat' in data && (data.sat < 0 || data.sat > 32)) {
    return false;
  }

  return true;
}

/**
 * Check if latitude is valid
 * @param {number} lat - Latitude value
 * @returns {boolean}
 */
function isValidLatitude(lat) {
  return typeof lat === 'number' && lat >= -90 && lat <= 90;
}

/**
 * Check if longitude is valid
 * @param {number} lng - Longitude value
 * @returns {boolean}
 */
function isValidLongitude(lng) {
  return typeof lng === 'number' && lng >= -180 && lng <= 180;
}

/**
 * Validate phone number (Indian format)
 * @param {string} phone - Phone number
 * @returns {boolean}
 */
function isValidIndianPhone(phone) {
  const phoneRegex = /^(\+91|91|0)?[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate time format (HH:MM)
 * @param {string} time - Time string
 * @returns {boolean}
 */
function isValidTime(time) {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Validate bus ID format
 * @param {string} busId - Bus ID
 * @returns {boolean}
 */
function isValidBusId(busId) {
  const busIdRegex = /^BUS_\d{3}$/;
  return busIdRegex.test(busId);
}

/**
 * Validate route number format
 * @param {string} routeNumber - Route number
 * @returns {boolean}
 */
function isValidRouteNumber(routeNumber) {
  const routeRegex = /^[A-Z0-9]{1,5}$/;
  return routeRegex.test(routeNumber);
}

/**
 * Validate stop code format
 * @param {string} stopCode - Stop code
 * @returns {boolean}
 */
function isValidStopCode(stopCode) {
  const stopCodeRegex = /^[A-Z]\d{1,3}$/;
  return stopCodeRegex.test(stopCode);
}

/**
 * Sanitize user input for SMS commands
 * @param {string} input - User input
 * @returns {string} - Sanitized input
 */
function sanitizeSMSInput(input) {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^\w\s:.-]/g, '') // Allow only alphanumeric, space, colon, dot, dash
    .substring(0, 160); // SMS length limit
}

/**
 * Validate GPS accuracy for reliable tracking
 * @param {number} hdop - Horizontal Dilution of Precision
 * @param {number} satellites - Number of satellites
 * @returns {boolean} - Whether accuracy is acceptable
 */
function isAcceptableGPSAccuracy(hdop, satellites) {
  // Good GPS fix criteria
  return hdop <= 2.0 && satellites >= 4;
}

/**
 * Check if GPS data is stale
 * @param {number|Date} timestamp - Data timestamp
 * @param {number} maxAgeSeconds - Maximum age in seconds (default: 300)
 * @returns {boolean}
 */
function isStaleGPSData(timestamp, maxAgeSeconds = 300) {
  const dataTime = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const age = Date.now() - dataTime;
  return age > maxAgeSeconds * 1000;
}

module.exports = {
  validateGPSData,
  isValidLatitude,
  isValidLongitude,
  isValidIndianPhone,
  isValidTime,
  isValidBusId,
  isValidRouteNumber,
  isValidStopCode,
  sanitizeSMSInput,
  isAcceptableGPSAccuracy,
  isStaleGPSData
};