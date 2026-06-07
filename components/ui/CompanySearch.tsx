'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CompanyResult {
  name: string;
  siret: string;
  siren: string;
  address: string;
  postal_code: string;
  city: string;
  vat_number: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (company: CompanyResult) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  /** FLAW 2 FIX: Client type determines search behavior.
   * 'b2c' disables SIRENE API and shows a simple text input.
   * 'b2b' or null uses SIRENE API autocomplete.
   */
  clientType?: 'b2b' | 'b2c' | null;
}

function computeFrenchVAT(siren: string): string {
  if (!siren || siren.length !== 9) return '';
  const key = (12 + 3 * (parseInt(siren, 10) % 97)) % 97;
  return `FR${String(key).padStart(2, '0')}${siren}`;
}

/**
 * CompanySearch — Contextual client search with B2B/B2C intelligence.
 *
 * ═══ FLAW 2 FIX — Loi: L'Adaptation Contextuelle Dynamique ═══
 * When clientType is 'b2c', the SIRENE API is completely disabled and the
 * component becomes a simple text input with B2C-appropriate placeholder
 * ("Prénom et nom du client") and a User icon instead of Building2.
 * When clientType is 'b2b' or null, the full SIRENE autocomplete is active.
 *
 * ═══ UX LAWS APPLIED ═══
 * • Jakob's Law — B2C mode looks like a standard name input (familiar pattern)
 * • Miller's Law — Reduced cognitive load for B2C (no SIRET, no company results)
 * • Law of Context — UI adapts dynamically to the user's current task context
 */
export function CompanySearch({ value, onChange, onSelect, label, placeholder, required, clientType }: Props) {
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = async (q: string) => {
    // ═══ FLAW 2 FIX: B2C mode — skip SIRENE API entirely ═══
    if (clientType === 'b2c') {
      setResults([]);
      setOpen(false);
      return;
    }

    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&page=1&per_page=6`,
      );
      const data = await res.json();
      const companies: CompanyResult[] = (data.results || []).map((r: any) => {
        const siege = r.siege || {};
        const addressParts = [
          siege.numero_voie,
          siege.type_voie,
          siege.libelle_voie,
        ].filter(Boolean).join(' ');
        return {
          name: r.nom_complet || r.nom_raison_sociale || '',
          siret: siege.siret || '',
          siren: r.siren || '',
          address: siege.geo_adresse || addressParts,
          postal_code: siege.code_postal || '',
          city: siege.libelle_commune || '',
          vat_number: computeFrenchVAT(r.siren || ''),
        };
      });
      setResults(companies);
      setOpen(companies.length > 0);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(v), 350);
  };

  // ═══ FLAW 2 FIX: Dynamic placeholder based on client type ═══
  const dynamicPlaceholder = placeholder ||
    (clientType === 'b2c'
      ? 'Prénom et nom du client'
      : 'Nom, SIRET ou raison sociale');

  // Dynamic search icon — User for B2C, Search for B2B
  const searchIcon = clientType === 'b2c'
    ? <User size={14} className="text-blue-400 dark:text-blue-400" />
    : <Search size={14} className="text-gray-400 dark:text-gray-500" />;

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 block mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => clientType !== 'b2c' && results.length > 0 && setOpen(true)}
          placeholder={dynamicPlaceholder}
          required={required}
          className={cn(
            'w-full rounded-xl border text-sm focus:outline-none focus:ring-2 pr-9 px-4 py-2.5',
            // ═══ FLAW 2 FIX: B2C gets blue-tinted input ═══
            clientType === 'b2c'
              ? 'border-blue-200 dark:border-blue-500/30 bg-blue-50/30 dark:bg-blue-500/5 dark:text-white dark:placeholder:text-gray-500 focus:ring-blue-500/20 focus:border-blue-400'
              : 'border-gray-200 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-white dark:placeholder:text-gray-500 focus:ring-emerald-500/30 focus:border-emerald-400',
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {searching ? (
            <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            searchIcon
          )}
        </div>
      </div>

      {/* B2C hint — subtle indication that this is manual entry */}
      {clientType === 'b2c' && value.length === 0 && (
        <p className="mt-1 text-[10px] text-blue-400 dark:text-blue-500/70 font-medium">
          Saisie manuelle — pas de recherche d&apos;entreprise
        </p>
      )}

      {/* ═══ SIRENE results — B2B only ═══ */}
      {clientType !== 'b2c' && open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
          <div className="px-3 py-1.5 border-b border-gray-50 dark:border-white/5">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              R&eacute;sultats &mdash; Base SIRENE (donn&eacute;es officielles)
            </p>
          </div>
          {results.map((company, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onSelect(company); onChange(company.name); setOpen(false); }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-50 dark:border-white/5 last:border-0"
            >
              <div className="flex items-start gap-2.5">
                <Building2 size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{company.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {company.siret && `SIRET ${company.siret}`}
                    {company.city && ` · ${company.postal_code} ${company.city}`}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
