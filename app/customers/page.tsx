"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  DollarSign,
  Sparkles,
  TrendingUp,
  Receipt,
  Eye,
  Package,
  BookOpen,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { customersRepository } from "@/repositories/customers.repo";
import { productsRepository } from "@/repositories/products.repo";
import { Customer, Product } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { CustomerLedgerModal } from "@/components/customers/CustomerLedgerModal";
import { ShippingParcelLabelModal } from "@/components/pos/ShippingParcelLabelModal";
import { CollectPaymentModal } from "@/components/khata/CollectPaymentModal";

export default function CustomersPage() {
  const { currentStore, profile, fetchSession } = useAuthStore();
  const activeShopId = currentStore?.id || profile?.store_id || "";

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Customer Profit Ledger Modal
  const [selectedCustForLedger, setSelectedCustForLedger] = useState<string | null>(null);
  const [custForKhataPay, setCustForKhataPay] = useState<Customer | null>(null);

  // Add Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Parcel Shipping Label Modal State
  const [shippingCustomer, setShippingCustomer] = useState<Customer | null>(null);

  // Custom Pricing Modal
  const [selectedCustForPricing, setSelectedCustForPricing] = useState<Customer | null>(null);
  const [pricingProdId, setPricingProdId] = useState("");
  const [customPriceVal, setCustomPriceVal] = useState<number>(0);
  const [activePrices, setActivePrices] = useState<any[]>([]);

  const loadData = async () => {
    if (!activeShopId) return;
    try {
      setLoading(true);
      const [custs, prods] = await Promise.all([
        customersRepository.getAllWithProfitSummary(activeShopId),
        productsRepository.getAll(activeShopId, { isActive: true }),
      ]);
      setCustomers(custs);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (activeShopId) {
      loadData();
    }
  }, [activeShopId]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await customersRepository.create({
        shop_id: activeShopId,
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
      });

      setIsAddModalOpen(false);
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setNotes("");
      loadData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to add customer: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openPricingModal = async (c: Customer) => {
    setSelectedCustForPricing(c);
    try {
      const prices = await customersRepository.getCustomerPrices(c.id);
      setActivePrices(prices);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustForPricing || !pricingProdId || customPriceVal <= 0) return;

    try {
      await customersRepository.setCustomerPrice(
        selectedCustForPricing.id,
        pricingProdId,
        customPriceVal
      );
      const updated = await customersRepository.getCustomerPrices(selectedCustForPricing.id);
      setActivePrices(updated);
      setPricingProdId("");
      setCustomPriceVal(0);
    } catch (err: any) {
      console.error(err);
      alert("Failed to set custom price: " + err.message);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  // Overall Aggregate KPIs
  const totalLifetimeSales = customers.reduce(
    (acc, c) => acc + (Number(c.calculatedLifetimeSpend) || 0),
    0
  );
  const totalLifetimeProfit = customers.reduce(
    (acc, c) => acc + (Number(c.calculatedLifetimeProfit) || 0),
    0
  );
  const overallAvgMargin =
    totalLifetimeSales > 0 ? (totalLifetimeProfit / totalLifetimeSales) * 100 : 0;

  return (
    <MainLayout
      title="Customer Directory & Profitability Ledger"
      subtitle="Track customer lifetime purchases, net profit earned, and custom wholesale pricing"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Customer Profitability Overview KPI Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total Customers
            </span>
            <div className="text-xl font-black text-gray-900 tabular-nums">
              {customers.length} Registered
            </div>
            <div className="text-[11px] text-gray-500 font-medium">
              Active store buyers
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Lifetime Customer Revenue
            </span>
            <div className="text-xl font-black text-gray-900 tabular-nums">
              {formatCurrency(totalLifetimeSales)}
            </div>
            <div className="text-[11px] text-gray-500 font-medium">
              Total billed across all customers
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Lifetime Gross Profit (कुल मुनाफा)
            </span>
            <div className="text-xl font-black text-emerald-700 tabular-nums">
              +{formatCurrency(totalLifetimeProfit)}
            </div>
            <div className="text-[11px] font-bold text-emerald-800">
              ⚡ {overallAvgMargin.toFixed(1)}% Average Margin
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Avg. Customer Value (LTV)
            </span>
            <div className="text-xl font-black text-purple-700 tabular-nums">
              {formatCurrency(totalLifetimeSales / (customers.length || 1))}
            </div>
            <div className="text-[11px] text-gray-500 font-medium">
              Revenue per customer
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-surface-border shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by customer name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
            />
          </div>

          <Button onClick={() => setIsAddModalOpen(true)} className="gap-1.5 font-semibold text-xs shadow-sm">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>

        {/* Customer Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center text-gray-400 text-sm">
              Loading customers and profitability stats...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-400 text-sm">
              No customers found.
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const spend = Number(cust.calculatedLifetimeSpend) || Number(cust.total_spend) || 0;
              const profit = Number(cust.calculatedLifetimeProfit) || 0;
              const margin = Number(cust.profitMarginPercent) || 0;
              const bills = Number(cust.totalBills) || 0;

              return (
                <Card key={cust.id} className="hover:shadow-md transition-shadow border border-gray-200 rounded-2xl">
                  <CardContent className="p-5 space-y-3.5">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-gray-900 truncate">{cust.name}</h4>
                        {cust.phone && (
                          <p className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-gray-400" /> +91 {cust.phone}
                          </p>
                        )}
                        {cust.address && (
                          <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                            📍 {cust.address}
                          </p>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                        {cust.name.slice(0, 2).toUpperCase()}
                      </div>
                    </div>

                    {/* Spend & Profit Metrics Box */}
                    <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">
                          Lifetime Spend
                        </span>
                        <span className="font-black text-gray-900 text-sm tabular-nums">
                          {formatCurrency(spend)}
                        </span>
                        <span className="text-[10px] text-gray-500 block font-medium">
                          {bills} {bills === 1 ? "Bill" : "Bills"}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-emerald-800 block text-[10px] uppercase font-bold">
                          Profit Made (कमाई)
                        </span>
                        <span className="font-black text-emerald-700 text-sm tabular-nums">
                          +{formatCurrency(profit)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 block">
                          {margin.toFixed(1)}% margin
                        </span>
                      </div>
                    </div>

                    {/* Pending Khata Due Balance */}
                    {Number(cust.outstanding_balance) > 0 && (
                      <div className="p-2.5 bg-red-50 rounded-xl border border-red-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-red-700 uppercase block">
                            उधार बकाया (Pending Due)
                          </span>
                          <span className="font-black text-red-900 text-sm tabular-nums">
                            ₹{Number(cust.outstanding_balance).toFixed(2)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setCustForKhataPay(cust)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7 px-2.5 shadow-2xs cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                          <span>जमा करें</span>
                        </Button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-1 flex items-center justify-between gap-1.5 text-xs">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCustForLedger(cust.id)}
                        className="flex-1 text-xs font-bold gap-1 text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        Bills & Profit
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShippingCustomer(cust)}
                        className="text-xs font-bold gap-1 border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                        title="Print 80mm Parcel Shipping Sticker"
                      >
                        <Package className="w-3.5 h-3.5 text-amber-700" />
                        <span>Parcel</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPricingModal(cust)}
                        className="text-xs font-semibold gap-1 border-purple-200 text-purple-700 hover:bg-purple-50 px-2"
                        title="Configure wholesale locked price"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        Prices
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Customer Lifetime Profit & Transaction Ledger Modal */}
        {selectedCustForLedger && (
          <CustomerLedgerModal
            customerId={selectedCustForLedger}
            onClose={() => setSelectedCustForLedger(null)}
            shopId={activeShopId}
          />
        )}

        {/* Add Customer Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Customer"
          maxWidth="md"
        >
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <Input
              label="Full Name *"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
            />
            <Input
              label="Phone Number (Unique)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98700 11223"
            />
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. priya@example.com"
            />
            <Input
              label="Address / Salon Name"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Lotus Beauty Studio, 4th Floor"
            />
            <Input
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Wholesale buyer, weekly delivery"
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving}>
                Save Customer
              </Button>
            </div>
          </form>
        </Modal>

        {/* Special Pricing Modal */}
        <Modal
          isOpen={!!selectedCustForPricing}
          onClose={() => setSelectedCustForPricing(null)}
          title={`Custom Wholesale Pricing — ${selectedCustForPricing?.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Configure locked special prices for this specific wholesale customer. These prices
              will automatically apply during POS checkout.
            </p>

            {/* Set price form */}
            <form onSubmit={handleSetPrice} className="p-3 bg-gray-50 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Select Product
                  </label>
                  <select
                    required
                    value={pricingProdId}
                    onChange={(e) => setPricingProdId(e.target.value)}
                    className="w-full text-xs h-9 bg-white border border-gray-300 rounded-md px-2 font-medium"
                  >
                    <option value="">Choose product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Retail: {formatCurrency(p.selling_price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Custom Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={customPriceVal || ""}
                    onChange={(e) => setCustomPriceVal(parseFloat(e.target.value) || 0)}
                    placeholder="Enter special price"
                    className="w-full text-xs h-9 bg-white border border-gray-300 rounded-md px-2 font-bold"
                  />
                </div>
              </div>

              <Button type="submit" size="sm" className="w-full bg-brand-600 text-white font-semibold">
                Save Price Override
              </Button>
            </form>

            {/* Active configured prices list */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-gray-700">Active Custom Price Rules</h5>
              {activePrices.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No custom prices configured yet.</p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg p-2">
                  {activePrices.map((cp, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-900">{cp.product?.name}</span>
                        <span className="text-gray-400 ml-2">
                          (Retail: {formatCurrency(cp.product?.selling_price)})
                        </span>
                      </div>
                      <span className="font-bold text-brand-700 tabular-nums">
                        {formatCurrency(cp.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>

        {/* 📦 80mm Customer Parcel Shipping Sticker Modal */}
        {shippingCustomer && (
          <ShippingParcelLabelModal
            isOpen={!!shippingCustomer}
            onClose={() => setShippingCustomer(null)}
            shopId={activeShopId}
            initialCustomerName={shippingCustomer.name}
            initialCustomerPhone={shippingCustomer.phone || ""}
            initialDestination={shippingCustomer.address || ""}
            initialAddress={shippingCustomer.address || ""}
          />
        )}

        {/* 💰 Customer Khata Payment Collect Modal */}
        {custForKhataPay && (
          <CollectPaymentModal
            isOpen={!!custForKhataPay}
            onClose={() => setCustForKhataPay(null)}
            customer={custForKhataPay}
            shopId={activeShopId}
            onPaymentSuccess={() => {
              loadData();
            }}
          />
        )}
      </div>
    </MainLayout>
  );
}
