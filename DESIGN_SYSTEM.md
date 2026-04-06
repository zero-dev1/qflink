# QFLink — QDL Design System
## Source of Truth · v1.0

> **QDL Stamped.** This document is the single source of truth for every design decision, interaction pattern, animation sequence, and visual standard in QFLink. Every screen, every state, every sound. Nothing is left to interpretation.

---

# Part I — Philosophy & Foundations

## 1. QDL (Quick Declarative Language)

QDL is the interaction philosophy governing every surface of QFLink.

**Core Principles:**

- **The UI is the action.** Where you see information is where you change it. No "edit modes," no settings pages for inline-editable values.
- **Progressive reveal, not steps.** Complex flows reveal themselves as the user decides. No wizards, no "Step 2 of 5."
- **The system participates.** It pre-fills, auto-detects, adapts. Badge status is automatic, not selected. Defaults are intelligent.
- **Every dead end is a doorway.** Empty states are invitations, never "nothing here."
- **Every touchpoint creates FOMO.** Animations, haptics, sound, polish — someone watching should want in.
- **Native-app class or better.** Spring physics, gesture navigation, progressive data loading. We set the standard.

---

## 2. Visual Language

### 2.1 Shape Language

| Shape | Usage | Examples |
|-------|-------|---------|
| **Pill / Capsule** (`border-radius: 9999px`) | Identity & state elements, primary CTAs | Mode pill, profile capsule, navbar, category pills, "Enter App" button, "Join Pod · 50 QF" |
| **Rounded rectangle** (`border-radius: 12px`) | Secondary actions, cards, containers | Pod cards, glass cards, chat input, buttons |
| **Circle** (perfect) | Avatars, wallet selectors, rail icons | User avatars, pod avatars, wallet circles on connect |

**Rule:** Pills are for identity and state. Rounded rects are for content and actions. Circles are for people and entities.

### 2.2 Glass Treatment

The foundational surface treatment across the app:
- Background: `rgba(255, 255, 255, 0.03–0.06)` depending on depth
- Border: `rgba(255, 255, 255, 0.06–0.10)`
- Backdrop filter: `blur(12px)`
- Used on: navbar capsule, mode pill, sidebar rail, cards, Action Bar, profile sheet

### 2.3 Typography

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| Display / Headlines | Clash Display | Bold | Page titles, hero text, pod names, section headers |
| Body / UI | Satoshi | Regular / Medium | Body text, labels, descriptions, nav items |
| Mono / Addresses | System mono | Regular | Hex addresses, tx hashes, technical data |

### 2.4 Color System

**Primary:** Cyan `#00EFE7` — CTAs, active states, .qf suffix, links, mode pill active
**Background:** Near-black `#0A0A0A` or pure `#000000`
**Surfaces:** Layered whites at low opacity (surface-1, surface-2, surface-3)
**Text:** Primary `#FFFFFF`, secondary `rgba(255,255,255,0.6)`, tertiary `rgba(255,255,255,0.4)`

**Badge Colors:**
| Badge | Hex | Usage |
|-------|-----|-------|
| Team | `#DADADA` | Profile border, Official pod strip |
| Dapp Lab | `#00EFE7` | Profile border, Official pod strip |
| Pioneer | `#FFD700` | Profile border |
| Ambassador | `#FF6B35` | Profile border |
| Default (no badge) | `#00EFE7` | Default profile border |

**Category Colors (for pod cards & rail avatars):**
| Category | Suggested Color |
|----------|----------------|
| Trading | Emerald green |
| Alpha | Gold |
| DeFi | Purple |
| Gaming | Orange |
| Builders | Blue |
| Social | Cyan (default) |
| NFTs | Pink |

*Exact hex values TBD in visual design phase.*

### 2.5 Signature Motions (Design Language Origins)

Three signature motions established on the landing page, echoed throughout the app:

| Motion | Origin | App Usage |
|--------|--------|-----------|
| **Split reveal** | Landing Section 2 — two planes meeting/parting | Pod composer expanding, major state transitions |
| **Self-drawing lock** | Landing Section 3 — SVG lock traces itself | Privacy Mode activation, encrypted thread opened |
| **Character morph** | Landing Section 4 — hex address → .qf name | Connect animation, profile name claim, identity resolution |

---

## 3. Content Alignment

**Left-anchored** across all app pages. Max-width constrained, pinned to left edge of content column. Breathing room on the right.

**Exception:** Pod creation composer centers itself during creation — the shift marks a moment of focus.

**Landing page:** Centered content (marketing context, not app context).

---

# Part II — Landing Page

## 4. Landing Page

### 4.1 Structure

A scroll-driven manifesto in **5 viewport-snapped sections**. Each section is full viewport height. Snap scroll (GSAP ScrollTrigger or CSS scroll-snap). Transition between sections: ~600ms with ease-out curve. Each section has entrance animations that play on snap.

### 4.2 Navbar — Floating Capsule

A floating pill-shaped container, center-top of viewport. Glass treatment. ~360px wide on desktop.

