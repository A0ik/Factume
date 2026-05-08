/**
 * Schémas de validation pour les API Routes
 * Validation centralisée pour éviter les injections et garantir l'intégrité des données
 */

import { z } from 'zod';

// Types de statuts valides pour les factures
export const VALID_INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'refunded', 'cancelled'] as const;
export type InvoiceStatus = typeof VALID_INVOICE_STATUSES[number];

// Types de documents valides
export const VALID_DOCUMENT_TYPES = ['invoice', 'quote', 'credit_note', 'purchase_order', 'delivery_note', 'deposit'] as const;
export type DocumentType = typeof VALID_DOCUMENT_TYPES[number];

// Types de contrats valides
export const VALID_CONTRACT_TYPES = ['cdd', 'cdi', 'stage', 'apprentissage', 'professionnalisation', 'interim', 'portage', 'freelance'] as const;
export type ContractType = typeof VALID_CONTRACT_TYPES[number];

// === ZOD SCHEMAS ===

// Schéma de validation pour le statut de facture
export const InvoiceStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'refunded', 'cancelled']),
});

// Schéma de validation pour la création de facture
export const CreateInvoiceSchema = z.object({
  client_id: z.string().uuid().nullable(),
  client_name_override: z.string().max(255).nullable(),
  document_type: z.enum(['invoice', 'quote', 'credit_note', 'purchase_order', 'delivery_note', 'deposit']),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  items: z.array(z.object({
    description: z.string().min(1).max(1000),
    quantity: z.number().positive(),
    unit_price: z.number().nonnegative(),
    vat_rate: z.number().refine(val => [0, 2.1, 5.5, 10, 20].includes(val), {
      message: 'Taux de TVA invalide. Doit être 0, 2.1, 5.5, 10 ou 20.'
    }),
  })).min(1),
  notes: z.string().max(5000).nullable(),
  discount_percent: z.number().min(0).max(100).nullable(),
});

// Schéma de validation pour la création de client
export const CreateClientSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().nullable(),
  phone: z.string().regex(/^[+]?[\d\s\-()]+$/).nullable(),
  siret: z.string().regex(/^\d{14}$/).nullable(),
  vat_number: z.string().regex(/^FR[A-Z0-9]{11}$/).nullable(),
  address: z.string().max(500).nullable(),
  city: z.string().max(100).nullable(),
  postal_code: z.string().regex(/^\d{5}$/).nullable(),
  country: z.string().default('FR'),
});

// Schéma de validation pour l'envoi de facture
export const SendInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  email: z.string().email(),
  profile: z.object({
    company_name: z.string().max(200).optional(),
    email: z.string().email().optional(),
    accent_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    siret: z.string().regex(/^\d{14}$/).optional(),
    legal_status: z.string().max(200).optional(),
    iban: z.string().max(200).optional(),
    bank_name: z.string().max(200).optional(),
    bic: z.string().max(200).optional(),
    language: z.enum(['fr', 'en']).optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  }).optional(),
  isReminder: z.boolean().optional().default(false),
  subject: z.string().max(500).optional(),
  message: z.string().max(5000).optional(),
});

// Schéma de validation pour la génération IA
export const AIGenerateSchema = z.object({
  prompt: z.string().min(1).max(10000),
  sector: z.string().max(100).optional(),
  isEdit: z.boolean().optional().default(false),
  existingItems: z.array(z.object({
    description: z.string().max(500).optional(),
    quantity: z.number().nonnegative(),
    unit_price: z.number().nonnegative(),
    vat_rate: z.number().min(0).max(100),
  })).optional(),
  document_type: z.enum(['invoice', 'quote', 'credit_note', 'purchase_order', 'delivery_note', 'deposit']).default('invoice'),
});

// Fonction helper pour valider avec Zod
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

