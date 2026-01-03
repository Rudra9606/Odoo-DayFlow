const Counter = require('../models/Counter');

/**
 * Generate auto-generated user ID
 * Format: CCFN LN YYYY SSSS
 * - CC: First 2 letters of company (uppercase, padded with X)
 * - FN: First 2 letters of first name (uppercase, padded with X)
 * - LN: First 2 letters of last name (uppercase, padded with X)
 * - YYYY: Joining year
 * - SSSS: Sequential number (0001-9999) unique per company+year
 *
 * @param {string} company - Company name
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @param {number} joinYear - Joining year (YYYY)
 * @returns {string} Generated user ID
 */
async function generateUserId(company, firstName, lastName, joinYear) {
  try {
    // Normalize and extract first 2 letters
    const normalize = (str) => {
      // Remove non-alphabetic characters and uppercase
      const clean = str.replace(/[^a-zA-Z]/g, '').toUpperCase();
      // Take first 2 letters, pad with X if shorter
      return (clean.substring(0, 2) + 'XX').substring(0, 2);
    };

    const companyCode = normalize(company);
    const firstNameCode = normalize(firstName);
    const lastNameCode = normalize(lastName);

    // Get next sequence number atomically
    const counterKey = `${companyCode}_${joinYear}`;
    const counter = await Counter.getNextSequence(counterKey);

    // Format sequential number as 4-digit zero-padded
    const seqStr = counter.seq.toString().padStart(4, '0');

    // Combine all parts
    const userId = `${companyCode}${firstNameCode}${lastNameCode}${joinYear}${seqStr}`;

    return userId;
  } catch (error) {
    console.error('Error generating user ID:', error);
    throw new Error('Failed to generate user ID');
  }
}

module.exports = {
  generateUserId
};