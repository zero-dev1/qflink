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
  ChainMismatch: "Switch your wallet to QF Network and try again",
  UserExists: "You’re already registered — you’re good to go",
  UserNotFound: "Register your profile first to continue",
  InvalidName: "That name isn’t valid — try a different one",
  PodNotFound: "This pod doesn’t exist anymore",
  AlreadyMember: "You’re already in this pod — open it from your sidebar",
  NotMember: "Join this pod first to interact",
  Banned: "You’ve been removed from this pod by the creator",
  NotCreator: "Only the pod creator can do this",
  CreatorCantLeave: "Creators can’t leave their own pod",
  InvalidFee: "Fee amount doesn’t match — refresh and try again",
  Unauthorized: "You don’t have permission for this action",
  NotPodMember: "Join this pod to send messages",
  SelfMessage: "You can’t message yourself",
  EmptyContent: "Type a message first",
  InsufficientCreationFee: "Not enough QF for the creation fee — check your balance",
  InsufficientBalance: "Not enough QF — top up your balance and try again",
  NotAuthorized: "You don’t have permission for this action",
  PodFull: "This pod is at capacity",
  AlreadyBanned: "This user is already banned",
  NotBanned: "This user isn’t banned",
  AlreadyMod: "Already a moderator",
  NotMod: "Not a moderator",
  InsufficientEntryFee: "Entry fee doesn’t match — refresh and try again",
  ContentTooLong: "Message is too long — keep it under the limit",
  Module: "Something went wrong — try again in a moment",
};

export function getContractErrorMessage(error: unknown): string {
  // Check for user rejection first
  const errStr = String(error);
  if (errStr.includes('Cancelled') || errStr.includes('Rejected') || errStr.includes('rejected')) {
    return 'Transaction cancelled';
  }

  const raw = decodeContractError(error);
  if (!raw) return "Something went wrong — try again in a moment";
  return CONTRACT_ERRORS[raw] ?? "Something went wrong — try again in a moment";
}
