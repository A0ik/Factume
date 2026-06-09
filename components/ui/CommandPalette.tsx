'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/stores/dataStore';
import {
  Search, FileText, Users, Receipt, Clipboard, RefreshCw,
  ShoppingCart, Truck, Banknote, X, ArrowRight, Clock,
  LayoutDashboard, Settings, Bell, HelpCircle, Package,
  Target, DollarSign, Calendar, Activity, Plug, ScanLine,
  Plus, FileSignature, ClipboardList, CreditCard, FileCheck,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

const DOC_ICON: Record<string, any> = {
  invoice: Receipt, quote: Clipboard, credit_note: RefreshCw,
  purchase_order: ShoppingCart, delivery_note: Truck, deposit: Banknote,
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'text-gray-400' },
  sent: { label: 'Envoyée', color: 'text-blue-500' },
  paid: { label: 'Payée', color: 'text-green-500' },
  overdue: { label: 'En retard', color: 'text-red-500' },
  accepted: { label: 'Accepté', color: 'text-purple-500' },
  refused: { label: 'Refusé', color: 'text-orange-500' },
};

// Navigation items for the palette
const NAV_ITEMS = [
  { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, keywords: 'dashboard accueil home' },
  { label: 'Documents', href: '/documents', icon: FileText, keywords: 'factures devis avoirs commandes livraisons acomptes invoices quotes' },
  { label: 'Contacts', href: '/contacts', icon: Users, keywords: 'clients articles crm pipeline customers' },
  { label: 'Contrats', href: '/contracts', icon: ClipboardList, keywords: 'cdi cdd contracts employment' },
  { label: 'Notes de frais', href: '/expenses', icon: DollarSign, keywords: 'expenses dépenses finances' },
  { label: 'Comptabilité', href: '/accounting', icon: DollarSign, keywords: 'accounting comptabilité' },
  { label: 'Banque', href: '/banking', icon: DollarSign, keywords: 'banking banque transactions' },
  { label: 'Agenda', href: '/calendar', icon: Calendar, keywords: 'calendar agenda rendez-vous' },
  { label: 'Activité', href: '/activity', icon: Activity, keywords: 'activity activité log historique' },
  { label: 'Paramètres', href: '/settings', icon: Settings, keywords: 'settings paramètres configuration' },
  { label: 'Notifications', href: '/notifications', icon: Bell, keywords: 'notifications alertes' },
  { label: 'Aide', href: '/help', icon: HelpCircle, keywords: 'help aide support' },
];

// Quick action items
const ACTION_ITEMS = [
  { label: 'Créer une facture', href: '/documents/factures/new', icon: Plus, keywords: 'nouvelle facture create invoice', section: 'actions' },
  { label: 'Créer un devis', href: '/documents/devis/new', icon: FileCheck, keywords: 'nouveau devis create quote', section: 'actions' },
  { label: 'Créer un avoir', href: '/documents/avoirs/new', icon: RefreshCw, keywords: 'nouvel avoir credit note', section: 'actions' },
  { label: 'Ajouter un client', href: '/contacts?tab=clients', icon: Users, keywords: 'nouveau client add customer', section: 'actions' },
  { label: 'Voir les contrats', href: '/contracts', icon: FileSignature, keywords: 'contrats cdi cdd', section: 'actions' },
];

interface Result {
  id: string;
  type: 'document' | 'client' | 'navigation' | 'action';
  title: string;
  subtitle: string;
  href: string;
  icon: any;
  iconBg?: string;
  meta?: string;
  metaColor?: string;
  section: string;
}

let setOpenCommandPalette: ((open: boolean) => void) | null = null;

