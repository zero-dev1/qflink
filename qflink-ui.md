## Windsurf/Claude Code Prompt (With Reference Images)

```
You are building QFLink, a decentralized wallet-gated messaging platform on QF Network.

REFERENCE DOCUMENT: @qflink.md (read this file completely - it contains all specifications)

REFERENCE IMAGES: I have attached UI mockups that show the exact design to implement. Study these carefully.

=== IMAGE REFERENCE GUIDE ===

DESKTOP SCREENS:

1. HOME (Desktop - Light Mode)
   - Left sidebar: QFLink logo, navigation (Home, Explore, Direct, Profile, Settings), "Local Devnet" indicator at bottom
   - Header: Wallet address "0x7f...a91", balance "52.3K QF", theme toggle, avatar
   - Main content: "Your Pods" section with 3 pod cards (Krakens, Whales, Sharks/Chefs)
   - Pod cards show: Name, requirement (500K+, 250K+, 100K+), last message preview, timestamp, unread count (cyan dot)
   - "Direct" section below with conversation previews (HW Media, Sir Boolean)
   - Background: #DADADA, Cards: white, Accent: #00FFFF (cyan)

2. POD CHAT (Desktop - Light Mode) - Krakens
   - Three-column layout: Pod list (left), Chat (center), Pod Info (right)
   - Left column: "YOUR PODS" header, list of pods with unread indicators
   - Center: Pod header (Krakens, 500K+ Holders, 127 members icon)
   - Balance progress bar: "You hold 290K QF" with cyan fill, "210K to go"
   - Messages: Other users (dark bubbles, left-aligned), Your messages (cyan bubbles, right-aligned)
   - Message input at bottom with send button (cyan)
   - Right column: "POD INFO" - About, Requirements, Members count, Invite Link button, View Members button, Leave Pod button (red text)

3. POD CHAT (Desktop - Light Mode) - Whales
   - Same layout as Krakens
   - Shows different messages and member count (453 members)

4. EXPLORE (Desktop - Light Mode)
   - Header: "Explore Pods", subtitle "Discover gated communities based on your QF holdings"
   - Search bar with placeholder "Search pods by name, token, or category..."
   - Category filter pills: All (cyan/active), Trading, Builders, NFTs, Macro, Meme
   - Pod grid (3 columns): Featured pods (Krakens, Whales) have cyan border and "Featured" badge
   - Each pod card shows: Badge (if featured), Name, Description, Requirement, Member count, "View Pod" button (cyan)
   - Additional pods: Sharks, Dolphins, QF Builders, DeFi Degens

5. EXPLORE (Desktop - Dark Mode)
   - Same layout as light mode
   - Background: #0D0D0D, Cards: #1A1A1A, Text: white
   - Featured badge and buttons remain cyan
   - Shows theme toggle icon changed (sun icon for dark mode)

6. DM CHAT (Desktop - Light Mode)
   - Left column: "DIRECT MESSAGES" header, conversation list
   - Selected conversation highlighted in cyan
   - Center: User header (Sir Boolean, "QF Builder", "Online" with green dot)
   - "End-to-end encrypted" badge (top right, cyan background)
   - Message thread with timestamps
   - Same bubble styling as pod chat

7. PROFILE (Desktop - Light Mode)
   - "Profile" header
   - Profile card with: Cyan avatar circle, Display name "QF Holder", "Member since February 2026", wallet address with copy icon
   - Stats: "QF Balance: 52.3K QF", "Pods Joined: 3"
   - (Note: Linked wallets section should be added per qflink.md)

MOBILE SCREENS:

8. HOME (Mobile - Light Mode)
   - Top bar: Hamburger menu, "QFLink" logo, theme toggle, avatar
   - "Your Pods" section with full-width pod cards (stacked vertically)
   - Each card shows: Name, requirement, progress bar OR last message, timestamp
   - "Direct" section with conversation cards
   - Bottom navigation: Home (active/cyan), Explore, Direct, Profile

9. POD CHAT (Mobile - Light Mode) - Krakens
   - Top bar: Back arrow, Pod name "Krakens", member count "127", members icon
   - Sub-header: Balance progress "You hold 290K QF" / "210K to go"
   - Full-width message area
   - Message input at bottom
   - Bottom navigation visible

10. POD CHAT (Mobile - Light Mode) - Whales
    - Same layout, different content

11. POD LIST SIDEBAR (Mobile)
    - Slide-out panel showing "YOUR PODS"
    - List of pods with unread indicators
    - Selected pod highlighted in cyan

12. EXPLORE (Mobile - Light Mode)
    - "Explore Pods" header with subtitle
    - Search bar
    - Category pills (scrollable horizontally)
    - Full-width pod cards (stacked)
    - Featured badge on applicable pods

13. EXPLORE (Mobile - Dark Mode)
    - Same as light but with dark theme colors

14. DM LIST (Mobile - Light Mode)
    - "DIRECT MESSAGES" header
    - Full-width conversation cards
    - Selected conversation highlighted

15. DM CHAT (Mobile - Light Mode)
    - Top bar: Back arrow, User name, role, online status
    - Full message thread
    - Input at bottom

16. PROFILE (Mobile - Light Mode)
    - "Profile" header
    - Profile card (same content as desktop, responsive layout)
    - Bottom navigation with Profile tab active

=== DESIGN SPECIFICATIONS FROM IMAGES ===

COLORS (extracted from images):
- Light background: #DADADA
- Light card: #FFFFFF
- Light text: #161616
- Dark background: #0D0D0D  
- Dark card: #1A1A1A
- Dark text: #FFFFFF
- Accent (all modes): #00FFFF (cyan)
- User message bubble: #00FFFF
- Other message bubble: #2A2A2A (dark gray)
- Other message text: #FFFFFF
- Error/Leave: Red
- Online indicator: Green
- Unread badge: Cyan with dark text

TYPOGRAPHY:
- Logo: "QFLink" - Bold, ~20-24px
- Page titles: Semibold, ~24px
- Section headers: "Your Pods", "Direct", "POD INFO" - Semibold, ~14px, uppercase or title case
- Pod names: Semibold, ~16px
- Body text: Regular, ~14px
- Timestamps: Regular, ~12px, gray
- Badge text: Medium, ~12px

COMPONENT DETAILS:

Pod Card (Home):
- White background, rounded corners (~12px)
- Padding: ~16px
- Arrow icon on right
- Progress bar: Cyan fill, gray track, rounded ends
- Unread indicator: Cyan circle with number, top-right of card

Message Bubble:
- Rounded corners (~16px)
- Padding: ~12px horizontal, ~8px vertical
- Max width: ~70% of container
- User messages: Right-aligned, cyan background, dark text
- Other messages: Left-aligned, dark background, white text
- Sender name above bubble (for others)
- Timestamp below bubble

Navigation (Desktop):
- Sidebar width: ~180px
- Nav items: Icon + text, ~14px
- Active state: Cyan background, dark text
- Hover: Subtle highlight
- Network indicator at bottom with green dot

Navigation (Mobile):
- Bottom bar height: ~60px
- 4 icons with labels
- Active: Cyan icon and text
- Inactive: Gray

Featured Badge:
- "☆ Featured" text
- Cyan background
- Dark text
- Pill shape (full rounded)
- Positioned top-left of card

Category Pills:
- Pill shape
- Active: Cyan fill, dark text
- Inactive: Transparent, border, current text color
- Horizontal scroll on mobile

=== IMPLEMENTATION INSTRUCTIONS ===

1. MATCH THESE IMAGES EXACTLY
   - Use the images as your visual reference
   - The colors, spacing, and layouts shown are the source of truth
   - qflink.md provides specifications, images show the result

2. RESPONSIVE BEHAVIOR
   - Desktop: Sidebar navigation, multi-column layouts
   - Mobile: Bottom navigation, single-column, full-width cards
   - Breakpoint: 768px (md in Tailwind)

3. COMPONENT PRIORITY
   Build in this order to see visual progress quickly:
   a. Layout shell (Header, Sidebar/BottomNav)
   b. Home page with pod cards
   c. Pod chat view
   d. Explore page
   e. Direct messages
   f. Profile & Settings

4. THEME IMPLEMENTATION
   - Support light and dark modes
   - Default: Follow system preference
   - Use CSS variables or Tailwind dark: prefix
   - Accent color (#00FFFF) stays same in both modes

5. ATTENTION TO DETAIL
   - Progress bar in Krakens card shows user's balance toward threshold
   - Unread indicators are cyan dots with count
   - "End-to-end encrypted" badge in DM chat
   - Online status indicator (green dot) in DM header
   - Featured pods have cyan border + badge

=== SCREENS NOT IN IMAGES (design from qflink.md) ===

These screens need to be designed following the same visual language:

1. SETTINGS PAGE
   - Network selector (Local Devnet / Mainnet)
   - Theme toggle (Light / Dark / System)
   - Connected wallet info
   - Disconnect button
   - About section

2. CREATE POD (3-step flow)
   - Step 1: Tier selection cards (Standard/Premium/Elite)
   - Step 2: Pod details form
   - Step 3: Confirmation with fee breakdown

3. MODALS
   - Connect Wallet (wallet extension list)
   - Select Account (account list from wallet)
   - Link Wallet (address input, signature flow)
   - View Members (searchable member list)
   - Invite Link (copyable link)

4. PROFILE (expanded)
   - Add "Linked Wallets" section showing all linked addresses with balances
   - "Link Another Wallet" button
   - Aggregate balance display

Use the same card styles, button styles, colors, and spacing from the provided images.

=== START ===

1. First, study all attached images carefully
2. Read qflink.md for complete specifications
3. Begin implementation matching the visual design exactly
4. Reference images whenever making UI decisions
```