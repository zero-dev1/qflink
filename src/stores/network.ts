import { create } from 'zustand'
import type { ConnectionStatus, NetworkId } from '@/lib/network'
import { getNetworkId } from '@/lib/network'

export interface NetworkState {
  currentNetwork: NetworkId
  connectionStatus: ConnectionStatus
  latestBlock: number
  latestBlockTime: number
  isHealthy: boolean
  reconnectAttempts: number
  setCurrentNetwork: (id: NetworkId) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setBlockInfo: (block: number, time: number) => void
  setHealthy: (healthy: boolean) => void
  incrementReconnectAttempts: () => void
  resetReconnectAttempts: () => void
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  currentNetwork: getNetworkId(),
  connectionStatus: 'disconnected',
  latestBlock: 0,
  latestBlockTime: 0,
  isHealthy: false,
  reconnectAttempts: 0,

  setCurrentNetwork: (id) => set({ currentNetwork: id, reconnectAttempts: 0 }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setBlockInfo: (block, time) => set({ latestBlock: block, latestBlockTime: time, isHealthy: true }),
  setHealthy: (healthy) => set({ isHealthy: healthy }),
  incrementReconnectAttempts: () => set({ reconnectAttempts: get().reconnectAttempts + 1 }),
  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
}))
