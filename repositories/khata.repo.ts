import { supabase } from "@/lib/supabase/client";
import { Customer, CustomerPayment, CustomerLedgerEntry, Supplier, SupplierPayment, Sale, PurchaseOrder } from "@/types/database";

export interface CustomerKhataSummary {
  customer: Customer;
  totalPurchases: number;
  totalPaid: number;
  currentDue: number;
  totalBillsCount: number;
  lastPaymentDate: string | null;
  lastSaleDate: string | null;
  entries: CustomerLedgerEntry[];
}

export interface ShopKhataStats {
  totalCustomerDue: number;
  dueCustomersCount: number;
  totalCustomersCount: number;
  todayCollections: number;
  thisMonthCollections: number;
  totalSupplierPayable: number;
  dueSuppliersCount: number;
}

export const khataRepository = {
  /**
   * Get all customers with their Khata / Udhaar balance
   */
  async getCustomersWithKhata(
    shopId: string,
    options: { search?: string; filter?: "all" | "due_only" | "cleared" } = {}
  ): Promise<Customer[]> {
    let query = supabase
      .from("customers")
      .select("*")
      .eq("shop_id", shopId)
      .order("outstanding_balance", { ascending: false })
      .order("name", { ascending: true });

    if (options.search?.trim()) {
      const s = options.search.trim();
      query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%`);
    }

    if (options.filter === "due_only") {
      query = query.gt("outstanding_balance", 0);
    } else if (options.filter === "cleared") {
      query = query.lte("outstanding_balance", 0);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Customer[]) || [];
  },

  /**
   * Get overall summary stats for store Khata dashboard (Total Market Udhaar, Collections, Payables)
   */
  async getShopKhataStats(shopId: string): Promise<ShopKhataStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // These three reads are independent — run them together so the Khata page opens faster.
    const [{ data: customersData, error: custError }, { data: paymentsData, error: payError }, { data: suppliersData }] =
      await Promise.all([
        supabase.from("customers").select("id, outstanding_balance").eq("shop_id", shopId),
        supabase.from("customer_payments").select("amount, payment_date").eq("shop_id", shopId).gte("payment_date", startOfMonth),
        supabase.from("suppliers").select("id, outstanding_balance").eq("shop_id", shopId),
      ]);

    if (custError) throw custError;

    let totalCustomerDue = 0;
    let dueCustomersCount = 0;
    const totalCustomersCount = (customersData || []).length;

    (customersData || []).forEach((c) => {
      const bal = Number(c.outstanding_balance) || 0;
      if (bal > 0) {
        totalCustomerDue += bal;
        dueCustomersCount += 1;
      }
    });

    let todayCollections = 0;
    let thisMonthCollections = 0;

    if (!payError && paymentsData) {
      paymentsData.forEach((p) => {
        const amt = Number(p.amount) || 0;
        thisMonthCollections += amt;
        if (p.payment_date >= startOfToday) {
          todayCollections += amt;
        }
      });
    }

    let totalSupplierPayable = 0;
    let dueSuppliersCount = 0;
    (suppliersData || []).forEach((s) => {
      const bal = Number(s.outstanding_balance) || 0;
      if (bal > 0) {
        totalSupplierPayable += bal;
        dueSuppliersCount += 1;
      }
    });

    return {
      totalCustomerDue,
      dueCustomersCount,
      totalCustomersCount,
      todayCollections,
      thisMonthCollections,
      totalSupplierPayable,
      dueSuppliersCount,
    };
  },

  /**
   * Fetch full date-wise ledger statement for a customer (Sales debits, Payments credits, Returns)
   */
  async getCustomerLedger(customerId: string): Promise<CustomerKhataSummary> {
    // Customer info + their sales + their repayments are independent reads — fetch together.
    const [{ data: customerData, error: custErr }, { data: salesData, error: salesErr }, { data: paymentsData, error: payErr }] =
      await Promise.all([
        supabase.from("customers").select("*").eq("id", customerId).single(),
        supabase
          .from("sales")
          .select("*, payments:payments(*), items:sale_items(quantity, unit_price, product:products(name))")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: true }),
        supabase
          .from("customer_payments")
          .select("*")
          .eq("customer_id", customerId)
          .order("payment_date", { ascending: true }),
      ]);

    if (custErr || !customerData) throw custErr || new Error("Customer not found");
    const customer = customerData as Customer;
    if (salesErr) throw salesErr;
    if (payErr) throw payErr;

    const rawEntries: Array<{
      id: string;
      date: string;
      type: "opening" | "sale" | "payment" | "return";
      reference_no: string;
      description: string;
      debit: number;
      credit: number;
      payment_method?: string | null;
      notes?: string | null;
    }> = [];

    // Optional opening balance entry
    const openingBal = Number(customer.opening_balance) || 0;
    if (openingBal > 0) {
      rawEntries.push({
        id: `opening-${customer.id}`,
        date: customer.created_at,
        type: "opening",
        reference_no: "OPENING-BAL",
        description: "पूर्व खाता शेष / Opening Balance (Notebook Migration)",
        debit: openingBal,
        credit: 0,
        notes: "Old balance carried forward",
      });
    }

    let totalPurchases = 0;
    let totalPaid = 0;
    let lastSaleDate: string | null = null;
    let lastPaymentDate: string | null = null;

    // Process sales
    (salesData || []).forEach((sale: any) => {
      const totalAmount = Number(sale.total_amount) || 0;
      totalPurchases += totalAmount;
      lastSaleDate = sale.created_at;

      const salePayments = sale.payments || [];
      const paidAtCounter = salePayments.reduce(
        (sum: number, p: any) => sum + (Number(p.amount) || 0),
        0
      );
      totalPaid += paidAtCounter;

      const payMethods = salePayments.map((p: any) => String(p.method || "cash").toUpperCase()).join(", ");

      const itemsDesc = (sale.items || [])
        .map((it: any) => `${it.product?.name || "Item"} x${it.quantity}`)
        .slice(0, 3)
        .join(", ");

      // Bill Debit entry (Full Bill Amount)
      rawEntries.push({
        id: `sale-${sale.id}`,
        date: sale.created_at,
        type: "sale",
        reference_no: sale.invoice_number,
        description: `बिक्री / Sale Invoice #${sale.invoice_number}${itemsDesc ? ` (${itemsDesc})` : ""}`,
        debit: totalAmount,
        credit: 0,
        notes: sale.notes || undefined,
      });

      // If customer made partial or full payment at counter, record payment credit entry
      if (paidAtCounter > 0) {
        rawEntries.push({
          id: `counter-pay-${sale.id}`,
          date: sale.created_at,
          type: "payment",
          reference_no: `RCPT-${sale.invoice_number}`,
          description: `बिल पर जमा / Paid at Counter (${payMethods || "CASH"})`,
          debit: 0,
          credit: paidAtCounter,
          payment_method: payMethods,
          notes: `Instant counter tender for #${sale.invoice_number}`,
        });
      }
    });

    // Process customer khata payments / vasooli
    (paymentsData || []).forEach((cp: any) => {
      const amt = Number(cp.amount) || 0;
      totalPaid += amt;
      lastPaymentDate = cp.payment_date;

      rawEntries.push({
        id: `cp-${cp.id}`,
        date: cp.payment_date,
        type: "payment",
        reference_no: cp.reference_no || `KHATA-PAY-${cp.id.slice(0, 6)}`,
        description: `उधार वसूली / Khata Payment (${(cp.payment_method || "CASH").toUpperCase()})`,
        debit: 0,
        credit: amt,
        payment_method: cp.payment_method,
        notes: cp.notes || undefined,
      });
    });

    // Sort all entries chronologically
    rawEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let running = 0;
    const computedEntries: CustomerLedgerEntry[] = rawEntries.map((item) => {
      running = running + item.debit - item.credit;
      return {
        ...item,
        running_balance: Math.max(0, running),
      };
    });

    return {
      customer,
      totalPurchases,
      totalPaid,
      currentDue: Number(customer.outstanding_balance) || Math.max(0, running),
      totalBillsCount: (salesData || []).length,
      lastPaymentDate,
      lastSaleDate,
      entries: computedEntries,
    };
  },

  /**
   * Record a payment collected from customer towards their Khata balance
   */
  async recordCustomerPayment(payload: {
    shop_id: string;
    customer_id: string;
    amount: number;
    payment_method: string;
    reference_no?: string;
    notes?: string;
    payment_date?: string;
  }): Promise<{ payment: CustomerPayment; newBalance: number }> {
    if (!payload.customer_id) throw new Error("Customer ID is required");
    if (!payload.amount || payload.amount <= 0) throw new Error("Payment amount must be greater than 0");

    // 1. Insert into customer_payments
    const { data: paymentData, error: payError } = await supabase
      .from("customer_payments")
      .insert([
        {
          shop_id: payload.shop_id,
          customer_id: payload.customer_id,
          amount: payload.amount,
          payment_method: payload.payment_method.toLowerCase(),
          reference_no: payload.reference_no || null,
          notes: payload.notes || null,
          payment_date: payload.payment_date || new Date().toISOString(),
        },
      ])
      .select("*, customer:customers(*)")
      .single();

    if (payError) throw payError;

    // customer_payments has no balance trigger, so lower the customer's outstanding balance here.
    const { data: currentCust, error: fetchErr } = await supabase
      .from("customers")
      .select("outstanding_balance")
      .eq("id", payload.customer_id)
      .single();

    if (fetchErr) throw fetchErr;

    // Do NOT clamp at 0: paying more than the due leaves a NEGATIVE balance = the customer's advance
    // / credit, which automatically offsets their next udhaar bill.
    const currentBal = Number(currentCust?.outstanding_balance) || 0;
    const newBalance = Math.round((currentBal - payload.amount) * 100) / 100;

    const { error: updateErr } = await supabase
      .from("customers")
      .update({ outstanding_balance: newBalance })
      .eq("id", payload.customer_id);

    if (updateErr) throw updateErr;

    return {
      payment: paymentData as CustomerPayment,
      newBalance,
    };
  },

  /**
   * Set or update customer opening balance (for migrating old bahi-khata diaries)
   */
  async setCustomerOpeningBalance(
    customerId: string,
    openingBalance: number
  ): Promise<Customer> {
    const { data: current, error: getErr } = await supabase
      .from("customers")
      .select("opening_balance, outstanding_balance")
      .eq("id", customerId)
      .single();

    if (getErr) throw getErr;

    const oldOpening = Number(current?.opening_balance) || 0;
    const currentBal = Number(current?.outstanding_balance) || 0;
    const diff = openingBalance - oldOpening;
    const newBalance = Math.max(0, currentBal + diff);

    const { data, error } = await supabase
      .from("customers")
      .update({
        opening_balance: openingBalance,
        outstanding_balance: newBalance,
      })
      .eq("id", customerId)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  /**
   * Get suppliers with their payables and transaction stats
   */
  async getSuppliersWithKhata(shopId: string, search?: string): Promise<Supplier[]> {
    let query = supabase
      .from("suppliers")
      .select("*")
      .eq("shop_id", shopId)
      .order("outstanding_balance", { ascending: false });

    if (search?.trim()) {
      const s = search.trim();
      query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Supplier[]) || [];
  },

  /**
   * Record payment remittance to supplier (decreases supplier.outstanding_balance)
   */
  async recordSupplierPayment(payload: {
    shop_id: string;
    supplier_id: string;
    purchase_order_id?: string;
    amount: number;
    method: string;
    reference_no?: string;
    notes?: string;
  }): Promise<{ payment: SupplierPayment; newBalance: number }> {
    if (!payload.supplier_id) throw new Error("Supplier ID is required");
    if (!payload.amount || payload.amount <= 0) throw new Error("Amount must be greater than 0");

    // 1. Insert into supplier_payments
    const { data: paymentData, error: payError } = await supabase
      .from("supplier_payments")
      .insert([
        {
          shop_id: payload.shop_id,
          supplier_id: payload.supplier_id,
          purchase_order_id: payload.purchase_order_id || null,
          amount: payload.amount,
          method: payload.method.toLowerCase(),
          reference_no: payload.reference_no || null,
          notes: payload.notes || null,
        },
      ])
      .select()
      .single();

    if (payError) throw payError;

    // The DB trigger `recompute_supplier_balance_on_payment` already lowered
    // suppliers.outstanding_balance by this amount when the row was inserted. Do NOT subtract it
    // again here (that was a double-deduction). Just read back the balance the trigger set.
    const { data: currSupplier, error: fetchErr } = await supabase
      .from("suppliers")
      .select("outstanding_balance")
      .eq("id", payload.supplier_id)
      .single();

    if (fetchErr) throw fetchErr;

    const newBalance = Math.max(0, Number(currSupplier?.outstanding_balance) || 0);

    return {
      payment: paymentData as SupplierPayment,
      newBalance,
    };
  },

  /**
   * Get complete statement for a Supplier (Purchase Orders vs Remittances)
   */
  async getSupplierLedger(supplierId: string): Promise<{
    supplier: Supplier;
    totalPurchased: number;
    totalPaid: number;
    currentPayable: number;
    entries: any[];
  }> {
    const { data: supplier, error: supErr } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", supplierId)
      .single();

    if (supErr || !supplier) throw supErr || new Error("Supplier not found");

    const [posRes, paymentsRes] = await Promise.all([
      supabase
        .from("purchase_orders")
        .select("*, items:purchase_order_items(*, product:products(name))")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: true }),
      supabase
        .from("supplier_payments")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("paid_at", { ascending: true }),
    ]);

    const pos = posRes.data || [];
    const payments = paymentsRes.data || [];

    const rawEntries: any[] = [];
    let totalPurchased = 0;
    let totalPaid = 0;

    pos.forEach((po: any) => {
      const amt = Number(po.total_amount) || 0;
      totalPurchased += amt;
      rawEntries.push({
        id: `po-${po.id}`,
        date: po.created_at,
        type: "purchase",
        reference_no: po.order_number,
        description: `खरीद इनवॉइस / Purchase Order #${po.order_number}`,
        debit: amt, // store owes supplier
        credit: 0,
        notes: po.notes,
      });
    });

    payments.forEach((sp: any) => {
      const amt = Number(sp.amount) || 0;
      totalPaid += amt;
      rawEntries.push({
        id: `sp-${sp.id}`,
        date: sp.paid_at,
        type: "payment",
        reference_no: sp.reference_no || `SP-PAY-${sp.id.slice(0, 6)}`,
        description: `सप्लायर को भुगतान / Remittance (${(sp.method || "BANK").toUpperCase()})`,
        debit: 0,
        credit: amt,
        payment_method: sp.method,
        notes: sp.notes,
      });
    });

    rawEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    const computedEntries = rawEntries.map((item) => {
      running = running + item.debit - item.credit;
      return {
        ...item,
        running_balance: Math.max(0, running),
      };
    });

    return {
      supplier: supplier as Supplier,
      totalPurchased,
      totalPaid,
      currentPayable: Number(supplier.outstanding_balance) || Math.max(0, running),
      entries: computedEntries,
    };
  },
};
