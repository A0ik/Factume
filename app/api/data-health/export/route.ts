import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { CHECKS } from '@/lib/data-health-engine';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const url = new URL(req.url);
    const scanId = url.searchParams.get('scan_id');

    if (!scanId) {
      return NextResponse.json({ error: 'scan_id requis' }, { status: 400 });
    }

    const { data: scan } = await admin
      .from('data_health_scans')
      .select('*')
      .eq('id', scanId)
      .eq('user_id', user.id)
      .single();

    if (!scan) {
      return NextResponse.json({ error: 'Scan non trouvé' }, { status: 404 });
    }

    const rows: string[][] = [
      ['Catégorie', 'Score', 'Statut'],
    ];

    Object.entries(scan.category_scores).forEach(([key, score]) => {
      const check = CHECKS.find((c) => c.id === key);
      rows.push([
        check?.label || key,
        `${score}%`,
        (score as number) >= 80 ? 'Bon' : (score as number) >= 50 ? 'Attention' : 'Critique',
      ]);
    });

    rows.push([]);
    rows.push(['Score global', `${scan.overall_score}%`, '']);
    rows.push([]);
    rows.push(['Problèmes détectés', '', '']);

    (scan.issues || []).forEach((issue: any) => {
      rows.push([`- [${issue.severity}] ${issue.message}`, `${issue.count}`, '']);
    });

    rows.push([]);
    rows.push(['Suggestions', '', '']);

    (scan.suggestions || []).forEach((s: any) => {
      rows.push([`- ${s.message}`, '', '']);
    });

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const bom = '﻿';
    const blob = `${bom}${csv}`;

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="data-health-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