// === Erreur de validation ===
export class ValidationError extends Error {
  constructor(
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// === Validation des statuts de facture ===
export function validateInvoiceStatus(status: unknown): { status: InvoiceStatus } {
  if (!status || typeof status !== 'string') {
    throw new ValidationError('Le statut est requis et doit être une chaîne de caractères', { status: 'Statut invalide' });
  }

  if (!VALID_INVOICE_STATUSES.includes(status as InvoiceStatus)) {
    throw new ValidationError(
      `Statut invalide. Valeurs acceptées: ${VALID_INVOICE_STATUSES.join(', ')}`,
      { status: `Statut "${status}" non valide` }
    );
  }

  return { status: status as InvoiceStatus };
}

// === Validation des données vocales ===
export interface ValidatedVoiceData {
  audio: File;
  sector?: string;
  isEdit: boolean;
  existingItems: Array<{
    description?: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }>;
}

export function validateVoiceData(formData: FormData): ValidatedVoiceData {
  const audio = formData.get('audio') as File;
  const sector = formData.get('sector') as string;
  const isEdit = formData.get('isEdit') === 'true';
  const existingItemsRaw = formData.get('existingItems') as string | null;

  // Validation audio
  if (!audio || typeof audio === 'string') {
    throw new ValidationError('Fichier audio requis', { audio: 'Aucun fichier audio fourni' });
  }

  // Vérifier le type de fichier audio
  const validAudioTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg'];
  if (audio.type && !validAudioTypes.includes(audio.type)) {
    throw new ValidationError(
      'Type de fichier audio non supporté',
      { audio: `Type "${audio.type}" non supporté. Types acceptés: ${validAudioTypes.join(', ')}` }
    );
  }

  // Vérifier la taille du fichier (max 25MB)
  const MAX_SIZE = 25 * 1024 * 1024; // 25MB
  if (audio.size > MAX_SIZE) {
    throw new ValidationError(
      'Fichier audio trop volumineux',
      { audio: `Taille maximale: 25MB. Fichier actuel: ${(audio.size / 1024 / 1024).toFixed(2)}MB` }
    );
  }

  // Validation sector
  let validatedSector: string | undefined;
  if (sector) {
    if (typeof sector !== 'string') {
      throw new ValidationError('Le secteur doit être une chaîne de caractères', { sector: 'Secteur invalide' });
    }
    // Nettoyer le secteur pour éviter les injections
    validatedSector = sector.trim().slice(0, 100);
  }

  // Validation existingItems
  let existingItems: ValidatedVoiceData['existingItems'] = [];
  if (isEdit && existingItemsRaw) {
    try {
      const parsed = JSON.parse(existingItemsRaw);
      if (!Array.isArray(parsed)) {
        throw new ValidationError('existingItems doit être un tableau', { existingItems: 'Format invalide' });
      }

      existingItems = parsed.map((item, index) => {
        if (!item || typeof item !== 'object') {
          throw new ValidationError(`Item ${index + 1}: format invalide`, { existingItems: `Item ${index + 1} invalide` });
        }

        // Validation des champs numériques
        if (item.quantity !== undefined && (typeof item.quantity !== 'number' || item.quantity < 0)) {
          throw new ValidationError(`Item ${index + 1}: quantité invalide`, { existingItems: `Quantité invalide pour item ${index + 1}` });
        }

        if (item.unit_price !== undefined && (typeof item.unit_price !== 'number' || item.unit_price < 0)) {
          throw new ValidationError(`Item ${index + 1}: prix unitaire invalide`, { existingItems: `Prix invalide pour item ${index + 1}` });
        }

        if (item.vat_rate !== undefined && (typeof item.vat_rate !== 'number' || item.vat_rate < 0 || item.vat_rate > 100)) {
          throw new ValidationError(`Item ${index + 1}: taux TVA invalide`, { existingItems: `TVA invalide pour item ${index + 1}` });
        }

        return {
          description: item.description ? String(item.description).slice(0, 500) : undefined,
          quantity: item.quantity ?? 1,
          unit_price: item.unit_price ?? 0,
          vat_rate: item.vat_rate ?? 20,
        };
      });
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      throw new ValidationError('Format JSON invalide pour existingItems', { existingItems: 'JSON invalide' });
    }
  }

  return {
    audio,
    sector: validatedSector,
    isEdit,
    existingItems,
  };
}

// === Validation des données de génération IA ===
export interface ValidatedAIGenerateData {
  prompt: string;
  sector?: string;
  isEdit: boolean;
  existingItems?: Array<{
    description?: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }>;
  document_type: DocumentType;
}

export function validateAIGenerateData(body: unknown): ValidatedAIGenerateData {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Corps de requête invalide');
  }

  const data = body as Record<string, unknown>;

  // Validation prompt
  if (!data.prompt || typeof data.prompt !== 'string') {
    throw new ValidationError('Le prompt est requis et doit être une chaîne de caractères', { prompt: 'Prompt requis' });
  }

  if (data.prompt.trim().length === 0) {
    throw new ValidationError('Le prompt ne peut pas être vide', { prompt: 'Prompt vide' });
  }

  if (data.prompt.length > 10000) {
    throw new ValidationError('Le prompt est trop long (max 10000 caractères)', { prompt: 'Prompt trop long' });
  }

  // Validation sector
  let validatedSector: string | undefined;
  if (data.sector) {
    if (typeof data.sector !== 'string') {
      throw new ValidationError('Le secteur doit être une chaîne de caractères', { sector: 'Secteur invalide' });
    }
    validatedSector = data.sector.trim().slice(0, 100);
  }

  // Validation isEdit
  if (typeof data.isEdit !== 'boolean' && data.isEdit !== undefined) {
    throw new ValidationError('isEdit doit être un booléen', { isEdit: 'Valeur invalide' });
  }
  const isEdit = data.isEdit === true;

  // Validation document_type
  let validatedDocType: DocumentType = 'invoice';
  if (data.document_type) {
    if (typeof data.document_type !== 'string') {
      throw new ValidationError('document_type doit être une chaîne de caractères', { document_type: 'Type invalide' });
    }
    if (!VALID_DOCUMENT_TYPES.includes(data.document_type as DocumentType)) {
      throw new ValidationError(
        `Type de document invalide. Valeurs acceptées: ${VALID_DOCUMENT_TYPES.join(', ')}`,
        { document_type: `Type "${data.document_type}" non valide` }
      );
    }
    validatedDocType = data.document_type as DocumentType;
  }

  // Validation existingItems
  let existingItems: ValidatedAIGenerateData['existingItems'];
  if (isEdit && data.existingItems) {
    if (!Array.isArray(data.existingItems)) {
      throw new ValidationError('existingItems doit être un tableau', { existingItems: 'Format invalide' });
    }

    existingItems = data.existingItems.map((item: unknown, index: number) => {
      if (!item || typeof item !== 'object') {
        throw new ValidationError(`Item ${index + 1}: format invalide`, { existingItems: `Item ${index + 1} invalide` });
      }

      const validatedItem = item as Record<string, unknown>;

      if (validatedItem.quantity !== undefined && (typeof validatedItem.quantity !== 'number' || validatedItem.quantity < 0)) {
        throw new ValidationError(`Item ${index + 1}: quantité invalide`, { existingItems: `Quantité invalide pour item ${index + 1}` });
      }

      if (validatedItem.unit_price !== undefined && (typeof validatedItem.unit_price !== 'number' || validatedItem.unit_price < 0)) {
        throw new ValidationError(`Item ${index + 1}: prix unitaire invalide`, { existingItems: `Prix invalide pour item ${index + 1}` });
      }

      if (validatedItem.vat_rate !== undefined && (typeof validatedItem.vat_rate !== 'number' || validatedItem.vat_rate < 0 || validatedItem.vat_rate > 100)) {
        throw new ValidationError(`Item ${index + 1}: taux TVA invalide`, { existingItems: `TVA invalide pour item ${index + 1}` });
      }

      return {
        description: validatedItem.description ? String(validatedItem.description).slice(0, 500) : undefined,
        quantity: validatedItem.quantity ?? 1,
        unit_price: validatedItem.unit_price ?? 0,
        vat_rate: validatedItem.vat_rate ?? 20,
      };
    });
  }

  return {
    prompt: data.prompt.trim(),
    sector: validatedSector,
    isEdit,
    existingItems,
    document_type: validatedDocType,
  };
}

// === Validation des données de contrat ===
export interface ValidatedContractData {
  employeeFirstName: string;
  employeeLastName: string;
  employeeAddress: string;
  employeePostalCode: string;
  employeeCity: string;
  employeeBirthDate: string;
  employeeNationality: string;
  contractType: ContractType;
  contractStartDate: string;
  jobTitle: string;
  workLocation: string;
  workSchedule: string;
  salaryAmount: string;
  salaryFrequency: string;
  companyName: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companySiret: string;
  employerName: string;
  employerTitle: string;
  [key: string]: string | undefined;
}

export function validateContractData(contractData: unknown): ValidatedContractData {
  if (!contractData || typeof contractData !== 'object') {
    throw new ValidationError('Données de contrat invalides');
  }

  const data = contractData as Record<string, unknown>;

  const requiredFields: (keyof ValidatedContractData)[] = [
    'employeeFirstName', 'employeeLastName', 'employeeAddress', 'employeePostalCode', 'employeeCity',
    'employeeBirthDate', 'employeeNationality',
    'contractType', 'contractStartDate', 'jobTitle', 'workLocation', 'workSchedule', 'salaryAmount', 'salaryFrequency',
    'companyName', 'companyAddress', 'companyPostalCode', 'companyCity', 'companySiret', 'employerName', 'employerTitle',
  ];

  const missingFields: string[] = [];
  const invalidFields: Record<string, string> = {};

  for (const field of requiredFields) {
    const value = data[field as string];
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      missingFields.push(field as string);
    } else {
      // Nettoyer et limiter la longueur des chaînes
      data[field as string] = value.trim().slice(0, 500);
    }
  }