| Left | Center | Right |
|------|--------|-------|
| QFLink wordmark (compact) | Clean space | "Enter App" — round pill button, cyan fill |

No search. No text links. No hamburger.

**Scroll behavior:** Fades to ~60% opacity during middle sections, returns to full on Section 5. Always accessible, knows when to step aside.

**Mobile:** Full-width capsule, same three elements.

### 4.3 Section 1 — THE CLAIM (Hero)

Full black viewport. Slow-breathing radial gradient background (barely perceptible).

Center, large Clash Display:

```
Every message,
on-chain,
forever.
```

Three lines, staggered entrance animation (each line slides up, 200ms apart). Below, after 500ms beat, CTA fades in:

**"Enter App →"** — cyan text link (not a button). Restraint IS confidence.

Bottom of viewport: Network Pulse — `1,247 members · 42 pods · 15,803 messages` — tiny, secondary text, numbers count up on load.

Subtle scroll indicator: animated chevron pulsing downward. Disappears after first scroll.

### 4.4 Section 2 — THE SPLIT (Pods)

Screen splits: **left half slides up from below, right half slides down from above**. They meet and lock.

**Left half:** Solid cyan fill. Center: large white bold text:
```
Your pod.
Your rules.
```

**Right half:** Black. Center: secondary white text (Satoshi):
"Token-gated group chats where your QF balance determines access. Every message is an on-chain transaction. Nothing deleted, nothing censored, nothing lost."

**Mobile adaptation:** Vertical split — top half slides from left, bottom half from right.

### 4.5 Section 3 — THE LOCK (Encrypted DMs)

Section 2's halves collapse outward (left down, right up), revealing Section 3 behind — a layered peeling-apart effect.

Full black viewport. Center: **animated lock icon** — SVG path self-draws in cyan, line by line (~800ms). Lock completes, then text appears below in stagger (100ms each):

```
Wallet-to-wallet.
No phone number. No server.
Your keys, your conversations.
```

The self-drawing lock becomes a **recurring motif** — same animation plays when Privacy Mode activates in the app.

### 4.6 Section 4 — THE NAME (QNS Identity)

Full black viewport. Center: large blinking cursor. Text types itself (Clash Display):

`0x5b34...9cc7`

Pauses 500ms. Then each character morphs — slot-machine style transformation from hex to:

**`alice.qf`**

The `.qf` lands in cyan. Below, text fades in:

**"Become someone on-chain."**

Total sequence: ~3 seconds. Same morph animation used in the connect screen and profile name claim.

### 4.7 Section 5 — THE CALL (Final CTA)

Background shifts to subtly warmer dark gradient — signals "this is the end."

Center:
```
The chain is waiting.
```
Below: "No sign-up. No email. Just your wallet."

Below: **"Enter QFLink"** — round pill button, cyan fill, generous padding. The brand name in the CTA.

Below button: `QF Network ↗ · dotqf.xyz ↗` — subtle external links.

Navbar re-intensifies to full opacity.

### 4.8 Footer

A single horizontal line at the bottom of Section 5:

Left: QFLink wordmark (small)
Center: **"Sovereign. On-Chain. Yours."** — the motto, monospace or small Clash Display
Right: `QF Network · dotqf.xyz · Docs` — minimal text links

Thin `1px` border above. Below: "Built on QF Network" — tiny, secondary.

Total height: ~80px. A punctuation mark, not a section.

### 4.9 Technical Implementation

- GSAP ScrollTrigger for snap scrolling and animation orchestration
- GSAP SplitText for staggered text reveals
- SVG path animation for self-drawing lock
- CSS scroll-snap as fallback
- `prefers-reduced-motion` → all animations instant, sections just appear
- Performance target: < 200KB total (mostly text, no heavy images/videos)

---

# Part III — Connect Screen

## 5. Connect Screen — Full Choreography

### 5.1 Overview

The connect screen is a cinematic identity reveal. The landing page transitions out, the connect screen fades in with the same ambient background. The navbar capsule persists but the "Enter App" button is removed — just the wordmark.

### 5.2 State 0 — Selection Screen

Two round wallet circles (72px), side by side, centered. Glass borders, wallet logos inside. Labels below ("Talisman", "SubWallet"). Ambient background breathing.

Mobile: 72px circles, side by side preferred. Stack vertically only if needed.
Mobile hint below: "On mobile? Open in SubWallet's browser"

### 5.3 State 1 — Selection Made (~400ms)

User taps a wallet. Simultaneously:
- Other circle: opacity → 0, scale → 0.9
- Selected circle: scales up 72px → 96px, moves to dead center
- Surrounding content (tagline, network pulse) fades out
- Label below wallet fades out

Screen simplifies to: one circle, centered, larger.

### 5.4 State 2 — Waiting for Signature

Wallet extension popup appears. Inside the circle:
- Wallet logo **cross-fades to a spinner**: a thin cyan arc that traces around the inside of the circle's border, rotating smoothly. The spinner IS the border — partially lit and rotating.
- Text below: `Approve in wallet...` — secondary text, subtle pulse on ellipsis.

