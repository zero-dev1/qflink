// Browser push notification utilities for QFLink

const NOTIF_ASKED_KEY = 'qflink_notif_asked'
const NOTIFICATIONS_ENABLED_KEY = 'qflink_notifications_enabled'
const COOLDOWN_MS = 30000 // 30 seconds cooldown between notifications per source

// Track last notification time per pod/conversation
const lastNotificationTimes = new Map<string, number>()

/**
 * Check if notifications are supported in this browser
 */
export function areNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Get the current notification permission state
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (!areNotificationsSupported()) {
    return null
  }
  return Notification.permission
}

/**
 * Check if notifications are enabled by the user (localStorage preference)
 */
export function areNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === 'true'
}

/**
 * Set the user's notification preference in localStorage
 */
export function setNotificationsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false')
}

/**
 * Request permission to show browser notifications.
 * Only runs if Notification API is available.
 * Returns true if permission is granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!areNotificationsSupported()) {
    return false
  }

  // Check if we've already asked
  const alreadyAsked = localStorage.getItem(NOTIF_ASKED_KEY)
  if (alreadyAsked === 'true') {
    return Notification.permission === 'granted'
  }

  try {
    const permission = await Notification.requestPermission()
    localStorage.setItem(NOTIF_ASKED_KEY, 'true')
    return permission === 'granted'
  } catch (err) {
    console.error('Failed to request notification permission:', err)
    localStorage.setItem(NOTIF_ASKED_KEY, 'true')
    return false
  }
}

/**
 * Check if we can send a notification (cooldown check)
 */
function canSendNotification(sourceId: string): boolean {
  const now = Date.now()
  const lastTime = lastNotificationTimes.get(sourceId)
  
  if (!lastTime || (now - lastTime) >= COOLDOWN_MS) {
    lastNotificationTimes.set(sourceId, now)
    return true
  }
  
  return false
}

/**
 * Send a browser notification.
 * Only fires if:
 * - User has enabled notifications in app settings (localStorage)
 * - Browser permission is granted
 * - Tab is not focused (document.hidden is true)
 * - Cooldown period has passed for this source
 */
export function sendNotification(
  title: string,
  body: string,
  sourceId: string,
  onClick?: () => void
): void {
  if (!areNotificationsSupported()) return

  // Check if user has enabled notifications in app settings
  if (!areNotificationsEnabled()) return

  // Only show if permission granted
  if (Notification.permission !== 'granted') return

  // Only show if tab is not focused
  if (!document.hidden) return

  // Check cooldown
  if (!canSendNotification(sourceId)) return

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: sourceId, // Prevents duplicate notifications with same tag
    })

    if (onClick) {
      notification.onclick = () => {
        // Focus the window
        window.focus()
        // Call the callback
        onClick()
        // Close the notification
        notification.close()
      }
    }
  } catch (err) {
    console.error('Failed to send notification:', err)
  }
}

/**
 * Clear the notification asked flag (for testing/debugging)
 */
export function clearNotificationAskedFlag(): void {
  localStorage.removeItem(NOTIF_ASKED_KEY)
}

/**
 * Clear the notification enabled flag (for testing/debugging)
 */
export function clearNotificationsEnabledFlag(): void {
  localStorage.removeItem(NOTIFICATIONS_ENABLED_KEY)
}
