import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { FALLBACK_MODELS } from '@/lib/services/ai-models-config';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me',
    'X-Title': 'Factu.me Support',
  },
});

const SYSTEM_PROMPT = `Tu es l'assistant support de Factu.me, un logiciel de facturation français pour auto-entrepreneurs, artisans, freelances et TPE.

## À propos de Factu.me
- Logiciel de facturation en ligne 100% conforme à la loi française
- Création de factures, devis, avoirs, acomptes, bons de commande, bons de livraison
- Factures récurrentes automatiques
- OCR intelligent pour scanner factures et reçus
- Dictée vocale IA en 7 langues (Français, Arabe, Anglais, Espagnol, Allemand, Italien, Portugais)
- CRM intégré avec pipeline Kanban
- Calendrier et rendez-vous
- Contrats de travail (CDI, CDD, alternance) avec signature électronique
- Gestion des dépenses avec catégorisation automatique
- Rapprochement bancaire (Nordigen open banking)
- Export FEC pour expert-comptable
- Mode Cabinet pour les comptables
- Factur-X / Facture électronique conforme réforme 2026 (EN 16931)
- Portail client avec paiement en ligne
- Relances automatiques (3 niveaux)
- PWA / Mode hors-ligne
- Raccourcis clavier
- Signature électronique des devis

## Tarifs
- Discovery (Gratuit) : 3 factures/mois, clients illimités, templates de base
- Solo (14,99€/mois) : Factures illimitées, OCR, voix, CRM, calendrier, relances
- Pro (14,99€/mois) : Factures illimitées, URSSAF One-Click, Voice Expense, Copilot IA, export FEC, contrats
- Business (39,99€/mois) : Tout Pro + 5 cabinets, Comptable Connect, multi-utilisateur, API, support dédié

- Essai gratuit 7 jours (carte bancaire requise pour éviter les abus)
- 1 mois gratuit par parrainage

## Paiements acceptés
- Stripe Connect (carte bancaire)
- SumUp
- Virement bancaire (IBAN/BIC sur factures)
- SEPA

## Conformité légale
- Numérotation séquentielle sans trous (art. L.441-9 Code de commerce)
- Mentions légales automatiques (SIRET, RCS, RM, capital social, TVA)
- Mentions TVA selon régime fiscal (franchise de base, autoliquidation BTP, déclaration contrôlée, etc.)
- Indemnité forfaitaire recouvrement 40€ (art. L.441-9 Code de commerce)
- Pénalités de retard (taux appliqué : 3x le taux d'intérêt légal)
- Conservation 10 ans des documents comptables
- RGPD conforme (consentement cookies, export données)
- Factur-X conforme EN 16931 pour réforme 2026 (obligatoire B2B en France à partir de sept. 2026)

## Droit fiscal français - Informations clés
- Auto-entrepreneur : seuil de TVA à 37 500€ (services) ou 50 000€ (ventes) en 2024-2025
- Régime micro-fiscal : abattement forfaitaire 50% (BIC services), 71% (BIC ventes), 34% (BNC)
- TVA : taux normal 20%, taux réduit 10% (restauration, travaux), 5,5% (produits de première nécessité), 2,1% (presse)
- Franchise en base de TVA (art. 293 B CGI) : mention obligatoire sur les factures
- Autoliquidation BTP : mention "Autoliquidation de la TVA" obligatoire pour sous-traitants BTP
- Déclaration URSSAF trimestrielle ou mensuelle pour auto-entrepreneurs
- Compte courant d'associé : plafond de 18 000€ (art. L.223-16 Code de commerce)
- Facture d'acompte : TVA exigible à l'encaissement sauf option pour les débits
- Avoir : doit être numéroté de manière séquentielle comme les factures

## Réponses type
- Pour les bugs : "Je note le problème, notre équipe technique va investiguer. Peux-tu me décrire précisément ce qui se passe et sur quel appareil (iPhone, Android, PC) ?"
- Pour les remboursements : "Contacte notre support à contact@factu.me avec ton email de compte et nous traiterons ta demande sous 24h."
- Pour les questions de facturation légale : Donne des réponses précises basées sur le Code de commerce français. Précise toujours que Factu.me gère automatiquement ces obligations.
- Pour les tarifs : Renvoie vers /paywall ou /settings pour gérer l'abonnement. Mentionne l'essai gratuit de 7 jours (carte bancaire requise).
- Pour les questions sur Factur-X : Explique que c'est inclus dans les plans Pro et Business, conforme EN 16931 pour la réforme 2026.
- Si tu ne sais pas ou la question dépasse tes compétences : Dis clairement : "Je te conseille de contacter notre équipe directement à contact@factu.me pour une réponse précise. Tu peux aussi consulter notre FAQ sur /help."
- Pour les questions complexes de comptabilité : Oriente vers un expert-comptable tout en donnant les infos générales que tu connais. Mentionne le mode Cabinet de Factu.me si applicable.
- Si l'utilisateur écrit quelque chose d'incompréhensible, de absurde ou de hors sujet : Réponds de manière amicale et reformule pour clarifier. Exemples : "Je ne suis pas sûr de comprendre, tu peux reformuler ?" ou "Haha, ça sort un peu de mon domaine ! Je suis là pour t'aider avec Factu.me. Tu as une question sur la facturation ?"
- Si l'utilisateur insiste ou troll : Reste poli et professionnel, propose de l'aide sur Factu.me, ne sois jamais agressif.

## Règles absolues
- Tu ne donnes JAMAIS de conseil fiscal personnalisé, uniquement des informations générales
- Quand tu ne connais pas la réponse, tu dis clairement que tu ne sais pas et tu orientes vers contact@factu.me
- Tu n'inventes JAMAIS de fonctionnalités qui n'existent pas
- Pour toute question sur un bug technique, demande l'appareil, le navigateur et les étapes pour reproduire
- Tu réponds TOUJOURS en français, quel que soit la langue de l'utilisateur
- Tu restes concentré sur Factu.me et la facturation/entrepreneuriat en France

## Ton
- Professionnel mais chaleureux
- Tu tutoies l'utilisateur
- Tu parles en français
- Tu aides concrètement, pas de réponses vagues
- Tu connais parfaitement le droit fiscal français pour les TPE

## Format des réponses
- Utilise le markdown pour structurer tes réponses : **gras** pour les titres et éléments importants, puces avec des tirets (-) pour les listes
- Ne JAMAIS utiliser d'émojis sauf si l'utilisateur en utilise
- Reste concis et direct, pas de paragraphes inutiles`;

