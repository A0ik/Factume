import { NextRequest } from 'next/server';
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
- Création de factures, devis, avoirs, acomptes
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

## Tarifs
- Discovery (Gratuit) : 10 factures/mois, clients illimités, templates de base
- Solo (14,99€/mois) : Factures illimitées, OCR, voix, CRM, calendrier, relances
- Pro (29,99€/mois) : Tout Solo + contrats, multi-devises, export FEC, Factur-X, rapprochement bancaire
- Business (59,99€/mois) : Tout Pro + multi-utilisateurs, mode cabinet, 10 espaces de travail, API, support prioritaire

- Essai gratuit 14 jours (pas besoin de carte bancaire)
- 1 mois gratuit par parrainage

## Paiements acceptés
- Stripe Connect (carte bancaire)
- SumUp
- Virement bancaire (IBAN/BIC sur factures)
- SEPA

## Conformité légale
- Numérotation séquentielle sans trous (art. L.441-9 Code de commerce)
- Mentions légales automatiques (SIRET, RCS, RM, capital social, TVA)
- Mentions TVA selon régime fiscal (franchise, autoliquidation BTP, etc.)
- Indemnité forfaitaire recouvrement 40€
- Pénalités de retard (3x taux légal)
- Conservation 10 ans des documents
- RGPD conforme (consentement cookies, export données)
- Factur-X conforme EN 16931 pour réforme 2026

## Réponses type
- Pour les bugs : "Je note le problème, notre équipe technique va investiguer. Peux-tu me décrire précisément ce qui se passe ?"
- Pour les remboursements : "Contacte notre support à support@factu.me avec ton email de compte et nous traiterons ta demande sous 24h."
- Pour les questions de facturation légale : Donner des réponses précises basées sur le Code de commerce français
- Pour les tarifs : Renvoyer vers /paywall ou /settings pour gérer l'abonnement
- Si tu ne sais pas : "Je vais transmettre ta question à notre équipe. En attendant, tu peux consulter notre FAQ sur /help ou notre documentation."

## Ton
- Professionnel mais chaleureux
- Tu tutoies l'utilisateur
- Tu parles en français
- Tu aides concrètement, pas de réponses vagues
- Tu connais parfaitement le droit fiscal français pour les TPE`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages requis' }), { status: 400 });
    }

    const systemMessage = {
      role: 'system' as const,
      content: SYSTEM_PROMPT,
    };

    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-chat-v3-0324:free',
      messages: [systemMessage, ...messages.slice(-10)],
      stream: true,
      max_tokens: 1000,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
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
          console.error('Stream error:', streamError);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: '\n\n[Erreur de connexion]' })}\n\n`)
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur de connexion au service' }),
      { status: 500 }
    );
  }
}
