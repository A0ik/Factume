import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { applyIpRateLimit } from '@/lib/rate-limit';

// PROMÉTHÉE (S3) — Transcription vocale Groq Whisper pour le micro du Copilot.
// Reçoit un blob audio (FormData), renvoie { text }. Chemin primaire du micro,
// multi-navigateur (MediaRecorder), robuste vs la Web Speech API.

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

    const client = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
    });
    const transcription: any = await client.audio.transcriptions.create({
      file: file as any,
      model: process.env.GROQ_STT_MODEL || 'whisper-large-v3',
      language: 'fr',
    });

    const text = (transcription?.text || '').trim();
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('[copilot/transcribe] Error:', err?.message || err);
    return NextResponse.json({ error: 'Échec de la transcription' }, { status: 500 });
  }
}
