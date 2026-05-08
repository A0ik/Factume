import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Expense, WorkflowHistoryEntry, ValidationRuleUpdateData } from '@/types';

// ---------------------------------------------------------------------------
// Validation Rules Engine
// ---------------------------------------------------------------------------

interface ValidationRule {
  id: string;
  name: string;
  conditions: {
    min_amount?: number;
    max_amount?: number;
    category?: string[];
    vendor?: string[];
    ocr_confidence_min?: number;
    has_receipt?: boolean;
    line_items_count_min?: number;
  };
  actions: {
    auto_validate?: boolean;
    require_approval?: boolean;
    set_status?: 'pending' | 'validated' | 'rejected';
    add_note?: boolean;
  };
  priority: number;
}

// ---------------------------------------------------------------------------
// Helper: Check if expense matches rule conditions
// ---------------------------------------------------------------------------

function matchesRule(expense: Expense, rule: ValidationRule): boolean {
  const { conditions } = rule;

  // Check amount range
  if (conditions.min_amount !== undefined && expense.amount < conditions.min_amount) {
    return false;
  }
  if (conditions.max_amount !== undefined && expense.amount > conditions.max_amount) {
    return false;
  }

  // Check category
  if (conditions.category && conditions.category.length > 0) {
    if (!expense.category || !conditions.category.includes(expense.category)) {
      return false;
    }
  }

  // Check vendor
  if (conditions.vendor && conditions.vendor.length > 0) {
    const vendorLower = expense.vendor?.toLowerCase();
    if (!vendorLower || !conditions.vendor.some(v => vendorLower.includes(v.toLowerCase()))) {
      return false;
    }
  }

  // Check OCR confidence
  if (conditions.ocr_confidence_min !== undefined) {
    const confidence = expense.ocr_confidence || expense.category_confidence || 0;
    if (confidence < conditions.ocr_confidence_min) {
      return false;
    }
  }

  // Check receipt
  if (conditions.has_receipt && !expense.receipt_url) {
    return false;
  }

  // Check line items count
  if (conditions.line_items_count_min !== undefined) {
    const count = expense.line_items_count || (expense.ocr_line_items?.length || 0);
    if (count < conditions.line_items_count_min) {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// POST handler - Run validation workflow
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { expense_id, auto_apply = true } = await req.json();

    if (!expense_id) {
      return NextResponse.json({ error: 'ID de dépense requis' }, { status: 400 });
    }

    // Fetch expense with related data
    const { data: expense } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expense_id)
      .eq('user_id', user.id)
      .single();

    if (!expense) {
      return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
    }

    // Fetch validation rules
    const { data: rules } = await supabase
      .from('validation_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (!rules || rules.length === 0) {
      // No rules configured, use default rule
      const defaultConfidence = expense.ocr_confidence || 0.8;

      return NextResponse.json({
        applied: false,
        reason: 'Aucune règle de validation configurée',
        validation_result: {
          status: defaultConfidence >= 0.9 ? 'auto_validated' : 'pending',
          confidence: defaultConfidence,
          rule_used: 'default',
        },
      });
    }

    // Find first matching rule
    let matchedRule: ValidationRule | null = null;

    for (const rule of rules as ValidationRule[]) {
      if (matchesRule(expense, rule)) {
        matchedRule = rule;
        break;
      }
    }

    if (!matchedRule) {
      return NextResponse.json({
        applied: false,
        reason: 'Aucune règle ne correspond',
        validation_result: {
          status: 'pending',
          confidence: expense.ocr_confidence || 0.5,
          rule_used: null,
        },
      });
    }

    // Apply rule actions
    let newStatus = expense.validation_status || 'pending';
    const workflowHistory: WorkflowHistoryEntry = {
      user_id: user.id,
      expense_id,
      workflow_type: 'validation',
      from_status: expense.validation_status || null,
      to_status: null,
      triggered_by: 'auto',
      rule_id: matchedRule.id,
      notes: `Règle "${matchedRule.name}" appliquée`,
    };

    if (matchedRule.actions.auto_validate && matchedRule.actions.set_status) {
      newStatus = matchedRule.actions.set_status;
      workflowHistory.to_status = newStatus;

      if (auto_apply) {
        await supabase
          .from('expenses')
          .update({
            validation_status: newStatus,
            validation_notes: `Validé automatiquement par la règle "${matchedRule.name}"`,
          })
          .eq('id', expense_id);

        // Record workflow history
        await supabase.from('workflow_history').insert(workflowHistory);
      }
    }

    if (matchedRule.actions.require_approval) {
      workflowHistory.to_status = 'manual_review';
      workflowHistory.notes = `Requiert validation manuelle (règle: ${matchedRule.name})`;

      if (auto_apply) {
        await supabase
          .from('expenses')
          .update({
            validation_status: 'manual_review',
          })
          .eq('id', expense_id);

        await supabase.from('workflow_history').insert(workflowHistory);
      }
    }

    return NextResponse.json({
      applied: true,
      rule_applied: {
        id: matchedRule.id,
        name: matchedRule.name,
        priority: matchedRule.priority,
      },
      actions: matchedRule.actions,
      validation_result: {
        status: newStatus,
        rule_used: matchedRule.name,
        confidence: expense.ocr_confidence || 0.5,
      },
      workflow_history: workflowHistory,
    });
  } catch (error) {
    console.error('[Validation Workflow] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur du workflow de validation' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET handler - Get validation rules
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: rules } = await supabase
      .from('validation_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    return NextResponse.json({
      rules: rules || [],
      count: rules?.length || 0,
    });
  } catch (error) {
    console.error('[Get Validation Rules] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des règles' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT handler - Create/update validation rule
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const ruleData = await req.json();

    // Validate rule data
    if (!ruleData.name || !ruleData.conditions || !ruleData.actions) {
      return NextResponse.json(
        { error: 'Nom, conditions et actions sont requis' },
        { status: 400 }
      );
    }

    // Check if rule already exists
    const { data: existing } = await supabase
      .from('validation_rules')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', ruleData.name)
      .single();

    let result;

    if (existing) {
      // Update existing rule
      const updateData: ValidationRuleUpdateData = {
        conditions: ruleData.conditions,
        actions: ruleData.actions,
        priority: ruleData.priority || 0,
        is_active: ruleData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (ruleData.is_active !== undefined) {
        updateData.is_active = ruleData.is_active;
      }

      const { data, error } = await supabase
        .from('validation_rules')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new rule
      const { data, error } = await supabase
        .from('validation_rules')
        .insert({
          user_id: user.id,
          name: ruleData.name,
          conditions: ruleData.conditions,
          actions: ruleData.actions,
          priority: ruleData.priority || 0,
          is_active: ruleData.is_active !== undefined ? ruleData.is_active : true,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      rule: result,
      message: existing ? 'Règle mise à jour' : 'Règle créée',
    });
  } catch (error) {
    console.error('[Update Validation Rule] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la règle' },
      { status: 500 }
    );
  }
}
