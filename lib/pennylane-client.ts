const PENNYLANE_API_URL = 'https://app.pennylane.com/api/external/v1';

export class PennylaneClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${PENNYLANE_API_URL}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pennylane API ${res.status}: ${body}`);
    }

    return res.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/self');
      return true;
    } catch {
      return false;
    }
  }

  async getSelf(): Promise<any> {
    return this.request('/self');
  }

  async pushSupplierInvoice(expense: {
    vendor: string;
    amount_ht: number;
    vat_amount: number;
    total_ttc: number;
    date: string;
    due_date?: string;
    invoice_number?: string;
    category: string;
    account_code: string;
    vat_rate: number;
    payment_method?: string;
    items?: Array<{ description: string; quantity: number; unit_price: number; vat_rate: number }>;
  }): Promise<{ id: string }> {
    const payload = {
      supplier_invoice: {
        reference: expense.invoice_number || `FACTU-${Date.now()}`,
        invoice_date: expense.date,
        due_date: expense.due_date || expense.date,
        supplier: { name: expense.vendor },
        total_amount: expense.total_ttc,
        net_amount: expense.amount_ht,
        vat_amount: expense.vat_amount,
        currency: 'EUR',
        notes: `Importé depuis FACTU.ME — Catégorie: ${expense.category}`,
        labels: [expense.category],
        invoice_items: expense.items?.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate / 100,
          account: expense.account_code,
        })) || [{
          description: expense.category,
          quantity: 1,
          unit_price: expense.amount_ht,
          vat_rate: expense.vat_rate / 100,
          account: expense.account_code,
        }],
      },
    };

    return this.request('/supplier_invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async pushCustomerInvoice(invoice: {
    client_name: string;
    amount_ht: number;
    vat_amount: number;
    total_ttc: number;
    date: string;
    due_date?: string;
    invoice_number: string;
    items: Array<{ description: string; quantity: number; unit_price: number; vat_rate: number; account_code?: string }>;
  }): Promise<{ id: string }> {
    const payload = {
      customer_invoice: {
        reference: invoice.invoice_number,
        invoice_date: invoice.date,
        due_date: invoice.due_date || invoice.date,
        customer: { name: invoice.client_name },
        total_amount: invoice.total_ttc,
        net_amount: invoice.amount_ht,
        vat_amount: invoice.vat_amount,
        currency: 'EUR',
        invoice_items: invoice.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate / 100,
          account: item.account_code || '706000',
        })),
      },
    };

    return this.request('/customer_invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async fetchSuppliers(): Promise<any[]> {
    const data = await this.request('/suppliers?page=1&per_page=100');
    return data.suppliers || [];
  }

  async fetchAccounts(): Promise<any[]> {
    const data = await this.request('/accounts?page=1&per_page=100');
    return data.accounts || [];
  }

  async updatePaymentStatus(externalId: string, status: string): Promise<void> {
    await this.request(`/supplier_invoices/${externalId}`, {
      method: 'PATCH',
      body: JSON.stringify({ supplier_invoice: { payment_status: status } }),
    });
  }
}