  if (missingFields.length > 0) {
    throw new ValidationError('Champs obligatoires manquants', { fields: missingFields.join(', ') });
  }

  // Validation spécifique pour le type de contrat
  if (data.contractType && typeof data.contractType === 'string') {
    if (!VALID_CONTRACT_TYPES.includes(data.contractType as ContractType)) {
      throw new ValidationError(
        `Type de contrat invalide. Valeurs acceptées: ${VALID_CONTRACT_TYPES.join(', ')}`,
        { contractType: `Type "${data.contractType}" non valide` }
      );
    }
  }

  // Validation du SIRET (14 chiffres)
  if (data.companySiret && typeof data.companySiret === 'string') {
    const siret = data.companySiret.replace(/\s/g, '');
    if (!/^\d{14}$/.test(siret)) {
      throw new ValidationError('Le SIRET doit contenir 14 chiffres', { companySiret: 'Format SIRET invalide' });
    }
    data.companySiret = siret;
  }

  // Validation de la date de début
  if (data.contractStartDate && typeof data.contractStartDate === 'string') {
    const date = new Date(data.contractStartDate);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Date de début invalide', { contractStartDate: 'Format de date invalide' });
    }
  }

  // Validation du montant du salaire (doit être un nombre positif)
  if (data.salaryAmount && typeof data.salaryAmount === 'string') {
    const salary = parseFloat(data.salaryAmount.replace(',', '.'));
    if (isNaN(salary) || salary <= 0) {
      throw new ValidationError('Montant du salaire invalide', { salaryAmount: 'Doit être un nombre positif' });
    }
  }

  return data as ValidatedContractData;
}

