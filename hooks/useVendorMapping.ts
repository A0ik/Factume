'use client';
import { useState } from 'react';

interface VendorMapping {
  vendor?: string;
  category?: string;
  payment_method?: string;
  vat_rate?: number;
}

export function useVendorMapping() {
  const [loading, setLoading] = useState(false);

  // Look up a vendor mapping
  const lookup = async (rawVendor: string): Promise<VendorMapping & { found: boolean }> => {
    if (!rawVendor.trim()) return { found: false };
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/vendor-learn?vendor=${encodeURIComponent(rawVendor)}`);
      const data = await res.json();
      return data;
    } catch {
      return { found: false };
    } finally {
      setLoading(false);
    }
  };

  // Save a correction (when user changes vendor/category)
  const learn = async (rawVendor: string, corrected: {
    vendor: string;
    category?: string;
    payment_method?: string;
    vat_rate?: number;
  }) => {
    if (!rawVendor.trim() || !corrected.vendor.trim()) return;
    try {
      await fetch('/api/expenses/vendor-learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_vendor: rawVendor,
          corrected_vendor: corrected.vendor,
          corrected_category: corrected.category,
          corrected_payment_method: corrected.payment_method,
          corrected_vat_rate: corrected.vat_rate,
        }),
      });
    } catch {}
  };

  return { lookup, learn, loading };
}
