"use client";

import React, { useState } from "react";
import {
  User,
  BookUser,
  Plus,
  X,
  Phone,
  Check,
  MapPin,
  Sparkles,
  Search,
  Pencil,
} from "lucide-react";
import { Customer } from "@/types/database";
import { customersRepository } from "@/repositories/customers.repo";
import {
  isContactPickerSupported,
  pickContactFromDevice,
  syncOrRegisterCustomerFromContact,
} from "@/lib/contact-picker";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface PosCustomerSelectorProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onCustomerCreated: (customer: Customer) => void;
  onCollectPayment?: () => void;
  shopId: string;
  /** Editable name shown on this bill (display only — never changes the saved customer). */
  billName?: string;
  onBillNameChange?: (name: string) => void;
}

export const PosCustomerSelector: React.FC<PosCustomerSelectorProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onCustomerCreated,
  onCollectPayment,
  shopId,
  billName,
  onBillNameChange,
}) => {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingName, setEditingName] = useState(false);

  const filteredCustomers = search.trim()
    ? customers.filter((c) => {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
      })
    : [];
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string>("");

  const hasContactPicker = isContactPickerSupported();

  const handlePickFromDeviceContacts = async () => {
    try {
      const picked = await pickContactFromDevice();
      if (!picked) return; // Cancelled

      const synced = await syncOrRegisterCustomerFromContact(
        picked,
        shopId,
        customers
      );

      onCustomerCreated(synced);
      onSelectCustomer(synced);

      setFeedback(`✓ Selected: ${synced.name} ${synced.phone ? `(${synced.phone})` : ""}`);
      setTimeout(() => setFeedback(""), 3500);
    } catch (err: any) {
      console.warn("Contact picker error:", err);
      // If not supported or user cancelled, open quick add modal
      setIsQuickAddOpen(true);
    }
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSaving(true);
      const created = await customersRepository.create({
        shop_id: shopId,
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
      });

      onCustomerCreated(created);
      onSelectCustomer(created);
      setIsQuickAddOpen(false);
      setName("");
      setPhone("");
      setAddress("");

      setFeedback(`✓ Customer "${created.name}" created and assigned!`);
      setTimeout(() => setFeedback(""), 3500);
    } catch (err: any) {
      alert("Failed to create customer: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="p-3 border-b border-gray-200 bg-gray-50/80 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3 text-purple-600" />
            <span>Customer / Biller</span>
          </span>

          <div className="flex items-center gap-1">
            {/* Native Mobile Contact Picker Button */}
            <button
              type="button"
              onClick={handlePickFromDeviceContacts}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-100 hover:bg-purple-200 text-purple-800 flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs border border-purple-200"
              title="Pick customer from phone contacts"
            >
              <BookUser className="w-3 h-3 text-purple-700" />
              <span>📱 Contacts</span>
            </button>

            {/* Quick Add New Customer Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(true)}
              className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-white hover:bg-gray-100 text-gray-700 flex items-center gap-0.5 transition-all cursor-pointer border border-gray-200"
              title="Add New Customer"
            >
              <Plus className="w-3 h-3 text-purple-600" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Selected Customer View vs Dropdown */}
        {selectedCustomer ? (
          <div className="p-2 bg-purple-50 rounded-xl border border-purple-200 animate-in fade-in duration-150 space-y-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                {editingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={billName ?? selectedCustomer.name}
                      onChange={(e) => onBillNameChange?.(e.target.value)}
                      onBlur={() => setEditingName(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setEditingName(false);
                      }}
                      placeholder="बिल पर नाम (Name on bill)"
                      className="flex-1 min-w-0 text-xs font-black text-purple-950 bg-white border border-purple-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="p-1 text-emerald-600 hover:bg-white rounded-lg"
                      title="Done"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-black text-purple-950 truncate flex items-center gap-1">
                    <span className="truncate">👤 {billName || selectedCustomer.name}</span>
                    {selectedCustomer.phone && (
                      <span className="text-[10px] font-mono font-semibold text-purple-700 shrink-0">
                        (+91 {selectedCustomer.phone})
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      className="p-0.5 text-purple-500 hover:text-purple-900 shrink-0"
                      title="बिल पर नाम बदलें (Edit name for this bill)"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {billName && billName.trim() && billName.trim() !== selectedCustomer.name && (
                  <div className="text-[9.5px] text-amber-700 font-semibold">
                    बिल पर: “{billName.trim()}” · खाता: {selectedCustomer.name}
                  </div>
                )}
                {selectedCustomer.address && (
                  <div className="text-[10px] text-gray-500 truncate flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{selectedCustomer.address}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onSelectCustomer(null)}
                className="p-1 text-purple-600 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer ml-1"
                title="Switch to Walk-in Customer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Advance / Credit badge when the customer has paid extra (negative balance) */}
            {Number(selectedCustomer.outstanding_balance) < 0 && (
              <div className="pt-1 border-t border-purple-200/60 text-[10px]">
                <span className="font-bold text-blue-800 bg-blue-100/90 px-2 py-0.5 rounded-md border border-blue-300 flex items-center gap-1 w-fit">
                  <span>💰 Advance जमा:</span>
                  <span className="font-black">₹{Math.abs(Number(selectedCustomer.outstanding_balance)).toFixed(2)}</span>
                </span>
              </div>
            )}

            {/* Khata / Udhaar Badge if customer has pending balance */}
            {Number(selectedCustomer.outstanding_balance) > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-purple-200/60 text-[10px]">
                <span className="font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300 flex items-center gap-1">
                  <span>📕 पुराना बकाया:</span>
                  <span className="font-black">₹{Number(selectedCustomer.outstanding_balance).toFixed(2)}</span>
                </span>
                {onCollectPayment && (
                  <button
                    type="button"
                    onClick={onCollectPayment}
                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[10px] shadow-2xs cursor-pointer transition-all active:scale-95"
                  >
                    + जमा करें (Settle)
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* Searchable customer picker */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ग्राहक खोजें — नाम या नंबर..."
                className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-600"
                  title="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {search.trim() && (
              <div className="max-h-44 overflow-y-auto space-y-0.5 rounded-lg border border-gray-100 bg-white p-1">
                {filteredCustomers.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setName(search.trim());
                      setIsQuickAddOpen(true);
                    }}
                    className="w-full text-left px-2 py-1.5 text-[11px] text-brand-700 font-bold hover:bg-brand-50 rounded-lg cursor-pointer"
                  >
                    + “{search.trim()}” नया ग्राहक जोड़ें
                  </button>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectCustomer(c);
                        setSearch("");
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-50 text-left cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-gray-900 truncate">{c.name}</div>
                        {c.phone && <div className="text-[10px] text-gray-400 font-mono">{c.phone}</div>}
                      </div>
                      {Number(c.outstanding_balance) > 0 && (
                        <span className="text-[9px] font-black text-red-700 bg-red-100 px-1.5 py-0.5 rounded shrink-0">
                          बकाया ₹{Number(c.outstanding_balance).toFixed(0)}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="text-[9.5px] text-gray-400">बिना चुने = Walk-in Customer · नाम/नंबर टाइप करके खोजें</div>
          </div>
        )}

        {/* Dynamic Toast Feedback */}
        {feedback && (
          <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md animate-in fade-in">
            {feedback}
          </div>
        )}
      </div>

      {/* Quick Add Customer Modal */}
      {isQuickAddOpen && (
        <Modal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          title="👤 Quick Add Customer"
          description="Save customer name & mobile number for WhatsApp billing and pricing"
          maxWidth="sm"
        >
          <form onSubmit={handleQuickAddSubmit} className="space-y-3">
            <Input
              label="Customer Name *"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              autoFocus
            />

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                WhatsApp / Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-gray-400 font-mono">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                  placeholder="10-digit mobile"
                  className="w-full text-xs bg-white border border-gray-300 rounded-md pl-10 pr-3 py-2 font-mono font-medium focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>
            </div>

            <Input
              label="Address / Town (Optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Ward No. 4, Main Market"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuickAddOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSaving}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
              >
                <Check className="w-4 h-4 mr-1" /> Save & Select
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};
