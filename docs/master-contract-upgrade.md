# QFLink Contract Upgrade — Moderation + Paid Pods + Creation Tiers

## CRITICAL: READ BEFORE WRITING ANY CODE

This upgrade adds new features to the EXISTING contracts. 
DO NOT rewrite contracts. DO NOT change the build toolchain.
DO NOT introduce ink!, cargo-contract, or any new framework.

The contracts use:
- Low-level Rust targeting pallet-revive
- pallet-revive-uapi for host functions
- build.sh + polkatool for compilation
- Hand-rolled keccak256 4-byte selectors
- Manual ABI encoding (32-byte slots)
- .polkavm binary output

## Step 0: Read These Files

Read ALL of these before writing any code:

**Specs (the rules):**
- docs/qflink-revenue-access-specs-v1.md
- docs/pod-access-monetisation-spec.md
- docs/pod-moderation-spec.md

**Existing contracts (the codebase you are modifying):**
- contracts/qflink-pods/src/main.rs
- contracts/qflink-registry/src/main.rs (if exists)
- contracts/qflink-messages/src/main.rs (if exists)

**Build toolchain (DO NOT CHANGE):**
- contracts/qflink-pods/build.sh
- contracts/qflink-pods/Cargo.toml
- scripts/deploy.mjs

**Frontend contract interaction (to understand how calls are made):**
- src/services/podService.ts
- src/services/registryService.ts (if exists)
- src/services/messageService.ts (if exists)

After reading, report back:
1. List every existing function selector you found in main.rs
2. List every storage key pattern you found
3. Confirm you understand the build pipeline
4. Confirm you understand how the frontend calls the contract

DO NOT proceed to Step 1 until you have reported the above.

## Step 1: Add Moderation to qflink-pods Contract

### New Storage Keys

Add these storage key patterns (keccak256 hashed, matching existing patterns):

```
ban_list:     key = keccak256("ban" ++ pod_id ++ address)     → u8 (1=banned, 0=not)
mod_list:     key = keccak256("mod" ++ pod_id ++ slot_index)  → address (20 bytes)
mod_count:    key = keccak256("modc" ++ pod_id)               → u8
global_ban:   key = keccak256("gban" ++ address)              → u8 (1=banned, 0=not)
```

### New Functions (compute keccak256 selectors for each)

#### ban_member(pod_id: u64, target: address)
- Selector: first 4 bytes of keccak256("ban_member(uint64,address)")
- Caller must be pod creator OR a mod for that pod
- Cannot ban the pod creator
- Cannot ban another mod
- Sets ban_list key to 1
- Returns success

#### unban_member(pod_id: u64, target: address)
- Selector: first 4 bytes of keccak256("unban_member(uint64,address)")
- Caller must be pod creator OR a mod
- Sets ban_list key to 0

#### add_mod(pod_id: u64, moderator: address)
- Selector: first 4 bytes of keccak256("add_mod(uint64,address)")
- Caller must be pod creator
- Check mod_count: max 1 for Free pods, max 3 for Pro pods
- Store moderator address in mod_list at next slot
- Increment mod_count

#### remove_mod(pod_id: u64, moderator: address)
- Selector: first 4 bytes of keccak256("remove_mod(uint64,address)")
- Caller must be pod creator
- Find and remove moderator from mod_list
- Decrement mod_count

#### global_ban(address)
- Selector: first 4 bytes of keccak256("global_ban(address)")
- Caller must be admin
- Sets global_ban key to 1

#### global_unban(address)
- Selector: first 4 bytes of keccak256("global_unban(address)")
- Caller must be admin
- Sets global_ban key to 0

#### is_banned(pod_id: u64, address) → u8
- Selector: first 4 bytes of keccak256("is_banned(uint64,address)")
- Query function. Returns 1 if banned, 0 if not.

#### is_globally_banned(address) → u8
- Selector: first 4 bytes of keccak256("is_globally_banned(address)")
- Query function. Returns 1 if globally banned, 0 if not.

#### get_mods(pod_id: u64) → list of addresses
- Selector: first 4 bytes of keccak256("get_mods(uint64)")
- Returns encoded list of mod addresses for the pod

