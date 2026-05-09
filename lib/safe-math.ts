// ---------------------------------------------------------------------------
// Safe Math Evaluation
// Replaces unsafe Function() constructor for mathematical expressions
// Uses mathjs library for safe evaluation
// ---------------------------------------------------------------------------

import { evaluate } from 'mathjs';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_EXPRESSION_LENGTH = 200;
const ALLOWED_OPERATORS = ['+', '-', '*', '/', '(', ')', '.', '%'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvalResult {
  success: boolean;
  result?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helper: Validate expression string
// ---------------------------------------------------------------------------

function validateExpression(expr: string): boolean {
  // Check length
  if (expr.length > MAX_EXPRESSION_LENGTH) {
    return false;
  }

  // Check for suspicious patterns
  const dangerousPatterns = [
    /function|constructor|prototype|return|import|require|process|eval|exec/i,
    /[{}[\]<>]/, // No objects, arrays, or comparison operators
    /\.\./, // No parent access
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(expr)) {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Main: Safely evaluate mathematical expression
// ---------------------------------------------------------------------------

export function safeMathEvaluate(expression: string): EvalResult {
  try {
    // Input validation
    if (typeof expression !== 'string') {
      return { success: false, error: 'Expression must be a string' };
    }

    if (!expression || expression.trim().length === 0) {
      return { success: false, error: 'Expression is empty' };
    }

    // Validate expression
    if (!validateExpression(expression)) {
      return { success: false, error: 'Expression contains invalid characters or patterns' };
    }

    // Evaluate with mathjs
    const result = evaluate(expression);

    // Validate result
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      return { success: false, error: 'Expression result is not a valid number' };
    }

    // Check for reasonable range
    if (result < -1_000_000 || result > 1_000_000) {
      return { success: false, error: 'Expression result is out of reasonable range' };
    }

    // Round to 2 decimal places for currency
    const rounded = Math.round(result * 100) / 100;

    return {
      success: true,
      result: rounded,
    };

  } catch (error) {
    console.error('[Safe Math] Evaluation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid mathematical expression',
    };
  }
}

// ---------------------------------------------------------------------------
// Helper: Safe calculation for line items
// ---------------------------------------------------------------------------

export function safeCalculateLineItemTotal(
  quantity: number,
  unitPrice: number | string
): EvalResult {
  // If unitPrice is already a number, just multiply
  if (typeof unitPrice === 'number') {
    const result = Math.round(quantity * unitPrice * 100) / 100;
    return { success: true, result };
  }

  // If unitPrice is a string expression, evaluate it safely
  const evalResult = safeMathEvaluate(String(unitPrice));

  if (!evalResult.success || evalResult.result === undefined) {
    return evalResult;
  }

  const result = Math.round(quantity * evalResult.result * 100) / 100;

  return {
    success: true,
    result,
  };
}

// ---------------------------------------------------------------------------
// Helper: Format number for display
// ---------------------------------------------------------------------------

export function formatMathResult(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) {
    return '0.00';
  }

  return value.toFixed(decimals);
}

// ---------------------------------------------------------------------------
// Helper: Parse and validate number
// ---------------------------------------------------------------------------

export function parseSafeNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    // Try to parse as number
    const parsed = parseFloat(value.replace(/[^\d.,-]/g, '').replace(',', '.'));
    if (Number.isFinite(parsed)) {
      return parsed;
    }

    // Try to evaluate as expression
    const evalResult = safeMathEvaluate(value);
    if (evalResult.success && evalResult.result !== undefined) {
      return evalResult.result;
    }
  }

  return defaultValue;
}
