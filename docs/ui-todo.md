# QFLink UI Mismatch Checklist

Generated from comparison of `qflink.md` spec + attached reference screenshots vs current code.

---

## Global / Design Tokens
- [x] CSS vars match spec (`#DADADA` light bg, `#0D0D0D` dark bg, `#1A1A1A` dark card, `#FFFFFF` light card) — already correct in `index.css`
- [ ] `--qf-elevated` in light mode should be closer to card (`#EEEEEE`) — currently fine but inputs use it as bg
- [ ] Input background: should use `bg-qf-card` not `bg-qf-elevated` to match reference (white inputs on light)

## Header
- [ ] Wallet address: shown as pill with border (like `0x7f...a91` in a rounded box), not plain text
- [ ] Balance badge: solid border pill (`52.3K QF`), currently `bg-qf-accent/10` — should be bordered pill
- [ ] Theme toggle: shows correct icon (moon for dark mode, sun for light mode) — currently cycles correctly ✓
- [ ] Header logo "QFLink" hidden on desktop (sidebar has it) — currently hidden on desktop ✓

## Sidebar
- [ ] Active nav item: `bg-qf-accent/10` with left cyan bar or full row highlight — reference shows full row cyan tint ✓
- [ ] Sidebar width: 160px in reference (currently `w-60` = 240px — too wide)
- [ ] Logo "QFLink" in sidebar: white/primary color not cyan (reference shows plain white)
- [ ] Network indicator at bottom: green dot + "Local Devnet" text ✓

## Home Page
- [ ] Pod cards: name left + arrow right on same row ✓; holder count below name (e.g. "500K+ Holders") — currently shows "X members" not "500K+ Holders"
- [ ] Pod card with progress bar: shows bar + "210k to go" + timestamp bottom-right
- [ ] Pod card without progress (has last message): shows last message text + timestamp bottom-right (like Whales/Sharks in reference)
- [ ] DM cards: avatar (cyan tinted circle) + name + last message + timestamp — layout matches ✓ but avatar color differs
- [ ] Section heading "Your Pods" — font size 18px semibold ✓; "Direct" same ✓
- [ ] No "Explore more" / "View all" links in reference — reference doesn't show them

## Explore Page
- [ ] Search bar: has search icon on left inside input, placeholder "Search pods by name, token, or category..." ✓
- [ ] Search bar: full-width, white bg (light) / dark bg (dark), rounded-lg border
- [ ] Category pills: "All" active = cyan bg, others = border only, no bg ✓
- [ ] Featured pod cards: cyan border (`border-qf-accent`) around card, not just badge
- [ ] Featured badge: `☆ Featured` cyan pill in top-left of card ✓
- [ ] Card layout: "Requirement" label (small gray) above "500K+ QF Holders" (bold), "Members" label above count with people icon
- [ ] "View Pod" button: full-width, cyan bg, dark text, inside card ✓ but needs to be `rounded-lg` not `rounded-md`
- [ ] Non-featured cards: no cyan border, same card structure but simpler

## Pod Chat (3-column layout)
- [ ] Left column "YOUR PODS" list: label at top, pod rows (name + holder count + unread dot)
- [ ] Active pod in list: cyan background highlight row
- [ ] Center chat header: pod name (large) + member count right-aligned with people icon
- [ ] Center chat sub-header: holder tier text (e.g. "250K+ Holders")
- [ ] Message bubbles: other user = dark gray `#2A2A2A` bg, white text; own = cyan bg, dark text
- [ ] Message bubble radius: 16px (`rounded-bubble`) — currently `rounded-lg` (8px)
- [ ] Sender name shown above bubble for other users (not inline with avatar)
- [ ] Timestamp shown below bubble (not inline)
- [ ] Right column "POD INFO": uppercase label at top, About/Requirements/Members sections, action buttons

## Direct Messages
- [ ] Left panel header: "DIRECT MESSAGES" uppercase label
- [ ] Conversation items: avatar + name + last message + timestamp — ✓ but needs display name not address
- [ ] Active conversation: cyan tinted row ✓
- [ ] Right panel (DM Chat) header: name + role ("QF Builder") + online dot + "End-to-end encrypted" text right-aligned
- [ ] E2E badge: plain text "End-to-end encrypted" right-aligned, no lock icon needed per reference

## Message Bubbles (DM + Pod)
- [ ] Other user bubble: `bg-[#2A2A2A]` dark, white text (light mode shows gray bubble)
- [ ] Own bubble: `bg-qf-accent` cyan, dark text ✓
- [ ] Bubble radius: `rounded-bubble` (16px) not `rounded-lg` (8px)
- [ ] Timestamp: below bubble, outside bubble, small gray text
- [ ] Sender name: above bubble for other users in pod chat

## Message Input
- [ ] Input + send button in same row ✓
- [ ] Send button: cyan bg, paper-plane icon ✓
- [ ] Input border: subtle, white/elevated bg
- [ ] No character counter shown unless approaching limit — currently shows counter for any text

## Pod Info Sidebar
- [ ] "POD INFO" uppercase label at very top (currently missing — sections start directly)
- [ ] About section: "About" heading + description text ✓
- [ ] Requirements section: plain text "Requires 250K QF aggregated balance" ✓
- [ ] Members section: "453 holders" ✓
- [ ] Buttons: "Invite Link" with link icon, "View Members" with people icon, "Leave Pod" red border ✓

## Profile Page
- [ ] Avatar: large cyan-tinted circle ✓
- [ ] Display name + edit button ✓
- [ ] "Member since February 2026" ✓
- [ ] Address with copy icon ✓
- [ ] Stats row: QF Balance + Pods Joined ✓
- [ ] Linked wallets section ✓

## Settings Page
- [ ] Network section: Local Devnet / Mainnet cards with active checkmark ✓
- [ ] Appearance section: Theme selector (Light/Dark/System) — **missing from current SettingsPage**
- [ ] Session section: connected wallet + Disconnect button — currently "Connected Wallet" card ✓
- [ ] About section: version + links — **missing from current SettingsPage**

## Components
- [ ] Button `rounded-md` → should be `rounded-lg` per spec (8px = `rounded-lg` in Tailwind)
- [ ] Card `rounded-lg` → should be `rounded-xl` per spec (12px)
- [ ] Input `rounded-md` → `rounded-lg`
- [ ] Avatar: jdenticon generates colorful icons; reference shows cyan solid circles — acceptable divergence
