import { notFound } from 'next/navigation';
import { CheckCircle2, XCircle, AlertTriangle, Shield, FileText, Calendar, User, Globe } from 'lucide-react';

interface VerificationResponse {
  signature: {
    id: string;
    documentId: string;
    signerName: string;
    timestamp: string;
    eidasLevel: string;
    valid: boolean;
    integrityValid: boolean;
    certificateValid?: boolean;
  };
  compliance: {
    signatureId: string;
    eidasLevel: 'simple' | 'advanced' | 'qualified';
    compliant: boolean;
    regulation: string;
    features: {
      uniqueLink: boolean;
      identification: boolean;
      timestamp: boolean;
      certificate: boolean;
      immutableLog: boolean;
      verification: boolean;
    };
    recommendations: string[];
  };
}

async function getVerificationData(signatureId: string): Promise<VerificationResponse | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/eidas/verify/${signatureId}`);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export default async function VerifySignaturePage({
  params
}: {
  params: Promise<{ signatureId: string }>;
}) {
  const { signatureId } = await params;
  const data = await getVerificationData(signatureId);

  if (!data) {
    notFound();
  }

  const { signature, compliance } = data;

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'qualified':
        return { label: 'Qualifiée (QES)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'advanced':
        return { label: 'Avancée (AdES)', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      default:
        return { label: 'Simple', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const badge = getLevelBadge(signature.eidasLevel);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Vérification de Signature
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Conformité eIDAS - {compliance.regulation}
          </p>
        </div>

        {/* Statut principal */}
        <div className={`rounded-2xl p-6 mb-6 border-2 ${
          signature.valid
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-4">
            {signature.valid ? (
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-12 h-12 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {signature.valid ? 'Signature Valide' : 'Signature Invalide'}
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                {signature.valid
                  ? 'Cette signature a été enregistrée et vérifiée (niveau Simple eIDAS).'
                  : 'Cette signature ne peut pas être vérifiée'}
              </p>
            </div>
          </div>
        </div>

        {/* Détails de la signature */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Détails de la signature
            </h3>
          </div>

          <div className="p-6 space-y-4">
            {/* Signataire */}
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Signataire</p>
                <p className="font-medium text-gray-900 dark:text-white">{signature.signerName}</p>
              </div>
            </div>

            {/* Date de signature */}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date de signature</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(signature.timestamp).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Niveau eIDAS */}
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Niveau de conformité</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            </div>

            {/* Document */}
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Document signé</p>
                <p className="font-medium text-gray-900 dark:text-white font-mono text-sm">
                  {signature.documentId}
                </p>
              </div>
            </div>

            {/* Intégrité */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Intégrité du document</span>
                <div className="flex items-center gap-2">
                  {signature.integrityValid ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    signature.integrityValid ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {signature.integrityValid ? 'Validé' : 'Corrompu'}
                  </span>
                </div>
              </div>
            </div>

            {/* Certificat (QES) - Non implémenté */}
            {false && signature.eidasLevel === 'qualified' && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Certificat numérique</span>
                  <div className="flex items-center gap-2">
                    {signature.certificateValid !== undefined && (
                      <>
                        {signature.certificateValid ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        )}
                        <span className={`text-sm font-medium ${
                          signature.certificateValid ? 'text-green-700' : 'text-amber-700'
                        }`}>
                          {signature.certificateValid ? 'Valide' : 'En attente'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fonctionnalités de conformité */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Fonctionnalités eIDAS
            </h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FeatureCheck
                label="Lien unique au signataire"
                valid={compliance.features.uniqueLink}
              />
              <FeatureCheck
                label="Identification du signataire"
                valid={compliance.features.identification}
              />
              <FeatureCheck
                label="Horodatage de l'acte"
                valid={compliance.features.timestamp}
              />
              <FeatureCheck
                label="Relevé de signature (hash)"
                valid={signature.integrityValid}
              />
              <FeatureCheck
                label="Journal d'audit"
                valid={compliance.features.immutableLog}
              />
              <FeatureCheck
                label="URL de vérification"
                valid={compliance.features.verification}
              />
              {/* Certificat QES non implémenté */}
              {false && compliance.features.certificate && (
                <FeatureCheck
                  label="Certificat numérique qualifié"
                  valid={compliance.features.certificate}
                />
              )}
            </div>
          </div>
        </div>

        {/* Recommandations */}
        {compliance.recommendations.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Recommandations
                </h4>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  {compliance.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Globe className="w-4 h-4" />
            <span>Vérification de signature</span>
          </div>
          <p className="text-xs">
            ID de signature : {signatureId}
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCheck({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
      {valid ? (
        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
      <span className={`text-sm ${valid ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}