### Modified Functions

#### check_pod_access(pod_id, address)
Add to the BEGINNING of the existing function:
1. Check global_ban — if globally banned, return denied (code 2)
2. Check ban_list — if pod-banned, return denied (code 1)
Then continue with existing balance check logic.

#### send_pod_message(pod_id, content)
Add to the BEGINNING of the existing function:
1. Check global_ban for caller — if banned, revert
2. Check ban_list for caller in this pod — if banned, revert
Then continue with existing message logic.

### Helper: is_creator_or_mod(pod_id, caller) → bool
Internal helper (not an external function):
1. Read pod creator from storage
2. If caller == creator, return true
3. Read mod_count for pod_id
4. Loop through mod_list slots 0..mod_count
5. If any slot matches caller, return true
6. Return false

## Step 2: Add Pod Creation Tiers

### New Storage Keys

```
pod_tier:          key = keccak256("tier" ++ pod_id)           → u8 (0=Free, 1=Pro)
pro_creation_fee:  key = keccak256("profee")                   → u256
treasury_address:  key = keccak256("treasury")                 → address
```

### Initialize Treasury and Pro Fee

In `initialize_pods()`, after creating the 3 default pods, also store:
- treasury_address = caller (admin)
- pro_creation_fee = constructor arg or hardcoded initial value
- Set all 3 default pods to tier = Pro (1)

### New Functions

#### set_pro_fee(amount: u256)
- Selector: keccak256("set_pro_fee(uint256)") first 4 bytes
- Admin only
- Stores new pro_creation_fee

#### set_treasury(address)
- Selector: keccak256("set_treasury(address)") first 4 bytes
- Admin only
- Stores new treasury_address

#### get_pro_fee() → u256
- Query. Returns pro_creation_fee.

#### get_treasury() → address
- Query. Returns treasury_address.

#### get_pod_tier(pod_id) → u8
- Query. Returns pod tier (0=Free, 1=Pro).

#### upgrade_pod(pod_id)
- Selector: keccak256("upgrade_pod(uint64)") first 4 bytes
- Caller must be pod creator
- Must be currently Free (tier 0)
- value_transferred must be >= pro_creation_fee
- Split payment: 95% to treasury, 5% burned (sent to 0x0 or kept in contract)
- Set pod tier to Pro (1)

### Modified Functions

#### create_pod(name, description, threshold)
Add NEW parameters: entry_fee (u256), payout_wallet (address)
**WARNING:** This changes the function signature and selector.
The old create_pod selector must be replaced.

New logic:
1. If value_transferred >= pro_creation_fee AND pro_creation_fee > 0:
   - Tier = Pro
   - Split creation fee: 95% treasury, 5% burn
2. Else:
   - Tier = Free
   - If entry_fee > 0, REVERT (free pods cannot charge)
3. Store pod_tier
4. Store entry_fee (can be 0)
5. Store payout_wallet
6. Rest of existing logic unchanged

### Enforcement in Existing Functions

#### add_mod
Before adding, check pod tier:
- Free: max 1 mod
- Pro: max 3 mods

#### join_pod — see Step 3

## Step 3: Add Paid Pods

### New Storage Keys

```
pod_entry_fee:      key = keccak256("efee" ++ pod_id)            → u256
pod_payout_wallet:  key = keccak256("payout" ++ pod_id)          → address
paid_members:       key = keccak256("paid" ++ pod_id ++ address) → u8 (1=paid)
pod_member_count:   key = keccak256("memc" ++ pod_id)            → u32
```

### New Functions

#### join_pod(pod_id)
- Selector: keccak256("join_pod(uint64)") first 4 bytes
- PAYABLE function (reads value_transferred)
- Checks:
  1. Not globally banned
  2. Not pod-banned
  3. Pod exists
  4. Pod not locked (threshold=0 AND fee=0)
  5. Free pod: member_count < 50
  6. If entry_fee > 0:
     - value_transferred >= entry_fee
     - Not already paid (paid_members check)
     - Split: 95% to payout_wallet, 5% to treasury
     - Record paid_members = 1
  7. Increment member_count

#### has_paid(pod_id, address) → u8
- Query. Returns 1 if paid, 0 if not.

