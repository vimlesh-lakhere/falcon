Companion to the AGS Store ERP Product Requirements Spec, the Complete Supabase Database & Backend Architecture Specification (schema/RLS/triggers source of truth), and the UI/UX & Design System Spec. This document is the production-ready backend/API blueprint — not code — for an AI coding agent to implement directly. Being built section-by-section; this pass covers Sections 1–6 (Backend Architecture through RBAC). Every API in later sections follows the same Route / Method / Request / Response / Validation / Authentication / Authorization / Business Rules / Error Responses template.

## 1\. Backend Architecture

Next.js (App Router) is the API layer in front of a single Supabase project (Postgres + Auth + Storage + Realtime + Edge Functions). There is no separate standalone API server — route handlers and server actions ARE the backend. Two execution paths exist, chosen per endpoint by whether the operation is a single-table read or a multi-table write:

-   Direct-read path — read-heavy screens (Dashboard, Product list, Sales history, Inventory overview) query Supabase directly from server components under RLS, using the anon/authenticated client. No business logic beyond filtering/sorting/pagination; RLS is the only gate.

-   Server-action write path — every write that touches more than one table (a sale writing sales + sale\_items + payments + stock\_movements; a purchase receipt writing purchase\_order\_items + stock\_movements + supplier balance) goes through a Next.js server action / route handler that runs the full layered stack: Validation → Authorization → Service → Repository → Postgres transaction → Realtime/notification side effects.


Layering (top to bottom, request flows down, response flows up):

-   **Route layer** — route handlers under /api/v1/\*, thin: parse request, call validation, call the matching service, shape the response envelope, map thrown errors to HTTP status.

-   **Validation layer** — schema validation (see Section 10) runs before any authorization or business logic executes.

-   **Authorization layer** — permission-key check resolved from the requesting user's role (Section 4/6), enforced again at the database via RLS.

-   **Service layer** — orchestrates business rules across one or more repositories inside a single Postgres transaction; the only layer allowed to make cross-table decisions (e.g. "decrement stock AND update customer total AND insert audit\_log").

-   **Repository layer** — one module per table/aggregate, the only place raw Supabase/Postgres queries are written.

-   **Data layer** — Postgres via Supabase, RLS-enforced for the direct-read path, service-role for trusted server-action writes only.


Deployment topology: the Next.js app deploys as a single service (e.g. Vercel or a Node host); Supabase hosts Postgres, Auth, Storage, Realtime, and Edge Functions as a managed project. No custom backend server, message queue, or cache is introduced at MVP — Postgres and Supabase's built-in features (triggers, Realtime, pg\_cron, Edge Functions) cover background jobs, scheduled jobs, and events.

## 2\. API Design Principles

-   **Resource-oriented, versioned routes** — every endpoint lives under /api/v1/{resource}\[/{id}\]\[/{sub-resource}\], e.g. /api/v1/products, /api/v1/purchase-orders/{id}/receive. Versioning is in the URL from day one so the Future Android customer app can adopt v1 without a rewrite, and a breaking change ships as v2 alongside it.

-   **Consistent response envelope** — every response is { "data": ..., "error": null, "meta": {...} } on success, or { "data": null, "error": { "code", "message", "field\_errors"? }, "meta": null } on failure. meta carries pagination info on list endpoints.

-   **snake\_case field names** — JSON request/response fields mirror Postgres column names exactly (matching the Database Specification) to avoid a translation layer and keep the AI coding agent's generated client code trivial to map.

-   **Pagination** — all list endpoints accept page (default 1) and page\_size (default 25, max 100) query params; response meta includes { page, page\_size, total\_count, total\_pages }. High-frequency lists (POS product search) additionally accept limit for a lighter, non-paginated top-N response.

-   **Filtering and sorting** — filters as query params named after the field (?category\_id=..., ?status=..., ?date\_from=...&date\_to=...); sorting via ?sort=field or ?sort=-field for descending. Unrecognized filter params are rejected (400), not silently ignored, to surface AI-agent/client integration bugs early.

