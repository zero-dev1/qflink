/**
 * Unread message tracker - stores last-read timestamps in localStorage
 * Only counts messages from OTHER users as unread (never your own)
 */

import { useWalletStore } from '@/stores/wallet'

const STORAGE_KEY_PREFIX = 'qflink_lastread_'
const DM_STORAGE_KEY_PREFIX = 'qflink_dm_lastread_'

// ============================================================
// Pod Unread Tracking
// ============================================================

/**
 * Mark a pod as read by storing the current timestamp
 */
export function markPodAsRead(podId: number): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${podId}`, String(Date.now()))
  } catch {
    // Ignore localStorage errors (e.g., quota exceeded)
  }
}

/**
 * Get the stored last-read timestamp for a pod
 */
export function getLastReadTimestamp(podId: number): number {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${podId}`)
    return stored ? Number(stored) : 0
  } catch {
    return 0
  }
}

interface Message {
  sender: string
  timestamp: number
}

/**
 * Calculate unread count for a pod
 * Only counts messages from OTHER users (not your own)
 * @param podId - The pod ID
 * @param messages - Array of messages with sender and timestamp
 * @returns Number of unread messages from other users
 */
export function getUnreadCount(podId: number, messages: Message[]): number {
  const { evmAddress } = useWalletStore.getState()
  if (!evmAddress) return 0

  const myAddress = evmAddress.toLowerCase()
  const lastRead = getLastReadTimestamp(podId)
  
  // If no stored value, treat all messages from others as unread on first visit
  if (lastRead === 0) {
    return messages.filter(m => m.sender.toLowerCase() !== myAddress).length
  }
  
  // Count messages from OTHER users that arrived after last read
  return messages.filter(
    m => m.sender.toLowerCase() !== myAddress && m.timestamp > lastRead
  ).length
}

// ============================================================
// DM (Direct Message) Unread Tracking
// ============================================================

/**
 * Mark a DM conversation as read by storing the current timestamp
 */
export function markConversationAsRead(conversationId: string): void {
  try {
    localStorage.setItem(`${DM_STORAGE_KEY_PREFIX}${conversationId.toLowerCase()}`, String(Date.now()))
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get the stored last-read timestamp for a DM conversation
 */
export function getDMLastReadTimestamp(conversationId: string): number {
  try {
    const stored = localStorage.getItem(`${DM_STORAGE_KEY_PREFIX}${conversationId.toLowerCase()}`)
    return stored ? Number(stored) : 0
  } catch {
    return 0
  }
}

/**
 * Calculate unread count for a DM conversation
 * Only counts messages from OTHER users (not your own)
 * @param conversationId - The other user's address
 * @param messages - Array of messages with sender and timestamp
 * @returns Number of unread messages from other users
 */
export function getDMUnreadCount(conversationId: string, messages: Message[]): number {
  const { evmAddress } = useWalletStore.getState()
  if (!evmAddress) return 0

  const myAddress = evmAddress.toLowerCase()
  const lastRead = getDMLastReadTimestamp(conversationId)
  
  // If no stored value, treat all messages from others as unread on first visit
  if (lastRead === 0) {
    return messages.filter(m => m.sender.toLowerCase() !== myAddress).length
  }
  
  // Count messages from OTHER users that arrived after last read
  return messages.filter(
    m => m.sender.toLowerCase() !== myAddress && m.timestamp > lastRead
  ).length
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
