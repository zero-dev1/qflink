# QFLink — Product Specification

## What QFLink Is

QFLink is an on-chain community and messaging app built on QuantumFusion. Users connect their wallets, create profiles, join or create group chats (called "pods"), and communicate — all enforced by smart contracts. It replaces Discord and Telegram for crypto communities.

## Tech Stack

- **Frontend:** React + TypeScript + Zustand + Polkadot.js API
- **Contracts:** Rust compiled to PolkaVM, deployed via pallet-revive on QuantumFusion
- **Chain:** Substrate-based (QuantumFusion), dev mode with `--dev` flag
- **Wallets:** Polkadot.js Extension, Talisman, SubWallet, MetaMask

## Contracts

There are three contracts:

- **Registry** — stores user profiles (display name, encryption public key, registration timestamp) keyed by H160 address
- **Pods** — stores pods (name, description, type, entry fee, creator, members, messages, moderators, bans) and handles all pod operations
- **Messages** — stores direct messages between wallet addresses

## Address System

QuantumFusion uses two address formats. SS58 is the Substrate-native format (starts with `5`). H160 is the Ethereum-compatible format (starts with `0x`). When a Substrate wallet connects, `pallet_revive::map_account` creates a deterministic SS58→H160 mapping. All contract interactions use H160. MetaMask users connect directly with H160.

## Source of Truth

The blockchain is the source of truth for ALL data: profiles, pod membership, messages, moderation status. localStorage may be used for UI preferences only (theme, sidebar state) — NEVER for membership, join status, or profile data. After disconnect and reconnect, all app state must reconstruct from on-chain queries alone.

---

## User Flows

### Flow 1 — New User Onboarding

1. User opens the app, lands on connect page
2. User selects a wallet provider (Polkadot.js, Talisman, SubWallet, or MetaMask)
3. App calls `map_account` if needed (Substrate wallets only)
4. App queries the registry contract for a profile at this H160 address
5. If no profile exists (empty display name or zero registration timestamp): show the profile creation form
6. User enters a display name and submits — this calls the registry contract to store the profile
7. After successful registration, navigate to the home page
8. Home page shows default pods (Chefs, Whale, Builders) in the sidebar
9. If a profile already exists: skip registration, go directly to home

**What must NOT happen:** User is redirected to home before registering. User sees "er not found" as display name. User is stuck in a redirect loop. Registration is skipped because the account is mapped but has no profile.

### Flow 2 — Pod Discovery and Joining

1. User opens the Explore page
2. Explore lists all pods from the chain with name, description, member count, and a badge (Free or Paid with fee amount)
3. User taps a free pod they haven't joined → button says "Join Pod"
4. Tapping "Join Pod" calls the contract's `join_pod` function with value 0
5. Contract adds user to the pod's member list and adds the pod ID to the user's `user_pods` reverse index
6. Frontend calls `fetchPods()` to refresh the pod list from the chain
7. Pod now appears in the sidebar
8. Explore button changes to "View Pod"
9. User taps "View Pod" → navigates to pod chat

For paid pods:
1. User taps a paid pod → button says "Join & Pay [amount] QF"
2. Tapping opens a confirmation modal showing the fee
3. User confirms → calls `join_pod` with the entry fee as transaction value
4. Contract verifies payment, adds member, updates `user_pods`, distributes fee (95% creator, 5% treasury)
5. Same post-join behavior: sidebar updates, Explore shows "View Pod"

For the pod creator viewing their own pod in Explore: button says "View Pod" and navigates directly to chat (no modal, no payment).

**What must NOT happen:** User joins but pod doesn't appear in sidebar. Explore still shows "Join Pod" after joining. Paid pod modal opens for the creator. User is shown as joined in pods they haven't joined. Payment succeeds but membership isn't recorded.

### Flow 3 — Pod Creation

1. User opens the Create Pod form
2. User enters: name, description, type (free or paid), entry fee (if paid)
3. User submits → calls the contract to create the pod
4. Contract stores the pod with the caller as creator
5. Frontend calls `fetchPods()` to refresh
6. New pod appears in the sidebar immediately
7. User can navigate to the pod and send messages

**What must NOT happen:** Pod is created but doesn't appear in sidebar until refresh. Creator cannot send messages in their own paid pod. First message doesn't persist until navigating away and back.

### Flow 4 — Messaging

1. User opens a pod they're a member of
2. User types a message and sends
3. Message is submitted as a contract call
4. Message appears in the chat immediately
5. Refreshing the page → message is still there
6. Disconnecting and reconnecting → message is still there
7. Other pod members see the message

**What must NOT happen:** Messages disappear after sending. Messages only appear after navigating away and back. Creator's messages in paid pods are auto-deleted. Messages from non-members are accepted.

### Flow 5 — Membership Persistence

1. User joins 3 pods (mix of free and paid)
2. All 3 appear in sidebar
3. User disconnects wallet
4. All `qflink` prefixed localStorage entries are cleared
5. User reconnects the same wallet
6. App queries the chain: calls `get_user_pods` for this address
7. Returns the 3 pod IDs
8. Sidebar shows all 3 pods

**What must NOT happen:** Sidebar is empty after reconnect. Sidebar shows pods from a different wallet's session. App relies on localStorage to know which pods the user joined.

### Flow 6 — Moderation

1. Pod creator opens the members panel
2. Creator taps the three-dot menu on a member
3. Creator selects "Ban from Pod" → confirmation dialog → confirms
4. Contract records the ban
5. Banned user can no longer send messages (contract rejects the call)
6. Creator selects "Unban Member" → confirms
7. User can send messages again

**What must NOT happen:** Non-creators see ban/unban options. Banned users can still send messages. Ban/unban doesn't take effect until page refresh.

### Flow 7 — Multi-Wallet Isolation

1. User A connects, joins pods, uses the app
2. User A disconnects — all `qflink` localStorage is cleared
3. User B connects on the same browser
4. User B sees only their own pods (or empty if new)
5. No data from User A's session is visible

**What must NOT happen:** User B sees User A's pods. User B appears to be a member of pods they never joined. Any localStorage from User A's session affects User B.

---

## Default Pods

The deploy script initializes 3 default pods:

- **Chefs** — open to all users, no restrictions, anyone can join and message
- **Whale** — requires a minimum balance of 1,000,000 QF to join. Users below this balance can see the pod in Explore but cannot join or send messages
- **Builders** — marked as "Coming Soon" in the UI. Users cannot join yet. This pod will eventually require the wallet to have deployed a contract on QuantumFusion. For now, it should appear in Explore with a "Coming Soon" badge and a disabled join button

All three default pods are visible in Explore to all users. Only Chefs appears in the sidebar by default. Whale Watch and Builders appear in the sidebar only after the user meets the requirements and explicitly joins. The UI already exist for the coming soon for builders you can find it.

## Fee Structure

- Paid pod entry fee: set by creator, paid by joiner
- Fee split: 95% to pod creator's wallet, 5% to treasury
- If treasury address is zero: 100% to creator (do not burn funds)
- Pro pod creation fee: if applicable, transferred to treasury
- Overpayment: acceptable (excess stays in contract or goes to treasury)
- All fees are in QF (native token)

## Contract Functions Required

The frontend expects these contract functions to exist and work:

**Registry:** register_profile, get_profile
**Pods:** initialize_pods, create_pod, join_pod, leave_pod, send_pod_message, get_pod, get_pod_count, get_user_pods, get_pod_members, check_pod_access, ban_member, unban_member, add_mod, remove_mod, get_mods, is_banned, get_pod_fee
**Messages:** send_message, get_messages, get_conversations