#### get_pod_fee(pod_id) → u256
- Query. Returns entry fee for pod.

### Modified Functions

#### check_pod_access(pod_id, address)
Full updated flow:
1. If globally banned → return 2
2. If pod-banned → return 1
3. If threshold == 0 AND fee == 0 → return 5 (locked)
4. If fee > 0 AND not paid → return 4 (payment required)
5. Balance check (existing logic) → return 3 if insufficient
6. Free pod member limit check → return 6 if full
7. Return 0 (granted)

#### send_pod_message(pod_id, content)
Updated checks at the beginning:
1. Global ban check
2. Pod ban check
3. If pod has entry_fee > 0, check has_paid
Then continue with existing message logic.

## Step 4: Update Frontend

### New Service Functions in src/services/podService.ts

Add functions that call the new contract selectors. Match the existing pattern
in the file for how calls are made (api.tx.revive.call with encoded data).

For each new function:
1. Compute the 4-byte selector
2. Encode parameters in 32-byte ABI slots
3. Call using the same pattern as existing functions

New frontend functions needed:
- banMember(podId, address)
- unbanMember(podId, address)
- addMod(podId, address)
- removeMod(podId, address)
- globalBan(address) — admin only
- globalUnban(address) — admin only
- isBanned(podId, address) → boolean
- isGloballyBanned(address) → boolean
- getMods(podId) → address[]
- joinPod(podId, fee) — payable
- hasPaid(podId, address) → boolean
- getPodFee(podId) → number
- getProFee() → number
- getPodTier(podId) → number
- upgradePod(podId, fee) — payable
- setProFee(amount) — admin only
- setTreasury(address) — admin only

### New UI Components

#### Moderation UI (in pod chat view):
- Ban button on message hover (visible only to creator/mods)
- Mod badge next to moderator names
- Pod settings panel: manage mods (add/remove), view ban list

#### Paid Pods UI:
- Pod creation form: add entry_fee field + payout_wallet field
- Entry fee field disabled for Free tier with "Upgrade to Pro" prompt
- Join confirmation modal: "Join [Pod Name] for [X] QF?"
- Paid badge on pod cards in Explore (e.g., "50 QF")

#### Creation Tiers UI:
- Replace existing 3-tier selection with 2 tiers: Free and Pro
- Free: 0 QF, limited features listed
- Pro: shows fee from get_pro_fee(), full features listed
- Fee breakdown: "95% Treasury / 5% Burned"
- Upgrade button in pod settings for Free pods

#### Access Filtering:
- On Explore/Home: hide pods where connected wallet is banned
- In pod chat: filter messages from banned addresses client-side
- For paid pods: show join modal before allowing entry

## Step 5: Build and Deploy

After ALL contract changes are complete:

```bash
cd contracts/qflink-pods
./build.sh
```

If build succeeds, deploy:

```bash
cd /path/to/qflink
npm run deploy
```

This will redeploy contracts and call initialize_pods.

Then restart frontend:

```bash
npm run dev
```

## Step 6: Verify

Test the following flow:
1. Explore page shows 3 pods with correct thresholds
2. Can create a new Free pod (no payment)
3. Can create a Pro pod (with payment)
4. Can send messages in a pod
5. Creator can ban a member
6. Banned member cannot see or message the pod
7. Creator can add a mod
8. Mod can ban a member
9. Global ban blocks access to all pods

Share screenshots of:
- Explore page with pod cards
- Pod creation form (Free/Pro)
- Ban button in chat
- Join confirmation modal for paid pod

## RULES

- DO NOT change the build toolchain (build.sh, polkatool, Cargo.toml dependencies)
- DO NOT introduce ink!, cargo-contract, or any new framework
- DO NOT modify colors, fonts, dark/light mode, logos, landing page, connect screen
- DO NOT change .env variable names
- DO NOT remove existing working functions — only ADD new ones and MODIFY existing ones
- Match the EXACT coding style of the existing main.rs (storage patterns, selector dispatch, ABI encoding)
- Every new function needs a keccak256 selector added to the dispatch match block in call()
- Test that ./build.sh succeeds before making frontend changes
- Provide diffs for every file modified
