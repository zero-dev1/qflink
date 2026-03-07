/**
 * Unread message tracker - stores last-read message counts in localStorage
 */

const STORAGE_KEY_PREFIX = 'qflink_lastread_'
const DM_STORAGE_KEY_PREFIX = 'qflink_dm_lastread_'

// ============================================================
// Pod Unread Tracking
// ============================================================

/**
 * Mark a pod as read by storing its current message count
 */
export function markPodAsRead(podId: number, messageCount: number): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${podId}`, String(messageCount))
  } catch {
    // Ignore localStorage errors (e.g., quota exceeded)
  }
}

/**
 * Get the stored last-read message count for a pod
 */
export function getLastReadCount(podId: number): number {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${podId}`)
    return stored ? Number(stored) : 0
  } catch {
    return 0
  }
}

/**
 * Calculate unread count for a pod
 * @param podId - The pod ID
 * @param currentMessageCount - Current total message count for the pod
 * @returns Number of unread messages (0 if none or negative)
 */
export function getUnreadCount(podId: number, currentMessageCount: number): number {
  const lastRead = getLastReadCount(podId)
  
  // If no stored value, treat all messages as unread on first visit
  if (lastRead === 0) {
    return currentMessageCount
  }
  
  const unread = currentMessageCount - lastRead
  return Math.max(0, unread)
}

// ============================================================
// DM (Direct Message) Unread Tracking
// ============================================================

/**
 * Mark a DM conversation as read by storing its current message count
 */
export function markConversationAsRead(conversationId: string, messageCount: number): void {
  try {
    localStorage.setItem(`${DM_STORAGE_KEY_PREFIX}${conversationId.toLowerCase()}`, String(messageCount))
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get the stored last-read message count for a DM conversation
 */
export function getDMLastReadCount(conversationId: string): number {
  try {
    const stored = localStorage.getItem(`${DM_STORAGE_KEY_PREFIX}${conversationId.toLowerCase()}`)
    return stored ? Number(stored) : 0
  } catch {
    return 0
  }
}

/**
 * Calculate unread count for a DM conversation
 * @param conversationId - The other user's address
 * @param currentMessageCount - Current total message count for the conversation
 * @returns Number of unread messages (0 if none or negative)
 */
export function getDMUnreadCount(conversationId: string, currentMessageCount: number): number {
  const lastRead = getDMLastReadCount(conversationId)
  
  // If no stored value, treat all messages as unread on first visit
  if (lastRead === 0) {
    return currentMessageCount
  }
  
  const unread = currentMessageCount - lastRead
  return Math.max(0, unread)
}

// ============================================================
// Clear All Tracking
// ============================================================

/**
 * Clear all unread tracking data (e.g., on logout)
 */
export function clearAllUnreadTracking(): void {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_KEY_PREFIX) || key.startsWith(DM_STORAGE_KEY_PREFIX))
      .forEach(key => localStorage.removeItem(key))
  } catch {
    // Ignore errors
  }
}
