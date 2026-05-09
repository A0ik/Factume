// ---------------------------------------------------------------------------
// OCR Bulk Stream API Route - Server-Sent Events for real-time progress
// This endpoint handles bulk PDF processing with live progress updates
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ocrQueueManager, type OCRQueueJob } from '@/lib/ocr-queue';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_FILES_PER_BATCH = 50;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

// ---------------------------------------------------------------------------
// POST handler with SSE streaming
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Track start time for timeout
  const startTime = Date.now();

  // ------------------------------------------------------------------
  // 1. Authentication & subscription check
  // ------------------------------------------------------------------
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, is_trial_active')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  }

  const isBusiness = profile.subscription_tier === 'business';
  const isTrial = profile.is_trial_active === true;

  if (!isBusiness && !isTrial) {
    return NextResponse.json(
      {
        error: "L'OCR en masse est disponible uniquement avec le plan Business.",
        feature: 'ocr',
        requiredPlan: 'business',
        upgradeUrl: '/paywall?plan=business',
      },
      { status: 402 }
    );
  }

  // ------------------------------------------------------------------
  // 2. Parse form data
  // ------------------------------------------------------------------
  const formData = await req.formData();
  const filesEntries = formData.getAll('files');
  const fileEntries = formData.getAll('file');
  const allEntries = filesEntries.length > 0 ? filesEntries : fileEntries;
  const files: File[] = allEntries.filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { error: 'Aucun fichier reçu. Utilisez la clé "files" ou "file".' },
      { status: 400 }
    );
  }

  if (files.length > MAX_FILES_PER_BATCH) {
    return NextResponse.json(
      { error: `Trop de fichiers (${files.length}). Maximum : ${MAX_FILES_PER_BATCH}.` },
      { status: 400 }
    );
  }

  // ------------------------------------------------------------------
  // 3. Validate files
  // ------------------------------------------------------------------
  const validFiles: File[] = [];
  const invalidFiles: Array<{ name: string; reason: string }> = [];

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.has(file.type) && !file.name.endsWith('.heic')) {
      invalidFiles.push({ name: file.name, reason: 'Type non supporté' });
      continue;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      invalidFiles.push({
        name: file.name,
        reason: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo)`,
      });
      continue;
    }

    validFiles.push(file);
  }

  // ------------------------------------------------------------------
  // 4. Create SSE stream
  // ------------------------------------------------------------------
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Send initial message
        send({
          stage: 'init',
          total: validFiles.length,
          invalid: invalidFiles,
          message: `${validFiles.length} fichiers valides, ${invalidFiles.length} invalides`,
        });

        // Upload files and add to queue
        const jobs: OCRQueueJob[] = [];
        const uploadErrors: Array<{ name: string; error: string }> = [];

        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i];
          const progress = Math.round(((i + 1) / validFiles.length) * 100);

          send({
            stage: 'uploading',
            progress,
            current: i + 1,
            total: validFiles.length,
            fileName: file.name,
            message: `Upload de ${file.name}...`,
          });

          try {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const storagePath = `${user.id}/${Date.now()}_${file.name}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('receipts')
              .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false,
              });

            if (uploadError) {
              uploadErrors.push({ name: file.name, error: uploadError.message });
              send({
                stage: 'upload_error',
                fileName: file.name,
                error: uploadError.message,
              });
              continue;
            }

            const { data: urlData } = supabase.storage
              .from('receipts')
              .getPublicUrl(storagePath);

            // Determine priority based on file size (smaller = higher priority)
            let priority: 'high' | 'normal' | 'low' = 'normal';
            if (file.size < 1024 * 1024) priority = 'high'; // < 1 MB
            else if (file.size > 5 * 1024 * 1024) priority = 'low'; // > 5 MB

            const job: OCRQueueJob = {
              id: '', // Will be set by addJob
              userId: user.id,
              fileName: file.name,
              fileUrl: urlData.publicUrl,
              storagePath,
              fileSize: file.size,
              mimeType: file.type,
              priority,
            };

            const jobId = await ocrQueueManager.addJob(job);
            job.id = jobId;
            jobs.push(job);

            send({
              stage: 'queued',
              progress,
              current: i + 1,
              total: validFiles.length,
              fileName: file.name,
              jobId,
              message: `${file.name} ajouté à la file`,
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            uploadErrors.push({ name: file.name, error: errorMessage });
            send({
              stage: 'error',
              fileName: file.name,
              error: errorMessage,
            });
          }
        }

        // Send queued summary
        send({
          stage: 'queued',
          summary: {
            total: validFiles.length,
            queued: jobs.length,
            errors: uploadErrors.length,
          },
          jobs: jobs.map(j => ({ id: j.id, fileName: j.fileName, priority: j.priority })),
          message: `${jobs.length} fichiers en file d'attente de traitement`,
        });

        // Monitor job progress
        const completedJobIds = new Set<string>();
        let lastUpdate = Date.now();
        const UPDATE_INTERVAL_MS = 1000; // Update every second max

        while (completedJobIds.size < jobs.length) {
          // Check if we should send an update
          const now = Date.now();
          if (now - lastUpdate >= UPDATE_INTERVAL_MS) {
            const completedCount = completedJobIds.size;
            const progress = Math.round((completedCount / jobs.length) * 100);

            // Get queue stats
            const stats = await ocrQueueManager.getQueueStats(user.id);

            send({
              stage: 'processing',
              progress,
              completed: completedCount,
              total: jobs.length,
              pending: stats.pending,
              processing: stats.processing,
              queueCompleted: stats.completed,
              failed: stats.failed,
              message: `${completedCount}/${jobs.length} traîtés...`,
            });

            lastUpdate = now;
          }

          // Check job statuses
          for (const job of jobs) {
            if (completedJobIds.has(job.id)) continue;

            const status = await ocrQueueManager.getJobStatus(job.id);
            if (!status) continue;

            if (status.status === 'completed' || status.status === 'failed') {
              completedJobIds.add(job.id);

              send({
                stage: status.status,
                jobId: job.id,
                fileName: job.fileName,
                result: status.result,
                error: status.error,
                completed: completedJobIds.size,
                total: jobs.length,
              });
            }
          }

          // Wait a bit before next check
          await new Promise(resolve => setTimeout(resolve, 500));

          // Safety: break if processing for too long (5 minutes max)
          if (Date.now() - startTime > 300000) {
            send({
              stage: 'timeout',
              message: 'Délai d\'attente dépassé. Vérifiez la file de traitement.',
              completed: completedJobIds.size,
              total: jobs.length,
            });
            break;
          }
        }

        // Final summary
        const finalStats = await ocrQueueManager.getQueueStats(user.id);
        const finalResults = await Promise.all(
          jobs.map(async (job) => await ocrQueueManager.getJobStatus(job.id))
        );

        const succeeded = finalResults.filter(r => r?.status === 'completed').length;
        const failed = finalResults.filter(r => r?.status === 'failed').length;

        send({
          stage: 'complete',
          summary: {
            total: jobs.length,
            succeeded,
            failed,
            pending: finalStats.pending,
          },
          results: finalResults,
          message: `Traitement terminé : ${succeeded} réussis, ${failed} échoués`,
        });

        controller.close();

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('[OCR Bulk Stream] Error:', error);

        send({
          stage: 'error',
          error: errorMessage,
          message: 'Erreur lors du traitement en masse',
        });

        controller.close();
      }
    },
  });

  // Return SSE stream
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}

// ---------------------------------------------------------------------------
// GET handler - Get queue status
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const stats = await ocrQueueManager.getQueueStats(user.id);

  return NextResponse.json({
    stats,
    timestamp: new Date().toISOString(),
  });
}
