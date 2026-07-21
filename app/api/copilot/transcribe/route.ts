import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { applyIpRateLimit } from '@/lib/rate-limit';
import { applySttCorrection } from '@/lib/stt-correction';
import { getUserHotwords, buildWhisperPrompt } from '@/lib/voice-vocabulary';

// ODIN (CIBLE 1) — Pipeline STT complet enfin câblé au micro du Copilot.
// Avant : la route renvoyait le brut Whisper → "fiche de paix", "contrar", "d n" survivaient.
// Maintenant : couche 0 (hotwords métier + mémoire vocale injectés dans le prompt Whisper)
// + couche 1 (homophones déterministes) + couche 2 (rescoring Groq si token suspect).

export async function POST(req: NextRequest) {
  try {
    // Anti-abus + auth (le plan-gate reste sur /api/copilot/command).
    const rl = applyIpRateLimit(req, 30, 60_000);
    if (rl) return rl as NextResponse;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Transcription indisponible' }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get('audio');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Audio manquant' }, { status: 400 });
    }

    // Couche 0 — lexique métier + corrections passées de l'utilisateur (biaise la reco AVANT l'erreur).
    const { hotwords, corrections } = await getUserHotwords(supabase, user.id);
    const whisperPrompt = buildWhisperPrompt(hotwords);

    const client = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
    });
    const transcription: any = await client.audio.transcriptions.create({
      file: file as any,
      model: process.env.GROQ_STT_MODEL || 'whisper-large-v3',
      language: 'fr',
      ...(whisperPrompt ? { prompt: whisperPrompt } : {}),
    });

    const raw = (transcription?.text || '').trim();
    // Couches 1 (déterministe) + 2 (rescoring LLM si un token suspect subsiste).
    const corrected = await applySttCorrection(raw, { userCorrections: corrections, groq: client });
    return NextResponse.json({ text: corrected.transcript, changes: corrected.changes });
  } catch (err: any) {
    console.error('[copilot/transcribe] Error:', err?.message || err);
    return NextResponse.json({ error: 'Échec de la transcription' }, { status: 500 });
  }
}
