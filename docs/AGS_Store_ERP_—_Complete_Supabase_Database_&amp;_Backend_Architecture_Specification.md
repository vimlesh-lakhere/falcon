Companion to the AGS Store ERP Product Requirements Spec (sections 18–22, 41.2, 41.3, 41.9). This document turns those requirements into an implementable Supabase/PostgreSQL schema, RLS strategy, and API/security architecture that an AI coding agent can build against directly. MVP tables are separated from Phase 2/Future tables.

## 1\. Tenancy Model

Every business table carries a shop\_id foreign key to shops, even though AGS Store runs a single shop today. This makes multi-branch/multi-tenant support (section 34) additive later instead of a migration that touches every table.

```sql
create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  address text,
  phone text,
  gst_number text,
  created_at timestamptz not null default now()
);
```

## 2\. Core MVP Tables

### 2.1 Users, Roles & Permissions

Modeled as first-class tables (gap 41.3) rather than a hardcoded enum, so role granularity can grow without a schema change.

```sql
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  shop_id uuid not null references shops(id),
  full_name text not null,
  email text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  name text not null, -- 'Owner', 'Cashier', later 'Manager'
  is_system_role boolean not null default false
);

create table permissions (
  key text primary key -- 'view_cost_price','edit_selling_price','apply_discount',
  -- 'override_price','process_refund','view_reports','manage_users'
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_key text not null references permissions(key),
  primary key (role_id, permission_key)
);

create table user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (user_id, role_id)
);
```

### 2.2 Categories, Products, Variants

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  parent_category_id uuid references categories(id),
  name text not null,
  image_url text,
  is_active boolean not null default true
);

create table units (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  name text not null,           -- 'piece','box','pack'
  base_unit_id uuid references units(id),
  conversion_factor numeric     -- e.g. 1 box = 12 pieces
);

create table products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  category_id uuid references categories(id),
  supplier_id uuid references suppliers(id),
  name text not null,
  sku text,
  barcode text,
  brand text,
  unit_id uuid references units(id),
  purchase_price numeric not null default 0,
  selling_price numeric not null default 0,
  wholesale_price numeric,
  minimum_selling_price numeric,
  current_stock numeric not null default 0, -- maintained by triggers, never written directly by clients
  minimum_stock numeric not null default 0,
  image_url text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  attribute_name text not null,  -- e.g. 'Shade', 'Size'
  attribute_value text not null,
  sku text,
  barcode text,
  price_delta numeric not null default 0,
  current_stock numeric not null default 0
);

create table product_batches ( -- gap 41.2: expiry/batch tracking
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  batch_no text,
  expiry_date date,
  quantity numeric not null default 0
);

create table price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  changed_by uuid not null references users(id),
  old_price numeric,
  new_price numeric,
  price_type text not null, -- 'selling','purchase','wholesale'
  changed_at timestamptz not null default now()
);
```

### 2.3 Inventory Movements

```sql
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  product_id uuid not null references products(id),
  variant_id uuid references product_variants(id),
  movement_type text not null, -- 'sale','purchase_receipt','adjustment','damage','return_in','return_out'
  quantity_delta numeric not null, -- signed: positive = stock in, negative = stock out
  reference_table text,        -- 'sales','purchase_orders', etc.
  reference_id uuid,
  batch_id uuid references product_batches(id),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);
-- current_stock on products/variants is recomputed by a trigger on insert, never written directly.
```

### 2.4 Suppliers & Purchases

```sql
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  name text not null,
  phone text,
  address text,
  gst_number text,
  outstanding_balance numeric not null default 0
);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  supplier_id uuid not null references suppliers(id),
  status text not null default 'draft', -- 'draft','partially_received','received','cancelled'
  total_amount numeric not null default 0,
  discount_amount numeric not null default 0,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity_ordered numeric not null,
  quantity_received numeric not null default 0,
  unit_price numeric not null
);

