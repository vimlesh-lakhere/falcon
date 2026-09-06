"use client";

import React, { useState, useEffect } from "react";
import { Building2, Plus, Phone, Mail, FileText, DollarSign } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { suppliersRepository } from "@/repositories/suppliers.repo";
import { Supplier } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

export default function SuppliersPage() {
  const { currentStore, profile, fetchSession } = useAuthStore();
  const SHOP_ID = currentStore?.id || profile?.store_id || "";

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Supplier Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Record Payment Modal
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [refNo, setRefNo] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const loadSuppliers = async () => {
    if (!SHOP_ID) return;
    try {
      setLoading(true);
      const data = await suppliersRepository.getAll(SHOP_ID);
      setSuppliers(data);
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
    if (SHOP_ID) {
      loadSuppliers();
    }
  }, [SHOP_ID]);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await suppliersRepository.create({
        shop_id: SHOP_ID,
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        gst_number: gstNumber || null,
        outstanding_balance: 0,
      });

      setIsAddModalOpen(false);
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setGstNumber("");
      loadSuppliers();
    } catch (err: any) {
      console.error(err);
      alert("Failed to add supplier: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPayment || paymentAmount <= 0) return;

    try {
      setIsPaying(true);
      await suppliersRepository.recordPayment({
        shop_id: SHOP_ID,
        supplier_id: selectedSupplierForPayment.id,
        amount: paymentAmount,
        method: paymentMethod,
        reference_no: refNo || undefined,
        notes: `Direct supplier payment via ${paymentMethod}`,
      });

      setSelectedSupplierForPayment(null);
      setPaymentAmount(0);
      setRefNo("");
      loadSuppliers();
    } catch (err: any) {
      console.error(err);
      alert("Failed to record payment: " + err.message);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <MainLayout
      title="Suppliers & Vendor Accounts"
      subtitle="Manage supplier contacts, GST numbers, outstanding payables, and remittances"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Vendor Directory
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-1.5 font-semibold text-xs shadow-sm">
            <Plus className="w-4 h-4" />
            Add Supplier
          </Button>
        </div>

        {/* Suppliers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center text-gray-400 text-sm">
              Loading suppliers...
            </div>
          ) : suppliers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-400 text-sm">
              No suppliers found.
            </div>
          ) : (
            suppliers.map((s) => (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{s.name}</h4>
                      {s.gst_number && (
                        <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                          GST: {s.gst_number}
                        </p>
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    {s.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-400" /> {s.phone}
                      </p>
                    )}
                    {s.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-gray-400" /> {s.email}
                      </p>
                    )}
                    {s.address && <p className="text-gray-500 line-clamp-1">{s.address}</p>}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                        Outstanding Balance
                      </span>
                      <span
                        className={`font-bold tabular-nums ${
                          Number(s.outstanding_balance) > 0 ? "text-amber-700" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(s.outstanding_balance)}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedSupplierForPayment(s);
                        setPaymentAmount(Number(s.outstanding_balance) || 0);
                      }}
                      className="text-xs font-semibold gap-1 text-brand-700 border-brand-200 hover:bg-brand-50"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Record Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Add Supplier Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Supplier"
          maxWidth="md"
        >
          <form onSubmit={handleAddSupplier} className="space-y-4">
            <Input
              label="Supplier / Company Name *"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Glow Cosmetics Distributors"
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98111 22233"
            />
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sales@glowcosmetics.example.com"
            />
            <Input
              label="GST Identification Number"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              placeholder="e.g. 27AABCG1234F1Z1"
            />
            <Input
              label="Warehouse / Business Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Plot 45, Industrial Area Phase 2"
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving}>
                Save Supplier
              </Button>
            </div>
          </form>
        </Modal>

        {/* Record Payment Modal */}
        <Modal
          isOpen={!!selectedSupplierForPayment}
          onClose={() => setSelectedSupplierForPayment(null)}
          title={`Record Supplier Payment — ${selectedSupplierForPayment?.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <Input
              type="number"
              min="1"
              label="Payment Amount (₹) *"
              required
              value={paymentAmount || ""}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
            />

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs h-9 bg-white border border-gray-300 rounded-md px-3 font-medium text-gray-900 focus:ring-2 focus:ring-brand-600 focus:outline-none"
              >
                <option value="bank_transfer">Bank Transfer / NEFT / RTGS</option>
                <option value="upi">UPI / QR Code</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <Input
              label="Transaction UTR / Reference No."
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              placeholder="e.g. UTR123456789"
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedSupplierForPayment(null)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isPaying} className="bg-emerald-600 hover:bg-emerald-700">
                Confirm Payment
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
