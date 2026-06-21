import { Shield, CheckCircle2, Info, FileText, Users, Building2, ArrowRight, ExternalLink, Award, Lock, Plug, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function PDPHelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Facturation électronique (PDP)</h1>
              <p className="text-sm text-gray-600">Transmission légale via SuperPDP — plateforme agréée par l'État</p>
            </div>
          </div>
          <p className="text-gray-700">
            Factu.me transmet vos factures B2B à l'État via <strong>SuperPDP</strong>, une Plateforme de
            Dématérialisation Partagée (PDP) agréée. La connexion à votre compte SuperPDP est
            <strong> optionnelle</strong> : tant que l'émission obligatoire n'est pas en vigueur pour votre
            entreprise, vous pouvez continuer à facturer en B2B classique (PDF/email) sans transmission.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Rappel réglementaire */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-600" />
              La règle d'or à retenir
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-gray-700">
              La <strong>transmission électronique</strong> des factures B2B à l'État ne devient
              obligatoire qu'en <strong>2027</strong> (déploiement progressif selon la taille de
              l'entreprise). En attendant :
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-gray-700">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-1" />
                <span>Vous pouvez facturer en <strong>B2B classique</strong> (PDF, papier) sans aucune transmission — c'est légal.</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-1" />
                <span>La transmission ne se déclenche <strong>que si vous connectez votre compte SuperPDP</strong>. Sans connexion, vos factures partent normalement, sans transmission.</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-1" />
                <span>Le <strong>B2C</strong> (particuliers) n'est jamais concerné par la transmission (il relève de l'e-reporting, à part).</span>
              </li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-bold text-amber-800 mb-1">Calendrier officiel</p>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• <strong>Sept. 2026</strong> : obligation de <em>réception</em> des factures électroniques (toutes entreprises)</li>
                <li>• <strong>2027</strong> : obligation d'<em>émission/transmission</em> progressive selon la taille</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Plug size={20} className="text-blue-600" />
              Comment ça marche chez Factu.me
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">1</div>
                <div>
                  <p className="font-semibold text-gray-900">Connectez votre compte SuperPDP (une seule fois)</p>
                  <p className="text-sm text-gray-600">
                    Rendez-vous dans <strong>Paramètres → Facturation</strong> et cliquez sur « Connecter ma plateforme ».
                    Une authentification sécurisée (OAuth) lie votre compte SuperPDP à Factu.me. Le jeton est chiffré
                    et représente <strong>votre entreprise émettrice</strong> — Factu.me ne peut transmettre que pour vous.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">2</div>
                <div>
                  <p className="font-semibold text-gray-900">Créez et envoyez vos factures B2B normalement</p>
                  <p className="text-sm text-gray-600">
                    Dès qu'une facture destinée à un client assujetti (avec SIRET) est prête, Factu.me génère le
                    format CII (EN 16931) et transmet automatiquement à SuperPDP, qui achemine vers le destinataire
                    et l'État.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">3</div>
                <div>
                  <p className="font-semibold text-gray-900">Suivez le statut en temps réel</p>
                  <p className="text-sm text-gray-600">
                    Acceptation, refus, paiement… le cycle de vie (CDAR) de chaque facture est synchronisé et
                    affiché sur la facture. Les échecs transitoires sont retentés automatiquement.
                  </p>
                </div>
              </li>
            </ol>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Pas encore connecté ?</strong> Si vous cliquez sur « Transmettre à l'État » sans compte
                SuperPDP lié, Factu.me vous invite simplement à le faire — aucune facture n'est bloquée.
              </p>
            </div>
          </div>
        </section>

        {/* Required Information */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 border-b border-emerald-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-600" />
              Informations obligatoires pour la transmission
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 size={18} className="text-primary" />
                Vendeur (votre entreprise)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoItem label="Nom de l'entreprise" required />
                <InfoItem label="SIRET (14 chiffres)" required />
                <InfoItem label="Numéro TVA intracommunautaire" required />
                <InfoItem label="Adresse complète" required />
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Users size={18} className="text-primary" />
                Client (assujetti — B2B uniquement)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoItem label="Nom du client" required />
                <InfoItem label="SIRET client (14 chiffres)" required />
                <InfoItem label="Numéro TVA client" recommended />
                <InfoItem label="Adresse complète" required />
              </div>
            </div>
          </div>
        </section>

        {/* Factur-X / CII */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4 border-b border-violet-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Award size={20} className="text-violet-600" />
              Le format : CII (norme EN 16931)
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-gray-700">
              Pour la transmission via SuperPDP, Factu.me génère le format <strong>CII</strong> (Cross-Industry Invoice),
              conforme à la norme européenne <strong>EN 16931</strong>. Factu-X (PDF + XML hybride) reste disponible au
              téléchargement pour vos archives et vos échanges hors plateforme.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="font-bold text-emerald-800">Conforme EN 16931</span>
                </div>
                <p className="text-sm text-emerald-700">Norme européenne d'interopérabilité</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-blue-600" />
                  <span className="font-bold text-blue-800">Données structurées</span>
                </div>
                <p className="text-sm text-blue-700">Lisibles par les PDP et l'administration</p>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className="text-violet-600" />
                  <span className="font-bold text-violet-800">Prêt pour PDP</span>
                </div>
                <p className="text-sm text-violet-700">Toutes les mentions légales incluses</p>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Lock size={20} className="text-amber-600" />
              Sécurité et traçabilité
            </h2>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Jeton OAuth chiffré (AES-256-GCM)</p>
                  <p className="text-sm text-gray-600">Votre jeton SuperPDP est stocké chiffré — jamais en clair.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Piste d'audit complète</p>
                  <p className="text-sm text-gray-600">Chaque transmission et chaque événement de cycle de vie est enregistré.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Concordance SIREN garantie</p>
                  <p className="text-sm text-gray-600">Le compte SuperPDP connecté doit correspondre à votre entreprise (vérifié en production).</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-br from-primary via-primary-dark to-primary rounded-2xl p-8 text-center text-white shadow-xl">
          <h2 className="text-2xl font-black mb-3">Prêt pour la facture électronique ?</h2>
          <p className="text-white/90 mb-6">
            Connectez votre plateforme SuperPDP ou créez une facture conforme
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
            >
              <Plug size={18} />
              Connecter ma plateforme
            </Link>
            <Link
              href="/invoices/new"
              className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-all"
            >
              Créer une facture
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        {/* Resources */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
          <h3 className="font-bold text-gray-900 mb-4">Ressources utiles</h3>
          <div className="space-y-3">
            <a
              href="https://www.superpdp.tech/documentation/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-gray-700 hover:text-primary transition-colors group"
            >
              <ExternalLink size={16} className="text-gray-400 group-hover:text-primary flex-shrink-0" />
              <span className="text-sm">Documentation officielle SuperPDP</span>
            </a>
            <a
              href="https://www.economie.gouv.fr/entreprises/actualites/facturation-electronique-obligatoire"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-gray-700 hover:text-primary transition-colors group"
            >
              <ExternalLink size={16} className="text-gray-400 group-hover:text-primary flex-shrink-0" />
              <span className="text-sm">Portail officiel de la facturation électronique (economie.gouv.fr)</span>
            </a>
            <Link
              href="/help/factur-x"
              className="flex items-center gap-3 text-gray-700 hover:text-primary transition-colors group"
            >
              <ExternalLink size={16} className="text-gray-400 group-hover:text-primary flex-shrink-0" />
              <span className="text-sm">Guide complet Factur-X sur Factu.me</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, required, recommended }: { label: string; required?: boolean; recommended?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {required && <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />}
      {recommended && <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />}
      <span className={required ? "text-gray-900 font-medium" : "text-gray-700"}>{label}</span>
      {required && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Obligatoire</span>}
      {recommended && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Recommandé</span>}
    </div>
  );
}
