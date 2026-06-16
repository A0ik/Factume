'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/ui/Button';
import { CompanySearch } from '@/components/ui/CompanySearch';
import { LEGAL_STATUSES } from '@/lib/utils';
import { Check, ChevronDown, Building2, Zap, ArrowRight, Lock } from 'lucide-react';
import Image from 'next/image';

/* ── Quick searchable dropdown ── */
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="w-full flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-left transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      >
        <Building2 size={16} className={selected ? 'text-primary' : 'text-gray-400'} />
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} className={`ml-auto text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">Aucun résultat</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-2.5 border-b border-gray-50 last:border-0"
              >
                {value === opt.value ? (
                  <Check size={14} className="text-primary flex-shrink-0" />
                ) : (
                  <span className="w-3.5 flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-900">{opt.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function QuickOnboardingPage() {
  const router = useRouter();
  const { updateProfile, user, initialized } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [form, setForm] = useState({
    company_name: '',
    first_name: '',
    last_name: '',
    legal_status: '',
    siret: '',
    vat_number: '',
    address: '',
    postal_code: '',
    city: '',
    country: 'France',
  });
  const [companyFound, setCompanyFound] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // BASTION — ne redirige vers /login qu'APRÈS l'init du store d'auth.
  // Sinon, au retour OAuth (cookie valide mais user pas encore chargé),
  // la page rebondit vers /login pendant une fraction de seconde.
  useEffect(() => {
    if (initialized && !user) router.replace('/login');
  }, [initialized, user, router]);

  const handleCompanySelect = (company: {
    name: string;
    siret: string;
    address: string;
    postal_code: string;
    city: string;
    vat_number: string;
  }) => {
    set('company_name', company.name);
    if (company.siret) set('siret', company.siret);
    if (company.address) set('address', company.address);
    if (company.postal_code) set('postal_code', company.postal_code);
    if (company.city) set('city', company.city);
    if (company.vat_number) set('vat_number', company.vat_number);
    setCompanyFound(true);
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await updateProfile({
        language: lang,
        onboarding_done: true,
      } as any);
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await updateProfile({
        language: lang,
        company_name: form.company_name,
        first_name: form.first_name,
        last_name: form.last_name,
        legal_status: form.legal_status || undefined,
        siret: form.siret || undefined,
        vat_number: form.vat_number || undefined,
        address: form.address || undefined,
        postal_code: form.postal_code || undefined,
        city: form.city || undefined,
        country: form.country,
        onboarding_done: true,
      } as any);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-blue-500/8 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/25 mb-4">
            <Image src="/logo-lg.png" alt="F" width={32} height={32} className="rounded-lg" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">
            Bienvenue sur Factu<span className="text-primary">.me</span>
          </h1>
          <p className="text-gray-400 text-sm">
            30 secondes pour configurer votre espace
          </p>
        </div>

        {/* Language toggle */}
        <div className="flex justify-center gap-2 mb-6">
          {([
            { code: 'fr' as const, flag: '🇫🇷', label: 'Français' },
            { code: 'en' as const, flag: '🇬🇧', label: 'English' },
          ]).map(({ code, flag, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                lang === code
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
              }`}
            >
              <span>{flag}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Main form card */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company search with auto-fill — THE WAOUH EFFECT */}
            <div>
              <label className="text-sm font-semibold text-gray-300 block mb-1.5">
                {lang === 'fr' ? 'Votre entreprise' : 'Your company'} <span className="text-primary">*</span>
              </label>
              <CompanySearch
                value={form.company_name}
                onChange={(v) => { set('company_name', v); setCompanyFound(false); }}
                onSelect={handleCompanySelect}
                placeholder={lang === 'fr' ? 'Rechercher par nom ou SIRET...' : 'Search by name or SIRET...'}
                required
              />
              {companyFound && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                  <Check size={14} />
                  <span>{lang === 'fr' ? 'Entreprise trouvée ! Infos auto-remplies.' : 'Company found! Auto-filled.'}</span>
                </div>
              )}
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">
                  {lang === 'fr' ? 'Prénom' : 'First name'}
                </label>
                <input
                  placeholder={lang === 'fr' ? 'Jean' : 'John'}
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">
                  {lang === 'fr' ? 'Nom' : 'Last name'}
                </label>
                <input
                  placeholder={lang === 'fr' ? 'Dupont' : 'Doe'}
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Legal status */}
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1">
                {lang === 'fr' ? 'Statut juridique' : 'Legal status'}
                <span className="text-gray-500 ml-1">({lang === 'fr' ? 'optionnel' : 'optional'})</span>
              </label>
              <div className="[&_button]:!bg-white/5 [&_button]:!border-white/10 [&_button]:!text-gray-300 [&_button]:hover:!bg-white/10 [&_button]:focus:!border-primary">
                <SearchableSelect
                  value={form.legal_status}
                  onChange={(v) => set('legal_status', v)}
                  options={LEGAL_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                  placeholder={lang === 'fr' ? 'Choisir le statut...' : 'Select status...'}
                />
              </div>
            </div>

            {/* SIRET (auto-filled) */}
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1">
                SIRET
                <span className="text-gray-500 ml-1">({lang === 'fr' ? 'auto-rempli' : 'auto-filled'})</span>
              </label>
              <input
                placeholder="12345678901234"
                value={form.siret}
                onChange={(e) => set('siret', e.target.value)}
                className={`w-full rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                  form.siret ? 'border-emerald-500/30 focus:border-emerald-500' : 'border-white/10 focus:border-primary'
                }`}
              />
            </div>

            {/* VAT (auto-filled) */}
            {form.vat_number && (
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">
                  N° TVA <span className="text-emerald-400 text-[10px]">✓ Auto</span>
                </label>
                <input
                  value={form.vat_number}
                  readOnly
                  className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-300"
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !form.company_name.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <>
                  <Zap size={16} />
                  {lang === 'fr' ? "C'est parti !" : "Let's go!"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Skip link */}
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
            >
              {lang === 'fr' ? 'Configurer plus tard →' : 'Set up later →'}
            </button>
          </form>
        </div>

        {/* Bottom trust signal */}
        <p className="text-center text-[10px] text-gray-600 mt-4">
          <Lock size={12} className="inline mr-1" /> {lang === 'fr' ? 'Vos données sont sécurisées et hébergées en France' : 'Your data is secure and hosted in France'}
        </p>
      </div>
    </div>
  );
}
