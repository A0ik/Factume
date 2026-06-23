/**
 * Signature électronique Factu.me — solution gratuite.
 *
 * ARGOS (honnêteté juridique) : cette solution délivre une signature de niveau
 * SIMPLE au sens du Règlement eIDAS (UE) n° 910/2014 (art. 25), avec un horodatage
 * serveur LOCAL. Elle ne repose PAS sur un Tiers de Confiance Qualifié (TQT) ni sur un
 * service d'horodatage certifié RFC 3161 : les niveaux AVANCÉ (AdES) et QUALIFIÉ (QES)
 * exigent un prestataire payant certifié eIDAS. Tout le wording de ce module et de
 * l'interface reflète désormais cette réalité — aucune allégation de conformité supérieure.
 *
 * Ce qui EST garanti : identification du signataire (nom, email, IP, user-agent),
 * preuve horodatée de l'acte (heure serveur), journal d'audit immuable, et un hash
 * SHA-256 liant l'image de signature au signataire et à l'instant de signature.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Horodatage serveur local (UTC ISO). Aucun service TSA externe n'est utilisé :
 * le service gratuit précédemment référencé attendait une requête binaire RFC 3161
 * et recevait du JSON → il échouait systématiquement et tombait sur ce fallback.
 * On assume désormais explicitement l'horodatage local (niveau Simple).
 */
async function getLocalTimestamp(): Promise<{ timestamp: string; tsaUrl: 'local' }> {
  return { timestamp: new Date().toISOString(), tsaUrl: 'local' };
}

