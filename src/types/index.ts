// ── Network ──
export type Network = 'local' | 'mainnet'

export interface NetworkConfig {
  id: Network
  name: string
  rpcUrl: string
  explorerUrl?: string
}

// ── Theme ──
export type Theme = 'light' | 'dark' | 'system'
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// ── Wallet ──
export interface WalletAccount {
  address: string
  name?: string
  source: 'metamask'
}

export interface LinkedWallet {
  address: string
  balance: bigint
  isPrimary: boolean
}

export interface UserProfile {
  primaryWallet: string
  displayName?: string
  linkedWallets: LinkedWallet[]
  aggregateBalance: bigint
  publicKey: Uint8Array
  createdAt: number
}

// ── Pods ──
export type PodTier = 'free' | 'pro'
export type PodTierNumeric = 0 | 1
export type JoinMethod = 'balance' | 'invite' | 'payment'
export type PodCategory = 'trading' | 'tokens' | 'nfts' | 'defi' | 'gaming' | 'builders' | 'social' | 'alpha'

export const POD_CATEGORIES: PodCategory[] = ['trading', 'tokens', 'nfts', 'defi', 'gaming', 'builders', 'social', 'alpha']

export const POD_TIER_INFO: Record<PodTier, {
  name: string
  creationFee: bigint
  creationFeeDisplay: number
  maxMembers: number
  maxMods: number
  features: string[]
}> = {
  free: { 
    name: 'Free', 
    creationFee: BigInt(0), 
    creationFeeDisplay: 0, 
    maxMembers: 50, 
    maxMods: 1,
    features: ['Up to 50 members', '1 moderator', 'No entry fees', 'Balance-based access'] 
  },
  pro: { 
    name: 'Pro', 
    creationFee: BigInt('500000000000000000000'), // 500 QF
    creationFeeDisplay: 500, 
    maxMembers: Infinity, 
    maxMods: 3,
    features: ['Unlimited members', '3 moderators', 'Entry fees allowed', 'All access types', 'Verified badge'] 
  },
}

export interface DefaultPod {
  id: number
  name: string
  minBalance: bigint
  maxBalance?: bigint
  description: string
  memberCount: number
  isDefault: true
  tier?: number  // 0=Free, 1=Pro
  entryFee?: bigint
  payoutWallet?: string
}

export interface CustomPod {
  id: number
  name: string
  description: string
  creator: string
  createdAt: number
  tier: PodTier
  maxMembers: number
  memberCount: number
  joinMethod: JoinMethod
  tokenAddress?: string
  minBalance?: bigint
  category: PodCategory
  isActive: boolean
  isDefault: false
  entryFee?: bigint
  payoutWallet?: string
}

export type Pod = DefaultPod | CustomPod

// Access check result codes
export type PodAccessCode = 
  | 0   // granted
  | 1   // pod-banned
  | 2   // globally banned
  | 3   // insufficient balance
  | 4   // payment required
  | 5   // locked (threshold=0 and fee=0)
  | 6   // free pod full (50 members)
  | 255 // error

export interface PodMember {
  address: string
  displayName?: string
  balance: bigint
  joinedAt: number
}

export interface FeeStats {
  totalTreasuryReceived: bigint
  totalBurned: bigint
  standardPodsCreated: number
  premiumPodsCreated: number
  elitePodsCreated: number
}

// ── Messages ──
export interface EncryptedMessage {
  id: string
  sender: string
  encryptedContent: Uint8Array
  nonce: Uint8Array
  timestamp: number
}

export interface DecryptedMessage {
  id: string
  sender: string
  senderName?: string
  content: string
  timestamp: number
  isMine: boolean
}

export interface Message {
  id: string
  sender: string
  recipient: string
  encryptedContent: Uint8Array
  decryptedContent?: string
  timestamp: number
}

export interface PodMessage {
  id: string
  podId: number
  sender: string
  content: string
  timestamp: number
}

export interface Conversation {
  address: string
  displayName?: string
  lastMessage?: string
  lastMessageTime?: number
  unreadCount: number
}

// ── Store Types ──
export type WalletType = 'substrate' | 'evm' | null

