import re

with open('app/(app)/ocr/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the old file cards section header with Dext-style tabs
old_cards = """                {/* File cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {files.map((scannedFile) => (
                      <motion.div
                        key={scannedFile.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 shadow-lg overflow-hidden"
                      >"""

new_cards = """                {/* Dext-style Tabs */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl overflow-x-auto">
                  {DEXT_TABS.map(tab => {
                    const count = tabCounts[tab.key];
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                          isActive
                            ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        )}
                      >
                        <tab.icon size={13} className={cn(tab.key === 'processing' && count > 0 && 'animate-spin')} />
                        {tab.label}
                        {count > 0 && (
                          <span className={cn(
                            'ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black',
                            isActive ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                          )}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* File cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredFiles.map((scannedFile) => {
                      const dextStatus = getDextStatus(scannedFile);
                      return (
                      <motion.div
                        key={scannedFile.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={cn(
                          'relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border shadow-lg overflow-hidden',
                          dextStatus === 'to_review' ? 'border-amber-300/60 dark:border-amber-700/60' :
                          dextStatus === 'ready' ? 'border-emerald-300/60 dark:border-emerald-700/60' :
                          dextStatus === 'error' ? 'border-red-300/60 dark:border-red-700/60' :
                          'border-white/50 dark:border-white/10'
                        )}
                      >"""

content = content.replace(old_cards, new_cards)

# 2. Replace status display
old_complete_status = """                                {scannedFile.status === 'complete' && (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                    <Check size={12} />
                                    Terminé
                                    {scannedFile.result?.extracted && (
                                      <span className="ml-1">
                                        - {formatCurrency(scannedFile.result.extracted.amount)}
                                      </span>
                                    )}
                                  </span>
                                )}"""

new_complete_status = """                                {scannedFile.status === 'complete' && dextStatus === 'to_review' && (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                                    <Eye size={12} />
                                    À vérifier
                                    {scannedFile.result?.extracted && (
                                      <span className="ml-1 text-amber-500">- {formatCurrency(scannedFile.result.extracted.amount)}</span>
                                    )}
                                  </span>
                                )}
                                {scannedFile.status === 'complete' && dextStatus === 'ready' && (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 size={12} />
                                    Prêt
                                    {scannedFile.result?.extracted && (
                                      <span className="ml-1 text-emerald-500">- {formatCurrency(scannedFile.result.extracted.amount)}</span>
                                    )}
                                  </span>
                                )}"""

content = content.replace(old_complete_status, new_complete_status)

# 3. Fix map closing
old_map_close = """                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state when no files */}"""

new_map_close = """                    );
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state when no files */}"""

content = content.replace(old_map_close, new_map_close)

# 4. Update save statuses: saved -> processed
content = content.replace("status: 'saved',", "status: 'processed',")

# 5. Update history status labels
content = content.replace(
    "item.status === 'saved' ? 'Sauvegardé' : item.status === 'reviewed' ? 'Vérifié' : 'En attente'",
    "item.status === 'processed' ? 'Traité' : item.status === 'reviewed' ? 'Vérifié' : 'Archivé'"
)

# 6. Update button text
content = content.replace("Créer la dépense", "Valider et traiter")

# 7. Update stats
content = content.replace(
    "{ label: 'En attente', value: String(pendingReview), icon: Clock, color: 'from-blue-500 to-indigo-500' },",
    "{ label: 'À vérifier', value: String(tabCounts.to_review), icon: Eye, color: 'from-amber-500 to-orange-500' },"
)

# 8. Update history status badge colors
content = content.replace(
    "item.status === 'saved' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'",
    "item.status === 'processed' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'"
)
content = content.replace(
    "'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'",
    "'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'"
)

with open('app/(app)/ocr/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('done')
