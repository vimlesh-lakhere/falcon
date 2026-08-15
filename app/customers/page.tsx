"use client";

import React, { useState, useEffect } from "react";
import { Users, Plus, Search, Phone, Mail, DollarSign, Sparkles } from "lucide-react";
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

const SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Custom Pricing Modal
  const [selectedCustForPricing, setSelectedCustForPricing] = useState<Customer | null>(null);
  const [pricingProdId, setPricingProdId] = useState("");
  const [customPriceVal, setCustomPriceVal] = useState<number>(0);
  const [activePrices, setActivePrices] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [custs, prods] = await Promise.all([
        customersRepository.getAll(SHOP_ID),
        productsRepository.getAll(SHOP_ID, { isActive: true }),
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
    loadData();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await customersRepository.create({
        shop_id: SHOP_ID,
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

  return (
    <MainLayout
      title="Customer Directory & Wholesale Pricing"
      subtitle="Track customer total spend, outstanding balances, and wholesale pricing agreements"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Actions Bar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-surface-border shadow-sm">
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
              Loading customers...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-400 text-sm">
              No customers found.
            </div>
          ) : (
            filteredCustomers.map((cust) => (
              <Card key={cust.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{cust.name}</h4>
                      {cust.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-gray-400" /> {cust.phone}
                        </p>
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs">
                      {cust.name.slice(0, 2).toUpperCase()}
                    </div>
                  </div>

                  {cust.address && (
                    <p className="text-xs text-gray-600 line-clamp-1">{cust.address}</p>
                  )}

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                        Total Spend
                      </span>
                      <span className="font-bold text-gray-900 tabular-nums">
                        {formatCurrency(cust.total_spend)}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPricingModal(cust)}
                      className="text-xs font-semibold gap-1 border-brand-200 text-brand-700 hover:bg-brand-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                      Special Prices
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

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
      </div>
    </MainLayout>
  );
}