-   **Idempotency on financial writes** — POST /sales, POST /purchase-orders/{id}/receive, and POST /purchase-orders/{id}/payments require an Idempotency-Key header; a retried request with the same key returns the original result instead of creating a duplicate sale/receipt/payment. This is the safety net for the POS "never lose a save on network retry" requirement (PRD Section 23/41.11).

-   **Soft-delete aware** — list endpoints for business records (products, customers, suppliers, categories) default to is\_active = true; an explicit ?include\_inactive=true is required to see deactivated records. Transactional records (sales, purchase orders) are never deleted, only status-transitioned (voided/cancelled).

-   **Full-resource writes** — every successful POST/PATCH/PUT returns the complete, freshly-read resource (not just an id), so the client never needs a follow-up GET.

-   **HTTP methods and status codes** — GET (200), POST create (201), PATCH partial update (200), DELETE / soft-deactivate (200 with the updated record, never 204, so the client sees the resulting is\_active state). 4xx for client/validation/auth errors, 5xx only for genuine server/database faults.


## 3\. Authentication Flow

Supabase Auth is the sole identity provider; no password ever reaches application code. Staff (Owner/Cashier) and future Customers are separate auth contexts sharing one Supabase project, distinguished by which app\_users vs customers row a given auth.users id maps to.

### 3.1 Staff login

-   POST /api/v1/auth/login { email, password } — server action calls supabase.auth.signInWithPassword, then sets the returned access + refresh tokens as httpOnly, Secure, SameSite=Lax cookies. The tokens are never returned in the JSON body to client JS.

-   Response includes the resolved app profile: { user: { id, full\_name, email, shop\_id, roles: \[...\], permissions: \[...\] } } so the client can render role-appropriate navigation immediately without a second round trip.

-   Failure: invalid credentials → 401 INVALID\_CREDENTIALS (generic message, never reveals whether the email exists). Deactivated account (is\_active = false) → 403 ACCOUNT\_DEACTIVATED.


### 3.2 Session refresh & logout

-   Middleware runs on every request to a protected route: validates the access token, transparently uses the refresh token to mint a new access token when expired, and re-sets the cookie — the client never manually calls a refresh endpoint.

-   POST /api/v1/auth/logout revokes the Supabase session server-side and clears the auth cookies.


### 3.3 Staff account provisioning (no public signup)

-   There is no public registration for staff. POST /api/v1/users (manage\_users permission required) creates the auth.users row via the Supabase Admin API (service role, server-only) and sends an invite email; the invited user sets their own password via the emailed link before first login.

-   Password policy (minimum length/complexity) and session idle-timeout duration are configured in Supabase Auth settings and Settings > Security respectively — exact values are an open question for the shop owner (PRD gap 41.9); this spec defines the hooks (Section 5), not the numbers.


### 3.4 Future customer authentication

Customer app (Future) uses the same Supabase Auth instance with self-service sign-up (email or phone OTP), mapping each auth.users row to a customers record instead of app\_users/users. Customer sessions never carry staff permissions, and staff sessions never resolve against customer-scoped RLS policies (Section 5 of the Database Specification).

## 4\. Authorization Flow

Authorization is enforced twice, deliberately redundant: once in the application layer (for correct UX — hide/disable what a user can't do, and fail fast before touching the database) and once in Postgres via Row Level Security (the actual security boundary, since a compromised or buggy client must never be able to read or write another shop's data or exceed its role).

Every authenticated request resolves a context object before any business logic runs:

```plaintext
AuthContext {
  user_id: uuid
  shop_id: uuid            // from current_shop_id() — one row per user, never trusted from client input
  role_ids: uuid[]
  permission_keys: string[] // flattened from role_permissions for all of the user's roles
}
```

Flow for a permission-gated write (e.g. price override, refund, stock adjustment, role change, manage\_users, void sale):

-   1\. Route layer resolves AuthContext from the session (never from a client-supplied header/body field).

-   2\. Service layer checks the required permission\_key is present in AuthContext.permission\_keys; if not, throws a PermissionDeniedError before any repository call — no partial side effects.