This state lasts 2-30 seconds (user dependent). Spinner loops patiently.

**Sound:** Silence. User needs to focus on wallet extension.

### 5.5 State 3a — User CANCELS (~1200ms total)

The delightful error recovery:

1. **Deceleration** (~300ms): Spinning arc slows down like a wheel coming to rest. Physics, not abruptness.
2. **Morph to X** (~400ms): Arc endpoints disconnect from circular path, straighten into two crossing lines forming an X. Continuous motion: arc → deceleration → X.
3. **Hold** (300ms): X sits inside circle. Border tints amber (not red — cancellation is a choice, not a failure). Text: `Cancelled`.
4. **Restore** (~400ms): X dissolves. Wallet logo fades back in. Circle scales down (96px → 72px). Other wallet circle fades back in. Content returns.

Everything back to State 0. Ready for another attempt.

**Sound:** Descending two-note motif (same as app error sound). Light haptic.

**The standard:** This recovery should be so satisfying that users might cancel just to experience it again.

### 5.6 State 3b — User APPROVES (~800ms)

1. **Acceleration** (~200ms): Spinning arc speeds up for one final rotation — burst of energy.
2. **Morph to checkmark** (~300ms): Arc completes full circle, endpoints connect and reshape into ✓. Check draws itself: bottom-left → center-bottom → top-right.
3. **Flash** (~100ms): Circle border flashes bright cyan, pulses once.
4. **Hold** (200ms): Check visible. Text: `Connected`.

**Sound:** Single clean "ding" — brighter and shorter than in-app success chime. Haptic success.

### 5.7 State 4 — QFLink Seal (~600ms)

- Checkmark cross-fades to **QFLink icon** (compact QF mark). "You've been verified, welcome to QFLink."
- Border returns to neutral.
- Text: `Setting up...` (account mapping in progress)

If account mapping requires another signature: spinner returns inside QF icon circle. Same arc spinner, same cancel/approve paths.

### 5.8 State 5 — QNS Acknowledgment (~600ms)

Account mapped. System reverse-resolves .qf name.

**If .qf name found:**
- Circle border **lights up emerald** (`#00EFE7`). Light traces around circumference — circular reveal animation like a fuse burning around the ring. ~600ms to complete.
- When ring closes: subtle pulse of light emanates outward (brief expanding ring that fades).
- **Sound:** Soft warm tone that rises and sustains as ring traces. Resolves when ring completes. The "you're home" sound.

**If no .qf name:**
- Border does softer white/neutral pulse. Acknowledgment, but muted.
- Absence of emerald ring = subtle motivation to claim a name.

### 5.9 State 6 — Avatar Reveal (~400ms)

- QFLink icon dissolves, **user's avatar** (generated identicon) fades in. Brief moment where both are partially visible — one identity becoming another.
- Below: `.qf` name fades in (split render: `alice` white + `.qf` cyan) or truncated address.
- If emerald ring is lit: avatar appears inside glowing ring. Feels earned.

### 5.10 State 7 — Pill Formation (~500ms)

- Circle stretches horizontally into **profile capsule pill**.
- Avatar stays left. Name slides in from right. Balance appears far right.
- Emerald/badge border wraps full pill.
- On badge-holding users: border color transitions from emerald to badge color.
- **Sound:** Quick satisfying "snap" — the pill locking into shape.

### 5.11 State 8 — Entry (~800ms)

- "Enter QFLink →" fades in below pill. Or pill pulses inviting tap. Or auto-transitions after 1.5s.
- Pill animates to final home: sidebar bottom (desktop) or tab bar avatar slot (mobile).
- Spring physics: slight overshoot, bounce to rest.
- Simultaneously: sidebar rail fades in, content area (Home) fades in, mode pill fades in.
- **Sound:** Ascending chime — full version with extra note. The most elaborate chime. You've arrived.
- Done.

### 5.12 Timing Summary

| Path | Animation Time | Notes |
|------|---------------|-------|
| Happy path (excl. user wait) | ~4 seconds | Brisk but ceremonial |
| Cancel recovery | ~1.8 seconds | Quick, graceful, satisfying |

### 5.13 Connection Error States (Non-Animation)

All errors keep user on connect screen. No toasts. Screen communicates state.

| Error | Visual |
|---|---|
| No wallet extension | Selected circle shakes (iOS wrong-password). Text + install link. |
| No accounts found | Circle → amber border. Text: "No accounts found." |
| Insufficient balance for mapping | Pill forms but balance shows "0 QF", muted treatment. Text about funding. |
| Metadata hash error | Clear actionable text about wallet settings. |

### 5.14 Returning Users

- Auto-reconnect from persisted state → skip connect screen, straight to Home
- Silent reconnect fails → user lands on connect screen (the screen IS the communication)

---

# Part IV — App Shell

## 6. Sidebar (Desktop)

### 6.1 Two-Layer Architecture

**Layer 1 — Rail (always visible, 56px wide)**

Thin vertical strip, left edge. Slightly more opaque glass treatment, 1px right border.