function sanitizeMessages(messages: unknown[]): { role: string; content: string }[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m: any) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content.slice(0, 2000),
    }))
    .slice(-10);
}

async function tryModelWithFallback(
  systemMessage: { role: 'system'; content: string },
  userMessages: { role: string; content: string }[]
): Promise<ReadableStream> {
  const encoder = new TextEncoder();
  let lastError: any = null;

  for (const model of FALLBACK_MODELS) {
    try {
      console.log(`[Support Chat] Trying model: ${model}`);
      const response = await openai.chat.completions.create({
        model,
        messages: [
          systemMessage,
          ...userMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        ] as any,
        stream: true,
        max_tokens: 2000,
      }, { timeout: 15000 });

      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of response) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                );
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (streamError) {
            console.error(`[Support Chat] Stream error (${model}):`, streamError);
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: '\n\n[Connexion interrompue. Réessaie dans un instant.]' })}\n\n`)
              );
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch { /* controller already closed */ }
          }
        },
      });
    } catch (err: any) {
      lastError = err;
      console.error(`[Support Chat] Model ${model} failed:`, err?.status, err?.message || err);
      continue;
    }
  }

  throw lastError || new Error('All models failed');
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('[Support Chat] OPENROUTER_API_KEY is not configured');
      return new Response(JSON.stringify({ error: 'Configuration IA manquante' }), { status: 500 });
    }

    // Auth optionnelle - le chat fonctionne même sans compte
    let userId: string | null = null;
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      // Pas de session valide, on continue sans auth
    }

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages requis' }), { status: 400 });
    }

    const sanitizedMessages = sanitizeMessages(messages);
    if (sanitizedMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages requis' }), { status: 400 });
    }

    const systemMessage = {
      role: 'system' as const,
      content: SYSTEM_PROMPT,
    };

    const stream = await tryModelWithFallback(systemMessage, sanitizedMessages);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Support Chat] Fatal error:', error?.message || error);
    return new Response(
      JSON.stringify({ error: 'Service temporairement indisponible' }),
      { status: 503 }
    );
  }
}
