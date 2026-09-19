export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Shop {
  id: string;
  name: string;
  slug?: string | null;
  business_type?: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  gst_number: string | null;
  currency: string;
  plan?: "trial" | "pro" | "enterprise" | "lifetime" | string;
  trial_ends_at?: string | null;
  data_retention_until?: string | null;
  is_active?: boolean;
  status?: "trial_active" | "trial_expired" | "active" | "suspended" | "purged" | string;
  owner_name?: string | null;
  owner_email?: string | null;
  service_type?: "erp" | "pos" | "custom-web" | "all" | string;
  subscription_starts_at?: string | null;
  subscription_ends_at?: string | null;
  subscription_duration_months?: number | null;
  subscription_amount?: number | null;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  business_name?: string | null;
  phone: string;
  email?: string | null;
  service: "all" | "erp" | "pos" | "custom-web" | string;
  message?: string | null;
  status: "new" | "trial_active" | "contacted" | "negotiating" | "won" | "lost" | "expired" | string;
  store_id?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  data_retention_until?: string | null;
  deal_value?: number | null;
  admin_notes?: string | null;
  last_contacted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  shop_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Role {
  id: string;
  shop_id: string;
  name: string;
  is_system_role: boolean;
  created_at: string;
}

export interface Permission {
  key: string;
  description: string | null;
}

export interface Category {
  id: string;
  shop_id: string;
  parent_category_id: string | null;
  name: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Unit {
  id: string;
  shop_id: string;
  name: string;
  base_unit_id: string | null;
  conversion_factor: number;
}

export interface Supplier {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  outstanding_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  category_id: string | null;
  supplier_id: string | null;
  name: string;
  name_hindi?: string | null;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  unit_id: string | null;
  purchase_price: number;
  mrp?: number | null;
  selling_price: number;
  wholesale_price: number | null;
  wholesale_min_qty?: number | null;
  minimum_selling_price: number | null;
  current_stock: number;
  minimum_stock: number;
  image_url: string | null;
  description: string | null;
  is_online?: boolean;
  online_price?: number | null;
  is_active: boolean;
  created_at: string;
  category?: Category;
  supplier?: Supplier;
  unit?: Unit;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  attribute_name: string;
  attribute_value: string;
  sku: string | null;
  barcode: string | null;
  price_delta: number;
  current_stock: number;
}

export interface ProductBatch {
  id: string;
  product_id: string;
  batch_no: string | null;
  expiry_date: string | null;
  quantity: number;
}

export interface StockMovement {
  id: string;
  shop_id: string;
  product_id: string;
  variant_id: string | null;
  movement_type: 'sale' | 'purchase_receipt' | 'adjustment' | 'damage' | 'return_in' | 'return_out';
  quantity_delta: number;
  reference_table: string | null;
  reference_id: string | null;
  batch_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  product?: Product;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  opening_balance?: number;
  total_spend: number;
  outstanding_balance: number;
  notes: string | null;
  created_at: string;
}

export interface CustomerPayment {
  id: string;
  shop_id: string;
  customer_id: string;
  amount: number;
  payment_method: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other' | string;
  reference_no: string | null;
  notes: string | null;
  payment_date: string;
  created_at: string;
  customer?: Customer;
}

export interface CustomerLedgerEntry {
  id: string;
  date: string;
  type: 'sale' | 'payment' | 'return' | 'opening';
  reference_no: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
  payment_method?: string | null;
  notes?: string | null;
}

export interface CustomerPrice {
  customer_id: string;
  product_id: string;
  price: number;
}

export interface PurchaseOrder {
  id: string;
  shop_id: string;
  supplier_id: string;
  order_number: string;
  status: 'draft' | 'partially_received' | 'received' | 'cancelled';
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  product?: Product;
}

export interface SupplierPayment {
  id: string;
  shop_id: string;
  purchase_order_id: string | null;
  supplier_id: string;
  amount: number;
  method: string;
  reference_no: string | null;
  notes: string | null;
  paid_at: string;
}

export interface ProductRequest {
  id: string;
  shop_id: string;
  customer_id: string;
  product_id: string | null;
  requested_product_name: string | null;
  quantity: number;
  expected_price: number | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'requested' | 'searching' | 'ordered_from_supplier' | 'available' | 'customer_notified' | 'completed' | 'cancelled';
  purchase_order_item_id: string | null;
  notes: string | null;
  created_at: string;
  customer?: Customer;
  product?: Product;
}

export interface Sale {
  id: string;
  shop_id: string;
  invoice_number: string;
  customer_id: string | null;
  cashier_id: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'completed' | 'held' | 'voided' | 'pending' | 'received' | 'confirmed' | 'packing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  notes: string | null;
  created_at: string;
  customer?: Customer;
  items?: SaleItem[];
  payments?: Payment[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  cost_price: number;
  is_price_overridden: boolean;
  overridden_by: string | null;
  product?: Product;
  unit_name?: string;
  unit_multiplier?: number;
  base_quantity?: number;
}

export interface Payment {
  id: string;
  sale_id: string;
  method: 'cash' | 'upi' | 'card' | 'other';
  amount: number;
  reference_no: string | null;
}

export interface Return {
  id: string;
  sale_id: string;
  shop_id: string;
  processed_by: string | null;
  reason: string | null;
  refund_method: string | null;
  total_refund: number;
  created_at: string;
  sale?: Sale;
  items?: ReturnItem[];
}

export interface ReturnItem {
  id: string;
  return_id: string;
  sale_item_id: string;
  quantity: number;
  refund_amount: number;
}

export interface Shift {
  id: string;
  shop_id: string;
  opened_by: string | null;
  opened_at: string;
  opening_float: number;
  closed_at: string | null;
  expected_cash: number | null;
  counted_cash: number | null;
  notes: string | null;
}

export interface Notification {
  id: string;
  shop_id: string;
  type: 'low_stock' | 'out_of_stock' | 'pending_purchase' | 'pending_request' | 'payment_due' | 'new_order';
  entity_table: string | null;
  entity_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  shop_id: string;
  actor_id: string | null;
  action: string;
  entity_table: string;
  entity_id: string;
  before_value: Json | null;
  after_value: Json | null;
  created_at: string;
}

export interface DemandNote {
  id: string;
  shop_id: string;
  item_name: string;
  quantity?: string | null;
  group_name: string; // "General" or Party / Supplier Name
  supplier_id?: string | null;
  supplier_phone?: string | null;
  notes?: string | null;
  status: 'pending' | 'ordered' | 'fulfilled';
  is_done: boolean;
  priority?: 'normal' | 'urgent';
  created_at: string;
  updated_at?: string;
  supplier?: Supplier;
}

