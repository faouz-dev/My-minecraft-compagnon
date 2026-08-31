import { isDebug } from "../constants/isDebug";

/**
 *
 * @param {string} message
 */
export function debugLog(message) {
  if (message && isDebug) {
    console.log(message);
  }
}
