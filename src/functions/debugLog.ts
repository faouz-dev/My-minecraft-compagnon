import { isDebug } from "../constants/isDebug";

export function debugLog(message: string) {
  if (message && isDebug) {
    console.log(message);
  }
}
