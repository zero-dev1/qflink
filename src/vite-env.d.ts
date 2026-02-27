/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_NETWORK: string
  readonly VITE_MESSAGING_CONTRACT_ADDRESS: string
  readonly VITE_PODS_CONTRACT_ADDRESS: string
  readonly VITE_LINKED_WALLETS_CONTRACT_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
