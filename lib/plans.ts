export interface PricingPlan {
  id: string;
  name: string;
  durationMonths: number;
  durationLabel: string;
  days: number;
  price: number;
  originalPrice: number;
  perMonthPrice: number;
  savingsPercentage: number;
  badge?: string;
  isPopular?: boolean;
  isBestValue?: boolean;
  description: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: PricingPlan[] = [
  {
    id: "pro_1m",
    name: "Monthly Pro",
    durationMonths: 1,
    durationLabel: "1 Month",
    days: 30,
    price: 599,
    originalPrice: 699,
    perMonthPrice: 599,
    savingsPercentage: 14,
    description: "Ideal for trying out Falcon ERP for a single month with all core features.",
    features: [
      "Full Cloud ERP & Retail POS Billing",
      "Unlimited Products & Barcode Printing",
      "GST Invoices & Thermal Printer Support",
      "Real-time Inventory & Low-Stock Alerts",
      "Cash, UPI & Card Payment Recording",
      "Daily Sales & Profit Analysis",
      "1 Store / 3 Staff Accounts",
      "Standard WhatsApp Support",
    ],
  },
  {
    id: "pro_3m",
    name: "Quarterly Pro",
    durationMonths: 3,
    durationLabel: "3 Months",
    days: 90,
    price: 1499,
    originalPrice: 1797,
    perMonthPrice: 499,
    savingsPercentage: 17,
    badge: "Popular Choice",
    isPopular: true,
    description: "Great value for retail shops planning a full fiscal quarter without interruptions.",
    features: [
      "Everything in Monthly Pro",
      "Effective ₹499/month (Save ₹300)",
      "Automated Daily Cloud Backups",
      "Customer Ledger & Udhar/Khata Tracking",
      "Supplier & Purchase Order Management",
      "GST HSN Summary & Tax Export to Excel",
      "1 Store / 5 Staff Accounts",
      "Priority Phone & WhatsApp Support",
    ],
  },
  {
    id: "pro_6m",
    name: "Half-Yearly Pro",
    durationMonths: 6,
    durationLabel: "6 Months",
    days: 180,
    price: 2599,
    originalPrice: 3594,
    perMonthPrice: 433,
    savingsPercentage: 28,
    badge: "High Savings",
    description: "Recommended for busy stores wanting seamless billing across two full quarters.",
    features: [
      "Everything in Quarterly Pro",
      "Effective ₹433/month (Save ₹1,000+)",
      "Free Custom Barcode Label Setup",
      "AI Fast Stock Ingestion via Camera",
      "Multi-Counter POS Billing",
      "Comprehensive P&L & Cash Flow Reports",
      "1 Store / Unlimited Staff Accounts",
      "Dedicated Onboarding Specialist Call",
    ],
  },
  {
    id: "pro_12m",
    name: "Annual Pro (1 Year)",
    durationMonths: 12,
    durationLabel: "1 Year (12 Months)",
    days: 365,
    price: 4499,
    originalPrice: 7188,
    perMonthPrice: 374,
    savingsPercentage: 38,
    badge: "Best Value • 38% OFF",
    isBestValue: true,
    description: "The complete peace-of-mind package. Year-round 24/7 billing with maximum savings.",
    features: [
      "Everything in Half-Yearly Pro",
      "Effective just ₹374/month (Best Value)",
      "Zero Downtime Guarantee",
      "Automated Google Drive Cloud Sync",
      "Custom Bill Header & Store Branding",
      "Free Barcode Scanner Hardware Consultation",
      "Unlimited Staff & Cashier Logins",
      "Direct 24/7 VIP WhatsApp & Phone Support",
    ],
  },
];

export const LIFETIME_PLAN = {
  id: "pro_lifetime",
  name: "Lifetime Enterprise License",
  durationMonths: 0,
  durationLabel: "Lifetime Access",
  days: 99999,
  price: 14999,
  originalPrice: 24999,
  savingsPercentage: 40,
  badge: "One-Time Payment",
  description: "Pay once and own the cloud software forever with lifetime updates and zero annual renewals.",
};