-   3\. Repository layer issues the query using a client whose RLS policy independently re-checks shop\_id = current\_shop\_id() at the database — so even a service-layer bug cannot leak cross-tenant data.

-   4\. On success, sensitive actions additionally write an audit\_log row (Section 20) inside the same transaction.


Failure mode: 403 { code: "PERMISSION\_DENIED", message: "You don't have permission to <action>." }. A missing/invalid session returns 401 { code: "UNAUTHENTICATED" } instead — the two are never conflated, since a 401 should redirect to login while a 403 should not.

## 5\. User Sessions

-   **Storage** — Supabase Auth access + refresh JWTs live only in httpOnly, Secure, SameSite=Lax cookies set by the server; never in localStorage/sessionStorage, never readable by client JS.

-   **No stale claims** — shop\_id, role, and permissions are NOT embedded in the JWT payload; they are re-resolved from users/roles/role\_permissions on every request via current\_shop\_id() and a permission-lookup query. This guarantees a role change or deactivation takes effect on the user's very next request, not only after their token expires.

-   **Concurrent sessions** — multiple simultaneous sessions per user are allowed at MVP (a cashier's POS terminal and the owner's phone are both always logged in); no single-active-session enforcement.

-   **Idle timeout** — a configurable idle-timeout (Settings > Security) invalidates the session after N minutes of inactivity; on expiry the client is redirected to /login with the originally-requested URL preserved as a redirect target. The exact default duration is an open question for the owner (ties to PRD gap 41.9).

-   **Shift vs. session** — a cashier's shift (shifts table: opening float, cash-in/out, close reconciliation) is a distinct business concept from the auth session and is tracked independently; logging out mid-shift does not close the shift, and a shift can span more than one login session.

-   **Forced logout** — deactivating a user (is\_active = false) or removing all of their roles takes effect immediately: the next request from that session is rejected with 403 ACCOUNT\_DEACTIVATED and the client force-clears local session state.


## 6\. Role Based Access Control

Roles and permissions are first-class tables (roles, permissions, role\_permissions, user\_roles per the Database Specification), not a hardcoded enum, so granularity can grow (e.g. a future Manager tier — PRD open question) without a schema migration.

### 6.1 System roles (seeded per shop)

-   **Owner** (is\_system\_role = true) — every permission key, including manage\_users and all Settings screens.

-   **Cashier** (is\_system\_role = true) — POS/product search/customer selection/payment collection by default; sensitive permission keys withheld unless the Owner grants them explicitly.

-   Custom roles (e.g. a future Manager) are created the same way — a roles row plus a role\_permissions set — with no code change required.


### 6.2 Permission keys

Base set defined in PRD gap 41.3, plus proposed additions (marked) needed to gate actions introduced elsewhere in this backend spec — confirm the additions with the owner before implementation:

-   view\_cost\_price, edit\_selling\_price, apply\_discount, override\_price, process\_refund, view\_reports, manage\_users — from the PRD.