// === Validation des données d'envoi de facture ===
export interface ValidatedSendInvoiceData {
  invoiceId: string;
  email: string;
  profile?: {
    company_name?: string;
    email?: string;
    accent_color?: string;
    siret?: string;
    legal_status?: string;
    iban?: string;
    bank_name?: string;
    bic?: string;
    language?: string;
    currency?: string;
  };
  isReminder?: boolean;
  subject?: string;
  message?: string;
}

export function validateSendInvoiceData(body: unknown): ValidatedSendInvoiceData {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Corps de requête invalide');
  }

  const data = body as Record<string, unknown>;

  // Validation invoiceId
  if (!data.invoiceId || typeof data.invoiceId !== 'string') {
    throw new ValidationError('invoiceId est requis et doit être une chaîne de caractères', { invoiceId: 'ID requis' });
  }

  if (data.invoiceId.trim().length === 0) {
    throw new ValidationError('invoiceId ne peut pas être vide', { invoiceId: 'ID vide' });
  }

  // Validation email
  if (!data.email || typeof data.email !== 'string') {
    throw new ValidationError('Email est requis et doit être une chaîne de caractères', { email: 'Email requis' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email.trim())) {
    throw new ValidationError('Format d\'email invalide', { email: 'Format email invalide' });
  }

  // Validation profile (optionnel)
  let validatedProfile: ValidatedSendInvoiceData['profile'];
  if (data.profile && typeof data.profile === 'object') {
    const profile = data.profile as Record<string, unknown>;
    validatedProfile = {};

    if (profile.company_name && typeof profile.company_name === 'string') {
      validatedProfile.company_name = profile.company_name.trim().slice(0, 200);
    }

    if (profile.email && typeof profile.email === 'string') {
      if (!emailRegex.test(profile.email.trim())) {
        throw new ValidationError('Email du profil invalide', { profile: 'Email profil invalide' });
      }
      validatedProfile.email = profile.email.trim();
    }

    if (profile.accent_color && typeof profile.accent_color === 'string') {
      // Validation hex color
      if (!/^#[0-9A-F]{6}$/i.test(profile.accent_color)) {
        throw new ValidationError('Couleur d\'accent invalide (format hex #RRGGBB attendu)', { profile: 'Couleur invalide' });
      }
      validatedProfile.accent_color = profile.accent_color;
    }

    if (profile.siret && typeof profile.siret === 'string') {
      const siret = profile.siret.replace(/\s/g, '');
      if (!/^\d{14}$/.test(siret)) {
        throw new ValidationError('SIRET invalide (14 chiffres requis)', { profile: 'SIRET invalide' });
      }
      validatedProfile.siret = siret;
    }

    // Autres champs string avec nettoyage
    (['legal_status', 'iban', 'bank_name', 'bic'] as const).forEach(field => {
      if (profile[field] && typeof profile[field] === 'string' && validatedProfile) {
        (validatedProfile as Record<string, unknown>)[field] = profile[field].trim().slice(0, 200);
      }
    });

    // Validation language
    if (profile.language && typeof profile.language === 'string') {
      if (!['fr', 'en'].includes(profile.language)) {
        throw new ValidationError('Langue invalide (fr ou en attendu)', { profile: 'Langue invalide' });
      }
      validatedProfile.language = profile.language;
    }

    // Validation currency (code ISO 4217)
    if (profile.currency && typeof profile.currency === 'string') {
      if (!/^[A-Z]{3}$/.test(profile.currency)) {
        throw new ValidationError('Devise invalide (code ISO 4217 attendu)', { profile: 'Devise invalide' });
      }
      validatedProfile.currency = profile.currency;
    }
  }

  // Validation isReminder
  if (data.isReminder !== undefined && typeof data.isReminder !== 'boolean') {
    throw new ValidationError('isReminder doit être un booléen', { isReminder: 'Valeur invalide' });
  }

  // Validation subject (optionnel)
  if (data.subject !== undefined) {
    if (typeof data.subject !== 'string') {
      throw new ValidationError('subject doit être une chaîne de caractères', { subject: 'Format invalide' });
    }
    if (data.subject.length > 500) {
      throw new ValidationError('subject trop long (max 500 caractères)', { subject: 'Sujet trop long' });
    }
  }

  // Validation message (optionnel)
  if (data.message !== undefined) {
    if (typeof data.message !== 'string') {
      throw new ValidationError('message doit être une chaîne de caractères', { message: 'Format invalide' });
    }
    if (data.message.length > 5000) {
      throw new ValidationError('message trop long (max 5000 caractères)', { message: 'Message trop long' });
    }
  }

  return {
    invoiceId: data.invoiceId.trim(),
    email: data.email.trim(),
    profile: validatedProfile,
    isReminder: data.isReminder === true,
    subject: data.subject as string | undefined,
    message: data.message as string | undefined,
  };
}

// === Helper pour formatter les erreurs de validation ===
export function formatValidationError(error: ValidationError): { error: string; details?: Record<string, string> } {
  return {
    error: error.message,
    details: error.fields,
  };
}
