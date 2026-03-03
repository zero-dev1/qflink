# QFLink Pod Moderation – Technical Spec v1.0

## Overview
On-chain messages are immutable. Moderation controls **visibility** and **access**, not deletion.
Messages from banned users remain on-chain but are hidden client-side.

---

## Roles

### Pod Creator
- The wallet that created the pod
- Full control: ban/unban members, appoint/remove moderators
- Cannot be banned from their own pod
- Max 1 creator per pod (non-transferable in MVP)

### Moderator
- Appointed by pod creator only
- Can ban/unban members within that pod
- Cannot ban other moderators or the creator
- Max **3 moderators per pod** (hardcoded)
- Stored on-chain per pod

### App-Wide Admin
- The deployer wallet (same as contract admin)
- Can ban a wallet from **all pods and DMs** platform-wide
- Used only for illegal content, scams, or severe abuse
- Not advertised in UI; exists as a backend safety net
- Stored on-chain as a global ban list

---

## Ban Behaviour

- **Scope:** Per-pod (creator/mod action) or platform-wide (admin action)
- **Duration:** Permanent until manually unbanned
- **No timed bans** in MVP
- **Banned user experience:**
  - Pod disappears from their Explore and Pods views entirely
  - Cannot send messages to that pod
  - Cannot rejoin even if they meet the token threshold
  - Existing messages hidden client-side for all other members
- **On-chain storage:** Ban list per pod (mapping: `pod_id + wallet → banned bool`)
- **Platform ban:** Global mapping: `wallet → banned bool`

---

## No Kicks
- Only ban/unban. No temporary removal.
- Keeps logic simple: you're either in or you're out.

---

## Message Moderation
- **No message-level hiding or flagging**
- Banning the user is the only tool
- Once banned, all their messages are hidden client-side
- Messages remain on-chain (immutable)

---

## Reporting
- **None in MVP**
- Moderators patrol the chat directly
- No report button, no report queue

---

## Appeals
- **No on-chain appeal mechanism**
- Creator/mod decision is final
- Banned users must contact the pod creator outside the platform

---

## Contract Changes Required

### New Storage (per pod)
ban_list: mapping(pod_id + H160 → bool) mod_list: mapping(pod_id + u8_index → H160) // max 3 slots mod_count: mapping(pod_id → u8)


### Global Storage (admin)
global_ban: mapping(H160 → bool)


### New Functions

| Function | Caller | Selector | Description |
|---|---|---|---|
| `ban_member(pod_id, address)` | Creator or Mod | TBD | Add wallet to pod ban list |
| `unban_member(pod_id, address)` | Creator or Mod | TBD | Remove wallet from pod ban list |
| `add_mod(pod_id, address)` | Creator only | TBD | Appoint moderator (max 3) |
| `remove_mod(pod_id, address)` | Creator only | TBD | Remove moderator |
| `get_ban_list(pod_id)` | Any | TBD | Return banned addresses for pod |
| `get_mods(pod_id)` | Any | TBD | Return moderator addresses for pod |
| `is_banned(pod_id, address)` | Any | TBD | Check if address is banned in pod |
| `global_ban(address)` | Admin only | TBD | Ban wallet from entire platform |
| `global_unban(address)` | Admin only | TBD | Remove global ban |
| `is_global_banned(address)` | Any | TBD | Check if wallet is globally banned |

### Modified Functions

| Function | Change |
|---|---|
| `check_pod_access(pod_id, address)` | Add ban check: deny if `is_banned` OR `is_global_banned` |
| `send_pod_message(pod_id, ...)` | Add ban check before allowing message |

---

## Frontend Changes

### Pod Chat View
- Before rendering messages, filter out messages from addresses in the pod's ban list
- Query `get_ban_list(pod_id)` on pod load, cache locally
- Mod/Creator see a small icon or context menu on each message sender to ban

### Pod Info Panel (existing)
- Add "Members" section showing active members
- Creator/Mods see a "Ban" button next to each member
- Creator sees "Add Mod" / "Remove Mod" controls
- Show mod badge next to moderator names in chat

### Explore / Home Pages
- Filter out pods where the connected wallet is banned
- Query `is_banned(pod_id, wallet)` during pod list load

### No Visible Moderation UI for Regular Members
- Regular members see no moderation controls
- No report button, no moderation settings
- Clean, minimal interface

---

## Access Check Flow (Updated)

function canAccessPod(wallet, pod_id): if is_global_banned(wallet): return DENIED if is_banned(pod_id, wallet): return DENIED if pod.threshold == 0: return LOCKED // Builders pod balance = getQualifyingBalance(wallet) if balance < pod.threshold: return INSUFFICIENT return GRANTED


---

## Implementation Priority

### Phase 1 (Now — MVP Moderation)
1. Contract: ban_list + mod_list storage per pod
2. Contract: ban_member, unban_member, add_mod, remove_mod functions
3. Contract: global_ban, global_unban (admin only)
4. Contract: update check_pod_access and send_pod_message with ban checks
5. Frontend: filter banned user messages client-side
6. Frontend: ban button visible to creator/mods in pod chat
7. Frontend: hide pods where user is banned from Explore/Home

### Phase 2 (Post-Launch)
- Timed bans (24h, 7d, 30d) with on-chain expiry block number
- Message-level hide/flag (if needed based on user feedback)
- Mod activity log (who banned whom, when)
- Increase mod cap as paid feature

### Not Planned
- Reporting system
- Appeal mechanism
- AI/automated moderation
- Word filters
- Per-message fees for spam control (tx fee handles this)

---

## Design Principles
- Simplicity over features
- On-chain for audit trail
- Creator autonomy — their pod, their rules
- Platform safety net via admin global ban
- Invisible moderation UI for regular users
- Messages are immutable; moderation controls visibility only