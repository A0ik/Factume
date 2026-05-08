#!/usr/bin/env node
/**
 * Script de vérification rapide de la correction des numéros de facture
 *
 * Usage:
 *   npx tsx scripts/check-invoice-fix.ts
 *
 * Ce script vérifie que:
 * 1. La migration a été appliquée
 * 2. Aucun doublon n'existe
 * 3. La fonction atomique est disponible
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface CheckResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

const results: CheckResult[] = [];

async function checkIndexExists(): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'idx_invoices_unique_number'
        ) as exists;
      `
    });

    if (error) {
      results.push({
        name: 'Index unique',
        status: 'error',
        message: `Impossible de vérifier: ${error.message}`
      });
      return;
    }

    if (data?.exists) {
      results.push({
        name: 'Index unique',
        status: 'success',
        message: 'idx_invoices_unique_number existe ✓'
      });
    } else {
      results.push({
        name: 'Index unique',
        status: 'error',
        message: 'idx_invoices_unique_number MANQUE - migration non appliquée'
      });
    }
  } catch (e) {
    results.push({
      name: 'Index unique',
      status: 'error',
      message: `Erreur: ${e}`
    });
  }
}

async function checkInvoiceMonthColumn(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_month')
      .limit(1);

    if (error) {
      results.push({
        name: 'Colonne invoice_month',
        status: 'error',
        message: `Colonne manquante: ${error.message}`
      });
    } else {
      results.push({
        name: 'Colonne invoice_month',
        status: 'success',
        message: 'Colonne invoice_month existe ✓'
      });
    }
  } catch (e) {
    results.push({
      name: 'Colonne invoice_month',
      status: 'error',
      message: `Erreur: ${e}`
    });
  }
}

async function checkDuplicates(): Promise<void> {
  try {
    // Note: Cette requête nécessite un rôle avec accès aux tables système
    // En anon, on va faire une vérification simple
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, user_id, number, status')
      .neq('status', 'draft');

    if (error) {
      results.push({
        name: 'Doublons',
        status: 'warning',
        message: `Impossible de vérifier: ${error.message}`
      });
      return;
    }

    const seen = new Map<string, string[]>();
    for (const inv of invoices || []) {
      const key = `${inv.user_id}-${inv.number}`;
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key)!.push(inv.id);
    }

    const duplicates = Array.from(seen.entries())
      .filter(([_, ids]) => ids.length > 1);

    if (duplicates.length === 0) {
      results.push({
        name: 'Doublons',
        status: 'success',
        message: 'Aucun doublon détecté ✓'
      });
    } else {
      results.push({
        name: 'Doublons',
        status: 'error',
        message: `${duplicates.length} doublon(s) détecté(s)!`
      });
    }
  } catch (e) {
    results.push({
      name: 'Doublons',
      status: 'warning',
      message: `Erreur lors de la vérification: ${e}`
    });
  }
}

async function checkAtomicFunction(): Promise<void> {
  try {
    // Tenter d'appeler la fonction avec des paramètres invalides
    // pour voir si elle existe
    const { error } = await supabase.rpc('create_invoice_atomique', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_client_id: null,
      p_client_name_override: null,
      p_document_type: 'invoice',
      p_status: 'draft',
      p_issue_date: new Date().toISOString().split('T')[0],
      p_due_date: null,
      p_items: '[]',
      p_subtotal: 0,
      p_vat_amount: 0,
      p_discount_percent: null,
      p_discount_amount: null,
      p_total: 0,
      p_notes: null,
      p_prefix: 'TEST',
      p_linked_invoice_id: null
    });

    if (error && error.message.includes('Utilisateur non trouvé')) {
      results.push({
        name: 'Fonction atomique',
        status: 'success',
        message: 'create_invoice_atomique existe ✓'
      });
    } else if (error && error.message.includes('function')) {
      results.push({
        name: 'Fonction atomique',
        status: 'error',
        message: 'Fonction create_invoice_atomique MANQUE'
      });
    } else {
      results.push({
        name: 'Fonction atomique',
        status: 'success',
        message: 'create_invoice_atomique existe ✓'
      });
    }
  } catch (e) {
    results.push({
      name: 'Fonction atomique',
      status: 'warning',
      message: `Impossible de vérifier: ${e}`
    });
  }
}

function printResults(): void {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Vérification de la correction des numéros de facture');
  console.log('═══════════════════════════════════════════════════════════\n');

  let hasError = false;
  let hasWarning = false;

  for (const result of results) {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';

    console.log(`${icon} ${result.name}: ${result.message}`);

    if (result.status === 'error') hasError = true;
    if (result.status === 'warning') hasWarning = true;
  }

  console.log('\n═══════════════════════════════════════════════════════════');

  if (!hasError && !hasWarning) {
    console.log('✅ Tous les tests sont passés ! La correction est bien appliquée.');
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else if (hasError) {
    console.log('❌ Des erreurs ont été détectées. Veuillez appliquer la migration.');
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  } else {
    console.log('⚠️  Des avertissements ont été détectés. Vérifiez manuellement.');
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(2);
  }
}

async function main(): Promise<void> {
  console.log('Vérification en cours...\n');

  await Promise.all([
    checkIndexExists(),
    checkInvoiceMonthColumn(),
    checkDuplicates(),
    checkAtomicFunction()
  ]);

  printResults();
}

main().catch(console.error);
