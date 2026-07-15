'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface Options {
  /** Appelé avec le texte transcrit (déjà trimmé) quand l'enregistrement s'arrête. */
  onTranscript: (text: string) => void;
}

/**
 * PROMÉTHÉE (S3) — Recorder Groq Whisper pour le micro du Copilot.
 * Chemin PRIMAIRE (multi-navigateur via MediaRecorder), la Web Speech API du CopilotFAB
 * sert de repli. Groq transcrit côté serveur → robuste (Chrome 139, Safari, Firefox).
 */
export function useGroqVoiceRecorder({ onTranscript }: Options) {
  const [supported] = useState(
    () => typeof window !== 'undefined'
      && !!navigator.mediaDevices?.getUserMedia
      && typeof window.MediaRecorder !== 'undefined',
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    try {
      const mr = recRef.current;
      if (mr && mr.state !== 'inactive') mr.stop();
    } catch { /* noop */ }
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        releaseStream();
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        chunksRef.current = [];
        if (blob.size === 0) return;
        try {
          const fd = new FormData();
          fd.append('audio', blob, 'voice.webm');
          const { getSupabaseClient } = await import('@/lib/supabase');
          const { data: { session } } = await getSupabaseClient().auth.getSession();
          const res = await fetch('/api/copilot/transcribe', {
            method: 'POST',
            headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
            body: fd,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || 'transcription échouée');
          const text = (data.text || '').trim();
          if (text) onTranscriptRef.current(text);
        } catch (e: any) {
          setError(e?.message || 'Transcription impossible');
        }
      };
      mr.start();
      recRef.current = mr;
      setListening(true);
    } catch (e: any) {
      releaseStream();
      setError(
        e?.name === 'NotAllowedError'
          ? 'Micro bloqué — cliquez sur le cadenas du navigateur et autorisez le micro.'
          : 'Micro indisponible',
      );
      setListening(false);
    }
  }, [supported, releaseStream]);

  // Libère le micro au démontage.
  useEffect(() => () => { releaseStream(); }, [releaseStream]);

  return { supported, listening, error, start, stop };
}
