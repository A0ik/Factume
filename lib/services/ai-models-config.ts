/**
 * Configuration des modèles IA pour FACTU.ME
 * Optimisé pour le coût et la performance
 */

export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  free: boolean;
  costPer1kTokens: number; // en USD
  maxTokens: number;
  useCase: 'contract_analysis' | 'payslip_modification' | 'general';
}

/**
 * Modèles IA disponibles (classés par coût croissant)
 */
export const AI_MODELS: Record<string, AIModelConfig> = {
  // Modèles GRATUITS - Recommandés pour économiser
  'gemma-31b-free': {
    id: 'google/gemma-4-31b-it:free',
    name: 'Google Gemma 4 31B (Gratuit)',
    provider: 'OpenRouter',
    free: true,
    costPer1kTokens: 0,
    maxTokens: 131072,
    useCase: 'general',
  },
  'gemma-27b-free': {
    id: 'google/gemma-3-27b-it:free',
    name: 'Google Gemma 3 27B (Gratuit)',
    provider: 'OpenRouter',
    free: true,
    costPer1kTokens: 0,
    maxTokens: 131072,
    useCase: 'general',
  },
  'llama-8b-free': {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    name: 'Llama 3.1 8B (Gratuit)',
    provider: 'OpenRouter',
    free: true,
    costPer1kTokens: 0,
    maxTokens: 131072,
    useCase: 'general',
  },
  'gemma-12b-free': {
    id: 'google/gemma-3-12b-it:free',
    name: 'Google Gemma 3 12B (Gratuit)',
    provider: 'OpenRouter',
    free: true,
    costPer1kTokens: 0,
    maxTokens: 131072,
    useCase: 'general',
  },

  // Modèles PAYANTS - Pour utilisateurs nécessitant plus de performance
  'gemma-flash': {
    id: 'google/gemma-2-9b-it:free',
    name: 'Google Gemma 2 9B Flash',
    provider: 'OpenRouter',
    free: true,
    costPer1kTokens: 0,
    maxTokens: 8192,
    useCase: 'contract_analysis',
  },
  'llama-70b': {
    id: 'meta-llama/llama-3-70b-instruct',
    name: 'Llama 3 70B',
    provider: 'OpenRouter',
    free: false,
    costPer1kTokens: 0.00059,
    maxTokens: 8192,
    useCase: 'contract_analysis',
  },
  'mistral-large': {
    id: 'mistralai/mistral-large-2402',
    name: 'Mistral Large',
    provider: 'OpenRouter',
    free: false,
    costPer1kTokens: 0.003,
    maxTokens: 128000,
    useCase: 'payslip_modification',
  },
};

/**
 * Modèles recommandés par cas d'usage (optimisés pour le coût)
 */
export const RECOMMENDED_MODELS = {
  contract_analysis: AI_MODELS['gemma-31b-free'].id,
  payslip_modification: AI_MODELS['gemma-27b-free'].id,
  general: AI_MODELS['gemma-31b-free'].id,
};

/**
 * Ordre de fallback des modèles (du plus performant au plus léger)
 */
export const FALLBACK_MODELS = [
  AI_MODELS['gemma-31b-free'].id,
  AI_MODELS['gemma-27b-free'].id,
  AI_MODELS['llama-8b-free'].id,
  AI_MODELS['gemma-12b-free'].id,
];

/**
 * Fonction pour obtenir le meilleur modèle gratuit disponible
 */
export function getBestFreeModel(): string {
  return AI_MODELS['gemma-31b-free'].id;
}

/**
 * Fonction pour obtenir les informations d'un modèle
 */
export function getModelInfo(modelId: string): AIModelConfig | undefined {
  return Object.values(AI_MODELS).find(m => m.id === modelId);
}

/**
 * Calcule le coût estimé d'une requête
 */
export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = getModelInfo(modelId);
  if (!model || model.free) return 0;

  return ((inputTokens + outputTokens) / 1000) * model.costPer1kTokens;
}

/**
 * Statistiques d'utilisation pour monitoring
 */
export interface AIUsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  modelBreakdown: Record<string, { requests: number; tokens: number; cost: number }>;
}

/**
 * Fonction pour tracking de l'utilisation (optionnel)
 */
export function trackUsage(modelId: string, tokens: number): AIUsageStats | null {
  // Dans une implémentation complète, cela pourrait stocker les stats en DB
  // Pour l'instant, retourne null pour désactiver le tracking
  return null;
}
