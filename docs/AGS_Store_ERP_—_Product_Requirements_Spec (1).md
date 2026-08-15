This is a first structured pass at the full specification requested, organized so it can be handed to an engineering team or an AI coding agent. Every ambiguous business rule is called out as an Open Question rather than invented. MUST-HAVE (MVP) items are separated from FUTURE items throughout.

## 1\. Product Vision

AGS Store ERP turns a manual, paper-and-memory-driven wholesale/retail shop into a modern digital business: fast checkout, organized inventory and purchasing, tracked customers and requests, and eventually a customer-facing ordering app — all on one connected data model so nothing is re-entered twice.

## 2\. Business Goals

-   Eliminate checkout queuing delays through fast POS billing.

-   Stop stockouts and overstock via real-time inventory visibility and low-stock alerts.

-   Never lose a customer product request again.

-   Give the owner a single daily view of sales, profit, and what needs attention.

-   Lay a backend foundation that a future customer-facing app can reuse without rebuilding.


## 3\. User Personas

### Shop Owner / Admin

Non-technical, time-constrained, needs the dashboard to answer "what's happening in my business today" at a glance. Full access to every module, including settings, roles, and the AI Center.

### Staff / Cashier

Focused on speed and accuracy during checkout. Needs a distraction-free POS screen and only the inventory/customer access their role grants.

### Future Customer

Shops occasionally or regularly for cosmetics/personal-care items; wants to check availability, order, and track status without calling the shop.

## 4\. User Journeys

### Owner — morning check-in (MVP)

1.  Opens dashboard on phone or desktop.

2.  Reviews today's sales, low-stock items, and pending orders/requests.

3.  Acts on the highest-priority alert (e.g. reorders a low-stock product).


### Cashier — walk-in sale (MVP)

1.  Opens POS, scans or searches products.

2.  Selects or skips customer, applies any authorized discount.

3.  Takes payment (cash/UPI/card), prints/generates receipt.


### Customer — unavailable product (MVP)

1.  Asks staff for a product that's out of stock.

2.  Staff logs a Customer Product Request with quantity and priority.

3.  Staff updates status as it's ordered, arrives, and the customer is notified.


### Customer — online order (Future)

1.  Browses/searches the catalog in the customer app.

2.  Adds items to cart, chooses delivery or pickup, places order.

3.  Tracks order status through to delivery.


## 5\. Complete Feature Hierarchy

-   Dashboard — sales/profit summary, alerts, quick actions (MVP)

-   POS/Billing — checkout, payments, holds, returns (MVP)

-   Products — catalog, pricing, variants, stock levels (MVP)

-   Inventory — stock movements, adjustments, valuation (MVP)

-   Categories — category/subcategory management (MVP)

-   Suppliers — profiles, purchase & payment history (MVP)

-   Purchases — purchase orders, receiving, payment tracking (MVP)

-   Customers — profiles, history, pricing, notes (MVP)

-   Customer Product Requests — request lifecycle tracking (MVP)

-   Sales — invoice history, returns/refunds, exports (MVP)

-   Orders — online order lifecycle (Future, backend-ready in MVP)

-   Analytics — trends, top products, turnover (Phase 2)

-   Reports — daily/weekly/monthly, P&L, tax-ready (Phase 2)

-   Notifications — low stock, orders, requests, payments (MVP: in-app; Future: push/WhatsApp)

-   AI Center — natural-language business Q&A over ERP data (Phase 2/Future)

-   Settings — shop profile, invoice/tax, roles, printers, backup (MVP: core subset; advanced items Future)


## 6\. Functional Requirements (by module, MVP unless marked Future)

-   Dashboard: show today's sales, orders, revenue, profit, low-stock count, pending purchases, pending customer orders, top sellers, recent transactions.

-   POS: search by name/SKU/barcode; camera-based barcode scan; add/remove/adjust line items; walk-in or selected customer; customer-specific pricing; discount entry; multiple payment methods per sale; hold and resume a bill; authorized price override; auto-calculated totals; generate a receipt; refund/return against a past invoice.

