import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

/*
-- Migration: create email_queue table

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_queue_send_at ON email_queue (send_at) WHERE status = 'pending';
CREATE INDEX idx_email_queue_user_id ON email_queue (user_id);
*/

const ONBOARDING_SEQUENCE = [
  {
    type: 'welcome',
    dayOffset: 0,
    subject: 'Bienvenue sur Factu.me !',
    body: 'Votre compte est prêt. Créez votre première facture en quelques clics.',
  },
  {
    type: 'first_invoice_tip',
    dayOffset: 1,
    subject: 'Astuce : créez votre première facture',
    body: 'Découvrez comment créer une facture professionnelle en moins de 2 minutes.',
  },
  {
    type: 'voice_feature',
    dayOffset: 3,
    subject: 'Essayez la dictée vocale',
    body: 'Factu.me peut créer vos factures par la voix. Essayez notre fonctionnalité de dictée !',
  },
  {
    type: 'upgrade_nudge',
    dayOffset: 5,
    subject: 'Passez au niveau supérieur',
    body: 'Débloquez les modèles personnalisés, les factures récurrentes et plus encore avec un plan supérieur.',
  },
];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const internalSecret = process.env.WEBHOOK_INTERNAL_SECRET;

  if (!internalSecret || authHeader !== `Bearer ${internalSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, email, firstName } = await req.json();
  if (!userId || !email) {
    return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const emails = ONBOARDING_SEQUENCE.map((step) => {
    const sendAt = new Date(now);
    sendAt.setDate(sendAt.getDate() + step.dayOffset);

    return {
      user_id: userId,
      email,
      type: step.type,
      subject: step.subject,
      body: step.body,
      data: { firstName: firstName || '' },
      send_at: sendAt.toISOString(),
      status: 'pending',
    };
  });

  const { error } = await supabase.from('email_queue').insert(emails);

  if (error) {
    console.error('[marketing/onboarding] insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ queued: emails.length });
}
