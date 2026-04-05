/**
 * Contract addresses — EVM hex addresses used in ABI encoding.
 * Passed to Binary.fromHex() when calling ReviveApi.
 */
export const CONTRACT_ADDRESSES = {
  registry: (import.meta.env.VITE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsStorage: (import.meta.env.VITE_PODS_STORAGE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsCreate: (import.meta.env.VITE_PODS_CREATE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsCreatePaid: (import.meta.env.VITE_PODS_CREATE_PAID_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsJoin: (import.meta.env.VITE_PODS_JOIN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsLeave: (import.meta.env.VITE_PODS_LEAVE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsBan: (import.meta.env.VITE_PODS_BAN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsAddMod: (import.meta.env.VITE_PODS_ADDMOD_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsRemoveMod: (import.meta.env.VITE_PODS_REMOVEMOD_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsAdmin: (import.meta.env.VITE_PODS_ADMIN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsReader: (import.meta.env.VITE_PODS_READER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  podsGetPod: (import.meta.env.VITE_PODS_GETPOD_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  payments: (import.meta.env.VITE_PAYMENTS_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  contentStore: (import.meta.env.VITE_CONTENT_STORE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  messageIndex: (import.meta.env.VITE_MESSAGE_INDEX_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  messageWriter: (import.meta.env.VITE_MESSAGE_WRITER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  messageReader: (import.meta.env.VITE_MESSAGE_READER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  qnsResolver: (import.meta.env.VITE_QNS_RESOLVER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  qnsRegistrar: (import.meta.env.VITE_QNS_REGISTRAR_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  qnsBadgeRegistry: (import.meta.env.VITE_QNS_BADGE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
} as const;
