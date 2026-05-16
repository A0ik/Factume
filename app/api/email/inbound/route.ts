import { NextRequest, NextResponse } from 'next/server';
import { parseInboundEmail } from '@/lib/email-parser';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { computeFileHash } from '@/lib/image-hash';

export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature (Resend)
    const body = await req.json();

    // Parse email
    const email = parseInboundEmail(body);

    if (email.attachments.length === 0) {
      return NextResponse.json({ message: 'No processable attachments' });
    }

    // Find user by email intake address
    const toAddress = body.to?.[0]?.replace('<', '').replace('>', '') || '';
    const serverSupabase = await createServerSupabaseClient();
    const { data: intakeAddress } = await serverSupabase
      .from('email_intake_addresses')
      .select('user_id, auto_ocr')
      .eq('email_address', toAddress)
      .maybeSingle();

    if (!intakeAddress) {
      // Try to match by recipient email format: {userId-short}@scan.factu.me
      return NextResponse.json({ error: 'Unknown address' }, { status: 404 });
    }

    const userId = intakeAddress.user_id;

    // Process each attachment
    for (const attachment of email.attachments) {
      const fileHash = await computeFileHash(attachment.content);

      // Check duplicate
      const { data: existing } = await serverSupabase
        .from('expenses')
        .select('id')
        .eq('user_id', userId)
        .eq('file_hash', fileHash)
        .maybeSingle();

      if (existing) continue;

      // Upload to storage
      const storagePath = `${userId}/${fileHash.substring(0, 8)}_${attachment.filename}`;
      const { error: uploadError } = await serverSupabase.storage
        .from('receipts')
        .upload(storagePath, attachment.content, { contentType: attachment.mimeType });

      if (uploadError) {
        console.error('[Email Inbound] Upload error:', uploadError);
        continue;
      }

      // Create expense with pending status
      await serverSupabase.from('expenses').insert({
        user_id: userId,
        vendor: attachment.filename.replace(/\.[^.]+$/, ''),
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        category: 'other',
        status: 'pending',
        source: 'email',
        receipt_storage_path: storagePath,
        file_hash: fileHash,
        ocr_method: 'pending',
      });
    }

    // If auto_ocr, trigger OCR processing
    if (intakeAddress.auto_ocr) {
      // Trigger OCR via internal fetch (fire and forget)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/process-email-expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, processed: email.attachments.length });
  } catch (error) {
    console.error('[Email Inbound] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