create table supplier_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references purchase_orders(id),
  supplier_id uuid not null references suppliers(id),
  amount numeric not null,
  method text not null,
  paid_at timestamptz not null default now()
);
```

### 2.5 Customers & Product Requests

```sql
create table customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  name text not null,
  phone text, -- unique per shop_id to prevent duplicates (gap 41.7)
  address text,
  total_spend numeric not null default 0,
  outstanding_balance numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (shop_id, phone)
);

create table customer_prices (
  customer_id uuid not null references customers(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  price numeric not null,
  primary key (customer_id, product_id)
);

create table product_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  customer_id uuid not null references customers(id),
  product_id uuid references products(id), -- nullable: product may not exist in catalog yet
  requested_product_name text,
  quantity numeric not null default 1,
  expected_price numeric,
  priority text not null default 'normal',
  status text not null default 'requested',
  -- 'requested','searching','ordered_from_supplier','available','customer_notified','completed','cancelled'
  purchase_order_item_id uuid references purchase_order_items(id), -- gap 41.1 request→PO linkage
  created_at timestamptz not null default now()
);
```

### 2.6 Sales, Payments, Returns

```sql
create table sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  invoice_number text not null, -- sequential per shop; format/reset policy is an open question
  customer_id uuid references customers(id), -- null for walk-in
  cashier_id uuid not null references users(id),
  subtotal numeric not null,
  discount_amount numeric not null default 0,
  tax_amount numeric not null default 0,
  total_amount numeric not null,
  status text not null default 'completed', -- 'held','completed','voided'
  created_at timestamptz not null default now(),
  unique (shop_id, invoice_number)
);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  variant_id uuid references product_variants(id),
  quantity numeric not null,
  unit_price numeric not null, -- price actually charged, post-override
  is_price_overridden boolean not null default false,
  overridden_by uuid references users(id)
);

create table payments ( -- gap 41.2: split-payment support
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  method text not null, -- 'cash','upi','card','other'
  amount numeric not null,
  reference_no text
);

create table returns (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id),
  processed_by uuid not null references users(id),
  reason text,
  refund_method text,
  total_refund numeric not null,
  created_at timestamptz not null default now()
);

create table return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references returns(id) on delete cascade,
  sale_item_id uuid not null references sale_items(id),
  quantity numeric not null
);
```

### 2.7 Shifts, Notifications, Audit Log

```sql
create table shifts ( -- gap 41.1/41.2: cash-drawer reconciliation
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  opened_by uuid not null references users(id),
  opened_at timestamptz not null default now(),
  opening_float numeric not null default 0,
  closed_at timestamptz,
  expected_cash numeric,
  counted_cash numeric
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  type text not null, -- 'low_stock','out_of_stock','pending_purchase','pending_request','payment_due','new_order'
  entity_table text,
  entity_id uuid,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  actor_id uuid not null references users(id),
  action text not null, -- 'price_override','stock_adjustment','refund','delete','role_change'
  entity_table text not null,
  entity_id uuid not null,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);
```

## 3\. Phase 2 / Future Tables

-   tax\_rates(id, shop\_id, name, rate, applies\_to) — needed only if GST moves from shop-wide to per-product (open question).

-   discounts / promotions, loyalty\_points — backs future loyalty and promotions.

-   warehouses(id, shop\_id, name) and stock\_by\_location(warehouse\_id, product\_id, quantity) — ahead of multi-branch.

-   orders(id, shop\_id, customer\_id, status, ...) and order\_items(...) — the online-order lifecycle from section 15; status enum matches Pending→Confirmed→Preparing→Ready→Out for delivery→Delivered/Cancelled/Returned.

-   cart(id, customer\_id) and cart\_items(cart\_id, product\_id, quantity) — customer app.

-   addresses(id, customer\_id, label, line1, line2, city, pincode) and delivery\_zones(id, shop\_id, name, radius\_km) — delivery/pickup for the customer app.


## 4\. Derived-Value Triggers

Current stock, customer totals, and supplier balances must never be written directly by the client — they are recomputed by triggers so numbers stay consistent no matter which client (POS, purchase screen, future customer app) causes the change.

```sql
-- Recompute product current_stock whenever a stock_movement is inserted
create or replace function recompute_product_stock() returns trigger as $$
begin
  update products
    set current_stock = current_stock + new.quantity_delta
    where id = new.product_id;

  -- low-stock notification
  insert into notifications (shop_id, type, entity_table, entity_id, message)
  select p.shop_id, 'low_stock', 'products', p.id,
         'Low stock: ' || p.name || ' (' || p.current_stock || ' left)'
  from products p
  where p.id = new.product_id and p.current_stock <= p.minimum_stock;

  return new;