**Contents, top to bottom:**
1. **QFLink mark** — compact symbol. Tap → Home.
2. **Pod icons** — joined pods as 40px circles. Letter avatars on category-colored backgrounds. Ordered by most recently active. Unread: cyan dot. Drag-reorderable. Tap → pod chat. 0 pods: ghost circle with `+` → Explore.
3. **Separator** — 1px line
4. **Explore icon** — custom compass/discovery
5. **Messages icon** — custom chat bubble with lock element
6. **Profile capsule** (bottom, see 6.2)

### 6.2 Profile Capsule

**Expanded (panel open, ~240px):** Pill matching QFPay/QNS pattern. Avatar (36px) + .qf name + balance. Badge-colored border. Tap → Profile. Long-press → "Disconnect" / "Copy Address" context menu.

**Collapsed (rail only):** Avatar 40px circle. Badge ring. No .qf name → pulsing cyan ring. Tap → Profile. Long-press → context menu.

### 6.3 Layer 2 — Context Panel (Collapsible, ~240px)

Content changes by rail selection: pod → member list, Messages → conversation list. Collapsible via drag/double-click. Shares rail's glass treatment.

### 6.4 No Search in Sidebar

Action Bar (⌘K) handles all search globally.

---

## 7. Mobile Navigation

### 7.1 Bottom Tab Bar (4 items)

| # | Icon | Notes |
|---|------|-------|
| 1 | Custom home icon | "Home" |
| 2 | Custom compass icon | "Explore" |
| 3 | Custom chat icon | "Messages" |
| 4 | User's avatar (28px, badge ring) | Tap → Profile. No text label. |

### 7.2 Mode Pill on Mobile

Same floating pill as desktop, slightly smaller, center-top.

### 7.3 Pod Switcher

Inside pod chat: swipe right → horizontal pod avatar strip (Instagram Stories pattern). Tap to switch.

---

## 8. Floating Mode Pill

Persistent split pill, centered top of content area. Glass treatment. ~120px resting width.

| Half | Icon | Off | On |
|------|------|-----|-----|
| Left — Instant | ⚡ | Dim/ghost | Cyan fill + glow |
| Right — Privacy | 🔒 | Dim/ghost | Cyan fill + glow |

**Instant toggle:** Tap ⚡ OFF → pill expands: `⚡ 5m | 30m | 2h | 24h`. Tap duration → session key signs (first time) → pill collapses: `⚡ 28m` with countdown. Expires → dims + pulse. Tap ON → cancel immediately.

**Privacy toggle:** Tap 🔒 OFF → derive keypair if needed (one-time signature) → activates. No timer. Persistent.

**Both active:** Full cyan glow on entire pill. Premium state.

**During pending signatures (Instant OFF):** ⚡ half pulses amber — "you could avoid this."

**Network health:** Connection drop → pill border shifts amber. Tooltip: "Connection unstable."

**Scroll behavior:** Background opacity increases on scroll to avoid fighting content.

---

## 9. Action Bar (Unified Command Surface)

Replaces: sidebar search, Spotlight, NewMessageModal.

### 9.1 Invocation

- Desktop: ⌘K, search icon, or start typing when no input focused
- Mobile: search icon in header. On Messages: always visible inline.

### 9.2 Visual

Centered floating panel, ~480px desktop, full-width bottom sheet mobile. Glass treatment. Single input top. Categorized results below.

### 9.3 Context-Aware Defaults (before typing)

| Page | Default Suggestions |
|------|-------------------|
| Home | Recent pods + DMs — "Jump to..." |
| Explore | Trending pods — "Discover..." |
| Messages | Recent contacts — "Message..." |
| Any | Quick actions: "Create a Pod", "Toggle Instant", "Toggle Privacy" |

### 9.4 Results as You Type

**People:** .qf name matches resolve live. Encryption status shown (🔒). Actions: "Message" / "View Profile".
**Pods:** Pod matches with member count + category. Actions: "Enter" / "View".
**Actions:** "create" → Create Pod. "instant" → Toggle Instant (with duration picker inline). "privacy" → Toggle Privacy. "disconnect" → Disconnect (red-tinted).

### 9.5 Keyboard Navigation

Arrow keys between results. Enter to select. Tab to cycle sections. Escape to close.

### 9.6 On Messages Page

Action Bar is inline at top of conversation list: "Message or search..." Always visible. Functions as search, filter, AND compose. Type name → tap person → navigate to existing thread or create new one. Zero intermediate steps. Eliminates NewMessageModal entirely.

---

## 10. Keyboard Shortcuts

| Shortcut | Action | Context |
|---|---|---|
| ⌘K | Open Action Bar | Global |
| Escape | Close/dismiss | Global |
| ⌘Enter | Send message | Chat input focused |
| ⌘. | Toggle Instant Mode | Global (nice-to-have) |

Four patterns. Action Bar IS the keyboard navigation layer.

---

## 11. Avatar-as-Portal Pattern

**Every avatar is tappable → opens profile sheet.** No exceptions.