export async function createFreeEidasSignature(
  signatureData: {
    documentId: string;
    documentType: string;
    signerName: string;
    signerEmail?: string;
    signatureDataUrl: string;
    ipAddress: string;
    userAgent: string;
  }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Horodatage serveur local (niveau Simple).
  const { timestamp, tsaUrl } = await getLocalTimestamp();

  // 2. Hash SHA-256 du relevé de signature : image de signature + document + signataire + instant.
  //    Ce hash lie la signature au signataire et au moment de l'acte (intégrité du relevé).
  //    NOTE : il ne porte pas sur le contenu binaire du PDF signé (non transmis ici) ; il
  //    n'équivaut donc pas à une « intégrité du document » au sens AdES.
  const hashPayload = JSON.stringify({
    documentId: signatureData.documentId,
    documentType: signatureData.documentType,
    signerName: signatureData.signerName,
    signerEmail: signatureData.signerEmail || null,
    signatureImage: signatureData.signatureDataUrl,
    timestamp,
  });
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashPayload));
  const documentHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // 3. Upload de l'image de signature.
  const signatureId = `eidas_free_${crypto.randomUUID()}`;
  const base64Data = signatureData.signatureDataUrl.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const path = `eidas_signatures/${signatureData.documentId}/${signatureId}.png`;
  await supabase.storage.from('assets').upload(path, buffer, { contentType: 'image/png', upsert: true });
  const { data } = supabase.storage.from('assets').getPublicUrl(path);

  // 4. Enregistrement en base — niveau honnête : 'simple'.
  const eidasData = {
    signature_id: signatureId,
    document_id: signatureData.documentId,
    document_type: signatureData.documentType,
    signer_name: signatureData.signerName,
    signer_email: signatureData.signerEmail || null,
    signature_url: data.publicUrl,
    signed_at: timestamp,
    ip_address: signatureData.ipAddress,
    user_agent: signatureData.userAgent,
    document_hash: documentHash,
    tsa_url: tsaUrl, // 'local'
    tsa_token: null,
    eidas_level: 'simple',
    eidas_compliant: false, // Simple ≠ AdES/QES
    eidas_regulation: 'Règlement (UE) n° 910/2014 (eIDAS) — niveau Simple (art. 25)',
    verification_token: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  await supabase.from('eidas_signatures').insert(eidasData);

  // 5. Mise à jour du document.
  const tableName = signatureData.documentType === 'invoice' ? 'invoices' : 'contracts';
  await supabase
    .from(tableName)
    .update({
      client_signature_url: data.publicUrl,
      signed_at: timestamp,
      signed_ip: signatureData.ipAddress,
      signed_by: signatureData.signerName,
      eidas_signature_id: signatureId,
      eidas_compliant: false,
      eidas_level: 'simple',
      status: 'accepted',
    })
    .eq('id', signatureData.documentId);

  return {
    success: true,
    signatureId,
    signatureUrl: data.publicUrl,
    timestamp,
    verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify/${signatureId}`,
    compliance: 'simple',
    eidasCompliant: false,
    note: 'Signature de niveau Simple (eIDAS art. 25) avec horodatage serveur local — gratuite. Pour une valeur juridique renforcée (AdES/QES), un prestataire certifié payant est requis.',
  };
}

/**
 * Informations légales honnêtes sur les niveaux de signature eIDAS.
 */
export function getEidasLegalInfo() {
  return {
    regulation: 'Règlement (UE) n° 910/2014 du Parlement européen et du Conseil (eIDAS)',

    levels: {
      simple: {
        name: 'Simple',
        description: 'Signature électronique simple',
        legalValue: 'Preuve libre, appréciée par le juge. Niveau fourni gratuitement par Factu.me.',
        canBeFree: true,
        requirements: ['Identification du signataire', 'Horodatage de l\'acte', 'Journal d\'audit'],
        freeSolution: 'Oui — solution Factu.me (horodatage serveur local)',
      },
      advanced: {
        name: 'Avancée (AdES)',
        description: 'Signature électronique avancée',
        legalValue: 'Reconnaissance juridique renforcée en UE',
        canBeFree: false,
        requirements: [
          'Lien unique au signataire',
          'Identification du signataire',
          'Horodatage certifié (TSP)',
          'Intégrité du document (hash du contenu)',
        ],
        freeSolution: 'Non — requiert un prestataire de confiance payant',
      },
      qualified: {
        name: 'Qualifiée (QES)',
        description: 'Signature électronique qualifiée',
        legalValue: 'Valeur légale équivalente à la signature manuscrite dans toute l\'UE',
        canBeFree: false,
        requirements: [
          'Toutes les exigences du niveau Avancé +',
          'Certificat numérique qualifié',
          'Dispositif sécurisé de création de signature',
          'Tiers de Confiance Qualifié (TQT) certifié eIDAS',
        ],
        freeSolution: 'Non — la loi européenne impose un TQT certifié (payant)',
        whyNotFree: 'La certification eIDAS coûte plusieurs milliers d\'euros par an au TQT',
        minimumCost: '1-3€ par signature (Universign) ou abonnements à partir de 10€/mois',
      },
    },

    factuSolution: {
      level: 'simple',
      cost: 'GRATUIT',
      what: 'Identification du signataire, horodatage serveur, journal d\'audit immuable, hash de relevé de signature.',
      whatNot: 'N\'utilise PAS de TSP certifié ni d\'horodatage RFC 3161 : ne constitue PAS un niveau Avancé/Qualifié.',
    },

    qualifiedProviders: [
      { name: 'Universign', level: 'QES', cost: '~1-3€ par signature (sans abonnement)', url: 'https://www.universign.eu' },
      { name: 'Yousign', level: 'QES', cost: 'Gratuit pour 10 signatures/mois, puis ~0,50€/signature', url: 'https://yousign.com' },
      { name: 'DocuSign', level: 'QES', cost: 'Essai 30 jours gratuit, puis à partir de 10€/mois', url: 'https://www.docusign.fr' },
      { name: 'Scriplet', level: 'QES', cost: '~0,15€ par signature', url: 'https://www.scriplet.com' },
    ],

    recommendations: [
      {
        useCase: 'Accusé de réception / acceptation simple (factures, bons)',
        level: 'simple',
        reason: 'Le niveau Simple gratuit suffit pour tracer l\'acceptation avec preuve horodatée.',
        solution: 'Solution Factu.me (gratuit)',
      },
      {
        useCase: 'Contrats à enjeux, valeur juridique renforcée',
        level: 'qualified',
        reason: 'Pour une valeur équivalente à la signature manuscrite, un TQT certifié est requis.',
        solution: 'Universign ou Yousign',
      },
    ],
  };
}