-   Products: full CRUD with SKU, barcode, category, brand, purchase/selling/wholesale/minimum prices, current & minimum stock, supplier, image, description, unit, variants, active/inactive flag, stock & price history.

-   Inventory: record stock in/out/adjustment/damage/return; low-stock and out-of-stock alerts; movement history; inventory valuation; bulk operations.

-   Categories: CRUD with subcategories, images, product counts, active/inactive status.

-   Suppliers: profile with contact/GST; linked products; purchase and payment history; outstanding balance.

-   Purchases: create PO against a supplier; add line items with quantity/price/discount; receive stock in full or partial; track supplier payments against POs.

-   Customers: profile with contact/address; order & purchase history; total spend; outstanding balance; customer-specific pricing; notes; linked product requests.

-   Customer Product Requests: capture customer, product, quantity, date, expected price, priority, and status (Requested → Searching → Ordered from supplier → Available → Customer notified → Completed/Cancelled).

-   Sales: list/filter invoices by date, customer, payment method; show items, discounts, profit; support returns/refunds; export.

-   Orders (Future customer app, backend modeled in MVP): Pending → Confirmed → Preparing → Ready → Out for delivery → Delivered / Cancelled / Returned.

-   Notifications: trigger on low/out-of-stock, new customer order, pending purchase, pending request, payment due.

-   Settings: shop profile, invoice numbering/format, tax/GST rate configuration, payment method list, user accounts and role assignment.


## 7\. Non-Functional Requirements

-   Performance: POS actions (search, add to cart, checkout) must feel instant — target sub-second UI response for local operations.

-   Availability: business data must survive owner/staff device loss (server-backed, not local-only).

-   Auditability: price overrides, stock adjustments, refunds, and record deletions are logged with who/when/what-changed.

-   Responsiveness: usable on phone (owner monitoring), tablet (POS), and desktop (back-office).

-   Data isolation: one shop's data must never be visible to another tenant if the platform later serves multiple shops.

-   Accessibility: legible type sizes and sufficient contrast for non-technical, possibly older, staff.


## 8\. Information Architecture

Two top-level applications sharing one backend:

-   Owner/Staff Web App: Dashboard, POS, Products, Inventory, Categories, Suppliers, Purchases, Customers, Requests, Sales, Orders, Analytics, Reports, Notifications, AI Center, Settings.

-   Customer App (Future): Home/Browse, Search, Product Detail, Cart, Checkout, Order Tracking, Order History, Requests, Account.


Navigation model: a persistent sidebar (desktop) / bottom nav (mobile) for the owner app, grouped as Overview (Dashboard), Sell (POS, Sales, Orders), Stock (Products, Inventory, Categories, Purchases, Suppliers), People (Customers, Requests), Insights (Analytics, Reports, AI Center), Admin (Settings).

## 9\. Page/Screen Hierarchy (owner/staff app, MVP)

-   Login → Dashboard

-   POS: Sell screen → Hold list → Invoice/Receipt view → Returns

-   Products: List → Detail/Edit → New → Stock & Price history

-   Inventory: Stock overview → Stock movement log → Adjustment form

-   Categories: List → Detail/Edit → New

-   Suppliers: List → Detail (profile, purchase history, payments) → New

-   Purchases: List → New PO → Receive stock → Payment tracking

-   Customers: List → Detail (history, requests, pricing, notes) → New

-   Requests: List (by status) → Detail → New

-   Sales: List/Filter → Invoice detail

-   Orders: List (by status) → Detail

-   Settings: Shop profile, Invoice & tax, Payment methods, Users & roles, Notifications, Backup, Printer


## 10\. Detailed Module Specifications

See sections 6, 11–15 for behavior; see section 18 for the underlying data model each module reads/writes.

## 11\. POS Workflow (MVP)

1.  Cashier opens Sell screen; default state is an empty cart with the search bar focused.

2.  Cashier searches or scans a product; matching item(s) appear for one-tap add.

3.  Cart line items support quantity change, removal, and (if authorized) price override.

4.  Cashier optionally selects a registered customer, which applies customer-specific pricing if configured.

