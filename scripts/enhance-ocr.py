import re

with open('app/(app)/ocr/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add amount_ht to ExtractedData
old_extracted = '''interface ExtractedData {
  vendor: string;
  amount: number;
  vat_amount: number;
  date: string;
  description: string;
  category: string;
  confidence: number;
  invoice_number: string;
  currency: string;
  line_items: LineItem[];
}'''

new_extracted = '''interface ExtractedData {
  vendor: string;
  amount: number;
  amount_ht: number;
  vat_amount: number;
  date: string;
  description: string;
  category: string;
  confidence: number;
  invoice_number: string;
  currency: string;
  line_items: LineItem[];
  client_name?: string;
  project_code?: string;
  accounting_code?: string;
  is_duplicate?: boolean;
}'''

content = content.replace(old_extracted, new_extracted)

# 2. Add duplicate detection helper after getDextStatus
old_helper_end = """const DEXT_TABS: { key: DextTab; label: string; icon: typeof Inbox }[] = ["""

new_helper = """// Duplicate detection
function checkDuplicate(file: ScannedFile, allFiles: ScannedFile[], history: HistoryItem[]): boolean {
  if (!file.result?.extracted) return false;
  const { vendor, amount, date } = file.result.extracted;
  if (!vendor || !amount || !date) return false;

  // Check against other completed files
  for (const other of allFiles) {
    if (other.id === file.id || other.status !== 'complete' || !other.result?.extracted) continue;
    const o = other.result.extracted;
    if (o.vendor?.toLowerCase() === vendor.toLowerCase() && Math.abs(o.amount - amount) < 0.01 && o.date === date) return true;
  }

  // Check against history
  for (const h of history) {
    if (h.vendor?.toLowerCase() === vendor.toLowerCase() && Math.abs(h.amount - amount) < 0.01 && h.date === date) return true;
  }
  return false;
}

// PCG accounting codes mapping
const CATEGORY_ACCOUNTING: Record<string, { code: string; label: string }> = {
  transport: { code: '625600', label: 'Transports de personnel' },
  meals: { code: '625700', label: 'Repas' },
  accommodation: { code: '613100', label: 'Locations immobilières' },
  equipment: { code: '604000', label: 'Matériel et fournitures' },
  office: { code: '606400', label: 'Fournitures de bureau' },
  shopping: { code: '607000', label: 'Achats de marchandises' },
  telecom: { code: '626000', label: 'Communications' },
  insurance: { code: '616000', label: 'Primes d\'assurance' },
  software: { code: '618300', label: 'Logiciels' },
  other: { code: '613200', label: 'Autres charges locatives' },
};

const DEXT_TABS: { key: DextTab; label: string; icon: typeof Inbox }[] = ["""

content = content.replace(old_helper_end, new_helper)

# 3. Add duplicate check + accounting code assignment after scan completes
old_complete_update = """                    updateFile(scannedFile.id, {
                        status: 'complete',
                        progress: 100,
                        result: data,
                      });"""

new_complete_update = """                    // Add accounting code suggestion based on category
                      if (data?.extracted?.category && CATEGORY_ACCOUNTING[data.extracted.category]) {
                        data.extracted.accounting_code = CATEGORY_ACCOUNTING[data.extracted.category].code;
                      }
                      // Calculate HT from TTC and TVA
                      if (data?.extracted?.amount && data?.extracted?.vat_amount && !data.extracted.amount_ht) {
                        data.extracted.amount_ht = Math.round((data.extracted.amount - data.extracted.vat_amount) * 100) / 100;
                      }

                      updateFile(scannedFile.id, {
                        status: 'complete',
                        progress: 100,
                        result: data,
                      });"""

content = content.replace(old_complete_update, new_complete_update)

# 4. Add duplicate check after complete status update
old_toast_success = """                    toast.success(`"${scannedFile.file.name}" analysé avec succès`);"""

new_toast_success = """                    // Check for duplicates
                      setTimeout(() => {
                        setFiles(prev => {
                          const updated = prev.map(f => {
                            if (f.id !== scannedFile.id || f.status !== 'complete') return f;
                            const isDuplicate = checkDuplicate(f, prev, history);
                            if (isDuplicate) {
                              toast.warning('Doublon détecté : une facture similaire existe déjà');
                            }
                            return isDuplicate ? { ...f, result: { ...f.result!, extracted: { ...f.result!.extracted, is_duplicate: true } } } : f;
                          });
                          return updated;
                        });
                      }, 100);

                      toast.success(`"${scannedFile.file.name}" analysé avec succès`);"""

content = content.replace(old_toast_success, new_toast_success)

# 5. Add HT amount + accounting code + duplicate warning in review panel (after VAT section)
old_invoice_number = """                  {/* Invoice number */}
                  {reviewingFile.result.extracted.invoice_number && ("""

new_invoice_number = """                  {/* HT Amount */}
                  {reviewingFile.result.extracted.amount_ht > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Montant HT</label>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-0.5">
                        {formatCurrency(reviewingFile.result.extracted.amount_ht)}
                      </p>
                    </div>
                  )}

                  {/* Accounting code suggestion */}
                  {reviewingFile.result.extracted.category && CATEGORY_ACCOUNTING[reviewingFile.result.extracted.category] && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Compte comptable suggéré</label>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                        {CATEGORY_ACCOUNTING[reviewingFile.result.extracted.category].code} — {CATEGORY_ACCOUNTING[reviewingFile.result.extracted.category].label}
                      </p>
                    </div>
                  )}

                  {/* Duplicate warning */}
                  {reviewingFile.result.extracted.is_duplicate && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Doublon possible</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Une facture avec le même fournisseur, montant et date existe déjà.</p>
                      </div>
                    </div>
                  )}

                  {/* Invoice number */}
                  {reviewingFile.result.extracted.invoice_number && ("""

content = content.replace(old_invoice_number, new_invoice_number)

# 6. Add duplicate badge on file cards
old_confidence_badge = """                              {/* Complete: confidence + action */}
                              {scannedFile.status === 'complete' && scannedFile.result?.extracted && (
                                <div className="mt-2 flex items-center gap-2">
                                  <ConfidenceBadge confidence={scannedFile.result.extracted.confidence} />
                                </div>
                              )}"""

new_confidence_badge = """                              {/* Complete: confidence + duplicate badge */}
                              {scannedFile.status === 'complete' && scannedFile.result?.extracted && (
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                  <ConfidenceBadge confidence={scannedFile.result.extracted.confidence} />
                                  {scannedFile.result.extracted.is_duplicate && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                      <AlertCircle size={10} />
                                      Doublon
                                    </span>
                                  )}
                                </div>
                              )}"""

content = content.replace(old_confidence_badge, new_confidence_badge)

with open('app/(app)/ocr/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('done')
