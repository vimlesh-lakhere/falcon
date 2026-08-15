*A complete UI/UX and design system specification for AGS Store ERP, written for AI coding agents to implement without further design decisions. Covers visual identity, tokens, responsive strategy, every module screen, the component library, and quality/accessibility standards.*

## 1\. Overall Design Philosophy

Visual identity: a calm, confident, business-grade interface — closer to Stripe/Linear than to a traditional ERP. Neutral surfaces, one accent color, generous whitespace, and typography as the primary hierarchy tool rather than color or borders.

Product personality: precise, trustworthy, unhurried under the hood but fast in the hand. The product should feel like it respects the owner's time — every screen answers "what do I need to do right now" within one glance.

-   **Design language:** flat surfaces, thin 1px borders instead of heavy shadows, 8px soft radii, single accent color reserved for primary actions and active states only.

-   **Emotional feeling:** in control, unhurried, confident — never cluttered, never "techy" for its own sake.

-   **UX philosophy:** keyboard-first for power flows (POS, data entry), pointer-friendly for everything else; progressive disclosure — show the 20% of fields used 80% of the time, hide the rest behind "More details"; every destructive action is reversible or confirmed; the system never blocks the cashier — offline and error states degrade gracefully instead of freezing the screen.


## 2\. Brand Guidelines

### 2.1 Logo & Brand

-   **Logo placement:** top-left of sidebar, 32px height, 16px left padding; collapses to a monogram mark (first letter, in a 32×32 rounded-square badge) when the sidebar is collapsed.

-   **Clear space:** minimum padding around the logo equal to half its height on every side.


### 2.2 Color Palette

-   **Primary (brand):** #4F46E5 (Indigo 600) — primary buttons, active nav item, links, focus rings. Hover #4338CA, Active #3730A3, Light tint background #EEF2FF.

-   **Secondary / Accent:** #0EA5E9 (Sky 500) — used sparingly for secondary highlights, informational charts, and the AI Center accent.

-   **Success:** #16A34A, tint #F0FDF4, text-on-tint #166534 — paid, in stock, completed.

-   **Warning:** #D97706, tint #FFFBEB, text-on-tint #92400E — low stock, pending approval, due soon.

-   **Danger:** #DC2626, tint #FEF2F2, text-on-tint #991B1B — out of stock, overdue, destructive actions.

-   **Info:** #2563EB, tint #EFF6FF — neutral system messages, tips.

-   **Backgrounds (light):** App canvas #F7F8FA, Card #FFFFFF, Sunken/inset panel #F1F2F4.

-   **Borders:** #E5E7EB default, #D1D5DB hover/emphasis, #4F46E5 focus.

-   **Text:** Primary #111827, Secondary #6B7280, Disabled #9CA3AF, Inverse #FFFFFF.

-   **Chart palette (categorical, colorblind-safe order):** #4F46E5, #0EA5E9, #16A34A, #D97706, #DC2626, #8B5CF6, #EC4899, #64748B. Sequential scale for heatmaps/forecasts: 5-step Indigo tint ramp from #EEF2FF to #4F46E5.


### 2.3 Typography, Spacing, Radius, Shadow, Glass

-   **Typeface:** Inter (UI text) + a tabular-figure numeric variant (Inter or IBM Plex Mono for monetary/quantity columns so digits align).

-   **Spacing base unit:** 4px, scaling in the 4/8/12/16/24/32/48/64 rhythm (full scale in Section 3).

-   **Border radius:** 6px small controls (badges, chips), 8px default (buttons, inputs), 12px cards, 16px modals/large panels, 999px pills/avatars.

-   **Shadows:** minimal and soft only. sm for hover affordance, md for dropdowns/popovers, lg for modals. No heavy drop shadows anywhere; borders do most separation work.

-   **Glass effects:** used only on the top bar and command palette overlay — background blur (12px) with 80% opacity white/dark surface, to keep content legible while scrolling underneath. Not used on cards, tables, or POS surfaces (must stay fully opaque for readability under store lighting).

-   **Icons:** single outline icon set (Lucide-style), 1.5px stroke, 16/20/24px sizes, never mixed with filled icons except for the active/selected state of nav items.

-   **Illustrations:** simple two-tone line illustrations (brand indigo + neutral gray) for empty states and onboarding only — never decorative on working screens.

-   **Empty / loading / animation guidance:** detailed in Sections 22, 23, 26.


## 3\. Design Tokens

### 3.1 Spacing Scale (px)

space-1: 4 · space-2: 8 · space-3: 12 · space-4: 16 · space-5: 20 · space-6: 24 · space-8: 32 · space-10: 40 · space-12: 48 · space-16: 64 · space-20: 80

### 3.2 Radius Scale

radius-xs: 4px · radius-sm: 6px · radius-md: 8px · radius-lg: 12px · radius-xl: 16px · radius-full: 9999px

### 3.3 Elevation

elevation-0: none (flat cards, default) · elevation-1: 0 1px 2px rgba(0,0,0,0.05) (hover) · elevation-2: 0 4px 12px rgba(0,0,0,0.08) (dropdown/popover) · elevation-3: 0 12px 32px rgba(0,0,0,0.12) (modal/drawer)

### 3.4 Opacity

