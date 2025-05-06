// src/utils/shortenAddress.js

/**
 * Shortens an Ethereum address for display purposes.
 * Example: 0x1234567890abcdef1234567890abcdef12345678 -> 0x1234...5678
 * @param {string} address The full Ethereum address.
 * @param {number} chars The number of characters to show at the beginning and end. Default is 4.
 * @returns {string} The shortened address or the original if it's invalid/too short.
 */
export const shortenAddress = (address, chars = 4) => {
  if (!address || typeof address !== 'string' || address.length < (chars * 2 + 2)) { // Ensure address is valid and long enough
    return address;
  }
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
};