/**
 * The last shipping address is remembered on this device to speed up the next
 * checkout. It is personal data, so it is forgotten when the session ends —
 * the next person on a shared computer must not see it.
 */
export const LAST_ADDRESS_KEY = 'zale.lastAddress'

export function forgetSavedAddress() {
  try {
    localStorage.removeItem(LAST_ADDRESS_KEY)
  } catch {
    /* storage unavailable */
  }
}
