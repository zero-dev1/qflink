**MIGRATION_PROMPT.md**

```markdown
# QFLink Migration: Replace Contract Interaction Layer with viem

You are migrating QFLink's contract interaction layer from manual @polkadot/api encoding to viem. The wallet connection system (SubWallet, Talisman, Polkadot.js, MetaMask) is NOT changing. The Rust smart contracts are NOT changing. Only the code that encodes/decodes contract calls and submits transactions changes.

## What This Migration Is
- Replace `src/lib/contracts.ts` (~1,700 lines of manual selector computation, SCALE encoding, ABI encoding) with viem readContract/writeContract calls (~200 lines)
- Add typed ABI files for each contract
- Add viem public client that talks to the ETH-RPC endpoint
- Update stores (pods.ts, messages.ts) to use new contract functions
- Add TanStack Query for caching and invalidation

## What This Migration Is NOT
- NOT a wallet connection rewrite — keep existing SubWallet/Talisman/Polkadot.js/MetaMask connection code
- NOT a UI rewrite — all components, pages, styles stay the same
- NOT a contract rewrite — Rust contracts are untouched
- NOT removing Substrate wallet support — mapAccount flow stays

## Context
- QF Network ETH-RPC: https://archive.mainnet.qfnode.net/eth
- Chain ID: 42
- Currency: QF (18 decimals)
- Existing Rust contracts use keccak256 function selectors with Solidity-style ABI encoding, so viem can call them directly
- Users connect via Substrate wallets (mapped to EVM address via mapAccount) OR MetaMask (EVM address directly)
- After connection, all contract calls use the user's EVM address through viem

## Absolute Rules
1. NEVER manually compute selectors, encode SCALE, or build call data bytes — viem does this
2. ALWAYS use viem readContract/writeContract with typed ABIs
3. ALWAYS await waitForTransactionReceipt before updating state
4. NEVER store blockchain data in localStorage — use TanStack Query
5. ALWAYS use parseEther/formatEther for amount conversions
6. ALWAYS surface errors to user — never swallow silently
7. DO NOT touch wallet connection code — leave it as-is
8. DO NOT touch the mapAccount flow — leave it as-is
9. DO NOT touch any UI components unless they directly reference the old contracts.ts functions
10. Contract addresses come from env vars: VITE_REGISTRY_CONTRACT, VITE_PODS_CONTRACT, VITE_MESSAGES_CONTRACT

## Phase 1: Foundation

### Step 1.1: Add viem dependency
```bash
pnpm add viem @tanstack/react-query
Do NOT remove @polkadot/api yet — wallet connection still uses it. Only remove it in Phase 5 cleanup if wallet code has been decoupled.

Step 1.2: Create chain definition
Create src/lib/chain.ts:

Copyimport { defineChain } from 'viem'

export const qfNetwork = defineChain({
  id: 42,
  name: 'QF Network',
  nativeCurrency: { name: 'QF', symbol: 'QF', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://archive.mainnet.qfnode.net/eth'] }
  },
  blockExplorers: {
    default: { name: 'QF Portal', url: 'https://portal.qfnetwork.xyz' }
  }
})
Step 1.3: Create viem public client
Create src/lib/viemClient.ts:

Copyimport { createPublicClient, http } from 'viem'
import { qfNetwork } from './chain'

export const publicClient = createPublicClient({
  chain: qfNetwork,
  transport: http()
})
Note: We do NOT create a wallet client here. The wallet client is created on-demand when a write is needed, using the provider from whichever wallet the user connected (MetaMask's window.ethereum, Talisman's window.talismanEth, or a custom provider wrapping the Substrate wallet's mapped EVM address).

Step 1.4: Create ABI files
Create src/abi/registry.ts, src/abi/pods.ts, src/abi/messages.ts.

To build these: open the current src/lib/contracts.ts and find every function call. Each computes a selector from a signature like createPod(string,bool,uint256). That signature becomes a viem ABI entry. Map every single function — do not skip any.

Example:

Copy// src/abi/pods.ts
export const podsAbi = [
  {
    name: 'createPod',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'isPublic', type: 'bool' },
      { name: 'fee', type: 'uint256' }
    ],
    outputs: [{ name: 'podId', type: 'uint256' }]
  },
  // ... map ALL functions from contracts.ts
] as const
Step 1.5: Create new contract wrapper
Create src/lib/contractCalls.ts (new file — do NOT overwrite contracts.ts yet):