end;
$$ language plpgsql;

create trigger trg_stock_movement_recompute
  after insert on stock_movements
  for each row execute function recompute_product_stock();

-- Recompute customer totals whenever a sale completes
create or replace function recompute_customer_totals() returns trigger as $$
begin
  if new.customer_id is not null and new.status = 'completed' then
    update customers
      set total_spend = total_spend + new.total_amount
      where id = new.customer_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_sale_customer_totals
  after insert on sales
  for each row execute function recompute_customer_totals();
```

## 5\. Row Level Security (RLS) Strategy

Every tenant-scoped table gets a policy keyed on shop\_id, resolved from the requesting user's JWT via a helper function. Column-level restrictions (e.g. hiding cost price from Cashiers) are handled with a view or column grants, since RLS itself is row-level, not column-level.

```sql
create or replace function current_shop_id() returns uuid as $$
  select shop_id from users where id = auth.uid();
$$ language sql stable;

alter table products enable row level security;
create policy products_tenant_isolation on products
  for all using (shop_id = current_shop_id());

-- Repeat the same pattern for every tenant-scoped table:
-- categories, suppliers, purchase_orders, customers, sales, stock_movements, ...

-- Column-level cost-price hiding for Cashiers: expose a view instead of the base table
create view products_for_cashier as
  select id, shop_id, name, sku, barcode, selling_price, current_stock, category_id
  from products;
-- Cashier-role clients query products_for_cashier; Owner/Admin clients query products directly.
```

-   Service-role key (bypasses RLS) is used only inside trusted Next.js server actions, never sent to the browser.

-   Customer-facing tables (Future) get their own policies scoping a customer to rows where customer\_id = auth.uid() equivalent in the customer auth context.


## 6\. API Architecture

-   Next.js server actions front every multi-table write (a sale touching sales, sale\_items, payments, and stock\_movements atomically) so business rules are enforced server-side, never left to direct client table writes.

-   Read-heavy screens (Dashboard, Product list, Sales history) query Supabase directly under RLS for speed; only writes and cross-table reads go through server actions.

-   API surface is versioned from day one (e.g. /api/v1/...) even though only the owner/staff web app consumes it at MVP, so the future Android customer app in section 29 can reuse it without a rewrite.


## 7\. Security Model Recap

-   Supabase Auth handles all authentication; no password ever touches application code.

-   Sensitive actions (price override, refund, stock adjustment, role change) require the matching permission key and always write an audit\_log row.

-   Session timeout and a minimum password policy should be configured in Supabase Auth settings before launch (gap 41.9) — exact values are an open question for the owner.

-   Secrets (service role key) live only in server environment variables, never in client bundles.


## 8\. Backend Testing Priorities

-   Trigger correctness: stock\_movements → products.current\_stock recomputation, including concurrent inserts.

-   RLS isolation: a second shop's user must get zero rows querying another shop's tenant-scoped tables.

-   Atomicity of the sale server action: a failure partway through (e.g. after sale\_items insert but before stock\_movements insert) must roll back completely, never leave stock or totals half-updated.