export interface WalletState {
  address: string | null
  balance: bigint
  isConnected: boolean
  isConnecting: boolean
  walletSource: string | null
  encryptionKeyPair: {
    publicKey: Uint8Array
    secretKey: Uint8Array
  } | null
  linkedWallets: LinkedWallet[]
  evmAddress: string | null
  accountMapped: boolean
  isMappingAccount: boolean
  walletType: WalletType
  connect: (selectedAccount?: any) => Promise<void>
  connectMetaMask: () => Promise<void>
  silentConnectMetaMask: () => Promise<boolean>
  finalizeMetaMaskConnection: (evmAddress: string) => Promise<void>
  disconnect: () => Promise<void>
  ensureMapping: () => Promise<string>
  setBalance: (balance: bigint) => void
  refreshBalance: () => Promise<void>
  setEncryptionKeyPair: (keyPair: { publicKey: Uint8Array; secretKey: Uint8Array }) => void
  addLinkedWallet: (wallet: LinkedWallet) => void
  removeLinkedWallet: (address: string) => void
  setEvmAddress: (evmAddress: string) => void
}

export interface MessagesState {
  conversations: Conversation[]
  messages: Record<string, Message[]>
  activeConversation: string | null
  isLoading: boolean
  setActiveConversation: (address: string | null) => void
  addMessage: (message: Message) => void
  setMessages: (address: string, messages: Message[]) => void
  setConversations: (conversations: Conversation[]) => void
  setLoading: (loading: boolean) => void
  fetchConversations: () => Promise<void>
  fetchMessages: (otherAddress: string) => Promise<void>
  sendMessage: (recipient: string, content: string) => Promise<void>
}

export interface PodsState {
  pods: Pod[]
  myPods: Pod[]
  defaultPods: DefaultPod[]
  activePod: number | null
  podMessages: Record<number, PodMessage[]>
  podMembers: Record<number, string[]>
  podMods: Record<number, string[]>
  bannedAddresses: Record<number, string[]>
  podMessageCounts: Record<number, number> // Track message counts per pod for unread indicator
  isLoading: boolean
  setPods: (pods: Pod[]) => void
  setMyPods: (pods: Pod[]) => void
  setDefaultPods: (pods: DefaultPod[]) => void
  setActivePod: (id: number | null) => void
  addPod: (pod: Pod) => void
  addPodMessage: (message: PodMessage) => void
  setPodMessages: (podId: number, messages: PodMessage[]) => void
  setPodMembers: (podId: number, members: string[]) => void
  setPodMods: (podId: number, mods: string[]) => void
  setBannedAddresses: (podId: number, addresses: string[]) => void
  setPodMessageCount: (podId: number, count: number) => void
  setLoading: (loading: boolean) => void
  fetchPods: (blockNumber?: bigint) => Promise<void>
  fetchPodMessages: (podId: number) => Promise<void>
  fetchPodMessageCount: (podId: number) => Promise<number>
  sendPodMessage: (podId: number, content: string) => Promise<void>
  checkAccess: (podId: number, address: string) => Promise<{ granted: boolean; code: number }>
  fetchPodMods: (podId: number) => Promise<string[]>
  checkIsBanned: (podId: number, address: string) => Promise<{ isBanned: boolean; isGloballyBanned: boolean }>
  checkHasPaid: (podId: number, address: string) => Promise<boolean>
}

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

export interface UIState {
  theme: Theme
  toasts: Toast[]
  isSidebarOpen: boolean
  showConnectWallet: boolean
  setTheme: (theme: Theme) => void
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setShowConnectWallet: (show: boolean) => void
}

// ── Constants ──
// Removed DEFAULT_PODS_CONFIG - all pods come from contract as const

export const LIMITS = {
  MAX_MESSAGE_LENGTH: 280,
  MAX_LINKED_WALLETS: 5,
  MAX_POD_NAME_LENGTH: 50,
  MIN_POD_NAME_LENGTH: 3,
  MAX_POD_DESCRIPTION_LENGTH: 280,
  MIN_POD_DESCRIPTION_LENGTH: 10,
  MAX_DISPLAY_NAME_LENGTH: 30,
} as const