Copyimport { publicClient } from './viemClient'
import { podsAbi } from '@/abi/pods'
import { registryAbi } from '@/abi/registry'
import { messagesAbi } from '@/abi/messages'
import { parseEther, formatEther } from 'viem'

const PODS = import.meta.env.VITE_PODS_CONTRACT as `0x${string}`
const REGISTRY = import.meta.env.VITE_REGISTRY_CONTRACT as `0x${string}`
const MESSAGES = import.meta.env.VITE_MESSAGES_CONTRACT as `0x${string}`

// --- READ FUNCTIONS (no wallet needed) ---

export async function getPod(podId: bigint) {
  return publicClient.readContract({
    address: PODS,
    abi: podsAbi,
    functionName: 'getPod',
    args: [podId]
  })
}

// Map ALL read functions from current contracts.ts here

// --- WRITE FUNCTIONS (need wallet provider) ---

export async function createPod(
  provider: any, // window.ethereum, window.talismanEth, or custom substrate provider
  account: `0x${string}`,
  name: string,
  isPublic: boolean,
  fee: bigint
) {
  const { createWalletClient, custom } = await import('viem')
  const { qfNetwork } = await import('./chain')
  
  const walletClient = createWalletClient({
    chain: qfNetwork,
    transport: custom(provider),
    account
  })

  const hash = await walletClient.writeContract({
    address: PODS,
    abi: podsAbi,
    functionName: 'createPod',
    args: [name, isPublic, fee]
  })

  return publicClient.waitForTransactionReceipt({ hash })
}

// Map ALL write functions from current contracts.ts here
Copy
The provider parameter is the key to dual-wallet support. MetaMask passes window.ethereum. Talisman passes window.talismanEth. For Substrate wallets, the wallet store provides a custom EIP-1193 provider that wraps the mapped EVM address.

Verification: pnpm dev compiles. New files exist alongside old contracts.ts. Nothing is broken yet.

Phase 2: Migrate Pod Store
Step 2.1: Update pod store to use new contract functions
In src/stores/pods.ts, replace all calls to the old contracts.ts functions with calls to the new contractCalls.ts functions. The store still manages the same state shape — only the function calls change.

Step 2.2: Add TanStack Query hooks for pod data
Create src/hooks/usePods.ts:

Copyimport { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as contracts from '@/lib/contractCalls'

export function usePods() {
  return useQuery({
    queryKey: ['pods'],
    queryFn: () => contracts.getAllPods(),
    staleTime: 30_000,
    refetchInterval: 10_000
  })
}

export function usePod(podId: bigint) {
  return useQuery({
    queryKey: ['pod', podId.toString()],
    queryFn: () => contracts.getPod(podId),
    staleTime: 30_000
  })
}

export function useCreatePod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { provider: any; account: `0x${string}`; name: string; isPublic: boolean; fee: bigint }) =>
      contracts.createPod(params.provider, params.account, params.name, params.isPublic, params.fee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pods'] })
    }
  })
}

// Create hooks for ALL pod operations: join, leave, ban, unban, etc.
Copy
Step 2.3: Update pod pages
Update Explore, CreatePod, PodDetail pages to use the new hooks. Loading states come from isLoading, errors from isError/error.

Verification: Can browse pods, create a pod, join a pod. Sidebar updates correctly. Errors show in UI.

Phase 3: Migrate Messages
Step 3.1: Migrate message functions
Same pattern as Phase 2 — replace old contract calls with new contractCalls.ts functions.

