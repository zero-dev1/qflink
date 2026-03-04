# QFLink Product Specification

## Overview
QFLink is a decentralized group messaging and pod management dApp on QF Network. Users create or join pods (group chats), send messages, manage membership, and handle fees — all on-chain with no backend server.

## Tech Stack

### Why This Stack
- **Contracts: Rust via qf-polkavm-sdk** — Existing contracts work. Bugs are in the frontend interaction layer, not contract logic. Solidity compiled via resolc produces 10-20x larger bytecode, hitting the 48 KB initcode limit for complex contracts. Rust stays.
- **Contract interaction: viem via ETH-RPC** — Replaces the broken 1,700-line manual encoding layer (contracts.ts). Provides typed ABI calls, automatic gas estimation, built-in error parsing. Existing Rust contracts use keccak selectors, so viem works with them directly. This is the only part that changes.
- **Wallets: Dual approach** — MetaMask (primary, where ecosystem is heading post-bridge) + SubWallet/Talisman/Polkadot.js (secondary, for existing Substrate users). Both paths produce an EVM address that viem uses for contract calls. Wallet connection code mostly stays as-is.
- **Caching: TanStack Query** — Replaces manual queryCache/invalidateCache. Stale-while-revalidate, automatic refetching, cache invalidation on mutation success.
- **State: Zustand** — Existing store shapes remain. Only contract interaction functions inside them change.
- **UI: React 19 + Vite + TypeScript + Tailwind** — Unchanged.

### Chain Configuration
| Parameter | Value |
|-----------|-------|
| Network Name | QF Network |
| ETH-RPC URL | https://archive.mainnet.qfnode.net/eth |
| WSS (Substrate) | wss://mainnet.qfnode.net |
| Chain ID | 42 |
| Currency Symbol | QF |
| Decimals | 18 |
| Block Explorer | https://portal.qfnetwork.xyz |
| Testnet WSS | wss://test.qfnetwork.xyz |

### Contract Addresses (env vars)
VITE_REGISTRY_CONTRACT=0x... VITE_PODS_CONTRACT=0x... VITE_MESSAGES_CONTRACT=0x...


## Architecture

### Wallet Connection (dual path, existing code mostly stays)

**Path A — EVM wallet (MetaMask, or Talisman/SubWallet in EVM mode):**
User connects → app gets `0x` address directly → viem uses this for all contract calls. No mapping needed.

**Path B — Substrate wallet (SubWallet, Talisman, Polkadot.js in Substrate mode):**
User connects → app checks if `mapAccount` has been called → if not, prompts user to sign that one-time Substrate transaction → app derives the mapped EVM address → viem uses this for all contract calls. Existing flow, already built.

**After wallet connection, both paths converge.** All contract reads and writes go through viem + ETH-RPC using the user's EVM address. The contract layer does not know or care which wallet type connected.

### Address Resolution
Users may encounter both Substrate addresses (in the portal explorer) and EVM addresses (in MetaMask, future DEX). The app should:
- Accept both address formats when looking up a user (e.g., "message this person")
- Display the format appropriate to context (EVM `0x` for contract interactions, Substrate for portal links)
- Derive one from the other client-side using the pallet-revive mapping logic (keccak hash of 32-byte account → last 20 bytes)

### Contract Layer (unchanged)
Three Rust contracts compiled to PolkaVM via qf-polkavm-sdk:
- **Registry** — user registration, profile metadata
- **Pods** — pod creation, joining, leaving, banning, fee management, treasury
- **Messages** — message storage and retrieval per pod

All use keccak256 function selectors with Solidity-style ABI encoding.

### ABI Definition Pattern
Each contract gets a TypeScript ABI file in `src/abi/`:

```typescript
// src/abi/pods.ts
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
  // ... remaining functions
] as const
Frontend Interaction Pattern
Copyimport { publicClient, getWalletClient } from '@/lib/viemClient'
import { podsAbi } from '@/abi/pods'

// Read (free, no tx)
const podInfo = await publicClient.readContract({
  address: PODS_CONTRACT,
  abi: podsAbi,
  functionName: 'getPod',
  args: [podId]
})

// Write (sends tx, costs gas)
const walletClient = getWalletClient()
const hash = await walletClient.writeContract({
  account: userEvmAddress,
  address: PODS_CONTRACT,
  abi: podsAbi,
  functionName: 'createPod',
  args: ['My Pod', true, parseEther('0')]
})
const receipt = await publicClient.waitForTransactionReceipt({ hash })
````
User Flows
Onboarding
User visits app
Wallet connect modal shows: MetaMask, SubWallet, Talisman, Polkadot.js
If EVM wallet: connects directly, app has 0x address
If Substrate wallet: connects, app checks mapAccount status, prompts mapping if needed, derives EVM address
If user not registered in Registry contract, prompt registration
User enters app
Pod Discovery & Joining
Explore page shows public pods via readContract calls
User selects pod, sees details (members, fee, description)
If free pod: join via writeContract
If paid pod: writeContract with value (fee amount)
Wait for receipt, invalidate pod queries, navigate to chat
Messaging
Pod chat view loads messages via readContract (paginated)
User types message, sends via writeContract
Wait for receipt, invalidate message queries
New messages appear via TanStack Query refetch (polling interval)
Address Lookup (copy from explorer/DEX)
User pastes an address (Substrate or EVM format)
App detects format and resolves to the corresponding user
Shows user profile, option to message or view pods
Moderation
Pod owner sees mod controls per member
Ban/unban via writeContract
Receipt confirms, member list refreshes
Critical Rules (for AI coding tools)
Never manually encode selectors, SCALE, or ABI data — viem handles all encoding/decoding
Always await transaction receipt before updating UI or cache
Never store on-chain data in localStorage — TanStack Query is the cache layer
Use env vars for contract addresses — never hardcode
Use parseEther/formatEther from viem for all amount conversions (18 decimals)
All errors must surface to UI — use viem's error parsing, never swallow silently
Wallet connection code for Substrate wallets stays — only contract interaction code changes
The mapAccount flow for Substrate wallets stays — this is the one Substrate-specific call that remains
All contract reads/writes go through viem — no @polkadot/api for contract calls
Files That Change During Migration
src/lib/contracts.ts — deleted and replaced with viem wrapper functions (~200 lines replaces ~1,700)
src/abi/registry.ts, pods.ts, messages.ts — new ABI definition files
src/lib/viemClient.ts — new viem public client setup
src/lib/chain.ts — new QF Network chain definition
src/stores/pods.ts — rewritten to use viem calls + TanStack Query
src/stores/messages.ts — rewritten to use viem calls + TanStack Query
package.json — add viem, @tanstack/react-query; remove @polkadot/api contract-related utils (keep wallet connection deps)
Files That Do NOT Change
Wallet connection UI and logic (ConnectWallet component, wallet store)
mapAccount flow
All UI components (layout, styling, pod cards, chat bubbles)
Tailwind config, Vite config
Rust contracts
Route structure
Future Contracts (QFClash, etc.)
New contracts: Rust (qf-polkavm-sdk) for complex logic, Solidity for simple contracts (under 48 KB). Both callable via same viem frontend pattern.