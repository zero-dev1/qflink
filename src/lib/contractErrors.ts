/**
 * Decode contract errors from PAPI transaction results.
 */
export function decodeContractError(error: unknown): string | null {
  const str = String(error);

  // PAPI dispatch error
  if (error && typeof error === "object" && "type" in (error as any)) {
    return (error as any).type;
  }

  // viem-style custom error in string
  const customErrorMatch = str.match(/reverted with.*?(\w+)\(\)/);
  if (customErrorMatch) return customErrorMatch[1];

  const revertReasonMatch = str.match(/reverted with the following reason:\s*(.+?)(?:\n|$)/);
  if (revertReasonMatch) return revertReasonMatch[1].trim();

  if (error && typeof error === "object" && "shortMessage" in error) {
    const shortMsg = (error as any).shortMessage as string;
    const errMatch = shortMsg?.match(/reverted with.*?(\w+)\(\)/);
    if (errMatch) return errMatch[1];
  }

  return null;
}

export const CONTRACT_ERRORS: Record<string, string> = {
  ChainMismatch: "Please switch your wallet to QF Network",
  UserExists: "User already registered",
  UserNotFound: "User not registered",
  InvalidName: "Display name is invalid",
  PodNotFound: "Pod not found",
  AlreadyMember: "You are already a member of this pod",
  NotMember: "You are not a member of this pod",
  Banned: "You are banned from this pod",
  NotCreator: "Only the pod creator can perform this action",
  CreatorCantLeave: "Pod creators cannot leave their own pod",
  InvalidFee: "Incorrect fee amount",
  Unauthorized: "You are not authorized to perform this action",
  NotPodMember: "You must be a pod member to send messages",
  SelfMessage: "Cannot send a message to yourself",
  EmptyContent: "Message content cannot be empty",
  InsufficientCreationFee: "Insufficient creation fee — 500 QF required",
  InsufficientBalance: "Insufficient QF balance for this action",
  NotAuthorized: "You are not authorized to perform this action",
  PodFull: "This pod is full",
  AlreadyBanned: "This user is already banned",
  NotBanned: "This user is not banned",
  AlreadyMod: "This user is already a moderator",
  NotMod: "This user is not a moderator",
  InsufficientEntryFee: "Entry fee amount is incorrect",
  ContentTooLong: "Message content exceeds maximum length",
};

export function getContractErrorMessage(error: unknown): string {
  // Check for user rejection first
  const errStr = String(error);
  if (errStr.includes('Cancelled') || errStr.includes('Rejected') || errStr.includes('rejected')) {
    return 'Transaction cancelled';
  }

  const raw = decodeContractError(error);
  if (!raw) return "Transaction failed — please try again";
  return CONTRACT_ERRORS[raw] ?? `Contract error: ${raw}`;
}
