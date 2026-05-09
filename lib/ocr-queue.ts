// ---------------------------------------------------------------------------
// OCR Queue System - Asynchronous processing for bulk OCR
// Handles queue management, retry logic, and processing coordination
// ---------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';
import { extractWithTesseract, isTesseractResultReliable, tesseractResultToExpense } from './ocr-tesseract';
import OpenAI from 'openai';
import { buildOcrPrompt } from './ocr-helpers';
import { generateStoragePath, sanitizeCategory, sanitizeString, sanitizeNumeric, sanitizeDate, sanitizePaymentMethod } from './ocr-helpers';
import { getAccountCode, generateJournalEntry } from './plan-comptable';
import { validatePCGCode } from './ocr-helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OCRQueueJob {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  storagePath: string;
  fileSize?: number;
  mimeType?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface OCRJobResult {
  success: boolean;
  jobId: string;
  method: 'tesseract' | 'openrouter' | 'hybrid';
  confidence: number;
  processingTimeMs: number;
  costUsd?: number;
  expense?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TESSERACT_CONFIDENCE_THRESHOLD = 0.8; // 80% confidence to skip OpenRouter
const MAX_CONCURRENT_JOBS = 3; // Process 3 jobs at a time
const QUEUE_POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
const JOB_TIMEOUT_MS = 120000; // 2 minutes per job max

// Cost estimation (OpenRouter pricing)
const OPENROUTER_COST_PER_1M_TOKENS = {
  input: 0.15, // GPT-4o-mini pricing
  output: 0.60,
};

// ---------------------------------------------------------------------------
// OCR Queue Manager Class
// ---------------------------------------------------------------------------

export class OCRQueueManager {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  private openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  // --------------------------------------------------------------------------
  // Add job to queue
  // --------------------------------------------------------------------------

  async addJob(job: OCRQueueJob): Promise<string> {
    const { data, error } = await this.supabase
      .from('ocr_queue')
      .insert({
        user_id: job.userId,
        file_name: job.fileName,
        file_url: job.fileUrl,
        storage_path: job.storagePath,
        file_size: job.fileSize,
        mime_type: job.mimeType,
        priority: job.priority || 'normal',
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[OCR Queue] Failed to add job:', error);
      throw new Error(`Failed to add OCR job: ${error.message}`);
    }

    console.log(`[OCR Queue] Job added: ${data.id} for user ${job.userId}`);
    return data.id;
  }

  // --------------------------------------------------------------------------
  // Add multiple jobs to queue
  // --------------------------------------------------------------------------

  async addBatchJobs(jobs: OCRQueueJob[]): Promise<string[]> {
    const jobIds: string[] = [];

    for (const job of jobs) {
      try {
        const id = await this.addJob(job);
        jobIds.push(id);
      } catch (error) {
        console.error(`[OCR Queue] Failed to add job for ${job.fileName}:`, error);
      }
    }

    console.log(`[OCR Queue] ${jobIds.length} jobs added to queue`);
    return jobIds;
  }

  // --------------------------------------------------------------------------
  // Get queue statistics
  // --------------------------------------------------------------------------

  async getQueueStats(userId?: string): Promise<QueueStats> {
    let query = this.supabase
      .from('ocr_queue')
      .select('id, status', { count: 'exact', head: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[OCR Queue] Failed to get stats:', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    }

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    for (const job of data || []) {
      const status = job.status as keyof typeof stats;
      if (status in stats && typeof stats[status] === 'number') {
        stats[status]++;
      }
      stats.total++;
    }

    return stats;
  }

  // --------------------------------------------------------------------------
  // Get pending jobs for processing
  // --------------------------------------------------------------------------

  async getPendingJobs(limit: number = 10): Promise<OCRQueueJob[]> {
    const { data, error } = await this.supabase
      .from('ocr_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false }) // high first
      .order('created_at', { ascending: true }) // oldest first
      .limit(limit);

    if (error) {
      console.error('[OCR Queue] Failed to get pending jobs:', error);
      return [];
    }

    return (data || []).map((job: Record<string, unknown>) => ({
      id: job.id as string,
      userId: job.user_id as string,
      fileName: job.file_name as string,
      fileUrl: job.file_url as string,
      storagePath: job.storage_path as string,
      fileSize: job.file_size as number | undefined,
      mimeType: job.mime_type as string | undefined,
      priority: (job.priority as 'high' | 'normal' | 'low') || 'normal',
    }));
  }

  // --------------------------------------------------------------------------
  // Process a single job (hybrid approach: Tesseract first, OpenRouter fallback)
  // --------------------------------------------------------------------------

  private async processJob(job: OCRQueueJob): Promise<OCRJobResult> {
    const startTime = Date.now();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Job timeout')), JOB_TIMEOUT_MS)
    );

    try {
      // Mark job as processing
      await this.supabase
        .from('ocr_queue')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', job.id);

      // Download file from storage
      const { data: fileData, error: downloadError } = await this.supabase.storage
        .from('receipts')
        .download(job.storagePath);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`);
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const mimeType = job.mimeType || 'image/jpeg';

      // Step 1: Try Tesseract (FREE)
      console.log(`[OCR Queue] Processing ${job.fileName} with Tesseract...`);
      const tesseractResult = await Promise.race([
        extractWithTesseract(buffer, mimeType),
        timeoutPromise,
      ]);

      let expense: Record<string, unknown> | undefined;
      let method: 'tesseract' | 'openrouter' | 'hybrid' = 'tesseract';
      let confidence = tesseractResult.confidence;
      let costUsd = 0;

      // Step 2: Check if Tesseract is reliable enough
      if (isTesseractResultReliable(tesseractResult)) {
        console.log(`[OCR Queue] Tesseract result reliable (${confidence}), using it`);
        expense = tesseractResultToExpense(tesseractResult, {
          userId: job.userId,
          receiptUrl: job.fileUrl,
          storagePath: job.storagePath,
        });
        method = 'tesseract';
      } else {
        console.log(`[OCR Queue] Tesseract confidence low (${confidence}), falling back to OpenRouter`);
        method = 'hybrid';

        // Fallback to OpenRouter
        const openrouterResult = await Promise.race([
          this.processWithOpenRouter(buffer, mimeType, job.userId, job.fileUrl, job.storagePath),
          timeoutPromise,
        ]);

        expense = openrouterResult.expense;
        confidence = openrouterResult.confidence;
        costUsd = openrouterResult.costUsd;

        // Use Tesseract basic data as fallback for missing fields
        if (expense) {
          expense.ocr_raw_response = {
            openrouter: expense.ocr_raw_response,
            tesseract: {
              text: tesseractResult.text,
              confidence: tesseractResult.confidence,
              basicData: tesseractResult.basicData,
            },
          };
        }
      }

      // Step 3: Save expense to database
      if (expense) {
        const { data: savedExpense, error: insertError } = await this.supabase
          .from('expenses')
          .insert(expense)
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to save expense: ${insertError.message}`);
        }

        // Update job with success
        await this.supabase
          .from('ocr_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result: {
              success: true,
              method,
              confidence,
              expense_id: savedExpense.id,
            },
            ocr_method: method,
            confidence,
            expense_id: savedExpense.id,
          })
          .eq('id', job.id);

        // Update stats
        await this.updateOCRStats(job.userId, true, method, costUsd, confidence);

        return {
          success: true,
          jobId: job.id,
          method,
          confidence,
          processingTimeMs: Date.now() - startTime,
          costUsd,
          expense: savedExpense,
        };
      }

      throw new Error('No expense data extracted');

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`[OCR Queue] Job ${job.id} failed:`, errorMessage);

      // Update job with failure
      await this.supabase
        .from('ocr_queue')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          error: errorMessage,
          error_code: 'PROCESSING_ERROR',
        })
        .eq('id', job.id);

      // Update stats
      await this.updateOCRStats(job.userId, false, 'hybrid', 0, 0);

      return {
        success: false,
        jobId: job.id,
        method: 'hybrid',
        confidence: 0,
        processingTimeMs,
        error: errorMessage,
        errorCode: 'PROCESSING_ERROR',
      };
    }
  }

  // --------------------------------------------------------------------------
  // Process with OpenRouter (paid)
  // --------------------------------------------------------------------------

  private async processWithOpenRouter(
    buffer: Buffer,
    mimeType: string,
    userId: string,
    receiptUrl: string,
    storagePath: string
  ): Promise<{
    expense: Record<string, unknown>;
    confidence: number;
    costUsd: number;
  }> {
    const base64 = buffer.toString('base64');

    const completion = await this.openrouter.chat.completions.create({
      model: 'google/gemini-2.0-flash-exp',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildOcrPrompt() },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('OpenRouter returned empty response');
    }

    const parsed = JSON.parse(rawContent);

    // Calculate cost (rough estimation)
    const inputTokens = base64.length / 4; // Rough estimation
    const outputTokens = JSON.stringify(parsed).length / 4;
    const costUsd = (inputTokens / 1_000_000) * OPENROUTER_COST_PER_1M_TOKENS.input +
                    (outputTokens / 1_000_000) * OPENROUTER_COST_PER_1M_TOKENS.output;

    // Build expense record
    const category = sanitizeCategory(parsed.category);
    const supplierCategory = sanitizeString(parsed.supplier_category);
    const extractedAccountCode = sanitizeString(parsed.account_code);
    const extractedAccountLabel = sanitizeString(parsed.account_label);

    const accountMapping = getAccountCode(category, supplierCategory);
    const finalAccountCode = (validatePCGCode(extractedAccountCode) ? extractedAccountCode : null) ?? accountMapping.code;
    const finalAccountLabel = extractedAccountLabel ?? accountMapping.label;

    const journalEntry = generateJournalEntry({
      category,
      supplierCategory,
      amountTtc: sanitizeNumeric(parsed.amount) ?? 0,
      amountHt: sanitizeNumeric(parsed.ht_amount),
      vatAmount: sanitizeNumeric(parsed.vat_amount),
      vatRate: sanitizeNumeric(parsed.vat_rate),
      paymentMethod: sanitizePaymentMethod(parsed.payment_method),
    });

    const expense: Record<string, unknown> = {
      user_id: userId,
      vendor: sanitizeString(parsed.vendor),
      amount: sanitizeNumeric(parsed.amount),
      vat_amount: sanitizeNumeric(parsed.vat_amount),
      category,
      date: sanitizeDate(parsed.date),
      due_date: sanitizeDate(parsed.due_date),
      description: sanitizeString(parsed.description),
      receipt_url: receiptUrl,
      receipt_storage_path: storagePath,
      payment_method: sanitizePaymentMethod(parsed.payment_method),
      status: 'pending',
      ocr_raw_response: parsed,
      ocr_confidence: normalizeConfidence(parsed.confidence),
      ocr_line_items: sanitizeLineItems(parsed.line_items),
      ocr_supplier_siret: sanitizeString(parsed.vendor_siret),
      ocr_invoice_number: sanitizeString(parsed.invoice_number),
      ocr_currency: sanitizeString(parsed.currency) ?? 'EUR',
      ocr_payment_due_date: sanitizeDate(parsed.due_date),
      account_code: finalAccountCode,
      account_label: finalAccountLabel,
      journal_type: journalEntry.journalType,
      journal_entry: {
        debit: { account: journalEntry.debitAccount, label: journalEntry.debitLabel, amount: journalEntry.amount },
        credit: { account: journalEntry.creditAccount, label: journalEntry.creditLabel, amount: journalEntry.amount + journalEntry.vatAmount },
        vat: journalEntry.vatAccount ? { account: journalEntry.vatAccount, amount: journalEntry.vatAmount } : null,
      },
      vat_account: journalEntry.vatAccount || null,
      document_type: sanitizeString(parsed.document_type),
      supplier_category: supplierCategory,
      is_professional_expense: typeof parsed.is_professional_expense === 'boolean' ? parsed.is_professional_expense : true,
      vat_details: sanitizeVatDetails(parsed.vat_details),
      ocr_method: 'openrouter',
    };

    return {
      expense,
      confidence: normalizeConfidence(parsed.confidence),
      costUsd,
    };
  }

  // --------------------------------------------------------------------------
  // Process batch of jobs (with concurrency limit)
  // --------------------------------------------------------------------------

  async processBatch(limit: number = MAX_CONCURRENT_JOBS): Promise<OCRJobResult[]> {
    const jobs = await this.getPendingJobs(limit);

    if (jobs.length === 0) {
      return [];
    }

    console.log(`[OCR Queue] Processing ${jobs.length} jobs...`);

    // Process jobs with concurrency limit
    const results: OCRJobResult[] = [];
    const queue: Array<{ job: OCRQueueJob; index: number }> = jobs.map((job, index) => ({ job, index }));

    async function worker(this: OCRQueueManager): Promise<void> {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        const { job } = item;
        try {
          const result = await this.processJob(job);
          results.push(result);
        } catch (error) {
          console.error(`[OCR Queue] Worker error for job ${job.id}:`, error);
          results.push({
            success: false,
            jobId: job.id,
            method: 'hybrid',
            confidence: 0,
            processingTimeMs: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'WORKER_ERROR',
          });
        }
      }
    }

    // Start workers
    const workers = Array.from({ length: Math.min(MAX_CONCURRENT_JOBS, jobs.length) }, () =>
      worker.call(this)
    );

    await Promise.all(workers);

    console.log(`[OCR Queue] Batch complete: ${results.length} results`);
    return results;
  }

  // --------------------------------------------------------------------------
  // Update OCR statistics
  // --------------------------------------------------------------------------

  private async updateOCRStats(
    userId: string,
    success: boolean,
    method: 'tesseract' | 'openrouter' | 'hybrid',
    costUsd: number,
    confidence: number
  ): Promise<void> {
    try {
      // Call the database function we created in migration
      await this.supabase.rpc('update_ocr_stats', {
        p_user_id: userId,
        p_success: success,
        p_method: method,
        p_cost_usd: costUsd,
        p_confidence: confidence,
      });
    } catch (error) {
      console.error('[OCR Queue] Failed to update stats:', error);
      // Non-critical, don't throw
    }
  }

  // --------------------------------------------------------------------------
  // Get job status
  // --------------------------------------------------------------------------

  async getJobStatus(jobId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('ocr_queue')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  // --------------------------------------------------------------------------
  // Cancel job
  // --------------------------------------------------------------------------

  async cancelJob(jobId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('ocr_queue')
      .update({ status: 'cancelled' })
      .eq('id', jobId)
      .eq('status', 'pending'); // Only cancel pending jobs

    return !error;
  }

  // --------------------------------------------------------------------------
  // Retry failed job
  // --------------------------------------------------------------------------

  async retryJob(jobId: string): Promise<boolean> {
    const { data: job } = await this.supabase
      .from('ocr_queue')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) {
      return false;
    }

    if (job.status !== 'failed') {
      console.log(`[OCR Queue] Job ${jobId} is not in failed status`);
      return false;
    }

    if ((job.retry_count || 0) >= (job.max_retries || 3)) {
      console.log(`[OCR Queue] Job ${jobId} has reached max retries`);
      return false;
    }

    const { error } = await this.supabase
      .from('ocr_queue')
      .update({
        status: 'pending',
        retry_count: (job.retry_count || 0) + 1,
        error: null,
        error_code: null,
      })
      .eq('id', jobId);

    return !error;
  }

  // --------------------------------------------------------------------------
  // Clean up old completed jobs
  // --------------------------------------------------------------------------

  async cleanup(daysToKeep: number = 7): Promise<number> {
    const { data, error } = await this.supabase.rpc('cleanup_old_ocr_queue', {
      days_to_keep: daysToKeep,
    });

    if (error) {
      console.error('[OCR Queue] Cleanup failed:', error);
      return 0;
    }

    return data as number || 0;
  }
}