5.  Cashier applies a discount if authorized.

6.  Totals (subtotal, discount, tax placeholder, grand total) recalculate live.

7.  Cashier selects payment method(s) and confirms; sale is recorded and stock is decremented.

8.  Receipt is generated (on-screen/print now; Bluetooth thermal printing is Future).

9.  Cashier may instead Hold the current cart to serve another customer, then Resume it later.

10.  Returns: cashier looks up a past invoice and processes a partial or full return, restoring stock.


Open question: does AGS Store need per-line tax rates now, or a single shop-wide rate for MVP?

## 12\. Inventory Workflow (MVP)

1.  Stock changes (sale, purchase receipt, adjustment, damage, return) each write a stock-movement record; current stock is derived, not hand-edited.

2.  When a product's stock crosses its minimum threshold, a low-stock alert is raised on the Dashboard and Notifications.

3.  The system surfaces a replenishment suggestion per low-stock product: current quantity, a recommended order quantity, preferred supplier and contact, last purchase price, and last purchase date.


Open question: what formula should drive "recommended order quantity" (e.g. days-of-cover vs. fixed reorder point)? Not specified in the brief — needs an owner decision before implementation.

## 13\. Purchase Workflow (MVP)

1.  Staff creates a Purchase Order against a supplier, adding products with quantity and purchase price.

2.  PO is saved with a total (discount and tax-ready fields included, even if unused at MVP).

3.  Stock is received against the PO — fully or partially — which increments Product stock via a stock-movement record.

4.  Supplier payments are recorded and tracked against the PO, updating the supplier's outstanding balance.


## 14\. Customer Workflow (MVP)

1.  Staff creates or selects a Customer record during a sale or independently.

2.  Customer profile accumulates order history, total spend, and outstanding balance automatically from Sales.

3.  Staff can set customer-specific pricing and add free-text notes.

4.  Staff can log a Product Request tied to the customer (see section below), viewable from the customer's profile.


## 15\. Online Order Workflow (Future, backend modeled now)

1.  Customer places an order in the customer app; it enters as Pending.

2.  Staff confirms (Confirmed), begins fulfilling (Preparing), marks Ready, then Out for delivery or ready for pickup, then Delivered.

3.  Cancelled/Returned are terminal states reachable from earlier stages per business rule (exact allowed transitions are an open question).


Open question: is pickup a distinct status/flow from delivery, or a flag on the same order?

## 16\. Notification Architecture

-   MVP: in-app notification center covering low/out-of-stock, pending purchases, pending customer requests, new customer orders (once orders exist), payment due.

-   Notifications are generated by backend triggers (e.g. a stock-movement bringing quantity below minimum) rather than client polling, so they fire even if no one has the app open.

-   Future: push notifications and WhatsApp integration for owner alerts and customer order updates.


## 17\. Role and Permission Model

-   Owner/Admin: full access to all modules including Settings, user management, and AI Center.

-   Staff/Cashier: POS, product search, customer selection/creation, payment collection, receipt printing; inventory and customer data access limited by permission flags (e.g. can view but not edit cost prices).

-   Customer (Future): scoped entirely to their own account, orders, cart, and requests — no back-office access.


Open question: does AGS Store need more than these two staff-side roles at MVP (e.g. a manager tier with purchase approval rights but no settings access)?

## 18\. Database Entities and Relationships

Core entities and their primary relationships (PostgreSQL, one shop = one tenant to start, tenant\_id ready for multi-shop later):

-   shops (tenant root) 1—\* users, products, customers, suppliers, categories

-   users (owner/staff accounts) \*—\* roles/permissions

-   categories 1—\* products (self-referencing for subcategories)

-   suppliers 1—\* purchase\_orders; suppliers 1—\* products (preferred supplier)

-   products 1—\* product\_variants; products 1—\* stock\_movements; products 1—\* price\_history

-   purchase\_orders 1—\* purchase\_order\_items; purchase\_orders 1—\* supplier\_payments

-   customers 1—\* sales; customers 1—\* product\_requests; customers 1—\* orders (Future)

