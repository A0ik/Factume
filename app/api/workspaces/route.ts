import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { name, description } = await req.json();
    const user_id = user.id;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check user's subscription tier and existing workspace count
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user_id)
      .single();

    const tier = profile?.subscription_tier || 'free';

    // Count existing workspaces owned by this user
    const { count: workspaceCount } = await admin
      .from('workspaces')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user_id);

    // Enforce workspace limits
    if (tier !== 'pro' && tier !== 'business' && workspaceCount !== null && workspaceCount >= 1) {
      return NextResponse.json({
        error: 'Limitation de plan',
        message: 'La création de plusieurs dossiers nécessite un abonnement Pro.',
        tier,
        currentWorkspaces: workspaceCount,
        limit: 1
      }, { status: 403 });
    }

    // Create slug from name
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug already exists
    const { data: existing } = await admin
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single();

    const finalSlug = existing
      ? `${slug}-${Date.now().toString(36)}`
      : slug;

    // Create workspace
    const { data: workspace, error } = await admin
      .from('workspaces')
      .insert({
        name,
        slug: finalSlug,
        owner_id: user_id,
        description: description || null,
        plan: 'free',
        settings: {},
      })
      .select()
      .single();

    if (error) throw error;

    // Add owner as admin member
    await admin
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id,
        email: '',
        role: 'admin',
        status: 'active',
      });

    return NextResponse.json({ workspace });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const admin = createAdminClient();

    const { data: workspaces, error } = await admin
      .from('workspaces')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ workspaces });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
