# Falcon — AGS Store ERP System

A modern, production-grade, AI-powered Retail and Wholesale ERP web application designed for **AGS Store**, built on **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL)**.

---

## 🚀 Live Supabase Infrastructure

- **Project Name:** `falcon`
- **Project ID / Ref:** `knbabffighhuguxsdtzj`
- **Region:** `ap-south-1` (Mumbai, India)
- **Status:** `ACTIVE_HEALTHY`
- **Database Engine:** PostgreSQL with UUID, pgcrypto, Automated Derived-Value Stock Triggers, and RLS policies.
- **REST / Realtime Endpoint:** `https://knbabffighhuguxsdtzj.supabase.co`

---

## 📦 Implemented Modules & Features

1. **POS / Billing Station (`/pos`)**
   - Barcode scanning & quick keyboard search (SKU / Barcode / Name).
   - Real-time customer selection with **special wholesale pricing overrides**.
   - Line-item price overrides & cart discounts.
   - Multi-tender split payment options (Cash, UPI QR, Card).
   - Bill Hold & Resume functionality.
   - Instant printable receipt modal.

2. **Dashboard (`/`)**
   - Real-time gross sales, net profit, low-stock alerts count, pending orders.
   - Recent transactions table and quick-action shortcuts.

3. **Products & Catalog (`/products`)**
   - Product catalog with brand, category, cost price, retail price, and wholesale price.
   - Add/Edit product modal with barcode assignment and reorder threshold alert configuration.

4. **Inventory & Stock Ledger (`/inventory`)**
   - Real-time audit trail of all stock movements (sales, purchases, damages, corrections).
   - Automated stock decrement triggers upon POS billing.
   - Manual stock adjustment & inventory count reconciliation modal.

5. **Purchases & Receiving (`/purchases`)**
   - Purchase order creation against registered vendors.
   - Stock receiving workflow with automatic inventory replenishment.

6. **Sales & Invoices (`/sales`)**
   - Historical invoice search by invoice number and customer.
   - Invoice detail inspection & duplicate receipt reprinting.

7. **Customers & Custom Pricing (`/customers`)**
   - Customer profiles, contact details, total spend, and balance tracking.
   - Custom wholesale locked price configuration per customer.

8. **Customer Product Requests (`/requests`)**
   - Out-of-stock sourcing request tracker with lifecycle statuses (`Requested` → `Searching` → `Ordered from Supplier` → `Available in Store` → `Customer Notified` → `Completed`).

9. **Suppliers & Remittances (`/suppliers`)**
   - Vendor directory, GST details, and outstanding payables.
   - Supplier payment recording (Bank Transfer, UPI, Cheque, Cash).

10. **Financial Reports & P&L (`/reports`)**
    - Gross Revenue, Cost of Goods Sold (COGS), Gross Profit, Margin %, and Category velocity.
    - GST Output Tax Summary breakdown.

11. **Falcon AI Business Intelligence Center (`/ai-center`)**
    - Conversational AI agent over live PostgreSQL ERP data for replenishment insights, sales margin summaries, and customer behavior analysis.

12. **Store Settings (`/settings`)**
    - Shop profile, GST number, thermal receipt layout, and role permission matrices.

---

## 🛠️ Running the Application Locally

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev

# 3. Open in browser
# Visit http://localhost:3000
```