| Location | Opens... |
|---|---|
| Message bubble (pod/DM) | Sender's profile sheet |
| DM header | Recipient's profile sheet |
| Conversation list | Person's profile sheet |
| Member list (Creator Dashboard) | Member's profile sheet |
| Pod detail member preview | Member's profile sheet |
| Own avatar (sidebar capsule) | Full Profile page |

---

## 12. Custom Icon System

Custom-drawn, 1.5px stroke, rounded terminals, tech-forward aesthetic. Not from generic libraries.

| Icon | Design Direction |
|------|-----------------|
| Home | House/dashboard with digital node feel |
| Explore | Compass or radar — discovery |
| Messages | Chat bubble with integrated lock — encrypted messaging |
| Profile | Hexagonal frame — on-chain identity |
| Instant | Lightning bolt — clean, geometric |
| Privacy | Lock/shield — integrated |
| Create | Plus in circle, or spark symbol |
| Search | Magnifying glass — refined, thin |

---

# Part V — App Screens

## 13. Home

No "Home" title — greeting IS the header.

### 13.1 Structure

1. **Greeting + Balance:** "Good afternoon, alice" (Clash Display, left) + `142.5 QF` pill (right, tappable)
2. **QNS Nudge** (no .qf name only): Glass card, cyan border. "You're `0x5b34...9cc7`" + "Claim your .qf name and become someone." + shimmer on ".qf" text. Disappears once name claimed.
3. **Your Pods:** "Your Pods" + "Explore →". Horizontal card row (~200×120px). Pod name, category, members, unread glow. Ordered by activity. Tap → pod chat. 0 pods → "Join your first pod" CTA card.
4. **Recent Messages:** "Messages" + "View all →". 2-3 DM rows: avatar, .qf name, preview, timestamp, 🔒 indicator, unread dot. Tap → DM chat. 0 DMs → "Start a conversation."
5. **Momentum Tracker** (newer users): ONE next action card. Steps: join pod → send message → enable encryption. Dot progress. Each completed → animates out, next slides in. All done → disappears.
6. **Network Pulse** (future): "42 pods · 1,247 members · 15,803 messages" — live chain stats, count-up on load.

---

## 14. Explore

### 14.1 Structure

1. **Header:** "Explore" (Clash Display, left) + search icon (right, opens Action Bar scoped to pods)
2. **Category pills:** Horizontal scroll: `All · Trading · Alpha · DeFi · Gaming · Builders · Social · NFTs`. Single-select, "All" default. Glass treatment, active = cyan fill.
3. **Sort:** `Active · New · Popular` — underlined text tabs. Default: Active.
4. **Featured row:** Horizontal scroll cards (~280×160px). Official + highlighted Community pods. Snap-scroll mobile.
5. **All Pods grid:** Desktop: 3 columns. Mobile: single column. Official pods inline with distinct treatment (NOT segregated).
6. **Creation CTA:** Sparse → "Launch your pod" card. Full → floating `+`. Zero results → "No [category] pods yet — be the first."

### 14.2 Unified Stream

No separate Official/Community sections. Official pods differentiated by badge-colored top strip + "Official" chip. Eliminates empty states entirely.

### 14.3 Pod Card Anatomy

- **Top strip:** 4-6px color. Official: badge color. Community: category color.
- **Category:** Tiny chip above name
- **Name:** Bold + "Official" chip if applicable
- **Description:** One line, truncated, optional
- **Bottom:** `👥 N members` (left) + economics (right):

| Scenario | Display |
|----------|---------|
| Free, no gate | `Free` |
| Free, gated | `Free · 🔒 100+ QF` |
| Paid, no gate | `50 QF` (price tag) |
| Paid, gated | `50 QF · 🔒 100+ QF` |

### 14.4 Pod Detail — Inline Expansion (Not Modal)

Desktop: card expands in place. Mobile: card zooms to full screen (swipe down to dismiss).

**Content:** Header (name, badge, category, creator — tappable avatar), full description, economics strip with user-specific feedback ("Your balance: 30 QF — insufficient"), member preview (5-8 avatars), join button.

**Join button states:**

| State | Button |
|-------|--------|
| Free, not member | "Join Pod" — cyan filled |
| Paid, not member | "Join Pod · 50 QF" — cyan, price in button |
| Already member | "Enter Pod →" — outlined |
| Banned | No button. Red text: "You are banned." |
| Not connected | "Connect to Join" |
| Insufficient | "Requires 100+ QF" — disabled with reason |

---

## 15. Pod Creation Composer

### 15.1 Inline Expanding Panel

Not modal, not page. Expands from CTA on Explore. Content centers during creation.

### 15.2 Six Beats with Live Preview

| Beat | Element | Preview |
|------|---------|---------|
| 1 — Name | Large centered input. "Name your pod." | Card forms with name |
| 2 — Category | Chips fade in. Single-select. | Card gets category color |
| 3 — Access | "Open to all" vs "Token-gated" (threshold input). Official tag auto-appears if badge-qualified. | Tags appear |
| 4 — Price | Input with "QF" suffix, pre-filled 0. | `Free` or `X QF` price tag |
| 5 — Description | 280-char textarea. Optional. | Description fills in |
| 6 — Launch | "Launch Pod · 500 QF" (creation fee in button) | — |

