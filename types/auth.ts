export type UserRole =
  | 'Owner'
  | 'Admin'
  | 'Manager'
  | 'Cashier'
  | 'Inventory Staff'
  | 'Accountant'
  | 'Sales Staff'
  | 'Delivery Partner'
  | 'Customer';

export interface Store {
  id: string;
  name: string;
  slug: string | null;
  business_type: string;
  gst_number: string | null;
  logo_url: string | null;
  website: string | null;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  store_id: string;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_main_branch: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  store_id: string | null;
  branch_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  store?: Store;
  branch?: Branch;
}

export interface UserSession {
  id: string;
  user_id: string;
  store_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  is_active: boolean;
  last_activity_at: string;
  expires_at: string;
  created_at: string;
}

export interface LoginHistoryItem {
  id: string;
  user_id: string | null;
  email: string;
  ip_address: string | null;
  user_agent: string | null;
  location: string | null;
  status: 'success' | 'failed' | 'blocked';
  failure_reason: string | null;
  created_at: string;
}

export interface DeviceItem {
  id: string;
  user_id: string;
  device_fingerprint: string;
  device_name: string;
  is_trusted: boolean;
  last_used_at: string;
  created_at: string;
}
