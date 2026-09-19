"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Users,
  Building2,
  Search,
  Plus,
  DollarSign,
  Receipt,
  Phone,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  MessageCircle,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  MapPin,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Customer, Supplier } from "@/types/database";
import { khataRepository, ShopKhataStats } from "@/repositories/khata.repo";
import { customersRepository } from "@/repositories/customers.repo";
import { suppliersRepository } from "@/repositories/suppliers.repo";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { CollectPaymentModal } from "@/components/khata/CollectPaymentModal";
import { CustomerLedgerStatementModal } from "@/components/khata/CustomerLedgerStatementModal";
import { getPrinterConfig } from "@/lib/thermal-printer";

export default function KhataPage() {
  const { currentStore, profile, fetchSession } = useAuthStore();
  const shopId = currentStore?.id || profile?.store_id || "";

  // Active Main Tab: "customers" | "suppliers"
  const [activeTab, setActiveTab] = useState<"customers" | "suppliers">("customers");

  // Summary KPIs
  const [stats, setStats] = useState<ShopKhataStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Customer Khata State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<"all" | "due_only" | "cleared">("due_only");
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Customer Modals
  const [selectedCustForPayment, setSelectedCustForPayment] = useState<Customer | null>(null);
  const [selectedCustForLedger, setSelectedCustForLedger] = useState<string | null>(null);
  const [isAddCustModalOpen, setIsAddCustModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustOpeningBal, setNewCustOpeningBal] = useState<number>(0);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Supplier Khata State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // Supplier Modals
  const [selectedSuppForPayment, setSelectedSuppForPayment] = useState<Supplier | null>(null);
  const [suppPayAmount, setSuppPayAmount] = useState<number>(0);
  const [suppPayMethod, setSuppPayMethod] = useState<string>("bank_transfer");
  const [suppPayRef, setSuppPayRef] = useState<string>("");
  const [suppPayNotes, setSuppPayNotes] = useState<string>("");
  const [isSavingSuppPay, setIsSavingSuppPay] = useState(false);
  const [selectedSuppForLedger, setSelectedSuppForLedger] = useState<Supplier | null>(null);
  const [suppLedgerData, setSuppLedgerData] = useState<any>(null);
  const [loadingSuppLedger, setLoadingSuppLedger] = useState(false);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const loadStats = async () => {
    if (!shopId) return;
    try {
      setLoadingStats(true);
      const data = await khataRepository.getShopKhataStats(shopId);
      setStats(data);
    } catch (err) {
      console.error("Failed to load khata stats", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadCustomers = async () => {
    if (!shopId) return;
    try {
      setLoadingCustomers(true);
      const data = await khataRepository.getCustomersWithKhata(shopId, {
        search: customerSearch,
        filter: customerFilter,
      });
      setCustomers(data);
    } catch (err) {
      console.error("Failed to load customers khata", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadSuppliers = async () => {
    if (!shopId) return;
    try {
      setLoadingSuppliers(true);
      const data = await khataRepository.getSuppliersWithKhata(shopId, supplierSearch);
      setSuppliers(data);
    } catch (err) {
      console.error("Failed to load suppliers", err);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    if (shopId) {
      loadStats();
    }
  }, [shopId]);

  useEffect(() => {
    if (shopId && activeTab === "customers") {
      loadCustomers();
    }
  }, [shopId, activeTab, customerFilter, customerSearch]);

  useEffect(() => {
    if (shopId && activeTab === "suppliers") {
      loadSuppliers();
    }
  }, [shopId, activeTab, supplierSearch]);

  // Handle Add Customer with Optional Opening Balance
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    try {
      setIsSavingCustomer(true);
      const opening = Number(newCustOpeningBal) || 0;
      await customersRepository.create({
        shop_id: shopId,
        name: newCustName.trim(),
        phone: newCustPhone.trim() || null,
        address: newCustAddress.trim() || null,
        opening_balance: opening,
        outstanding_balance: opening,
      });

      setIsAddCustModalOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustAddress("");
      setNewCustOpeningBal(0);
      loadCustomers();
      loadStats();
    } catch (err: any) {
      alert("ग्राहक जोड़ने में विफल: " + (err.message || "Unknown error"));
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Handle Record Supplier Payment
  const handleRecordSupplierPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuppForPayment || suppPayAmount <= 0) return;

    try {
      setIsSavingSuppPay(true);
      await khataRepository.recordSupplierPayment({
        shop_id: shopId,
        supplier_id: selectedSuppForPayment.id,
        amount: suppPayAmount,
        method: suppPayMethod,
        reference_no: suppPayRef || undefined,
        notes: suppPayNotes || undefined,
      });

      setSelectedSuppForPayment(null);
      setSuppPayAmount(0);
      setSuppPayRef("");
      setSuppPayNotes("");
      loadSuppliers();
      loadStats();
    } catch (err: any) {
      alert("सप्लायर भुगतान दर्ज करने में विफल: " + (err.message || "Unknown error"));
    } finally {
      setIsSavingSuppPay(false);
    }
  };

  // Handle Open Supplier Ledger
  const handleOpenSupplierLedger = async (supp: Supplier) => {
    setSelectedSuppForLedger(supp);
    try {
      setLoadingSuppLedger(true);
      const data = await khataRepository.getSupplierLedger(supp.id);
      setSuppLedgerData(data);
    } catch (err) {
      console.error("Failed to load supplier ledger", err);
    } finally {
      setLoadingSuppLedger(false);
    }
  };

  const shopConfig = getPrinterConfig(shopId);
  const shopName = shopConfig.shopName || "AGS Store & Cosmetics";
  const shopPhone = shopConfig.shopPhone || "+91 9340362381";

  // Build WhatsApp Reminder Message for a customer
  const buildReminderUrl = (c: Customer) => {
    const cleanPhone = c.phone?.replace(/[^0-9]/g, "").slice(-10) || "";
    if (!cleanPhone) return "";
    const due = Number(c.outstanding_balance) || 0;

    const msg = `नमस्ते *${c.name}* जी,
🏬 *${shopName}* की ओर से सादर नमस्कार।

आपके खाते में *₹${due.toFixed(2)}* का बकाया शेष (Pending Balance) है।
कृपया समय पर भुगतान करने का कष्ट करें।

📲 *Helpline:* ${shopPhone}
धन्यवाद!`;

    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <MainLayout
      title="📕 खाता बही & उधारी रजिस्टर (Khata & Ledger)"
      subtitle="कस्टमर उधार वसूली, सप्लायर देनदारी और तारीखवार डिजिटल खाता बही"
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Market Customer Due */}
          <Card className="border-red-200 bg-gradient-to-br from-red-50/70 to-rose-50/30">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-red-700 uppercase tracking-wider">
                  कुल बाज़ार बकाया (Receivables)
                </span>
                <span className="p-1.5 bg-red-100 text-red-700 rounded-lg">
                  <ArrowDownLeft className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-red-950 tabular-nums">
                {formatCurrency(stats?.totalCustomerDue || 0)}
              </div>
              <div className="text-[11px] font-semibold text-red-800">
                {stats?.dueCustomersCount || 0} ग्राहकों से वसूली बाकी है
              </div>
            </CardContent>
          </Card>

          {/* Today's Collection */}
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-teal-50/30">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                  आज की वसूली (Today&apos;s Vasooli)
                </span>
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 tabular-nums">
                {formatCurrency(stats?.todayCollections || 0)}
              </div>
              <div className="text-[11px] font-semibold text-emerald-800">
                इस माह वसूली: {formatCurrency(stats?.thisMonthCollections || 0)}
              </div>
            </CardContent>
          </Card>

          {/* Total Supplier Payables */}
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50/70 to-yellow-50/30">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                  सप्लायर देनदारी (Payables)
                </span>
                <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-950 tabular-nums">
                {formatCurrency(stats?.totalSupplierPayable || 0)}
              </div>
              <div className="text-[11px] font-semibold text-amber-800">
                {stats?.dueSuppliersCount || 0} पार्टियों को भुगतान शेष
              </div>
            </CardContent>
          </Card>

          {/* Active Customers in Ledger */}
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50/70 to-indigo-50/30">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">
                  कुल खाता ग्राहक (Total Customers)
                </span>
                <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-950 tabular-nums">
                {stats?.totalCustomersCount || 0}
              </div>
              <div className="text-[11px] font-semibold text-purple-800">
                रजिस्टर्ड कस्टमर डायरेक्टरी
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("customers")}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "customers"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>ग्राहक खाता (Customer Udhaar)</span>
              {stats && stats.dueCustomersCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {stats.dueCustomersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("suppliers")}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "suppliers"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>सप्लायर / पार्टी खाता (Vendor Payables)</span>
              {stats && stats.dueSuppliersCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {stats.dueSuppliersCount}
                </span>
              )}
            </button>
          </div>

          {activeTab === "customers" ? (
            <Button
              size="sm"
              onClick={() => setIsAddCustModalOpen(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>नया ग्राहक जोड़ें</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => (window.location.href = "/suppliers")}
              variant="outline"
              className="text-xs font-bold gap-1.5"
            >
              <Building2 className="w-4 h-4" />
              <span>सप्लायर जोड़ें / मैनेज करें</span>
            </Button>
          )}
        </div>

        {/* TAB 1: CUSTOMER KHATA */}
        {activeTab === "customers" && (
          <div className="space-y-4">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ग्राहक का नाम या मोबाइल नंबर खोजें..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 font-medium"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setCustomerFilter("due_only")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    customerFilter === "due_only"
                      ? "bg-red-100 text-red-800 border border-red-200"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
                >
                  बाकी वाले (Pending Due)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    customerFilter === "all"
                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
                >
                  सभी (All Customers)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerFilter("cleared")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    customerFilter === "cleared"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
                >
                  बेबाक (Cleared)
                </button>
              </div>
            </div>

            {/* Customers Table */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/90 text-gray-600 font-bold uppercase text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">ग्राहक का नाम (Customer)</th>
                      <th className="py-3 px-4">मोबाइल नंबर</th>
                      <th className="py-3 px-4">पता / स्थान</th>
                      <th className="py-3 px-4 text-right">कुल खरीद</th>
                      <th className="py-3 px-4 text-right">बकाया राशि (Balance Due)</th>
                      <th className="py-3 px-4 text-center">एक्शन (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {loadingCustomers ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                            <span>खाता लोड हो रहा है...</span>
                          </div>
                        </td>
                      </tr>
                    ) : customers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-gray-400">
                          कोई ग्राहक नहीं मिला। नया ग्राहक जोड़ने के लिए ऊपर बटन दबाएं।
                        </td>
                      </tr>
                    ) : (
                      customers.map((c) => {
                        const due = Number(c.outstanding_balance) || 0;
                        const reminderUrl = buildReminderUrl(c);

                        return (
                          <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-gray-900 text-sm">{c.name}</div>
                              {Number(c.opening_balance) > 0 && (
                                <span className="text-[10px] text-gray-500 block">
                                  प्रारंभिक शेष: ₹{Number(c.opening_balance).toFixed(0)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-600 font-mono">
                              {c.phone ? `+91 ${c.phone}` : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="py-3 px-4 text-gray-500 max-w-[180px] truncate">
                              {c.address || "—"}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-gray-700 tabular-nums">
                              {formatCurrency(Number(c.total_spend) || 0)}
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              {due > 0 ? (
                                <span className="inline-block px-2.5 py-1 bg-red-100 text-red-900 border border-red-200 rounded-lg font-black text-xs">
                                  ₹{due.toFixed(2)}
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-xs">
                                  बेबाक ✓
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Collect Payment Action */}
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedCustForPayment(c)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7 px-2.5 shadow-2xs cursor-pointer"
                                  title="उधार जमा करें"
                                >
                                  <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                                  <span>जमा करें</span>
                                </Button>

                                {/* View Full Ledger Statement */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedCustForLedger(c.id)}
                                  className="text-purple-700 border-purple-200 hover:bg-purple-50 font-bold text-xs h-7 px-2.5 cursor-pointer"
                                  title="खाता बही देखें"
                                >
                                  <BookOpen className="w-3.5 h-3.5 mr-1 text-purple-600" />
                                  <span>खाता बही</span>
                                </Button>

                                {/* Send WhatsApp Reminder */}
                                {due > 0 && reminderUrl && (
                                  <a
                                    href={reminderUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-all shadow-2xs"
                                    title="WhatsApp तगादा भेजें"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUPPLIER / PARTY KHATA */}
        {activeTab === "suppliers" && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="पार्टी / सप्लायर का नाम या संपर्क नंबर खोजें..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 font-medium"
                />
              </div>
            </div>

            {/* Suppliers Table */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/90 text-gray-600 font-bold uppercase text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">सप्लायर / पार्टी (Party Name)</th>
                      <th className="py-3 px-4">फोन नंबर</th>
                      <th className="py-3 px-4">GST नंबर</th>
                      <th className="py-3 px-4">पता</th>
                      <th className="py-3 px-4 text-right">कुल देनदारी (Payable)</th>
                      <th className="py-3 px-4 text-center">एक्शन (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {loadingSuppliers ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                            <span>सप्लायर लोड हो रहे हैं...</span>
                          </div>
                        </td>
                      </tr>
                    ) : suppliers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-gray-400">
                          कोई सप्लायर नहीं मिला।
                        </td>
                      </tr>
                    ) : (
                      suppliers.map((s) => {
                        const payable = Number(s.outstanding_balance) || 0;
                        return (
                          <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <span>{s.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600 font-mono">
                              {s.phone || "—"}
                            </td>
                            <td className="py-3 px-4 font-mono text-gray-500">
                              {s.gst_number || "—"}
                            </td>
                            <td className="py-3 px-4 text-gray-500 max-w-[180px] truncate">
                              {s.address || "—"}
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              {payable > 0 ? (
                                <span className="inline-block px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-black text-xs">
                                  ₹{payable.toFixed(2)}
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-xs">
                                  क्लियर ✓
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSuppForPayment(s);
                                    setSuppPayAmount(payable > 0 ? payable : 0);
                                  }}
                                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-7 px-2.5 shadow-2xs cursor-pointer"
                                >
                                  <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                                  <span>भुगतान करें</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenSupplierLedger(s)}
                                  className="text-gray-700 border-gray-200 hover:bg-gray-50 font-bold text-xs h-7 px-2.5 cursor-pointer"
                                >
                                  <BookOpen className="w-3.5 h-3.5 mr-1" />
                                  <span>लेजर देखें</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collect Customer Payment Modal */}
      {selectedCustForPayment && (
        <CollectPaymentModal
          isOpen={!!selectedCustForPayment}
          onClose={() => setSelectedCustForPayment(null)}
          customer={selectedCustForPayment}
          shopId={shopId}
          onPaymentSuccess={() => {
            loadCustomers();
            loadStats();
          }}
        />
      )}

      {/* View Customer Ledger Statement Modal */}
      {selectedCustForLedger && (
        <CustomerLedgerStatementModal
          isOpen={!!selectedCustForLedger}
          onClose={() => setSelectedCustForLedger(null)}
          customerId={selectedCustForLedger}
          shopId={shopId}
          onCollectPayment={(cust) => {
            setSelectedCustForLedger(null);
            setSelectedCustForPayment(cust);
          }}
        />
      )}

      {/* Add Customer with Optional Opening Balance Modal */}
      <Modal
        isOpen={isAddCustModalOpen}
        onClose={() => setIsAddCustModalOpen(false)}
        title="👤 नया ग्राहक जोड़ें (Add Customer to Khata)"
        description="ग्राहक का नाम, मोबाइल नंबर और पुराना बकाया दर्ज करें"
        maxWidth="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              ग्राहक का पूरा नाम (Full Name) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              WhatsApp / मोबाइल नंबर (Mobile Number)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                +91
              </span>
              <input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full pl-11 pr-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              गाँव / मोहल्ला / पता (Address)
            </label>
            <input
              type="text"
              placeholder="e.g. Ward No 4, Pipariya"
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              पुराना डायरी बकाया (Old Opening Balance if any)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                ₹
              </span>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={newCustOpeningBal === 0 ? "" : newCustOpeningBal}
                onChange={(e) => setNewCustOpeningBal(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 font-bold"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              अगर ग्राहक का पहले का कोई पुराना बकाया है तो यहाँ दर्ज करें।
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddCustModalOpen(false)}
              className="text-xs font-bold"
            >
              रद्द करें
            </Button>
            <Button
              type="submit"
              isLoading={isSavingCustomer}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
            >
              सुरक्षित करें (Save Customer)
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Supplier Payment Modal */}
      {selectedSuppForPayment && (
        <Modal
          isOpen={!!selectedSuppForPayment}
          onClose={() => setSelectedSuppForPayment(null)}
          title={`🏢 सप्लायर को भुगतान (Pay ${selectedSuppForPayment.name})`}
          description="सप्लायर को की गई राशि और भुगतान का विवरण दर्ज करें"
          maxWidth="md"
        >
          <form onSubmit={handleRecordSupplierPayment} className="space-y-4 pt-1">
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase block">पार्टी का नाम</span>
                <span className="text-sm font-black text-amber-950">{selectedSuppForPayment.name}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">कुल देनदारी</span>
                <span className="text-base font-black text-red-700">
                  ₹{Number(selectedSuppForPayment.outstanding_balance || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                भुगतान राशि (Amount Paid) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-500">₹</span>
                <input
                  type="number"
                  step="any"
                  required
                  min="0.01"
                  value={suppPayAmount === 0 ? "" : suppPayAmount}
                  onChange={(e) => setSuppPayAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                माध्यम (Payment Mode)
              </label>
              <select
                value={suppPayMethod}
                onChange={(e) => setSuppPayMethod(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none"
              >
                <option value="bank_transfer">बैंक ट्रांसफर (NEFT/RTGS/IMPS)</option>
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="cash">नकद (Cash)</option>
                <option value="cheque">चेक (Cheque)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  रिफरेंस / Cheque / UTR No.
                </label>
                <input
                  type="text"
                  placeholder="Txn ID"
                  value={suppPayRef}
                  onChange={(e) => setSuppPayRef(e.target.value)}
                  className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  टिप्पणी (Notes)
                </label>
                <input
                  type="text"
                  placeholder="Optional note"
                  value={suppPayNotes}
                  onChange={(e) => setSuppPayNotes(e.target.value)}
                  className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedSuppForPayment(null)}
                className="text-xs font-bold"
              >
                रद्द करें
              </Button>
              <Button
                type="submit"
                isLoading={isSavingSuppPay}
                disabled={suppPayAmount <= 0}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4"
              >
                भुगतान दर्ज करें (Save Remittance)
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Supplier Ledger Statement Modal */}
      {selectedSuppForLedger && (
        <Modal
          isOpen={!!selectedSuppForLedger}
          onClose={() => {
            setSelectedSuppForLedger(null);
            setSuppLedgerData(null);
          }}
          title={`🏢 ${selectedSuppForLedger.name} — सप्लायर खाता लेजर`}
          description="खरीद इनवॉइस और भुगतान का पूरा हिसाब"
          maxWidth="2xl"
        >
          {loadingSuppLedger || !suppLedgerData ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500 font-medium">लेजर लोड हो रहा है...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-500 font-bold block">कुल खरीद (Purchased)</span>
                  <span className="font-bold text-gray-900">₹{suppLedgerData.totalPurchased.toFixed(2)}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-bold block">कुल भुगतान (Paid)</span>
                  <span className="font-bold text-emerald-950">₹{suppLedgerData.totalPaid.toFixed(2)}</span>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-800 font-bold block">शेष देनदारी (Balance)</span>
                  <span className="font-black text-red-700">₹{suppLedgerData.currentPayable.toFixed(2)}</span>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-600 text-[10px] font-bold uppercase sticky top-0">
                    <tr>
                      <th className="py-2 px-3">दिनांक</th>
                      <th className="py-2 px-3">विवरण</th>
                      <th className="py-2 px-3 text-right">खरीद (+देना)</th>
                      <th className="py-2 px-3 text-right">भुगतान (-दिया)</th>
                      <th className="py-2 px-3 text-right">शेष (Balance)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {suppLedgerData.entries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400 text-xs">
                          कोई रिकॉर्ड नहीं मिला।
                        </td>
                      </tr>
                    ) : (
                      suppLedgerData.entries.map((e: any) => (
                        <tr key={e.id}>
                          <td className="py-2 px-3 text-gray-500 font-mono text-[11px]">
                            {new Date(e.date).toLocaleDateString("en-IN")}
                          </td>
                          <td className="py-2 px-3 font-semibold text-gray-800">{e.description}</td>
                          <td className="py-2 px-3 text-right font-bold text-red-700">
                            {e.debit > 0 ? `₹${e.debit.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            {e.credit > 0 ? `₹${e.credit.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-gray-900 bg-gray-50/50">
                            ₹{e.running_balance.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal>
      )}
    </MainLayout>
  );
}