Launch → signature → panel closes → pod drops into grid with animation → haptic + celebratory chime → pod in rail.

---

## 16. Messages

### 16.1 Conversation List

No "Messages" page title. Action Bar inline at top: "Message or search..."

Each row: avatar (badge ring), .qf name (split render), preview, relative timestamp, 🔒 if encrypted, unread indicator.

New DM: type name in Action Bar → tap person → existing thread or new. No modal.

Desktop: conversation list in context panel, active chat in main content (split-view).

Empty state: "Your conversations will appear here. Type a .qf name above to start."

### 16.2 DM Chat

**Header:** Back arrow + avatar (tappable → profile sheet) + .qf name + encryption indicator (filled 🔒 or nothing).

**Bubble states:**

| State | Treatment |
|-------|-----------|
| Optimistic | Translucent, pulsing border |
| Confirming | Dot animation under bubble |
| Confirmed | Full opacity, brief ✓ fades |
| Failed | Red-tinted, "Failed — tap to retry" |

**Chat input:** Arrow send button (cyan when content, dim when empty). Character countdown ring around send button. Encryption indicator left of input (🔒 if encrypted, open-lock if not). Signing state: input transforms to `Approve in wallet →`.

**Empty conversation:** Large avatar, .qf name, "Everything here lives on-chain." + encryption status.

---

## 17. Pod Chat

Same patterns as DM with:
- Header: pod name + member count (no encryption indicator — pods are public)
- Sender avatars on bubbles (tappable → profile sheet)
- Sender .qf names above bubbles (collapsed for same sender within 5min)
- Bottom states: connected+member → input, banned → red footer, not member → join prompt, not connected → connect prompt

---

## 18. Profile

### 18.1 Own Profile

1. **Identity Hero:** Avatar (96px, badge ring, pulsing cyan if no name), .qf name (Clash Display, split render), on-chain display name, QNS badges (real on-chain only, styled pills), "Edit on dotqf.xyz →"
2. **Session Status:** `⚡ Instant: 28m · 🔒 Privacy: On · Balance: 142.5 QF` — read-only strip
3. **Activity Summary:** Glass card: "Member of **1 pod** · Created **0 pods** · Sent **23 messages**" — numbers tappable. Created pods → compact rows with "Manage →"
4. **Your Pods:** Compact member pod list. Tap → chat. 0 pods → section absent.
5. **Addresses:** Collapsed by default. Expand → SS58 + EVM with copy buttons.
6. **Encryption Status:** "🔒 Encryption key active" or setup prompt.
7. **Danger Zone:** "Disconnect wallet" — red text link, bottom.

### 18.2 Profile Sheet (Other Users)

Universal component (`ProfileSheet.tsx`). Opened by tapping any avatar.

- Mobile: bottom sheet with drag handle, backdrop blur, spring physics
- Desktop: panel overlay, backdrop blur

**Content:** Avatar (64px) + .qf name + badges + encryption status ("🔒 Supports encrypted DMs" or not) + shared pods + actions ("Message" primary, "View Profile" secondary). Pod context: "Promote to mod" / "Ban" if creator/mod.

Data loads progressively: avatar + name instant (cache), badges + shared pods fill in.

---

## 19. Creator Dashboard

### 19.1 Three Zones

**Zone 1 — Pod Pulse:** Name + tag, member count + trend. **Inline-editable:** entry fee and token gate threshold. Tap value → input → confirm → tx.

**Zone 2 — Members:** Scrollable list, each row actionable. Tap → expand inline: promote/ban/view profile. Ban → red animation, collapses out. Search/filter for large pods.

**Zone 3 — Economics:** Revenue with context ("12 × 50 QF = 600 QF"), claimable share, **"Withdraw"** inline action, last withdrawal timestamp.

Single tier model. No Free/Pro. Price changeable 0→N anytime.

---

# Part VI — Interaction Systems

## 20. Transaction Signing State

Between action and confirmation, a distinct "your turn" beat:

**Message send:** Input bar transforms → `Approve in wallet →` with pulse + wallet icon. Rejected → text restored, `Cancelled` fades. Signed → `Confirming...` → clears.

**Pod join:** Button → `Approve in wallet →` with wallet icon. Rejected → button restores, `Cancelled` fades. Signed → `Confirming...`

**Pod create:** Launch button → `Approve in wallet →`. Preview pauses/dims. Rejected → re-enables. Signed → `Launching...`

The signing state is **"your turn," not "loading."** Agency, not patience.

---

## 21. Sound & Haptic Design

### 21.1 The Contrast Principle

Instant Mode OFF = full ceremony. Instant Mode ON = pure flow. The contrast makes Instant Mode desirable.

### 21.2 Vocabulary