-   Proposed: void\_sale (cancel an unpaid/in-progress sale), manage\_settings (shop profile/invoice/tax/payment methods), approve\_purchase\_order (ties to the PO-approval-threshold open question), manage\_shifts (open/close another cashier's shift), export\_data (Sales/Reports exports).


### 6.3 Enforcement points

-   **Route-level** — middleware hides/redirects entire route groups a role has no access to at all (e.g. a Cashier hitting /settings/\* gets 403 before any handler code runs).

-   **Action-level** — service layer checks the specific permission\_key for a given operation (Section 4), independent of which route it was called from.

-   **Row-level** — RLS restricts every query to shop\_id = current\_shop\_id() regardless of role; role never grants cross-tenant access.

-   **Column-level** — Postgres RLS can't restrict columns, so cost-price hiding from Cashiers is done via a products\_for\_cashier view (Database Specification Section 5); Cashier-scoped reads select from the view, Owner-scoped reads select from the base table.


### 6.4 Role/permission change auditing

Every change to a user's roles, or to a role's permission set, writes an audit\_log row (action = 'role\_change') capturing actor, before\_value, after\_value — per PRD gap 41.3, this is tracked separately from the price/stock/refund audit trail in Section 20.

-   **GET /api/v1/audit-log** — Request: query params action?, entity\_table?, entity\_id?, actor\_id?, date\_from?, date\_to?, page, page\_size. Response: paginated audit\_log rows with before\_value/after\_value jsonb diffs and the resolved actor name. Authentication: required. Authorization: view\_reports or manage\_users permission (read-only, sensitive data). Business Rules: read-only endpoint — audit\_log rows are never created or edited via this API, only inserted by services/triggers as a side effect of the action being audited. Error Responses: 401 UNAUTHENTICATED, 403 PERMISSION\_DENIED.

-   **GET /api/v1/audit-log/{entity\_table}/{entity\_id}** — convenience filter returning the full history for one record (e.g. a product's price-override history), used by detail-page "history" tabs. Same authorization as above.

-   Every service performing a sensitive action (price override, stock adjustment, refund, role/permission change, record deletion/deactivation) writes an audit\_log row inside the same transaction as the action itself — an audited action that fails to log is treated as a failed transaction, not a partial success.


## 20\. Audit Log APIs

-   **GET /api/v1/notifications** — Request: query params is\_read?, type?, page, page\_size. Response: paginated notifications rows plus meta.unread\_count. Authentication: required. Authorization: shop-scoped via RLS, no extra permission (every staff member sees their shop's notifications). Business Rules: sorted newest-first, grouped client-side into Today/Earlier per the UI/UX Spec. Error Responses: 401 UNAUTHENTICATED.

-   **PATCH /api/v1/notifications/{id}/read** — sets is\_read = true. Response: the updated notification. Validation: id must exist and belong to the caller's shop. Error Responses: 404 NOT\_FOUND.

-   **POST /api/v1/notifications/mark-all-read** — bulk-sets is\_read = true for all of the shop's unread notifications. Response: { data: { updated\_count } }.

-   Notifications are never created directly by a client — only by backend triggers/services (low\_stock, out\_of\_stock, pending\_purchase, pending\_request, payment\_due, new\_order, and near\_expiry per PRD gap 41.5), matching the PRD's requirement that alerts fire even with no client open. No public create endpoint exists.

-   Delivered in-app at MVP via the Realtime channel in Section 16; push notification and WhatsApp channels are Future (PRD Section 16/gap 41.10), added as new delivery adapters behind the same notification-creation trigger without changing this API surface.


## 19\. Notification APIs

-   **POST /api/v1/uploads** — multipart upload, { entity\_type: 'product'|'category'|'shop\_logo', entity\_id? } — Request: file + entity\_type + entity\_id. Response: { data: { url, path, entity\_type, entity\_id } }. Validation: MIME type in an allow-list (image/jpeg, image/png, image/webp), max file size (e.g. 5MB), entity\_id must belong to the caller's shop\_id if provided. Authentication: required. Authorization: matches the manage permission for entity\_type (e.g. edit\_selling\_price scope for products, manage\_settings for shop\_logo). Business Rules: stored under Supabase Storage at {shop\_id}/{entity\_type}/{entity\_id or uuid}/{filename}; on success for entity\_type='product'/'category', the service also updates that record's image\_url. Error Responses: 400 UNSUPPORTED\_FILE\_TYPE, 413 FILE\_TOO\_LARGE, 403 PERMISSION\_DENIED, 404 ENTITY\_NOT\_FOUND.

-   **DELETE /api/v1/uploads/{path}** — removes a stored file and clears the referencing image\_url. Authentication/Authorization mirror the upload. Error Responses: 404 FILE\_NOT\_FOUND, 403 PERMISSION\_DENIED.

-   Storage buckets are private by default; files are served via short-lived signed URLs generated per request, never public bucket URLs, so a deactivated user or expired session immediately loses image access.


## 18\. Storage APIs

-   PostgreSQL functions/triggers (run inside the database, called via SQL) handle derived-value recomputation and are the source of truth listed in Section 15: recompute\_product\_stock(), recompute\_customer\_totals(), plus new ones this spec requires: recompute\_supplier\_balance() (on supplier\_payments insert), recompute\_purchase\_order\_status() (draft → partially\_received → received based on quantity\_received vs. quantity\_ordered across purchase\_order\_items), and check\_low\_stock\_and\_notify() (already covered by the low-stock trigger, extended to also check product\_batches.expiry\_date for a near-expiry notification per PRD gap 41.5).

-   current\_shop\_id() and a new has\_permission(permission\_key text) SQL function (checking role\_permissions for the caller's roles) are used both inside RLS policies and inside service-layer authorization checks, so the permission model is defined once and consumed from both places.

-   Supabase Edge Functions (Deno, deployed independently of the Next.js app) are used only for work that must run outside the request/response cycle or outside Postgres's capabilities: sending the staff invite/notification emails, generating a printable PDF receipt/report, and any future webhook receiver (Section 41's payment gateway) — they are not used as a general alternative API layer.

-   pg\_cron (Supabase's scheduled-job extension) drives the Scheduled Jobs in the cross-cutting section below directly from Postgres, avoiding a separate job-scheduling service.


## 17\. Supabase Functions

-   Supabase Realtime (Postgres logical replication) broadcasts row changes on shop-scoped channels, subscribed to per shop\_id so a client only ever receives its own tenant's events — RLS applies to Realtime subscriptions the same as to queries.

-   Subscribed tables/uses: notifications (drive the bell/notification center live, Section 19), products.current\_stock (live low-stock badge on Dashboard/Inventory without polling), sales (Dashboard KPI ticks up as sales complete on other terminals), purchase\_orders/product\_requests status (multi-staff visibility into who changed what).

-   The POS Sell screen itself does not depend on Realtime for correctness — stock checks happen server-side at checkout time; Realtime is a UX convenience (live badges/counters), not a source of truth for a write decision.

-   Future: the same channels back live order-status updates for the customer app (Section 15 order lifecycle) without a new event system.


## 16\. Realtime Events

-   Every multi-table write executes inside a single Postgres transaction (via a Postgres function/RPC called from the service layer, or an explicit BEGIN/COMMIT in a server action) — a failure partway through rolls back completely, per the Database Specification's testing priority on sale-flow atomicity.

-   Canonical transactional writes: POS checkout (sales + sale\_items + payments + stock\_movements + customer totals + optional audit\_log), purchase receiving (purchase\_order\_items.quantity\_received + stock\_movements + purchase\_orders.status + supplier outstanding\_balance), returns/refunds (returns + return\_items + stock\_movements reversal + sales.status), and shift close (shifts.closed\_at/counted\_cash/expected\_cash).

-   Derived values (products.current\_stock, customers.total\_spend/outstanding\_balance, suppliers.outstanding\_balance) are written only by database triggers (Database Specification Section 4), never directly by a service — this guarantees the number is correct regardless of which transaction touched it, including future direct-to-Postgres writes from the customer app.

-   Idempotency-Key handling (Section 2) is itself transactional: the key is checked-and-inserted in the same transaction as the write it guards, closing the race window between a check and a retry arriving concurrently.


## 15\. Database Transactions

-   Defense in depth per Sections 4/6: application permission checks, RLS, and column-restricted views are all independently enforced — no single layer is trusted alone.

-   The Supabase service role key exists only in server environment variables and is used only inside trusted server actions/route handlers; it is never sent to the browser bundle or referenced in client components.

-   All input is parameterized through the Supabase client / query builder — no string-concatenated SQL anywhere in the codebase.

-   CSRF protection relies on SameSite=Lax cookies plus origin checking on state-changing requests, since auth tokens are never exposed to client JS for a script to exfiltrate.

-   Security headers (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security) are set at the edge/middleware layer for every response.

-   File uploads (Section 18/36) are restricted by MIME type and size, scanned for type mismatch (declared vs. actual), and stored under a per-shop path so RLS-equivalent access control applies to Storage the same as to Postgres.

-   PII handling: customer phone/address are stored in Postgres without additional encryption at rest at MVP (Supabase's disk-level encryption applies), scoped by RLS; whether any field needs application-level masking in staff-facing views beyond RLS row scoping is an open question (PRD gap 41.9).

-   Dependency vulnerabilities are scanned automatically in CI; Two-Factor Authentication for the Owner role is a Phase 2/Future addition (PRD gap 41.9).


## 14\. Security

-   POST /api/v1/auth/login: strict per-IP and per-email limit (e.g. a small number of attempts per minute) with exponential backoff, to blunt credential-stuffing against a small shop's staff accounts.

-   Search and barcode-lookup endpoints (Sections 34/35): a moderate per-user limit, generous enough for camera-scan burst input, to prevent runaway client loops from degrading Postgres for the whole shop.

-   Write endpoints (sales, purchase receiving): a light per-user limit as an abuse safety net, set well above realistic cashier throughput so it never interferes with legitimate POS speed requirements.

-   Exceeding a limit returns 429 { code: "RATE\_LIMITED", retry\_after\_seconds }. Exact thresholds are an implementation/ops decision, not fixed here, since they depend on the hosting platform's rate-limiting primitives (e.g. edge middleware counters).


## 13\. Rate Limiting

-   Structured JSON logs from every route handler and service call: { request\_id, timestamp, level, shop\_id, user\_id, route, action, duration\_ms, error\_code? }.

-   Log levels: debug (verbose, dev-only), info (successful requests, key business events — sale completed, PO received), warn (recoverable issues — low-stock trigger fired, idempotent replay detected), error (thrown exceptions, failed transactions).

-   No PII (customer phone/address) or secrets (tokens, service role key) are ever written to logs — log the entity id, not the payload, for customer/user records.

-   Logs stream to a centralized error-tracking/log service (PRD gap 41.11) so failures are visible to the owner/developer without depending on a cashier reporting them.


## 12\. Logging

-   Typed error classes per domain, thrown from services/repositories and caught once at the route layer: ValidationError (400), UnauthenticatedError (401), PermissionDeniedError (403), NotFoundError (404), ConflictError (409 — duplicate phone, idempotency replay mismatch), InsufficientStockError (409), InvalidStateTransitionError (409 — e.g. receiving an already-fully-received PO), and a generic InternalError (500) for anything unexpected.

-   No raw database or stack trace text ever reaches the response body; the route-layer mapper converts each typed error to { code, message } using a plain-language message, matching the PRD's requirement that cashiers/owners never see raw errors.

-   Every error response includes a request\_id (also present in the corresponding log line) so a reported issue can be traced without exposing internals to the user.

-   POS-specific: a network/save failure during checkout must not clear the in-progress cart client-side; the client retries the same Idempotency-Key up to a bounded window before surfacing a hard failure (PRD Sections 23/41.11).


## 11\. Error Handling

-   Schema-based validation (e.g. zod) with one schema per resource under lib/validation, shared between create and update where fields overlap (update schemas are the create schema with every field made optional except identifiers).

-   Validation runs first in the route layer, before authorization or any database call — a malformed request never reaches a permission check or a query.

-   Validation failure returns 400 with { code: "VALIDATION\_ERROR", field\_errors: { field\_name: "message" } } so a UI can attach the message to the exact form field.

-   Business-rule validation that needs a database lookup (duplicate phone number, stock availability, PO status transition legality) is NOT schema validation — it lives in the service layer and returns a distinct error code (e.g. DUPLICATE\_CUSTOMER\_PHONE, INSUFFICIENT\_STOCK) rather than VALIDATION\_ERROR, so clients can distinguish "fix your input" from "this conflicts with existing data".

-   Money fields validated as non-negative numeric with at most 2 decimal places; quantity fields as non-negative numeric with at most 3 decimals (matching the Database Specification's numeric(12,2)/numeric(12,3) types) to reject values Postgres would otherwise silently round.


## 10\. Validation Layer

-   One repository per table or tightly-coupled aggregate (e.g. sales + sale\_items + payments share one sales.repo.ts since they're always written together). Repositories are the only place a raw Supabase query builder or SQL string appears.

-   Every repository function accepts an explicit Supabase client instance (RLS-bound for reads, service-role for the write path inside a server action) rather than importing a global client — this makes the RLS-vs-service-role boundary visible at every call site and trivially testable.

-   Repositories never contain permission checks or cross-table orchestration — they take validated input and return rows or throw a typed database error; that error is translated to a domain error one layer up in the service.

-   Read repositories accept the same filter/sort/pagination shape used by the API layer (Section 2) so a route handler can pass query params through with minimal translation.


## 9\. Repository Layer

-   One service module per domain (products, categories, suppliers, purchases, inventory, customers, customer-requests, pos/sales, payments, reports, analytics, dashboard, notifications, audit, settings), matching the 20 API groups in Sections 21–37.

-   Services are the only layer allowed to call more than one repository or wrap a Postgres transaction — a route handler never calls two repositories directly.

-   Services own business rules that don't belong in the database: permission checks (Section 4), discount-limit enforcement, negative-stock policy, duplicate-customer prevention by phone, idempotency-key lookups.

-   A service function signature is (authContext, input) => result; it never reads cookies/headers directly — the route layer resolves AuthContext and passes it in, keeping services unit-testable without an HTTP request.

-   Cross-domain orchestration example — POS checkout service: validate cart → check permission for any price override present → open a transaction → call sales repo (insert sale + sale\_items + payments) → call inventory repo (insert stock\_movements) → call customers repo (update totals, or rely on the DB trigger from the Database Specification) → call audit repo if a price was overridden → commit → emit a Realtime event (Section 16) → return the full sale.


## 8\. Service Layer

```plaintext
app/
  api/
    v1/
      auth/{login,logout}/route.ts
      users/route.ts                    users/[id]/route.ts
      products/route.ts                 products/[id]/route.ts
      products/[id]/price-history/route.ts
      categories/route.ts               categories/[id]/route.ts
      suppliers/route.ts                suppliers/[id]/route.ts
      purchase-orders/route.ts          purchase-orders/[id]/route.ts
      purchase-orders/[id]/receive/route.ts
      purchase-orders/[id]/payments/route.ts
      inventory/movements/route.ts      inventory/adjustments/route.ts
      customers/route.ts                customers/[id]/route.ts
      customer-requests/route.ts        customer-requests/[id]/route.ts
      sales/route.ts                    sales/[id]/route.ts
      sales/[id]/returns/route.ts
      pos/hold/route.ts                 pos/resume/[id]/route.ts
      payments/route.ts
      reports/{daily,weekly,monthly,profit-loss}/route.ts
      analytics/{top-products,turnover,trends}/route.ts
      dashboard/summary/route.ts
      search/route.ts
      barcode/[code]/route.ts
      uploads/route.ts
      notifications/route.ts            notifications/[id]/read/route.ts
      audit-log/route.ts
      settings/{shop,tax,payment-methods,users,security}/route.ts
lib/
  supabase/            client.ts, server.ts, admin.ts (service role, server-only)
  services/            one file per domain: products.service.ts, pos.service.ts, purchases.service.ts, ...
  repositories/        one file per table/aggregate: products.repo.ts, sales.repo.ts, stock-movements.repo.ts, ...
  validation/          zod (or equivalent) schemas per resource: product.schema.ts, sale.schema.ts, ...
  auth/                session.ts (AuthContext resolution), permissions.ts (has_permission helper)
  audit/               audit-log.ts (write helper used by services)
  errors/              typed error classes + the route-layer error-to-HTTP mapper
  http/                response envelope builder, pagination helper
types/                 generated Supabase types + shared request/response DTOs
supabase/
  migrations/
  functions/           Edge Functions (Section 17)
  policies/            RLS policy SQL (Section 22)
  seed/
```

Extends the PRD's recommended project structure (Section 38) with the concrete API-layer breakdown. Each route handler is thin; all real logic lives in lib/services and lib/repositories so it is reusable from server components on the direct-read path.

## 7\. API Folder Structure
