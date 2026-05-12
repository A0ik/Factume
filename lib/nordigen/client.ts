/**
 * Nordigen GoCardless Open Banking Client
 *
 * Documentation: https://nordigen.com/en/account_information_integration_docs/
 */

import { createClient } from '@supabase/supabase-js';

const NORDIGEN_API = 'https://ob.nordigen.com/api/v2';
const NORDIGEN_SECRET_ID = process.env.NORDIGEN_SECRET_ID;
const NORDIGEN_SECRET_KEY = process.env.NORDIGEN_SECRET_KEY;

let accessToken: string | null = null;
let tokenExpiresAt: number | null = null;

interface Requisition {
  id: string;
  link: string;
  status: string;
  accounts?: string[];
  institution_id?: string;
  redirect?: string;
  agreement?: string;
  secret?: string;
}

interface Account {
  id: string;
  iban?: string;
  institution_id?: string;
  status: string;
  owner_name?: string;
}

interface Institution {
  id: string;
  name: string;
  logo: string;
  countries: string[];
}

interface Transaction {
  transaction_id: string;
  booking_date: string;
  value_date: string;
  transaction_amount: { amount: string; currency: string } | { amount: string; currency: string };
  creditor_name?: string;
  debtor_name?: string;
  remittance_information_unstructured?: string;
  raw_data?: Record<string, unknown>;
}

/**
 * Get access token from Nordigen API
 */
async function getAccessToken(): Promise<string> {
  if (accessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  if (!NORDIGEN_SECRET_ID || !NORDIGEN_SECRET_KEY) {
    throw new Error('Nordigen credentials not configured');
  }

  const response = await fetch(`${NORDIGEN_API}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret_id: NORDIGEN_SECRET_ID,
      secret_key: NORDIGEN_SECRET_KEY,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get Nordigen access token');
  }

  const data = await response.json();
  accessToken = data.access as string;
  // Tokens expire after 24 hours, use 23 hours to be safe
  tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;

  return accessToken as string;
}

/**
 * Get list of institutions (banks) available in a country
 */
export async function getInstitutions(country: string = 'FR'): Promise<Institution[]> {
  const token = await getAccessToken();

  const response = await fetch(
    `${NORDIGEN_API}/institutions/?country=${country}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch institutions');
  }

  return response.json();
}

/**
 * Create a requisition (link for user to connect their bank)
 */
export async function createRequisition(
  redirectUri: string,
  institutionId?: string
): Promise<Requisition> {
  const token = await getAccessToken();

  const body: Record<string, string | string[]> = {
    redirect: redirectUri,
    agreement: ['account_details', 'transactions'],
  };

  if (institutionId) {
    body.institution_id = institutionId;
  } else {
    body.user_language = 'fr';
    body.institution_id = '';
  }

  const response = await fetch(`${NORDIGEN_API}/requisitions/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Failed to create requisition');
  }

  return response.json();
}

/**
 * Get requisition details (after user returns from bank)
 */
export async function getRequisition(requisitionId: string): Promise<Requisition> {
  const token = await getAccessToken();

  const response = await fetch(
    `${NORDIGEN_API}/requisitions/${requisitionId}/`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get requisition');
  }

  return response.json();
}

/**
 * Delete a requisition
 */
export async function deleteRequisition(requisitionId: string): Promise<void> {
  const token = await getAccessToken();

  await fetch(`${NORDIGEN_API}/requisitions/${requisitionId}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

/**
 * Get account details
 */
export async function getAccount(accountId: string, accessToken: string): Promise<Account> {
  const response = await fetch(
    `${NORDIGEN_API}/accounts/${accountId}/`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get account details');
  }

  return response.json() as Promise<Account>;
}

/**
 * Get account IBAN
 */
export async function getAccountIban(accountId: string, accessToken: string): Promise<{ iban: string }> {
  const response = await fetch(
    `${NORDIGEN_API}/accounts/${accountId}/details/`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get account IBAN');
  }

  return response.json();
}

/**
 * Get account balances
 */
export async function getAccountBalances(
  accountId: string,
  accessToken: string
): Promise<{
  balances: Array<{
    balanceAmount: { amount: string; currency: string };
    balanceType: string;
    referenceDate: string;
  }>;
}> {
  const response = await fetch(
    `${NORDIGEN_API}/accounts/${accountId}/balances/`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get account balances');
  }

  return response.json();
}

/**
 * Get account transactions
 */
export async function getAccountTransactions(
  accountId: string,
  accessToken: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  transactions: {
    booked?: Transaction[];
    pending?: Transaction[];
  };
}> {
  const params = new URLSearchParams();
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);
  params.append('limit', '500');

  const response = await fetch(
    `${NORDIGEN_API}/accounts/${accountId}/transactions/?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get account transactions');
  }

  return response.json();
}

/**
 * Create an account link (access token for a specific account)
 */
export async function createAccountLink(
  requisitionId: string,
  accountId: string
): Promise<string> {
  const token = await getAccessToken();

  const response = await fetch(`${NORDIGEN_API}/requisitions/${requisitionId}/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get requisition for account link');
  }

  const requisition = await response.json();

  // Create an "account access" agreement
  const agreementResponse = await fetch(`${NORDIGEN_API}/agreements/enduser/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      institution_id: requisition.institution_id,
      max_historical_days: 90,
      access_valid_for_days: 90,
      access_scope: ['balances', 'transactions', 'details'],
    }),
  });

  if (!agreementResponse.ok) {
    throw new Error('Failed to create agreement');
  }

  const agreement = await agreementResponse.json();

  // Exchange agreement for account access token
  const tokenResponse = await fetch(`${NORDIGEN_API}/agreements/enduser/${agreement.id}/links/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_id: accountId,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to create account link');
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access; // This is the account-specific access token
}

/**
 * Supabase helper to store Nordigen connection
 */
export async function storeNordigenConnection(params: {
  userId: string;
  institutionId: string;
  institutionName: string;
  accountId: string;
  iban?: string;
  accountName?: string;
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('nordigen_connections')
    .insert({
      user_id: params.userId,
      institution_id: params.institutionId,
      institution_name: params.institutionName,
      account_id: params.accountId,
      account_iban: params.iban,
      account_name: params.accountName,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Supabase helper to sync transactions
 */
export async function syncNordigenTransactions(params: {
  userId: string;
  connectionId: string;
  transactions: Transaction[];
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let added = 0;
  let updated = 0;

  for (const transaction of params.transactions) {
    const { data: existing } = await supabase
      .from('nordigen_transactions')
      .select('id')
      .eq('transaction_id', transaction.transaction_id)
      .eq('connection_id', params.connectionId)
      .maybeSingle();

    const transactionData = {
      user_id: params.userId,
      connection_id: params.connectionId,
      transaction_id: transaction.transaction_id,
      transaction_date: transaction.booking_date,
      value_date: transaction.value_date,
      booking_date: transaction.booking_date,
      amount: Math.abs(parseFloat(transaction.transaction_amount.amount)),
      currency: transaction.transaction_amount.currency,
      description: transaction.remittance_information_unstructured ||
                   transaction.creditor_name ||
                   transaction.debtor_name ||
                   'Transaction',
      merchant_name: transaction.creditor_name || transaction.debtor_name,
      raw_data: transaction,
    };

    if (existing) {
      await supabase
        .from('nordigen_transactions')
        .update(transactionData)
        .eq('id', existing.id);
      updated++;
    } else {
      await supabase
        .from('nordigen_transactions')
        .insert(transactionData);
      added++;
    }
  }

  return { added, updated };
}