**Instant OFF:**
| Moment | Sound | Haptic |
|--------|-------|--------|
| Action initiated | None | Single tap |
| Signing state | Silence | None |
| Signature received | Low warm hum | Gentle pulse |
| Confirmed | Ascending 2-3 note resolve | Success pattern |
| Failed | Descending 2-note | Three short pulses |

**Instant ON:**
| Moment | Sound | Haptic |
|--------|-------|--------|
| Sent | Soft high "pip" | Lightest tap |
| Confirmed | Nothing | None |

**Scaled significance:**
| Action | Sound |
|--------|-------|
| Join pod | Standard success, longer sustain |
| Create pod | 3-note ascending, celebratory |
| Instant activated | Rising sweep (~300ms) |
| Instant expired | Gentle descending sweep |
| Privacy activated | Lock click, percussive |

**Connect flow sounds:** Silence during spinner → "ding" on approve → warm rising tone during emerald ring → "snap" on pill formation → full arrival chime on app transition.

### 21.3 Rules

- All sounds same timbral family — one synthesizer, one reverb
- Mutable (future setting). ON by default.

---

## 22. Error Persistence

| Type | Auto-dismiss |
|------|-------------|
| Success | Yes, 3s |
| Info | Yes, 4s |
| Warning | No, manual dismiss |
| Error | No, manual dismiss |

Failed message bubbles persist permanently. Red-tinted, "Failed — tap to retry." Never disappear.

Cancellation ≠ error. Brief `Cancelled` indicator fades after 2s. Unsent text restored.

---

## 23. Reconnect & Connection State

1. PAPI warmup BEFORE reconnect attempt
2. Platform check: mobile → SubWallet only, desktop → Talisman only
3. **Connecting state:** Sidebar capsule avatar border slow-pulses. Mode pill dimmed.
4. **Success:** Pulse stops, border solidifies. Invisible success.
5. **Failure:** Avatar muted, text → tappable "Reconnect."
6. **Post-reconnect:** Mode pill shimmer 1-2s. During shimmer, actions blocked: "Connecting to chain..."

---

## 24. Tab Return & Live Feel

- Tab return → immediate data fetch + subtle opacity breath (0.97 → 1.0, 200ms)
- Unread indicators update instantly
- Mode pill timer updates (if expired while away, reflects immediately)
- While hidden: zero polling, zero network calls
- `useVisibilityPolling` everywhere, no raw `setInterval`

---

## 25. Universal Confirmation Pattern

| Level | Example | Feel |
|-------|---------|------|
| 1 — Minimal | Message (Instant ON) | Pip + bubble appears. < 1s. Flow state. |
| 2 — Standard | Message (Instant OFF) | Full ceremony: signing → hum → chime. 5-15s. Satisfying. |
| 3 — Significant | Join paid pod | Extended chime, member count increments, pod in rail, balance ticks. Momentous. |
| 4 — Ceremonial | Create pod | Celebratory 3-note, composer closes, card drops into grid with animation. Proud. |

More significant = more elaborate. Intuitive through feel.

---

## 26. Micro-Interactions & Motion

### 26.1 Press States

Every interactive element: `active:scale-[0.98]` with spring (~150ms). No dead taps.

### 26.2 Page Transitions

| Navigation | Transition |
|-----------|-----------|
| Home → Pod Chat | Pod card expands into chat |
| Messages → DM Chat | Row pushes into chat. Mobile: right-slide. |
| Explore → Pod Detail | Inline expansion |
| Any → Profile | Slide up from capsule/tab |
| Back | Inverse of forward |

Every navigation has a **spatial origin.** Never teleporting.

### 26.3 Loading States

- Content materializes (staggered opacity 0→1, 50-100ms between elements). No skeleton grey blocks.
- Long fetches: thin pulsing cyan line at top. Not spinners.
- Progressive loading in sheets: avatar + name instant, rest fills in.

### 26.4 Polish

- Numbers: locale-formatted, count-up animation
- Timestamps: update live every minute
- Scroll: momentum + elastic overscroll (mobile)
- Text: selectable/copyable
- Truncation: "Show more" expand, never overflow

---

## 27. Connection & Offline

- Mode pill border → amber on connection drop
- Sidebar capsule ring → dims to grey when disconnected
- Offline messages: queue locally, show clock icon, auto-send on reconnect

---

## 28. Accessibility

| Requirement | Spec |
|------------|------|
| Keyboard focus | All interactive elements focusable |
| Focus rings | 2px solid cyan (not browser default) |
| Color independence | Never color-only. Always icon + color, or shape + color. |
| Reduced motion | `prefers-reduced-motion` → all animations instant. Fully functional. |
| Contrast | WCAG AA on all text |
| Screen readers | `aria-label` on all icon-only elements |
| Touch targets | 44px × 44px minimum (mobile) |

---

## 29. Gas Cost Policy

No gas display anywhere. Gas on QF is negligible. Pre-flight checks catch insufficient balance generically. Showing gas adds anxiety without info.

---

# Part VII — Quality Standard

## 30. QDL Certification Checklist

### Functional (10 tests)

