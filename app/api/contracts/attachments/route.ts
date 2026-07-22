import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { ContractType } from '@/types';

// GET /api/contracts/attachments?contractId=&contractType=
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const contractId = searchParams.get('contractId');
    const contractType = searchParams.get('contractType');

    if (!contractId || !contractType) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: attachments, error } = await admin
      .from('contract_attachments')
      .select('*')
      .eq('contract_id', contractId)
      .eq('contract_type', contractType)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(attachments || []);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/contracts/attachments
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await req.formData();
    const contractId = formData.get('contractId') as string;
    const contractType = formData.get('contractType') as ContractType;
    const file = formData.get('file') as File;
    const description = formData.get('description') as string | null;
    const category = (formData.get('category') as string) || 'other';

    if (!contractId || !contractType || !file) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10MB)' }, { status: 400 });
    }

    // Validate file type
    const ALLOWED_TYPES = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 });
    }

    const admin = createAdminClient();

    // ARGOS (sécurité) — Ownership check : le contrat doit appartenir à l'utilisateur.
    // createAdminClient() bypass la RLS ; sans ce contrôle, un user pouvait attacher un
    // fichier au contrat d'autrui en énumérant contractId.
    const TABLE_BY_TYPE: Record<string, string> = { cdi: 'contracts_cdi', cdd: 'contracts_cdd', other: 'contracts_other' };
    const cTable = TABLE_BY_TYPE[(contractType || '').toLowerCase()];
    if (cTable) {
      const { data: ownContract } = await admin
        .from(cTable)
        .select('id')
        .eq('id', contractId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!ownContract) {
        return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 });
      }
    }

    // Use user ID and contract ID for folder organization
    const folderPath = `${user.id}/${contractId}`;
    // ODIN (CIBLE 1) — assainit le nom de fichier avant de l'inscrire dans le path
    // Storage : un file.name malveillant (ex. '../../../evil.pdf') injectait des
    // segments de traversal. Le nom original est conservé en base pour l'affichage.
    const safeBase = (file.name || 'document')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.');
    const fileName = `${Date.now()}-${safeBase}`;
    const storagePath = `${folderPath}/${fileName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await admin.storage
      .from('contract-documents')
      .upload(storagePath, file);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 });
    }

    // Create attachment record
    const { data: attachment, error: dbError } = await admin
      .from('contract_attachments')
      .insert({
        contract_id: contractId,
        contract_type: contractType,
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: uploadData.path,
        description: description || null,
        category,
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup storage if DB insert fails
      await admin.storage.from('contract-documents').remove([storagePath]);
      throw dbError;
    }

    return NextResponse.json(attachment, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