// Helper function from ocr-helpers (import to avoid circular dependency)
function normalizeConfidence(val: unknown): number {
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return Math.min(Math.max((n || 0) / 100, 0), 1);
}

function sanitizeLineItems(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => {
      const quantity = typeof v.quantity === 'number' ? v.quantity : 1;
      const unit_price = typeof v.unit_price === 'number' ? v.unit_price : null;
      const total = typeof v.total === 'number' ? v.total : null;
      const vatRaw = typeof v.vat_rate === 'number' ? v.vat_rate : null;
      const vat_rate = (vatRaw !== null && vatRaw >= 0 && vatRaw <= 100) ? vatRaw : null;
      const account_code = typeof v.account_code === 'string' ? v.account_code : null;

      return {
        description: typeof v.description === 'string' ? v.description : 'Article',
        quantity,
        unit_price,
        total,
        vat_rate,
        account_code: account_code && /^\d{6}$/.test(account_code) ? account_code : null,
        account_label: typeof v.account_label === 'string' ? v.account_label : null,
      };
    });
}

function sanitizeVatDetails(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      rate: typeof v.rate === 'number' ? v.rate : null,
      base: typeof v.base === 'number' ? v.base : null,
      amount: typeof v.amount === 'number' ? v.amount : null,
    }));
}

// Export singleton instance
export const ocrQueueManager = new OCRQueueManager();
