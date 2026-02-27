// Global type declarations for MetaMask and other browser extensions

interface EthereumProvider {
  isMetaMask?: boolean
  request: (args: { method: string; params?: any[] }) => Promise<any>
  on: (event: string, handler: (...args: any[]) => void) => void
  removeListener: (event: string, handler: (...args: any[]) => void) => void
  selectedAddress?: string
  chainId?: string
  networkVersion?: string
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

export {}