Step 3.2: Add TanStack Query hooks for messages
Copyexport function useMessages(podId: bigint) {
  return useQuery({
    queryKey: ['messages', podId.toString()],
    queryFn: () => contracts.getMessages(podId),
    staleTime: 5_000,
    refetchInterval: 3_000 // poll for new messages
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { provider: any; account: `0x${string}`; podId: bigint; content: string }) =>
      contracts.sendMessage(params.provider, params.account, params.podId, params.content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.podId.toString()] })
    }
  })
}
Step 3.3: Update PodChatView
Replace direct store calls with hooks. Messages auto-refresh via refetchInterval.

Verification: Can send messages, see them appear, other users' messages show up via polling.

Phase 4: Migrate Registry + Moderation
Step 4.1: Registry operations
User registration, profile lookup, address resolution — same pattern.

Step 4.2: Moderation operations
Ban, unban, transfer ownership — same pattern.

Step 4.3: Address resolution helper
Create src/lib/addressUtils.ts:

Copyimport { keccak256, toBytes } from 'viem'

// Detect if an address is Substrate (starts with 5, length ~48) or EVM (starts with 0x, length 42)
export function detectAddressFormat(address: string): 'substrate' | 'evm' {
  if (address.startsWith('0x') && address.length === 42) return 'evm'
  return 'substrate'
}

// Convert Substrate address to EVM address (client-side derivation)
// This matches pallet-revive's AccountId32Mapper logic
export function substrateToEvm(substratePubKey: Uint8Array): `0x${string}` {
  const hash = keccak256(substratePubKey)
  return `0x${hash.slice(-40)}` as `0x${string}`
}
Verification: Full flow works: register → create pod → invite → send messages → ban member → unban. Address lookup works with both formats.

Phase 5: Cleanup + Polish
Step 5.1: Remove old contract interaction code
Delete the old src/lib/contracts.ts (the 1,700-line file)
Rename src/lib/contractCalls.ts to src/lib/contracts.ts if preferred
Delete all manual encoding helpers (decodeU256, encodeString, selector computation, queryContract, callContract, sendContractTx, etc.)
Remove @polkadot/api ONLY if wallet connection code has been fully decoupled from it. If wallet code still imports from @polkadot/api for Substrate connections and mapAccount, keep it.
Step 5.2: Error handling
All writeContract calls catch errors and display user-friendly messages
MetaMask rejection (user cancelled) → "Transaction cancelled"
Contract revert → parse revert reason from viem error → display
Network error → "Connection lost, retrying..."
Step 5.3: Loading states
All readContract calls show loading skeletons via TanStack Query's isLoading
All writeContract calls show pending state on buttons via useMutation's isPending
Transaction confirmation shows progress (submitted → waiting → confirmed)
Step 5.4: Final verification
pnpm build succeeds with no errors
No references to old manual encoding functions anywhere in codebase
All flows work: connect wallet (both Substrate and MetaMask) → register → browse pods → create pod → join pod → send message → ban/unban → disconnect → reconnect
Errors display correctly for: rejected transaction, reverted transaction, network disconnect
Cache invalidation works: creating a pod immediately shows it in the list, sending a message immediately shows it in chat
Development Setup
Have a wallet installed (SubWallet, Talisman, or MetaMask)
If using MetaMask, add QF Network: ChainID 42, RPC https://archive.mainnet.qfnode.net/eth
Fund your account with QF tokens
Set env vars for contract addresses in .env
Run pnpm install && pnpm dev
Environment Variables
VITE_REGISTRY_CONTRACT=0x...
VITE_PODS_CONTRACT=0x...
VITE_MESSAGES_CONTRACT=0x...
Reference
viem docs: https://viem.sh
TanStack Query: https://tanstack.com/query
QF MetaMask setup: https://docs.qfnetwork.xyz/connect-metamask-to-qf-network/
QF Solidity deploy: https://docs.qfnetwork.xyz/deploy-solidity-contract-from-remix/
QF ETH-RPC endpoint: https://archive.mainnet.qfnode.net/eth
QF Portal (Substrate explorer): https://portal.qfnetwork.xyz

Those are the complete final files. The key difference from every previous version: the wallet system is untouched, only the contract plumbing behind it gets replaced with viem. Dual-wallet support stays exactly as you have it today. Each phase has a clear verification checkpoint. Phase 1 runs alongside the old code so nothing breaks until you're ready to switch over.