disabled: 0.4 · hover-overlay: 0.06 · pressed-overlay: 0.1 · scrim/backdrop: 0.5 · glass-surface: 0.8

### 3.5 Typography Scale

-   **Display:** 32px / 40px line-height / weight 700 — page-level KPI numbers only.

-   **H1:** 24px / 32px / 700 — page titles.

-   **H2:** 20px / 28px / 600 — section headers, modal titles.

-   **H3:** 16px / 24px / 600 — card titles.

-   **Body:** 14px / 20px / 400 — default UI text.

-   **Body Strong:** 14px / 20px / 600 — emphasized labels, table headers.

-   **Small:** 12px / 16px / 400 — captions, helper text, timestamps.

-   **Micro:** 11px / 14px / 600, uppercase, letter-spacing 0.04em — eyebrow labels, badges.

-   **POS Numeric Large:** 28px / 36px / 700, tabular figures — cart total on billing screen.


### 3.6 Icon Sizes

icon-xs: 14px (inline in text) · icon-sm: 16px (table rows, inputs) · icon-md: 20px (default UI, nav) · icon-lg: 24px (page headers, empty states) · icon-xl: 40px (empty-state illustration accents)

### 3.7 Grid & Breakpoints

-   **Breakpoints:** xs <640px (phone) · sm 640–767px (large phone / small POS handheld) · md 768–1023px (tablet) · lg 1024–1439px (laptop) · xl 1440–1919px (desktop) · 2xl ≥1920px (large POS monitor / TV display).

-   **Container widths:** content max-width 1440px centered on 2xl; fluid with 24px side padding on lg/xl; 16px on md; 12px on xs/sm.

-   **Grid:** 12-column grid on lg+, 8-column on md, 4-column on xs/sm; 24px gutter on lg+, 16px on md, 12px on xs/sm.


## 4\. Responsive Strategy

-   **Desktop / Large POS Monitor (xl/2xl):** full expanded sidebar (240px) always visible; multi-column dashboards (up to 4 KPI cards per row); tables show all columns; POS screen splits into 60/40 product-grid / cart panels side by side.

-   **Laptop (lg):** sidebar defaults to collapsed icon rail (72px) with flyout labels on hover; dashboards drop to 3 KPI cards per row; tables keep all columns but with tighter 12px cell padding.

-   **Tablet (md):** sidebar becomes an overlay drawer opened via hamburger; top bar persists; dashboards go to 2-column KPI grid; data tables convert lower-priority columns into an expandable row detail; filters move into a slide-over panel triggered by a Filters button; POS switches to a tabbed layout (Products tab / Cart tab) instead of side-by-side.

-   **Android Phone (xs/sm):** bottom tab bar replaces sidebar entirely (Dashboard, POS, Inventory, Orders, More); all tables convert to stacked cards (one record = one card, key fields only, tap to expand); search and filters live in a persistent top search bar with a filter icon opening a bottom sheet; forms become single-column, full-width, with a sticky bottom action bar (Save/Cancel); touch targets minimum 44×44px; POS becomes a single-column flow: category chips → product list → floating cart button with item-count badge → tap to open full-screen cart/checkout.

-   **Drawers:** used for record detail and secondary forms on md+; on xs/sm, all drawers become full-screen sheets with a back arrow instead of a close X, to match native mobile conventions.

-   **Search:** global search/command palette (⌘K / Ctrl K) on lg+; collapses to a search icon that expands to full-width overlay on md and below.


## 5\. Navigation System

