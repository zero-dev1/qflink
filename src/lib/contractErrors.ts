/**
 * QFLink v1 Solidity contracts use custom errors (4-byte selectors).
 * viem decodes these via the ABI into ContractFunctionRevertedError.
 */
export function decodeContractError(error: unknown): string | null {
  const str = String(error)

  // viem custom error: "reverted with ... UserNotFound()"
  const customErrorMatch = str.match(/reverted with.*?(\w+)\(\)/)
  if (customErrorMatch) return customErrorMatch[1]

  // viem reason string (if any revert("...") still used)
  const revertReasonMatch = str.match(/reverted with the following reason:\s*(.+?)(?:\n|$)/)
  if (revertReasonMatch) return revertReasonMatch[1].trim()

  // Check shortMessage on error object
  if (error && typeof error === 'object' && 'shortMessage' in error) {
    const shortMsg = (error as any).shortMessage as string
    const errMatch = shortMsg?.match(/reverted with.*?(\w+)\(\)/)
    if (errMatch) return errMatch[1]
    const reasonMatch = shortMsg?.match(/reverted with the following reason:\s*(.+?)(?:\n|$)/)
    if (reasonMatch) return reasonMatch[1].trim()
  }

  return null
}

/**
 * Custom error names and their user-friendly messages.
 * Sourced from QFLinkRegistry.sol, QFLinkPods.sol, QFLinkMessages.sol (v1 optimized)
 */
export const CONTRACT_ERRORS: Record<string, string> = {
  // ── Wallet/Chain errors ──
  'ChainMismatch': 'Please switch your wallet to QF Network (Chain ID 42)',

  // ── Registry custom errors ──
  'UserExists': 'User already registered',
  'UserNotFound': 'User not registered',
  'InvalidName': 'Display name is invalid',

  // ── Pods custom errors ──
  'PodNotFound': 'Pod not found',
  'AlreadyMember': 'You are already a member of this pod',
  'NotMember': 'You are not a member of this pod',
  'Banned': 'You are banned from this pod',
  'NotCreator': 'Only the pod creator can perform this action',
  'CreatorCantLeave': 'Pod creators cannot leave their own pod',
  'InvalidFee': 'Incorrect fee amount',
  'Unauthorized': 'You are not authorized to perform this action',

  // ── Messages custom errors ──
  'NotPodMember': 'You must be a pod member to send messages',
  'SelfMessage': 'Cannot send a message to yourself',
  'EmptyContent': 'Message content cannot be empty',
}

export function getContractErrorMessage(error: unknown): string {
  const msg = String(error)

  // Check for chain mismatch errors first
  if (msg.includes('ChainMismatch') || msg.includes('does not match the target chain') || msg.includes('wallet chain id')) {
    return 'Please switch your wallet to QF Network (Chain ID 42)'
  }

  const raw = decodeContractError(error)
  if (!raw) return 'Transaction failed'
  return CONTRACT_ERRORS[raw] ?? `Contract error: ${raw}`
}