export function openCommandPalette() {
  setOpenCommandPalette?.(true);
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { invoices, clients } = useDataStore();

  useEffect(() => {
    setOpenCommandPalette = setOpen;
    return () => { setOpenCommandPalette = null; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const results: Result[] = (() => {
    const q = query.toLowerCase().trim();

    // Navigation results
    const navResults: Result[] = NAV_ITEMS
      .filter(item => !q || item.label.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q))
      .map(item => ({
        id: `nav-${item.href}`,
        type: 'navigation' as const,
        title: item.label,
        subtitle: item.href,
        href: item.href,
        icon: item.icon,
        section: 'Navigation',
      }));

    // Action results
    const actionResults: Result[] = ACTION_ITEMS
      .filter(item => !q || item.label.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q))
      .map(item => ({
        id: `action-${item.href}`,
        type: 'action' as const,
        title: item.label,
        subtitle: item.href,
        href: item.href,
        icon: item.icon,
        section: 'Actions',
      }));

    if (!q) {
      return [...actionResults.slice(0, 3), ...navResults.slice(0, 7)].slice(0, 10);
    }

    // Document results
    const docResults: Result[] = invoices
      .filter((inv) =>
        (inv.number || '').toLowerCase().includes(q) ||
        (inv.client?.name || inv.client_name_override || '').toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((inv) => {
        const DocIcon = DOC_ICON[inv.document_type || 'invoice'] || FileText;
        const st = STATUS_LABEL[inv.status] || STATUS_LABEL.draft;
        const typeLabels: Record<string, string> = {
          invoice: 'Facture', quote: 'Devis', credit_note: 'Avoir',
          purchase_order: 'Commande', delivery_note: 'Livraison', deposit: 'Acompte',
        };
        return {
          id: inv.id,
          type: 'document' as const,
          title: `${typeLabels[inv.document_type || 'invoice'] || 'Document'} ${inv.number || ''}`,
          subtitle: inv.client?.name || inv.client_name_override || '—',
          href: `/invoices/${inv.id}`,
          icon: DocIcon,
          meta: `${formatCurrency(inv.total)} · ${st.label}`,
          metaColor: st.color,
          section: 'Documents',
        };
      });

    // Client results
    const clientResults: Result[] = clients
      .filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((c) => ({
        id: `client-${c.id}`,
        type: 'client' as const,
        title: c.name,
        subtitle: c.email || c.city || '',
        href: `/clients/${c.id}`,
        icon: Users,
        section: 'Clients',
      }));

    // Combine: docs first, then clients, then actions, then nav — cap at 12
    return [...docResults, ...clientResults, ...actionResults.slice(0, 2), ...navResults.slice(0, 3)].slice(0, 12);
  })();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && results[selected]) {
        router.push(results[selected].href);
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, selected, router]);

  useEffect(() => { setSelected(0); }, [query]);

  const go = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
  }, [router]);

  if (!open) return null;

  // Group results by section
  const sections = Array.from(new Set(results.map(r => r.section)));

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-label="Palette de commandes"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un document, client, ou naviguer..."
            className="flex-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent focus:outline-none"
            role="combobox"
            aria-expanded={open}
            aria-activedescendant={selected >= 0 ? 'cmd-result-' + selected : undefined}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length === 0 && query.trim() !== '' ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">Aucun résultat pour <strong>"{query}"</strong></p>
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <Clock size={18} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">Tapez pour rechercher partout</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">↑↓ naviguer · ↵ ouvrir · Échap fermer</p>
          </div>
        ) : (
          <div className="py-1.5 max-h-[60vh] overflow-y-auto" role="listbox">
            {sections.map(section => {
              const sectionResults = results.filter(r => r.section === section);
              if (sectionResults.length === 0) return null;
              return (
                <div key={section}>
                  <div className="px-4 py-1.5">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{section}</p>
                  </div>
                  {sectionResults.map((result) => {
                    const globalIdx = results.indexOf(result);
                    const Icon = result.icon;
                    const isClient = result.type === 'client';
                    return (
                      <button
                        key={result.id}
                        onClick={() => go(result.href)}
                        onMouseEnter={() => setSelected(globalIdx)}
                        role="option"
                        id={'cmd-result-' + globalIdx}
                        aria-selected={globalIdx === selected}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          selected === globalIdx ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          isClient ? 'rounded-full' : '',
                          selected === globalIdx ? 'bg-primary/20 dark:bg-primary/30' : 'bg-gray-100 dark:bg-gray-800'
                        )}>
                          {isClient ? (
                            <span className={cn('text-xs font-bold', selected === globalIdx ? 'text-primary' : 'text-gray-500 dark:text-gray-400')}>
                              {result.title[0].toUpperCase()}
                            </span>
                          ) : (
                            <Icon size={14} className={selected === globalIdx ? 'text-primary' : 'text-gray-400 dark:text-gray-500'} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{result.title}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{result.subtitle}</p>
                        </div>
                        {result.meta && (
                          <p className={cn('text-xs font-semibold flex-shrink-0 hidden sm:block', result.metaColor || 'text-gray-400 dark:text-gray-500')}>
                            {result.meta}
                          </p>
                        )}
                        {selected === globalIdx && <ArrowRight size={14} className="text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
          <p className="text-[10px] text-gray-300 dark:text-gray-600 font-medium">{results.length} résultat{results.length !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-3 text-[10px] text-gray-300 dark:text-gray-600">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-400 font-mono">↑↓</kbd> naviguer</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-400 font-mono">↵</kbd> ouvrir</span>
          </div>
        </div>
      </div>
    </div>
  );
}