-   **Sidebar (expanded, 240px):** logo + workspace selector at top, primary nav groups (Dashboard, POS, Sales, Purchases, Inventory, Products, Customers, Suppliers, Orders, Reports, AI Center, Settings) each with a 20px icon + label, active item shown with a filled icon, indigo text, and a 3px left accent bar on an indigo-tint (#EEF2FF) row background — no heavy pill backgrounds. Bottom-pinned: user avatar + name + role, opens user menu on click.

-   **Collapsed sidebar (72px):** icon-only rail; hovering an icon reveals a floating label; a pin/expand toggle sits at the bottom of the rail. State persists per user.

-   **Top navigation bar (glass, 56px):** left = sidebar toggle + breadcrumbs; center = global search field (click or ⌘K opens command palette); right = Quick Add (+) button, notifications bell with unread badge, help icon, user menu avatar.

-   **Breadcrumbs:** Module / Sub-section / Record name, each segment clickable, current segment in Body Strong, others in Secondary text color.

-   **Quick actions (+ menu):** New Sale, New Purchase Order, New Product, New Customer, New Supplier — each with its keyboard shortcut shown inline.

-   **Keyboard shortcuts:** ⌘K/Ctrl+K command palette · N new-sale (from anywhere) · / focus global search · G then D/P/I/O/S/R module jumps (Dashboard/POS/Inventory/Orders/Sales/Reports) · Esc closes any overlay · full POS shortcut list in Section 7.

-   **Notifications:** bell opens a right-side dropdown list (grouped: Today / Earlier), each item = icon + message + relative time + unread dot; "Mark all read" footer link; critical alerts (e.g. stock-out) also surface as a dismissible top banner.

-   **User menu:** Profile, Switch workspace/store location, Theme toggle (Light/Dark/System), Keyboard shortcuts, Help center, Log out.

-   **Workspace selector:** dropdown under the logo for multi-location stores — shows store name + city, with an "Add location" action at the bottom of the list.

-   **Settings entry point:** gear icon pinned near the bottom of the sidebar, always visible regardless of collapse state.


## 6\. Dashboard Design

Layout: 4-column KPI row at top, 2-column chart row below, then a 2-column split of Top Products / Recent Sales, then a full-width Inventory Alerts strip, with a persistent right-hand Activity Feed rail on xl+ (collapses below the fold on lg and smaller).

-   **Today's Sales / Revenue / Profit / Orders (KPI cards):** each card = Micro eyebrow label, Display-size value, a small trend chip (▲/▼ % vs. yesterday in success/danger color), and a 40px inline sparkline anchored bottom-right. Cards are elevation-0 with a 1px border; on hover, elevation-1.

-   **Customers card:** new customers today + total active customers, same KPI card treatment.

-   **Inventory Alerts widget:** horizontally scrollable strip of compact alert chips (product thumbnail, name, "3 left" in warning/danger tint), "View all" link to Inventory > Low Stock filter. Empty state: green checkmark + "All stock levels healthy."

-   **Top Products widget:** ranked list (1–5), thumbnail + name + units sold + revenue, with a period selector (Today/Week/Month) in the card header.

-   **Recent Sales widget:** compact list — invoice #, customer, amount, payment method icon, time; row click opens invoice drawer; "View all sales" footer link.

-   **Purchase Summary widget:** open POs count, pending receiving count, amount due to suppliers this week — 3 mini-stat row inside one card.

-   **Quick Actions bar:** row of pill buttons under the page header — New Sale, New Purchase Order, Add Product, Add Customer — icon + label, always visible without scrolling.

-   **Charts:** Sales Trend (line/area, 7/30/90-day toggle) and Category Mix (donut) side by side; both use the chart palette from Section 2, gridlines at 10% opacity, tooltips on hover with exact values.

-   **Activity Feed:** reverse-chronological system events (sale completed, stock adjusted, PO received, customer added) — icon + one-line description + timestamp, infinite scroll.


## 7\. POS Billing Screen

**The single most important screen. Layout on desktop/POS monitor: full-height, no sidebar chrome distraction — a minimal top strip (store name, cashier, shift, Hold Bills, Settings) then a 60/40 split: left = category rail + search + product grid; right = fixed cart panel with checkout controls always visible without scrolling.**

### 7.1 Left panel — Find & Add Products

-   **Barcode scanning:** search input is auto-focused at all times and accepts raw scanner input (treated as Enter-terminated keyboard entry); a successful scan flashes the product card green and adds it to cart with a short haptic-style toast; an unrecognized barcode opens a "Product not found — Quick Add?" inline prompt.

-   **Search:** same input supports type-ahead by name/SKU, showing a dropdown of matches with thumbnail, name, price, stock count; arrow keys navigate results, Enter adds the highlighted item.

-   **Categories:** horizontal chip rail (Cosmetics, Beauty, Hair Accessories, General) above the grid, plus an "All" chip; active chip filled indigo; chips are touch-friendly (40px height) for tablet POS.

-   **Product grid:** responsive card grid (5 columns on 2xl POS monitor, 4 on desktop, 3 on tablet), each card = image, name (2-line clamp), price, stock badge (green in-stock / amber low / red out — out-of-stock cards are dimmed and not clickable); single tap/click adds 1 unit to cart.

-   **Quick Add Product:** a "+" card pinned first in the grid opens a minimal inline form (name, price, quantity, optional barcode) for one-off / unlisted items, added to cart immediately without leaving the POS screen.

-   **Stock validation:** adding beyond available stock shows an inline warning under the cart line ("Only 4 in stock") and requires explicit confirmation to oversell; disabled entirely for locations with oversell blocked in Settings.


### 7.2 Right panel — Cart & Checkout

-   **Cart list:** scrollable line items — thumbnail, name, unit price, qty stepper (–/+ plus tap-to-type), line total; swipe-left (mobile) or a trailing trash icon (desktop) removes a line.

-   **Customer selection:** pinned above the cart list — search-or-create customer field; shows loyalty/outstanding-balance chip once selected; "Walk-in" is the default with one tap.

-   **Price override:** tapping a line's price opens an inline editable field gated behind a manager-PIN if the user's role requires approval (per Settings > Roles); overridden prices show a small pencil icon and strike the original price.

-   **Discount:** per-line discount (% or ₹) via a discount icon on the line, and a cart-level discount field near the totals; applied discounts show as a deduction row in the totals summary, never silently baked into the price.

-   **Tax:** GST breakdown (CGST/SGST or IGST) auto-calculated per item's tax slab, shown as collapsible line(s) in the totals summary — collapsed by default, one tap expands the breakdown.

-   **Totals summary:** Subtotal, Discount, Tax, then Grand Total in POS Numeric Large weight — always pinned at the bottom of the cart panel, never scrolls out of view.

-   **Payment:** large tab selector — Cash / UPI / Card / Credit / Split — each tab shows the relevant sub-fields (Cash: tendered amount with quick-amount chips ₹100/₹200/₹500/Exact, auto-computed change; UPI: QR code + "Mark as paid" once confirmed; Card: terminal-linked or manual reference entry; Credit: adds to customer's outstanding balance, requires a selected customer; Split: add multiple payment rows across methods until the remaining balance reaches ₹0).

-   **Hold Bill / Resume Bill:** a "Hold" button saves the current cart with a short label/customer tag and clears the screen for the next customer; a "Held Bills (n)" button in the top strip opens a list to resume any parked cart exactly as left.

-   **Clear Cart / Cancel Sale:** both require a confirmation dialog ("Clear 4 items from cart?") — never a silent, irreversible wipe.

-   **Complete Sale:** full-width primary button, disabled until payment fully covers the total (or a valid credit customer is set); shows a loading spinner state while processing, then transitions to the Receipt screen.

-   **Receipt / Print / Invoice:** post-sale confirmation screen with a receipt preview, and three actions — Print, Send (SMS/WhatsApp/Email), New Sale; auto-returns to a fresh cart after a short countdown or on "New Sale" tap.

-   **Loading & Offline handling:** a persistent connectivity indicator dot in the top strip (green/gray/red); if offline, sales queue locally with an "Offline — will sync (n) pending" banner, printing and cash/UPI-manual flows still work, and Card/UPI-QR live flows are disabled with an explanatory inline note until reconnected.

-   **Keyboard shortcuts (POS):** F1 focus search/scanner · F2 hold bill · F3 resume bill list · F4 apply discount · F5 select customer · F9 payment · F12 / Enter-on-total complete sale · Esc cancel current dialog.


## 8\. Inventory Module

-   **Inventory Dashboard:** KPI row (Total SKUs, Stock Value, Low Stock Count, Out-of-Stock Count) + a Stock Health chart (in-stock vs low vs out, donut) + a Low Stock table preview.

-   **Product List (stock view):** data table — thumbnail, name, SKU/barcode, category, on-hand qty, reserved, available, reorder level, status badge; row click opens Product Details drawer.

-   **Filters:** category, supplier, status (In stock/Low/Out), location (multi-store), saved filter presets in a left rail or top filter bar (per Section 18).

-   **Low Stock view:** same table pre-filtered, with a "Create Purchase Order" bulk action that pre-fills a PO from the selected rows grouped by supplier.

-   **Product Details (inventory tab):** current stock by location, reorder level/point editable inline, cost & margin summary, linked supplier(s).

-   **Movement History:** chronological ledger table — date, type (Sale/Purchase/Adjustment/Return/Transfer), quantity delta (+/– colored), resulting balance, reference link (invoice/PO#), user.

-   **Stock Adjustment:** modal — reason (Damage/Theft/Recount/Other, required select), quantity delta, note field, requires the adjusting user's identity to be logged; large negative adjustments (configurable threshold) require manager approval.

-   **Barcode:** barcode field on product record with a "Generate" action for products without one, and a "Print labels" bulk action (quantity per SKU, label size selector) opening a print preview.

-   **Variant Management:** a variant matrix editor (e.g. shade/size) generating child SKUs from selected attribute combinations, each row editable for its own price/stock/barcode.

-   **Import / Export:** CSV/XLSX import wizard (3 steps: upload → map columns → review & confirm, with per-row validation errors listed before commit); Export respects current filters/columns and offers CSV/XLSX/PDF.


## 9\. Products Module

-   **List views:** toggle between Grid (image-forward cards, for visual browsing) and Table (dense, for bulk edits) — persisted per user.

-   **Search & Bulk Actions:** search bar + filter bar as in Section 18; row/card checkboxes enable a floating bulk action bar (Change category, Change status, Delete, Export) once ≥1 selected.

-   **Categories:** nested tree sidebar (Category > Subcategory) with drag-to-reorder and product counts per node.

-   **Product Detail page:** tabbed layout — Overview (images, name, description, status toggle), Pricing (cost, MRP, selling price, margin auto-calculated, tax slab), Variants, Inventory Summary (stock by location, link to full Movement History), Supplier (linked supplier(s) + last purchase cost/date), Barcode.

-   **Images:** drag-and-drop multi-image uploader with reorderable thumbnails, first image = primary/cover, 1:1 crop guide.

-   **Status:** Active / Draft / Discontinued badge-select, Discontinued products hidden from POS grid but retained in history/reports.


## 10\. Customers Module

-   **Customer Profile header:** avatar/initials, name, phone/email, tags (e.g. VIP, Wholesale), and 3 headline stats — Lifetime Value, Total Orders, Outstanding Balance (in danger tint if > 0).

-   **Tabs:** Overview, Purchase History, Payments, Requested Products, Notes.

-   **Purchase History:** table of past invoices — date, items count, amount, payment status; row opens invoice drawer.

-   **Outstanding Balance:** dedicated card with a running ledger (charge/payment rows) and a "Record Payment" action.

-   **Requested Products:** list of items the customer asked for but weren't in stock (logged from POS "Quick Add" not-found flow or manually) — status (Pending/Notified/Fulfilled), one-tap "Notify when in stock."

-   **Notes:** free-text timestamped notes feed, author-attributed, for preferences or reminders (e.g. "Prefers cash-on-delivery").

-   **Contact Information panel:** phone, email, address, WhatsApp opt-in toggle, all inline-editable.


## 11\. Supplier Module

-   **Supplier Profile header:** name, category (e.g. Cosmetics distributor), contact person, headline stats — Total Purchased, Outstanding Payable, Avg. Delivery Time.

-   **Tabs:** Overview, Purchase History, Products Supplied, Outstanding, Performance.

-   **Purchase History:** table of POs — PO#, date, items, amount, status (Draft/Sent/Partially Received/Received/Cancelled).

-   **Products Supplied:** grid/table of linked products with last cost price and last purchased date.

-   **Outstanding:** payable ledger mirroring the Customer outstanding pattern, with "Record Payment" action.

-   **Performance:** on-time delivery %, order accuracy %, price trend chart for key products — small stat cards, not heavy analytics.

-   **Contact panel:** phone, email, address, GSTIN, payment terms — inline-editable.


## 12\. Purchases Module

-   **Purchase Orders list:** table — PO#, supplier, date, items, total, status badge, expected date; filter by status/supplier/date.

-   **Create/Edit PO:** supplier selector, line-item table (product search + qty + cost price, auto-suggested from last purchase), auto-computed subtotal/tax/total, expected delivery date, notes.

-   **Approval:** POs above a configurable value threshold enter a Pending Approval status with an inline Approve/Reject action for authorized roles, plus a comment field for rejection reason.

-   **Receiving:** a dedicated Receive screen listing PO line items with an editable "Received qty" column (defaults to ordered qty), partial receiving supported (remaining stays open on the PO), discrepancy notes field, and a "Confirm Receipt" action that updates inventory in real time.

-   **Payments:** payment status per PO (Unpaid/Partial/Paid) with a record-payment action feeding the supplier's Outstanding ledger.

-   **Status pipeline:** Draft → Pending Approval → Sent → Partially Received → Received → Closed, shown as a horizontal stepper at the top of the PO detail page.


## 13\. Sales Module

-   **Sales History:** table — invoice#, date/time, customer, cashier, items, total, payment method icon, status; filters for date range, cashier, payment method, status.

-   **Invoice view:** drawer/detail showing full line items, tax breakdown, payment(s) applied, and actions — Print, Resend, Return/Refund.

-   **Returns & Refunds:** select original invoice → choose returned line items and quantities → refund method (original method / store credit / cash) → reason (required) → generates a linked credit note.

-   **Filters & Export:** standard filter bar (Section 18) plus an Export button (CSV/PDF) respecting active filters.


## 14\. Orders Module

-   **Online Orders list:** kanban-style status columns (New, Packing, Ready for Delivery, Out for Delivery, Delivered, Cancelled) with drag-between-columns, plus a table-view toggle for bulk filtering/export.

-   **Order Detail:** customer + delivery address, items, payment status, status stepper, packing checklist (tick items as packed), and a Tracking panel (courier/rider name, tracking link/number, delivery ETA).

-   **Packing:** a focused full-screen checklist mode for staff — large item rows with tap-to-check, progress bar, "Mark ready" disabled until all items checked.

-   **Delivery:** rider assignment dropdown, delivery time window, proof-of-delivery (signature/photo) capture on completion.


## 15\. Reports Module

-   **Layout:** left rail of report categories (Sales, Inventory, Purchases, Customers, Financial), main area = KPI summary row + primary chart + detail table.

-   **Date Picker:** top-right, with presets (Today, This Week, This Month, This Quarter, Custom Range) and a "Compare to previous period" toggle.

-   **Comparison:** when enabled, KPI cards show current vs. prior period with a delta chip, and charts overlay a dashed prior-period line.

-   **Filters:** category/product/location/staff filters contextual to the selected report.

-   **Export:** PDF (formatted report) and CSV/XLSX (raw data) export buttons in the page header.


## 16\. Settings Module

-   **Structure:** left-nav settings categories — Company, Users, Roles & Permissions, Taxes, Printer, POS, Theme, Notifications, Backup — each opening a form panel on the right.

-   **Company:** name, logo, address, GSTIN, multi-location list management.

-   **Users & Roles:** user table with role badge and status; Roles & Permissions as a matrix (module × action: View/Create/Edit/Delete/Approve checkboxes).

-   **Taxes:** tax slab table (name, rate, CGST/SGST split), assignable as product default.

-   **Printer & POS:** receipt printer setup (paper size, connection test), POS behavior toggles (allow oversell, require manager PIN for discount/override, default payment method).

-   **Theme:** Light / Dark / System selector with a live preview swatch.

-   **Notifications:** per-event channel toggles (in-app/email/SMS) for low stock, PO approval, payment due.

-   **Backup:** last backup timestamp, manual "Backup now" action, scheduled frequency selector, restore-from-file action gated behind confirmation.


## 17\. Component Library

All components share the token set from Section 3. Every interactive component has default, hover, active/pressed, focus-visible, and disabled states, plus a loading state where relevant.

-   **Buttons:** Primary (filled indigo), Secondary (white + border), Ghost (no border, tint on hover), Destructive (danger filled), Link. Sizes sm(32px)/md(40px)/lg(48px). Icon-only variant is square with equal padding.

-   **Inputs / Select / Dropdown:** 40px height default, 8px radius, 1px border, indigo focus ring (2px offset); Select/Dropdown open a popover (elevation-2) with search-to-filter for lists over 8 items.

-   **Cards:** 12px radius, 1px border, white surface, 16–24px padding depending on density.

-   **Badges:** pill, tint background + matching text color per semantic color (success/warning/danger/info/neutral), Micro type.

-   **Alerts / Toast:** Alerts are inline, full-width, tinted background + left icon + optional action link. Toasts appear bottom-right (top-center on mobile), auto-dismiss after 4s (errors persist until dismissed), stack up to 3 with the newest on top.

-   **Modals / Dialogs:** centered, elevation-3, 16px radius, 50% scrim backdrop, max-width 480px (confirmation) or 720px (form); destructive confirmations use a danger primary button and require typing the record name for irreversible deletes above a data-risk threshold.

-   **Tables:** full spec in Section 18.

-   **Pagination:** page-number style for reports/back-office tables, "Load more"/infinite scroll for feeds and mobile card lists.

-   **Tabs:** underline style, active tab indigo underline + Body Strong text, horizontal scroll on overflow (mobile).

-   **Accordion:** used for FAQ-style and "More details" progressive disclosure; chevron rotates 180° on expand, 150ms ease.

-   **Charts:** line, bar, donut, sparkline — palette per Section 2, no 3D effects, tooltips required on hover/tap.

-   **Calendar / Date Picker:** single date and range modes, preset shortcuts (Today, Last 7 days, This Month), keyboard arrow navigation.

-   **Search / Command Palette:** ⌘K overlay, glass surface, grouped results (Products, Customers, Orders, Actions), arrow-key navigation, recent searches when empty.

-   **Avatar / Stat Cards / Data Grid / Forms / Skeleton / Progress / Tooltip / Context Menu / Breadcrumb / Timeline / Stepper / Drawer / Sidebar / Navbar / Floating Action Button:** each follows the same token set — 1px borders over shadows, 8–12px radii, indigo for active/selected, semantic colors reserved for status only. FAB used only on mobile POS/quick-add contexts, bottom-right, 56px circular, elevation-2.


## 18\. Data Tables

-   **Sorting:** click column header to sort asc/desc, arrow indicator; shift-click for secondary sort.

-   **Filtering:** a filter bar above the table combining a search input, quick-filter chips for common fields (status, category), and an "Add filter" button opening a condition builder for advanced queries; active filters render as removable chips.

-   **Pagination:** 25/50/100 rows-per-page selector, page controls bottom-right, total-count label bottom-left.

-   **Sticky header:** header row and, where present, the leftmost identity column (e.g. product name) remain fixed on vertical/horizontal scroll.

-   **Bulk actions:** row checkboxes + header "select all"; selecting rows reveals a floating action bar above the table listing count-aware actions ("3 selected").

-   **Column visibility:** a columns icon opens a checklist to show/hide and reorder columns, persisted per user per table.

-   **Export:** exports exactly the visible columns and active filters/sort, CSV/XLSX/PDF options.

-   **Responsive behavior:** below md, tables convert to a stacked card list — primary field as card title, next 2–3 fields as labeled rows, remaining fields behind a "Show more" expand.


## 19\. Forms

-   **Validation:** inline, on blur for single fields and on submit for the full form; required fields marked with a subtle asterisk, never relying on color alone.

-   **Error state:** danger-colored 1px border + small danger text below the field with a specific, actionable message (never just "Invalid").

-   **Success state:** success-colored check icon inside the field on valid entry for fields worth confirming (e.g. barcode lookup, GSTIN validation).

-   **Autosave:** used for longer records (product edit, customer notes) — a small "Saved" / "Saving…" indicator near the form header replaces an explicit Save button where safe; destructive/financial forms (payments, adjustments) always require an explicit Save/Confirm.

-   **Loading:** submit buttons show an inline spinner and disable to prevent double-submit; the form itself stays interactive/read visible (no full-page blocking spinner) unless replacing content entirely.

-   **Focus & keyboard navigation:** logical tab order matching visual layout, Enter submits single-line forms, Esc cancels a modal form, first invalid field receives focus on failed submit.


## 20\. Search Experience

-   **Global Search / Command Palette:** ⌘K opens a grouped overlay — Actions, Products, Customers, Suppliers, Orders — top result auto-highlighted, Enter navigates or executes.

-   **Product Search:** matches name/SKU/barcode, shows thumbnail + stock in results (used identically in POS and Products module).

-   **Customer / Supplier Search:** matches name/phone/email, shows outstanding balance inline in results for fast context.


## 21\. Notifications

-   **Toast:** transient confirmations ("Product saved"), bottom-right, 4s auto-dismiss.

-   **Alerts / Warning banner:** persistent, dismissible, full-width strip below the top bar for system-wide issues (e.g. "5 products are out of stock", offline mode).

-   **Inbox:** the notification bell dropdown doubles as an inbox with Today/Earlier grouping and read/unread state.

-   **Badge:** small numeric/dot badge on bell icon and relevant sidebar items (e.g. Orders with new items).


## 22\. Loading States

-   **Skeletons:** used for first-load of tables, cards, and dashboards — gray shimmer blocks matching the real content's shape, never a generic spinner for content areas.

-   **Progress:** determinate bar for known-duration operations (import, export, backup).

-   **Spinner:** small inline spinners only inside buttons/inputs for short actions.

-   **Optimistic UI:** used for POS cart actions and stock adjustments — the UI updates immediately, with a silent background sync and a rollback + toast if the server rejects it.


## 23\. Empty States

Every empty state pairs a two-tone line illustration with a one-line headline, one-line supporting text, and a single primary action button. No empty state is ever a blank page.

-   **Products:** "No products yet" → "Add your first product" primary button (or "Import products" secondary).

-   **Inventory alerts:** "All stock levels healthy" with a green check — a positive, not neutral, empty state.

-   **Customers / Suppliers:** "No customers yet" → "Add customer."

-   **Sales / Orders history:** "No sales in this range" → "Adjust filters" secondary action.

-   **Search / filter no-results:** "No results for '…' " → "Clear filters" action.

-   **Held bills:** "No bills on hold."


## 24\. Error States

-   **404:** "Page not found" + illustration + "Back to Dashboard" button.

-   **500:** "Something went wrong" + "Retry" primary + "Contact support" secondary.

-   **Permission Denied:** "You don't have access to this" + "Request access" action (notifies an admin maker).

-   **Offline:** persistent banner (Section 7/21), non-blocking; core POS cash flow keeps working.

-   **Network error (inline):** inline alert on the affected panel only, with a "Retry" button, rather than crashing the whole page.


## 25\. Accessibility

-   **Standard:** WCAG 2.1 AA across all screens including POS.

-   **Contrast:** minimum 4.5:1 for body text, 3:1 for large text/icons; all semantic colors validated against both light and dark backgrounds.

-   **Keyboard navigation:** every action reachable without a mouse; visible focus ring (2px indigo, 2px offset) on all interactive elements; no keyboard traps in modals.

-   **Screen readers:** semantic landmarks, labeled form fields, live-region announcements for toasts and cart total changes in POS.

-   **Touch targets:** minimum 44×44px on touch surfaces (mobile, tablet POS).


## 26\. Animations

-   **Page transition:** 120ms fade + 4px slide-up, no full-page cross-fades.

-   **Hover:** 80ms ease background/border transition, no scale transforms on data-dense elements.

-   **Cards:** elevation-0 → elevation-1 on hover, 150ms.

-   **Sidebar collapse/expand:** 200ms width ease, labels fade separately from width to avoid text wrapping mid-animation.

-   **Tables:** row insert/remove fades in/out over 150ms; no animation on sort/filter re-render (instant, to avoid perceived lag on large datasets).

-   **Dialogs:** 180ms scale-from-98%-plus-fade in, 120ms fade out; backdrop fades in parallel.

-   **Overall principle:** animation durations stay under 200ms everywhere except onboarding; nothing blocks input during a running transition.


## 27\. Dark Mode

-   **Backgrounds:** App canvas #0B0E14, Card #12151C, Sunken panel #171B24.

-   **Borders:** #2A2F3A default, #3A404D hover/emphasis.

-   **Text:** Primary #F3F4F6, Secondary #9CA3AF, Disabled #6B7280.

-   **Primary accent:** #818CF8 (lightened indigo for AA contrast on dark), tint background #1E1B4B.

-   **Semantic colors:** lightened by ~10% (success #4ADE80, warning #FBBF24, danger #F87171, info #60A5FA) with dark tint backgrounds at 12% opacity of the base hue.

-   **Shadows:** replaced with a subtle lighter-border technique (borders carry more contrast weight since shadows read poorly on dark).

-   **Charts:** same categorical hues at slightly higher luminance, gridlines at 8% white opacity.


## 28\. Light Mode

Light mode is the default theme and uses the full palette defined in Section 2.2 as-is: canvas #F7F8FA, cards #FFFFFF, borders #E5E7EB, primary #4F46E5, text primary #111827 / secondary #6B7280, semantic colors and chart palette unmodified. All component specs in Section 17 are authored against this theme by default.

## 29\. Mobile Experience

-   **POS (mobile):** single-column — sticky search/scan bar at top, category chip row, scrollable product list; a floating pill "Cart (3) · ₹450" button bottom-fixed opens a full-screen cart/checkout sheet with the same payment tabs as desktop, stacked vertically.

-   **Inventory (mobile):** card-per-product list with stock badge; tapping opens a full-screen detail sheet; a scan-icon FAB opens the camera-based barcode scanner for quick lookups/adjustments.

-   **Customers (mobile):** card list (name, phone, outstanding chip); profile opens full-screen with tabs converted to a horizontally-scrollable segment control.

-   **Orders (mobile):** status-grouped list (not kanban — kanban drag doesn't translate to touch scroll well) with a status chip per card and swipe actions for next-status advance.

-   **Dashboard (mobile):** KPI cards stack 2-per-row, charts stack full-width below, Activity Feed becomes its own scrollable section rather than a side rail.


## 30\. Future AI Center

-   **Layout:** a dedicated module with a sky-blue accent (distinct from the indigo core UI, signaling "intelligence") — a conversational panel on one side, insight cards on the other.

-   **Business Insights:** auto-generated insight cards ("Sales up 18% this week, driven by Hair Accessories") each with a confidence tag and a "View data" link into the relevant report.

-   **Demand Forecast / Sales Prediction:** a forecast chart with a solid line for actuals and a dashed projected line plus a shaded confidence band.

-   **Low Stock Prediction:** a "Will run out in ~5 days" list, sortable by urgency, each row with a one-tap "Create PO" action.

-   **Natural Language Search:** a prompt input ("Show me slow-moving cosmetics this month") that returns a formatted table/chart answer inline, with a "Refine" follow-up input.

-   **AI Assistant:** a persistent chat-style panel (same visual language as the command palette) that can answer questions and take confirmed actions (e.g. draft a PO) but never executes a financial/stock-changing action without explicit user confirmation.

-   **Smart Reports:** one-click narrative summaries of a selected report ("Summarize this month's sales") rendered as a short text block above the existing chart/table, not replacing it.


## 31\. Wireframes (text)

**Dashboard**

Sidebar | Top Bar (search, quick add, bell, avatar) | KPI Row (4 cards) | Charts Row (Sales Trend, Category Mix) | Top Products + Recent Sales (2-col) | Inventory Alerts strip | Activity Feed (right rail)

**POS Billing**

Top strip (store, cashier, hold-bills, settings) | Left: search/scan bar, category chips, product grid | Right: customer select, cart list, totals summary, payment tabs, complete-sale button

**Product List**

Sidebar | Top Bar | Page header (title, New Product button) | Filter bar | Grid/Table toggle | Data table or card grid | Pagination

**Product Detail**

Sidebar | Top Bar | Breadcrumb | Header (image, name, status) | Tabs (Overview/Pricing/Variants/Inventory/Supplier/Barcode) | Tab content panel

**Inventory Dashboard**

Sidebar | Top Bar | KPI Row | Stock Health chart | Low Stock table preview | "View all" link

**Customer Profile**

Sidebar | Top Bar | Header (avatar, name, stats) | Tabs (Overview/Purchase History/Payments/Requested Products/Notes) | Tab content

**Purchase Order Detail**

Sidebar | Top Bar | Breadcrumb | Status stepper | Supplier + dates panel | Line-item table | Totals | Actions (Approve/Send/Receive/Record Payment)

**Orders (Kanban)**

Sidebar | Top Bar | View toggle (Kanban/Table) | Status columns (New/Packing/Ready/Out for Delivery/Delivered/Cancelled) with draggable order cards

**Reports**

Sidebar | Top Bar | Report category rail | Date picker + compare toggle | KPI summary row | Primary chart | Detail table | Export buttons

**Settings**

Sidebar | Top Bar | Settings category rail (Company/Users/Roles/Taxes/Printer/POS/Theme/Notifications/Backup) | Form panel

**AI Center**

Sidebar | Top Bar | Insight cards row | Forecast chart | Low Stock Prediction list | AI Assistant chat panel (right)

## 32\. Design System Structure

-   /design-system/tokens/ — colors.json, spacing.json, typography.json, radius.json, elevation.json, breakpoints.json (light + dark variants)

-   /design-system/components/ — one subfolder per component (button, input, table, card, modal, toast, ...) each with variants and states documented

-   /design-system/layouts/ — sidebar, topbar, page-shell, drawer, kanban-board, split-pane (POS)

-   /design-system/themes/ — light.json, dark.json

-   /design-system/typography/ — font files/references, type-scale.json

-   /design-system/icons/ — svg icon set, organized by category (nav, action, status, module)

-   /design-system/illustrations/ — empty-state and onboarding illustrations, two-tone SVGs

-   /design-system/assets/ — logo variants, favicons, brand marks


## 33\. Acceptance Checklist

-   Every screen uses only tokens from Section 3 — no hard-coded colors, spacing, or radii.

-   POS: a cashier can complete a cash sale of 3 items in under 15 seconds using only the keyboard/scanner.

-   All text meets WCAG 2.1 AA contrast in both Light and Dark themes.

-   Every table works on mobile via the card-list fallback with no horizontal scroll required.

-   Every empty, loading, and error state defined in Sections 22–24 exists for every list/table screen — none default to a blank white page.

-   Every destructive action requires confirmation; every irreversible action above the data-risk threshold requires typed confirmation.

-   Offline POS sales queue and sync without data loss.

-   No animation exceeds 200ms outside onboarding; no interaction is blocked during a transition.

-   Touch targets ≥44×44px on all touch surfaces; keyboard reachability verified for every action.

-   Dark and Light themes both fully specified for every screen — no module ships in one theme only.


## 34\. Final Deliverables

-   **A. Complete Design System:** Sections 2–3, 27–28.

-   **B. Complete Component Library:** Section 17.

-   **C. Complete Responsive Strategy:** Sections 4, 29.

-   **D. Complete UX Guidelines:** Sections 1, 19, 20.

-   **E. Complete Screen Specifications:** Sections 6–16, 30.

-   **F. Text Wireframes:** Section 31.

-   **G. Interaction Rules:** Sections 18, 21, 22, 26.

-   **H. Accessibility Guidelines:** Section 25.

-   **I. Animation Guidelines:** Section 26.

-   **J. Developer Handoff Notes:** Section 32 (folder structure) plus Section 33 (acceptance checklist) as the QA gate before merge.
