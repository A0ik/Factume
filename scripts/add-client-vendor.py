import re

with open('app/(app)/ocr/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add useDataStore import
content = content.replace(
    "import { useAuthStore } from '@/stores/authStore';",
    "import { useAuthStore } from '@/stores/authStore';\nimport { useDataStore } from '@/stores/dataStore';\nimport { getSupabaseClient } from '@/lib/supabase';"
)

# 2. Add User icon to lucide imports
content = content.replace(
    "Inbox, CheckCircle2, CircleDot, Archive } from 'lucide-react';",
    "Inbox, CheckCircle2, CircleDot, Archive, Users, Tag } from 'lucide-react';"
)

# 3. Add vendor rules state + client loading in the component
old_review_state = """  // Review state
  const [reviewingFile, setReviewingFile] = useState<ScannedFile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<ExtractedData | null>(null);
  const [lineItemsExpanded, setLineItemsExpanded] = useState(false);"""

new_review_state = """  // Review state
  const [reviewingFile, setReviewingFile] = useState<ScannedFile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<ExtractedData | null>(null);
  const [lineItemsExpanded, setLineItemsExpanded] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [projectCode, setProjectCode] = useState<string>('');

  // Clients from dataStore
  const { clients } = useDataStore();

  // Vendor learning: load rules from Supabase
  const [vendorRules, setVendorRules] = useState<Record<string, { category: string; accounting_code: string }>>({});

  useEffect(() => {
    if (!user) return;
    getSupabaseClient()
      .from('expenses')
      .select('vendor, category, account_code')
      .eq('user_id', user.id)
      .not('vendor', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!data) return;
        const rules: Record<string, { category: string; accounting_code: string }> = {};
        for (const row of data) {
          const key = (row.vendor || '').toLowerCase().trim();
          if (key && !rules[key]) {
            rules[key] = { category: row.category, accounting_code: row.account_code || '' };
          }
        }
        setVendorRules(rules);
      });
  }, [user]);"""

content = content.replace(old_review_state, new_review_state)

# 4. Apply vendor learning when scan completes
old_vendor_learning = """                    // Add accounting code suggestion based on category
                      if (data?.extracted?.category && CATEGORY_ACCOUNTING[data.extracted.category]) {
                        data.extracted.accounting_code = CATEGORY_ACCOUNTING[data.extracted.category].code;
                      }"""

new_vendor_learning = """                    // Vendor learning: override with learned rules if available
                      const vendorKey = (data?.extracted?.vendor || '').toLowerCase().trim();
                      if (vendorKey && vendorRules[vendorKey]) {
                        const learned = vendorRules[vendorKey];
                        if (learned.category) data.extracted.category = learned.category;
                        if (learned.accounting_code) data.extracted.accounting_code = learned.accounting_code;
                      }
                      // Add accounting code suggestion based on category (if no learned rule)
                      if (!data?.extracted?.accounting_code && data?.extracted?.category && CATEGORY_ACCOUNTING[data.extracted.category]) {
                        data.extracted.accounting_code = CATEGORY_ACCOUNTING[data.extracted.category].code;
                      }"""

content = content.replace(old_vendor_learning, new_vendor_learning)

# 5. Add client selector + project code in review panel (before the Actions section)
old_actions_section = """                {/* Actions */}
                <div className="p-5 border-t border-gray-100 dark:border-gray-700 space-y-3">"""

new_actions_section = """                {/* Client & Project Assignment */}
                <div className="px-5 pb-3 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Users size={10} /> Affectation client
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-sm font-medium focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    >
                      <option value="">Aucun client</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Tag size={10} /> Code projet
                    </label>
                    <input
                      type="text"
                      value={projectCode}
                      onChange={(e) => setProjectCode(e.target.value)}
                      placeholder="Ex: PROJ-2024-001"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Vendor Learning Indicator */}
                {reviewingFile.result.extracted.vendor && vendorRules[(reviewingFile.result.extracted.vendor || '').toLowerCase().trim()] && (
                  <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <Sparkles size={12} className="text-blue-500" />
                    <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">
                      Catégorie auto-apprise de vos factures précédentes de {reviewingFile.result.extracted.vendor}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="p-5 border-t border-gray-100 dark:border-gray-700 space-y-3">"""

content = content.replace(old_actions_section, new_actions_section)

# 6. Reset client/project when opening a new review
old_set_reviewing = """                                  onClick={() => {
                                    setReviewingFile(scannedFile);
                                    setEditData(scannedFile.result?.extracted || null);
                                    setEditMode(false);
                                  }}"""

new_set_reviewing = """                                  onClick={() => {
                                    setReviewingFile(scannedFile);
                                    setEditData(scannedFile.result?.extracted || null);
                                    setEditMode(false);
                                    setSelectedClientId('');
                                    setProjectCode('');
                                  }}"""

content = content.replace(old_set_reviewing, new_set_reviewing)

with open('app/(app)/ocr/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('done')