-   sales 1—\* sale\_items; sales 1—\* payments; sales 1—\* returns

-   product\_requests → customers, products (nullable if product doesn't exist yet)

-   orders (Future) 1—\* order\_items; orders → customers

-   audit\_log records changes to price, stock, refunds, and deletions across the above tables


## 19\. Supabase / PostgreSQL Architecture

-   PostgreSQL via Supabase as the single source of truth; every table scoped by shop\_id/tenant\_id from day one.

-   Supabase Auth for owner/staff login now, and customer login later, likely as separate auth contexts (staff vs. customer) sharing the same project.

-   Supabase Storage for product images and shop logo, organized per-tenant in folder paths.

-   Row Level Security (see section 22) enforced at the database layer, not just in application code.

-   Database functions/triggers for derived values (e.g. recomputing current stock from stock\_movements, updating customer totals from sales) to keep numbers consistent regardless of which client writes them.


## 20\. API Architecture

-   Next.js server actions / route handlers as the API layer in front of Supabase, so business rules (e.g. stock decrement on sale) are enforced server-side, not left to direct client writes.

-   A versioned, documented API surface for POS and inventory operations, designed so the future Android customer app can consume the same endpoints rather than a bespoke mobile API.

-   Read-heavy screens (dashboard, analytics) can query Supabase directly under RLS; write operations that touch multiple tables (a sale affecting stock, customer totals, and the invoice) go through server actions for atomicity.


## 21\. Security Model

-   Authentication via Supabase Auth; passwords never handled by application code directly.

-   Authorization enforced twice: role checks in the application layer for UX, and RLS policies in Postgres as the real boundary.

-   Sensitive actions (price override, refund, stock adjustment, user role change) require an authorized role and are written to the audit log.

-   Secrets (API keys, service role key) never exposed to the browser bundle.


## 22\. RLS Strategy

-   Every tenant-scoped table has a policy restricting rows to the requesting user's shop\_id.

-   Staff-role policies further restrict column-level visibility where needed (e.g. cost price) using views or column-level grants, since RLS is row-level.

-   Customer-facing tables (Future) get their own policies scoping a customer to only their own orders, cart, and requests.

-   Service-role bypass is used only in trusted server actions, never client-side.


## 23\. Error Handling

-   User-facing errors are translated into plain language (no raw database/stack errors surfaced to cashiers or the owner).

-   Network/save failures during a sale must not silently lose the cart — retry and preserve local cart state until confirmed saved.

-   Validation errors (e.g. negative stock, missing required field) block submission with an inline message at the field.


## 24\. Loading / Empty / Error States

-   Loading: skeleton placeholders for lists/tables and the dashboard; POS search shows a lightweight spinner only, never a full-screen block.

-   Empty: first-run empty states for Products, Customers, Suppliers, Requests, Sales, Orders each with a clear call-to-action to create the first record.

-   Error: a retry-capable inline error state for failed loads; a distinct "you're offline" state for POS is called out separately in section 26.


## 25\. Responsive UX Strategy

-   POS: optimized first for tablet/desktop with a keyboard-friendly flow (barcode scanner as keyboard-wedge input, hotkeys for common actions); still usable on a phone screen for a single-cashier setup.

-   Owner back-office screens (Dashboard, Reports, Analytics): mobile-first for on-the-go monitoring, with denser desktop layouts for deep work (Products, Purchases).

-   Tables collapse to card layouts below a breakpoint rather than horizontal-scrolling grids.


## 26\. Offline Strategy

-   MVP: the app assumes connectivity but should fail gracefully — a lost connection during POS shows a clear "reconnecting" state and never loses an in-progress cart.

-   Future: local persistence of an in-progress cart and queued sales while offline, with automatic sync and conflict resolution (e.g. stock reconciliation) once connectivity returns.


Open question: what should happen if two devices sell the last unit of a product while both are offline? Needs a business rule (e.g. last-write-wins with a flagged discrepancy) before Future offline sync is built.

## 27\. Backup / Recovery Strategy

-   Rely on Supabase's managed automated backups as the baseline; confirm retention window meets the business's risk tolerance.

-   Periodic export of critical tables (products, customers, sales) as an owner-triggerable safety net, independent of the platform backup.

-   Documented recovery runbook: how to restore from backup and reconcile any sales made between the last backup and an incident.


## 28\. AI Center Architecture

-   The AI Center answers natural-language questions strictly by querying the ERP's own structured data (sales, stock, customers, purchases) — not as a general-purpose chatbot.

-   Pattern: user question → query planner maps it to one or more predefined analytical queries (low stock, top sellers, profit-by-period, best customers, etc.) → results are summarized in natural language with the underlying numbers.

-   Starts read-only in Phase 2; write-capable suggestions (e.g. "create this purchase order for me") are a Future extension once the query layer is trusted.


## 29\. Future Android Architecture

-   Android customer app consumes the same versioned API/server actions as the web customer app — no parallel backend.

-   Push notifications (order status, request updates) via a standard mobile push provider, triggered by the same backend events that drive in-app notifications today.

-   Shared design tokens/component logic where feasible between web and native to keep the two experiences consistent.


## 30\. Testing Strategy

-   Unit tests for stock/price calculation logic (cart totals, stock decrement/increment, low-stock threshold detection) — these are the highest-risk-of-silent-bug areas.

-   Integration tests for the full sale flow (cart → payment → stock update → invoice) and the purchase-receiving flow.

-   RLS policy tests to confirm one shop's data is never readable by another tenant.

-   Manual UAT with actual shop staff on the POS flow before go-live, given the non-technical user base.


## 31\. Acceptance Criteria (MVP examples)

-   A cashier can complete a walk-in sale with at least two payment methods combined, and stock decrements correctly.

-   A low-stock product triggers a dashboard alert with a replenishment suggestion including recommended quantity, preferred supplier, and last purchase price.

-   A customer product request logged as Requested can be progressed through every defined status to Completed or Cancelled without data loss.

-   A staff user without price-override permission cannot change a selling price at checkout.


## 32\. MVP Definition

MUST-HAVE for v1 launch:

-   Dashboard (core metrics + alerts)

-   POS/Billing (search, scan, cart, payments, hold/resume, receipt, returns)

-   Products, Categories, Inventory (with movement history and low-stock alerts + replenishment suggestion)

-   Suppliers and Purchases (PO creation, receiving, payment tracking)

-   Customers and Customer Product Requests (full status lifecycle)

-   Sales history with filters

-   Core Settings (shop profile, invoice numbering, tax rate, users & two roles)

-   In-app notifications for the alert types listed in section 16


Explicitly OUT of MVP:

-   Online customer ordering and the customer app

-   Analytics and Reports modules (beyond what's on the Dashboard)

-   AI Center

-   Bluetooth thermal printing, barcode-scanner hardware integrations beyond camera scan

-   Offline sync, multi-branch/multi-warehouse, loyalty/promotions, WhatsApp integration


## 33\. Phase 2 Features

-   Analytics module (trends, top/slow products, turnover, AOV, payment-method breakdown)

-   Reports module (daily/weekly/monthly, P&L, tax-ready, supplier/customer reports)

-   AI Center (read-only Q&A over ERP data)

-   Bluetooth thermal printer support


## 34\. Future Roadmap

-   Customer shopping app (web, then Android)

-   Delivery management and order tracking

-   Multiple staff roles/permission granularity, multiple branches/warehouses

-   WhatsApp integration, online payments

-   Offline-capable POS with sync

-   Loyalty, promotions, offers, customer segmentation

-   Write-capable AI actions


## 35\. Risks and Mitigations

-   Risk: staff resistance to a new system after years of manual billing → Mitigate with a POS flow that's faster than pen-and-paper from day one, plus hands-on training.

-   Risk: data-model changes late in development are costly once real sales data exists → Mitigate by finalizing sections 18/22 before building Phase 4.

-   Risk: scope creep from the very long feature list → Mitigate by holding the line on the MVP definition in section 32.

-   Risk: offline gaps causing lost sales during connectivity drops → Mitigate with the graceful-degradation behavior in section 26 even before full offline sync is built.


## 36\. Development Milestones (sequencing, not dates)

1.  Finalize this PRD and resolve the open questions flagged throughout.

2.  Design information architecture and screen flows (Phase 2).

3.  Build and review the database schema and RLS policies (Phase 3) before any UI work starts.

4.  Build the ERP web app module-by-module in MVP order: Products/Categories/Inventory → Suppliers/Purchases → Customers/Requests → POS/Billing → Dashboard/Sales/Settings.

5.  Harden POS: printing, scanning, edge cases (Phase 5).

6.  Add Analytics, Reports, AI Center (Phase 6).

7.  Build the customer shopping application (Phase 7).

8.  Layer in advanced automation, AI, and scale features (Phase 8).


## 37\. Recommended Technology Stack

-   Frontend: Next.js, React, TypeScript, Tailwind CSS

-   Backend/data: Supabase (PostgreSQL, Auth, Storage, RLS), Next.js server actions for multi-table writes

-   Future mobile: Android app (or React Native/Expo, if cross-platform reuse is preferred — open question to decide before Phase 7)


## 38\. Recommended Project Folder Structure

```text
app/
  (owner)/
    dashboard/
    pos/
    products/
    inventory/
    categories/
    suppliers/
    purchases/
    customers/
    requests/
    sales/
    orders/
    analytics/
    reports/
    ai-center/
    settings/
  (customer)/            # Phase 7
    browse/ cart/ orders/ account/
components/
  ui/                    # shared design-system primitives
  pos/ inventory/ customers/ ...  # feature-specific components
lib/
  supabase/              # client, server, admin instances
  actions/               # server actions per module
  validation/            # shared schema validation
  audit/                 # audit-log helpers
types/
supabase/
  migrations/
  policies/
  seed/
```

## 39\. Data Flow Diagrams (described in text)

### Sale flow

Cashier action (POS UI) → server action validates cart & stock → writes sale + sale\_items + payments → writes stock\_movements (decrement) → recalculates product current\_stock and customer totals → returns invoice to UI → dashboard/analytics read the same tables on next load.

### Purchase receiving flow

Staff creates purchase\_order + items → supplier notified out-of-band (manual, MVP) → staff marks items received (full/partial) → server action writes stock\_movements (increment) → updates purchase\_order status and outstanding supplier balance.

### Low-stock alert flow

Any stock\_movement write → database trigger recomputes current\_stock → if below minimum\_stock, trigger inserts a notification row and a low-stock flag read by the Dashboard and Inventory screens.

## 40\. Screen-by-Screen Requirements (MVP set)

-   Dashboard: metric cards (sales, orders, revenue, profit), low-stock list with quick reorder action, pending purchases list, pending requests list, top sellers, recent transactions, quick-action buttons (New Sale, New Purchase, New Product).

-   POS Sell screen: search/scan bar, product results grid, cart panel with line-item controls, customer picker, discount field, payment method selector, Hold/Charge buttons.

-   Product List/Detail: filterable table; detail view shows all fields from section 3 (Products) plus stock and price history tabs.

-   Inventory Overview: current stock table with low/out-of-stock filters; movement log with type/date/quantity/reason.

-   Supplier Detail: contact/GST info, linked products, purchase history table, outstanding balance, payment history.

-   Purchase Order: supplier selector, line-item builder, totals, Save/Receive actions, partial-receiving state.

-   Customer Detail: contact info, order/purchase history, total spend, outstanding balance, custom pricing, notes, linked requests.

-   Request List/Detail: status-grouped list; detail with customer, product, quantity, date, expected price, priority, status stepper.

-   Sales List/Detail: filterable by date/customer/payment method; detail shows full invoice with items, discounts, profit, and a Return action.

-   Settings screens: Shop profile, Invoice & tax, Payment methods, Users & roles, Notifications, Backup, Printer — each a simple form, not a multi-step wizard.


## Summary of Open Questions

-   Tax/GST: single shop-wide rate vs. per-product rates for MVP?

-   Replenishment formula for "recommended order quantity."

-   Whether a manager-tier role is needed beyond Owner/Staff for MVP.

-   Exact allowed order-status transitions for the Future online-order flow, and whether pickup is a distinct flow from delivery.

-   Conflict-resolution rule for offline sales of the same last unit across two devices (Future).

-   Whether the future mobile app should be native Android or a cross-platform framework.


# 41\. Gap Analysis — Missing Requirements & Additions

Added after architect review of sections 1–40. Existing requirements are left as-is; this section only adds what was missing. Grouped by domain, then split MUST-HAVE MVP vs Phase 2/Future so scope stays controlled.

## 41.1 Workflow Gaps

### MVP

-   Refund/return authorization: define who can approve a refund and whether refunded amount can go to a different payment method than the original (e.g. cash refund for a card sale).

-   Shift/cash-drawer workflow: opening float, cash-in/cash-out during a shift, and end-of-shift reconciliation (expected vs counted cash) — not covered anywhere in sections 2/11.

-   Void/cancel an in-progress (not-yet-paid) sale, distinct from a Return against a completed sale.

-   Product Request → Purchase linkage: when staff moves a request to 'Ordered from supplier', it should optionally attach to a Purchase Order line rather than being tracked as free text.


### Phase 2 / Future

-   Purchase return-to-supplier workflow (defective/excess stock sent back), including its own stock-movement type and credit-note tracking against the supplier balance.

-   Physical stock count / cycle count workflow reconciling counted quantity against system stock, generating an adjustment.


## 41.2 Database / Data Model Additions

### MVP

-   payments: sale\_id, method, amount, reference\_no — needed because POS supports multiple payment methods per sale (a split payment is one sale with several payment rows), which section 18 doesn't make explicit.

-   product\_variants: attribute name/value (e.g. size, shade) plus its own SKU/barcode/price/stock deltas — section 18 lists the table but not its shape.

-   roles and permissions as first-class tables (role\_id, permission\_key) rather than a hardcoded two-role enum, so the open question in 17 can resolve without a schema change later.

-   shifts: opened\_by, opened\_at, opening\_float, closed\_at, counted\_cash, expected\_cash — backs the new cash-drawer workflow above.

-   notifications: type, entity\_reference, message, is\_read, created\_at — referenced conceptually in section 16 but never modeled.

-   units: unit name and, if the shop sells both by piece and by box/pack, a conversion factor — cosmetics/personal-care stock is frequently sold in both.

-   batch\_no and expiry\_date on stock\_movements or a dedicated product\_batches table — cosmetics and personal-care products commonly carry shelf-life; this is not in section 3 (Products) or 18 at all.


### Phase 2 / Future

-   tax\_rates: for when GST becomes per-product rather than shop-wide (see open question in 11).

-   discounts/promotions and loyalty\_points tables.

-   warehouses/branches and a stock\_by\_location join, ahead of the multi-branch future item in section 34.

-   cart and cart\_items (customer app), addresses (delivery), delivery\_zones.


## 41.3 Role & Permission Additions

### MVP

-   Explicit permission list, not just two named roles: view\_cost\_price, edit\_selling\_price, apply\_discount, override\_price, process\_refund, view\_reports, manage\_users. Staff/Cashier in section 17 is described narratively; an implementer needs this as a concrete, assignable set.

-   Audit log entries specifically for permission/role changes to a user account (who granted what, when) — section 21 covers price/stock/refund audit but not user-permission changes.


### Phase 2 / Future

-   A Manager role (between Owner and Cashier) once the open question in section 17 is answered — e.g. can approve purchase orders and refunds above a threshold but can't touch Settings.


## 41.4 POS Requirement Additions

### MVP

-   Split payment structure: a single sale can carry 2+ payment rows summing to the total — make this explicit as a requirement, not just implied by 'multiple payment methods'.

-   Duplicate-scan behavior: scanning/adding the same product again increments its existing cart line quantity rather than creating a duplicate line.

-   Negative-stock sale policy: does the system block a sale that would take stock below zero, warn and allow (backorder), or allow silently? Currently unspecified — flagged as an open question.

-   Invoice numbering scheme: sequential per shop, format, and whether it resets yearly — needed before Settings > Invoice numbering (section 40) can be built.

-   Discount limits: a maximum discount percentage/amount cashiers can apply without owner override, tying into the authorized-override permission in 41.3.


### Phase 2 / Future

-   Integrated card/UPI payment gateway capture (vs. manually recording that a card/UPI payment was taken) — today's requirement only records the method, not a gateway integration.


## 41.5 Inventory Requirement Additions

### MVP

-   Expiry/batch tracking for perishable-adjacent cosmetics stock (see 41.2), including a near-expiry alert alongside the low-stock alert in section 12.

-   Inventory valuation method: FIFO, weighted-average, or last-purchase-price — section 10/18 mention 'inventory valuation' as a feature without naming the method, which changes the calculation logic.


### Phase 2 / Future

-   Stock transfer between branches/warehouses once multi-branch (section 34) is built.


## 41.6 Supplier / Purchase Requirement Additions

### MVP

-   Multiple suppliers per product with a preferred/default flag, so the replenishment suggestion in section 12 can name a preferred supplier when more than one supplies the same item.

-   Purchase order approval threshold: does every PO need owner sign-off, or only above a value the owner sets? Unspecified today.


### Phase 2 / Future

-   Advance/partial payment to a supplier before stock is received, distinct from the payment tracked after receiving in section 13.


## 41.7 Customer Requirement Additions

### MVP

-   Duplicate-customer prevention by phone number at creation time — walk-in-heavy POS use makes accidental duplicate customer records likely.

-   Credit limit / outstanding-balance ceiling if the shop extends credit to customers, since section 8/32 track an outstanding balance but never say whether it's capped or interest/terms apply.


### Phase 2 / Future

-   Customer segmentation/tagging ahead of the loyalty/segmentation future item in section 34.


## 41.8 Reporting Requirement Additions

### Phase 2

-   Export formats per report: CSV for raw data, PDF for owner-facing/printable reports (e.g. daily sales, P&L).

-   GST/tax report format needs the applicable jurisdiction's exact filing format confirmed with the owner before building — flagged as an open question, not assumed.


### Future

-   Scheduled report delivery (e.g. emailed daily sales summary) once notification channels beyond in-app exist.


## 41.9 Security Requirement Additions

### MVP

-   Session timeout and password policy (minimum length/complexity) for owner and staff accounts — not stated in section 21.

-   PII handling for customer phone/address: confirm whether any field needs encryption at rest or masking in staff-facing views beyond RLS row scoping.


### Phase 2 / Future

-   Two-factor authentication for the Owner/Admin role.


## 41.10 Notification Requirement Additions

### MVP

-   Read/unread state per notification and a way to mark all as read, so the in-app notification center in section 16 has defined interaction behavior, not just trigger conditions.


### Phase 2 / Future

-   Per-channel notification preferences (in-app vs. email vs. WhatsApp) once those channels exist.


## 41.11 Offline / Error-Handling Additions

### MVP

-   A named strategy for the 'graceful degradation' in section 26: queue the in-progress sale locally and auto-retry submission for a bounded window (e.g. a couple of minutes) before surfacing a hard failure to the cashier.

-   Centralized error logging/monitoring (e.g. an error-tracking service) so failures are visible to the owner/developer without depending on a cashier reporting them.


## 41.12 Future Customer-Ordering Additions

### Future

-   Delivery zone/radius and any minimum order value for delivery vs. pickup.

-   Guest checkout vs. mandatory registration for the customer app.

-   Cart abandonment handling (e.g. how long an unpurchased cart is held).

-   Online payment gateway choice for customer orders, separate from the in-store POS payment methods in section 2.


## Updated Summary of Open Questions (adds to the list in section 40)

-   Negative-stock sale policy: block, warn-and-allow, or allow silently?

-   Inventory valuation method: FIFO, weighted-average, or last-purchase-price?

-   Purchase order approval threshold, if any.

-   Customer credit limit policy, if credit is extended at all.

-   GST/tax report filing format and jurisdiction to confirm before building tax-ready reports.