| # | Test |
|---|------|
| 1 | Complete every core flow without instructions |
| 2 | Every tap acknowledged (press state, no dead taps) |
| 3 | Every tx has signing → confirming → confirmed arc |
| 4 | Instant ON vs OFF feel fundamentally different |
| 5 | App feels current on tab return (instant refresh) |
| 6 | Every empty state invites action |
| 7 | Every avatar leads to profile sheet |
| 8 | ⌘K navigates everywhere |
| 9 | App feels alive when idle (timer ticks, timestamps update) |
| 10 | FOMO test: someone watching wants in |

### Sensory (5 tests)

| # | Test |
|---|------|
| 11 | All sounds from same sonic family |
| 12 | Haptics match action significance |
| 13 | Spring physics everywhere (no linear ease) |
| 14 | No layout shift on load |
| 15 | Reduced motion works fully |

### Identity (5 tests)

| # | Test |
|---|------|
| 16 | .qf names split-rendered everywhere (`alice` + `.qf` cyan) |
| 17 | Only real QNS on-chain badges shown |
| 18 | Badge colors propagate (capsule, profile, sheet) |
| 19 | Encryption status visible at every DM touchpoint |
| 20 | Connect animation plays full sequence |

---

# Part VIII — Implementation

## 31. File Mapping

| Component | File | Status |
|-----------|------|--------|
| Landing page | `src/pages/Landing.tsx` | Rebuild — 5-section scroll manifesto |
| Connect screen | `src/pages/Connect.tsx` | Rebuild — full choreography |
| Sidebar rail | `src/components/layout/Sidebar.tsx` | Rebuild → rail + context panel |
| Mobile tab bar | `src/components/layout/MobileTabBar.tsx` | Rebuild → 4 items |
| App layout | `src/components/layout/AppLayout.tsx` | Left-alignment, pill, Action Bar |
| Page transitions | `src/components/layout/PageTransition.tsx` | Spatial origin transitions |
| Home | `src/pages/Home.tsx` | Rebuild per spec |
| Explore | `src/pages/Explore.tsx` | Unified stream, pills, grid |
| Messages | `src/pages/Messages.tsx` | Action Bar inline, list |
| DM Chat | `src/pages/DMChat.tsx` | Signing states, tx bubbles, encryption |
| Pod Chat | `src/pages/PodChat.tsx` | Signing states, bubbles, ban, switcher |
| Profile | `src/pages/Profile.tsx` | Identity surface |
| Creator Dashboard | `src/pages/CreatorDashboard.tsx` | Three-zone, inline editing |
| Mode pill | New: `src/components/ui/ModePill.tsx` | Split pill, timer, health |
| Action Bar | New: `src/components/ui/ActionBar.tsx` | Replaces Spotlight + NewMessageModal |
| Profile Sheet | New: `src/components/ui/ProfileSheet.tsx` | Universal avatar-tap |
| Pod composer | New: `src/components/pods/PodComposer.tsx` | 6-beat flow |
| Pod card | `src/components/pods/PodCard.tsx` | New anatomy |
| Pod detail | `src/components/pods/PodDetailModal.tsx` | → Inline expansion |
| Message bubble | `src/components/chat/MessageBubble.tsx` | Tx states, avatar tap |
| Chat input | `src/components/chat/ChatInput.tsx` | Signing state, ring, encryption |
| Navbar capsule | New: `src/components/layout/NavCapsule.tsx` | Landing floating pill nav |
| Badge utility | New: `src/lib/badges.ts` | QNS badge fetching |
| Sound system | New: `src/lib/sounds.ts` | Sonic vocabulary |
| Toast store | `src/stores/toast.ts` | Persistence rules |
| Feedback lib | `src/lib/feedback.ts` | Expanded haptics + sounds |
| Spotlight | `src/components/spotlight/Spotlight.tsx` | Replaced by Action Bar |
| New message modal | `src/components/messages/NewMessageModal.tsx` | Eliminated |

---

## 32. Open Items

- [ ] Custom icon set — commission/design 6-8 icons
- [ ] Category color palette — finalize hex values
- [ ] Sound design production — create audio files
- [ ] Pod composer animations — pulse/glow effects
- [ ] Rail drag-reorder — interaction details
- [ ] Custom pod logos — IPFS storage
- [ ] Network Pulse component — live chain stats
- [ ] Context panel details — pod info when selected in rail
- [ ] Notification system — beyond unread dots
- [ ] Settings page — if ever needed
- [ ] Message reactions/replies — future patterns
- [ ] Mobile gesture inventory — comprehensive mapping
- [ ] Performance budget — frame rates, load times, bundle
- [ ] Sound mute toggle — location and UX
- [ ] Session key management UI — revoke, extend
- [ ] New user onboarding — faucet integration
- [ ] GSAP vs Framer Motion — choose animation library for landing
- [ ] Landing page responsive breakpoints — tablet adaptations

---

**QDL Stamped. v1.0**
*This document is the source of truth. Every design decision lives here. When in doubt, refer here. When implementing, match this. When iterating, update this first.*
