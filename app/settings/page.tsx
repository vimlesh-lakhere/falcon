"use client";

import React, { useState, useEffect } from "react";
import { Settings, Store, Shield, Receipt, Database, Save, Check, Printer, HardDrive, Package, Plus } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase/client";
import { Shop, Unit } from "@/types/database";
import { PrinterSettingsTab } from "@/components/settings/PrinterSettingsTab";
import { BackupSettingsTab } from "@/components/settings/BackupSettingsTab";
import { UnitManagementModal } from "@/components/products/UnitManagementModal";
import { productsRepository } from "@/repositories/products.repo";
import { useAuthStore } from "@/store/useAuthStore";

export default function SettingsPage() {
  const { currentStore, profile, fetchSession } = useAuthStore();
  const SHOP_ID = currentStore?.id || profile?.store_id || "";

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "printer" | "invoice" | "roles" | "database" | "backup" | "units">("backup");
  const [units, setUnits] = useState<Unit[]>([]);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [currency, setCurrency] = useState("INR");

  const fetchShop = async () => {
    if (!SHOP_ID) return;
    try {
      setLoading(true);
      const { data } = await supabase.from("shops").select("*").eq("id", SHOP_ID).single();
      if (data) {
        setShop(data);
        setName(data.name);
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setGstNumber(data.gst_number || "");
        setCurrency(data.currency || "INR");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    if (!SHOP_ID) return;
    try {
      const list = await productsRepository.getUnits(SHOP_ID);
      setUnits(list);
    } catch (err) {
      console.error("Failed to fetch units:", err);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (SHOP_ID) {
      fetchShop();
      fetchUnits();
    }
  }, [SHOP_ID]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase
        .from("shops")
        .update({
          name,
          phone,
          address,
          gst_number: gstNumber,
          currency,
        })
        .eq("id", SHOP_ID);

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err: any) {
      console.error(err);
      alert("Failed to save settings: " + err.message);
    }
  };

  return (
    <MainLayout
      title="Store Settings & Configuration"
      subtitle="Configure shop identity, GST details, thermal receipt headers, and role access"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Settings Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
          {[
            { id: "backup", label: "💾 Backup & Disaster Recovery", icon: HardDrive },
            { id: "units", label: "📦 Packaging Units", icon: Package },
            { id: "printer", label: "🖨️ Thermal Printer & ATPOS", icon: Printer },
            { id: "profile", label: "Shop Profile & GST", icon: Store },
            { id: "invoice", label: "Receipt & Invoicing", icon: Receipt },
            { id: "roles", label: "Roles & Permissions", icon: Shield },
            { id: "database", label: "Database Connection", icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-brand-50 text-brand-700 shadow-2xs border border-brand-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-brand-600" : "text-gray-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab: Thermal Printer & Hardware */}
        {activeTab === "printer" && <PrinterSettingsTab shopId={SHOP_ID} />}

        {/* Tab 1: Shop Profile */}
        {activeTab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-gray-900">
                Store Identity & Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Store Name *"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. AGS Store"
                  />
                  <Input
                    label="Contact Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                  />
                  <Input
                    label="GST Identification Number (GSTIN)"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                  />
                  <Input
                    label="Operating Currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="INR"
                  />
                </div>

                <Input
                  label="Store Physical Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 123 Market Road, Suite 4A"
                />

                <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                  {isSaved ? (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Settings updated successfully!
                    </span>
                  ) : (
                    <span />
                  )}

                  <Button type="submit" className="gap-1.5 bg-brand-600 text-white font-semibold text-xs">
                    <Save className="w-4 h-4" />
                    Save Shop Profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tab 2: Receipt & Invoicing */}
        {activeTab === "invoice" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-gray-900">
                POS Receipt Header & Footer Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Input label="Receipt Header Title" defaultValue="AGS STORE" />
              <Input label="Receipt Tagline" defaultValue="Retail & Wholesale Cosmetics" />
              <Input label="Receipt Footer Note" defaultValue="Thank you for shopping with AGS Store!" />
              <div className="pt-2">
                <Button size="sm" className="bg-brand-600 text-white text-xs font-semibold">
                  Update Receipt Layout
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Roles & Permissions */}
        {activeTab === "roles" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-gray-900">
                System Roles & Permission Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Owner (Super Admin)</h4>
                    <p className="text-[11px] text-gray-500">
                      Unrestricted access to all modules, reports, user management, and AI center
                    </p>
                  </div>
                  <Badge variant="success">All Permissions</Badge>
                </div>

                <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Cashier (POS Staff)</h4>
                    <p className="text-[11px] text-gray-500">
                      High-speed billing, item lookup, customer selection; cost prices hidden via products_for_cashier view
                    </p>
                  </div>
                  <Badge variant="neutral">Restricted Scope</Badge>
                </div>

                <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Manager (Inventory & Purchasing)</h4>
                    <p className="text-[11px] text-gray-500">
                      Catalog updates, purchase order receiving, and customer request management
                    </p>
                  </div>
                  <Badge variant="info">Operational Scope</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 4: Database Connection */}
        {activeTab === "database" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-gray-900">
                Connected Supabase Backend Infrastructure
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Supabase Project Name</span>
                <span className="font-bold text-gray-900 font-mono">falcon</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Project Reference ID</span>
                <span className="font-bold text-gray-900 font-mono">knbabffighhuguxsdtzj</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Cloud Region</span>
                <span className="font-bold text-gray-900">ap-south-1 (Mumbai, India)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Project Endpoint</span>
                <span className="font-bold text-brand-700 font-mono">https://knbabffighhuguxsdtzj.supabase.co</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500 font-medium">Row-Level Security & Triggers</span>
                <Badge variant="success">Fully Active & Enforced</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 5: Backup & Disaster Recovery */}
        {activeTab === "backup" && <BackupSettingsTab />}

        {/* Tab 6: Packaging Units & Conversion Factors */}
        {activeTab === "units" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-brand-600" />
                  Packaging Units & Auto-Break Factors
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  Define packaging units (e.g. 10 pcs Ladi, 16 pcs Ladi, Box of 24, Pack of 8) for POS multi-unit billing and automatic loose-piece pricing.
                </p>
              </div>
              <Button
                onClick={() => setIsUnitModalOpen(true)}
                size="sm"
                className="gap-1.5 bg-brand-600 text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add / Manage Units
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {units.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-700">No custom packaging units found</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Add packaging units to enable auto-break billing in POS</p>
                  <Button
                    onClick={() => setIsUnitModalOpen(true)}
                    size="sm"
                    className="mt-3 bg-brand-600 text-white text-xs"
                  >
                    Create First Unit
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-12 bg-gray-50/80 px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <span className="col-span-4">Unit Name</span>
                    <span className="col-span-3">Pieces Per Unit</span>
                    <span className="col-span-3">Unit Type</span>
                    <span className="col-span-2 text-right">Action</span>
                  </div>
                  {units.map((u) => {
                    const factor = Number(u.conversion_factor) || 1;
                    return (
                      <div key={u.id} className="grid grid-cols-12 items-center px-4 py-3 text-xs hover:bg-gray-50/60 transition-colors">
                        <div className="col-span-4 font-semibold text-gray-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-500" />
                          {u.name}
                        </div>
                        <div className="col-span-3 font-mono font-bold text-brand-700">
                          {factor} {factor === 1 ? "piece" : "pieces"}
                        </div>
                        <div className="col-span-3">
                          {factor === 1 ? (
                            <Badge variant="neutral">Single Piece</Badge>
                          ) : (
                            <Badge variant="info">Multi-Piece Pack</Badge>
                          )}
                        </div>
                        <div className="col-span-2 text-right">
                          <button
                            onClick={() => setIsUnitModalOpen(true)}
                            className="text-[11px] text-brand-600 hover:text-brand-800 font-semibold cursor-pointer"
                          >
                            Configure
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <UnitManagementModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        shopId={SHOP_ID}
        units={units}
        onUnitsUpdated={(newUnits) => setUnits(newUnits)}
      />
    </MainLayout>
  );
}
