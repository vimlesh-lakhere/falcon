import { Customer } from "@/types/database";
import { customersRepository } from "@/repositories/customers.repo";
import { sanitizeIndianPhone } from "@/lib/whatsapp-invoice";

export interface PickedContactResult {
  name: string;
  phone: string;
  rawContact?: any;
}

/**
 * Checks if the browser / mobile webview supports the W3C Native Contact Picker API.
 */
export function isContactPickerSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    "ContactsManager" in window
  );
}

/**
 * Launches the native mobile device contact picker sheet.
 */
export async function pickContactFromDevice(): Promise<PickedContactResult | null> {
  if (!isContactPickerSupported()) {
    throw new Error("Contact Picker API is not supported on this device/browser.");
  }

  try {
    const props = ["name", "tel"];
    const opts = { multiple: false };
    const contacts = await (navigator as any).contacts.select(props, opts);

    if (!contacts || contacts.length === 0) {
      return null; // User cancelled
    }

    const contact = contacts[0];
    const name = Array.isArray(contact.name) ? contact.name[0] : contact.name || "Customer";
    let rawTel = "";

    if (Array.isArray(contact.tel) && contact.tel.length > 0) {
      rawTel = contact.tel[0];
    } else if (typeof contact.tel === "string") {
      rawTel = contact.tel;
    }

    const cleanPhone = sanitizeIndianPhone(rawTel);

    return {
      name: name.trim(),
      phone: cleanPhone,
      rawContact: contact,
    };
  } catch (err: any) {
    if (err.name === "AbortError" || err.name === "SecurityError") {
      return null; // Cancelled
    }
    console.error("Failed to pick contact from device:", err);
    throw err;
  }
}

/**
 * Finds an existing customer by phone number, or auto-creates a new customer in database.
 */
export async function syncOrRegisterCustomerFromContact(
  contact: { name: string; phone: string },
  shopId: string,
  existingCustomers: Customer[] = []
): Promise<Customer> {
  const cleanPhone = sanitizeIndianPhone(contact.phone);

  // 1. Check in already loaded customer list
  if (cleanPhone) {
    const match = existingCustomers.find(
      (c) => sanitizeIndianPhone(c.phone || "") === cleanPhone
    );
    if (match) return match;
  } else if (contact.name) {
    const match = existingCustomers.find(
      (c) => c.name.toLowerCase() === contact.name.toLowerCase()
    );
    if (match) return match;
  }

  // 2. Query database for this phone
  if (cleanPhone) {
    try {
      const found = await customersRepository.getAll(shopId, cleanPhone);
      const exactMatch = found.find(
        (c) => sanitizeIndianPhone(c.phone || "") === cleanPhone
      );
      if (exactMatch) return exactMatch;
    } catch (e) {
      console.warn("Error querying customers by phone:", e);
    }
  }

  // 3. Create new customer entry in database
  const newCustomer = await customersRepository.create({
    shop_id: shopId,
    name: contact.name.trim() || `Customer ${cleanPhone.slice(-4)}`,
    phone: cleanPhone || null,
  });

  return newCustomer;
}
