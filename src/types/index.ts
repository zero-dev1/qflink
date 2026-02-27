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
  source: 'talisman' | 'polkadot-js' | 'subwallet'
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
export type PodTier = 'standard' | 'premium' | 'elite'
export type PodTierNumeric = 0 | 1 | 2
export type JoinMethod = 'balance' | 'invite'
export type PodCategory = 'trading' | 'builders' | 'nfts' | 'macro' | 'meme'

export const POD_CATEGORIES: PodCategory[] = ['trading', 'builders', 'nfts', 'macro', 'meme']

export const POD_TIER_INFO: Record<PodTier, {
  name: string
  fee: bigint
  feeDisplay: number
  maxMembers: number
  features: string[]
}> = {
  standard: { name: 'Standard', fee: BigInt('500000000000000000000'), feeDisplay: 500, maxMembers: 100, features: ['Up to 100 members', 'Balance or invite gating', 'Basic chat'] },
  premium: { name: 'Premium', fee: BigInt('5000000000000000000000'), feeDisplay: 5000, maxMembers: 250, features: ['Up to 250 members', 'All Standard features', 'Priority support'] },
  elite: { name: 'Elite', fee: BigInt('50000000000000000000000'), feeDisplay: 50000, maxMembers: Infinity, features: ['Unlimited members', 'All Premium features', 'Featured placement', 'Verified badge'] },
}

export interface DefaultPod {
  id: number
  name: string
  minBalance: bigint
  maxBalance?: bigint
  description: string
  memberCount: number
  isDefault: true
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
}

export type Pod = DefaultPod | CustomPod

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
  walletType: WalletType
  connect: (selectedAccount?: any) => Promise<void>
  connectMetaMask: () => Promise<void>
  silentConnectMetaMask: () => Promise<boolean>
  finalizeMetaMaskConnection: (evmAddress: string) => Promise<void>
  disconnect: () => Promise<void>
  ensureMapping: () => Promise<string>
  setBalance: (balance: bigint) => void
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
  isLoading: boolean
  setPods: (pods: Pod[]) => void
  setMyPods: (pods: Pod[]) => void
  setDefaultPods: (pods: DefaultPod[]) => void
  setActivePod: (id: number | null) => void
  addPod: (pod: Pod) => void
  addPodMessage: (message: PodMessage) => void
  setPodMessages: (podId: number, messages: PodMessage[]) => void
  setPodMembers: (podId: number, members: string[]) => void
  setLoading: (loading: boolean) => void
  fetchPods: () => Promise<void>
  fetchPodMessages: (podId: number) => Promise<void>
  sendPodMessage: (podId: number, content: string) => Promise<void>
  checkAccess: (podId: number, address: string) => Promise<boolean>
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
