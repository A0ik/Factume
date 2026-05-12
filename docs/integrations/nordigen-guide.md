# Nordigen (GoCardless) Open Banking Integration

## Overview

Nordigen (acquired by GoCardless) provides open banking APIs for accessing bank account data across Europe. This integration will enable Factu.me users to automatically import transactions for expense tracking.

## Use Case

Similar to Dext, users can:
- Connect their bank accounts via PSD2
- Automatically import transactions
- Categorize expenses
- Reconcile with invoices
- Export for accounting

## API Endpoints

### Authentication
- **POST** `/api/nordigen/link` - Generate link token for bank connection
- **POST** `/api/nordigen/callback` - Handle OAuth callback
- **GET** `/api/nordigen/accounts` - List connected accounts

### Transactions
- **GET** `/api/nordigen/transactions/:accountId` - Fetch transactions
- **POST** `/api/nordigen/sync` - Sync latest transactions
- **POST** `/api/nordigen/categorize` - Auto-categorize with AI

## Implementation Steps

### 1. Environment Variables

```env
# Nordigen/GoCardless
NORDIGEN_SECRET_ID=your_secret_id
NORDIGEN_SECRET_KEY=your_secret_key
NORDIGEN_REDIRECT_URI=https://factu.me/api/nordigen/callback
```

### 2. Database Schema

```sql
CREATE TABLE nordigen_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  institution_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nordigen_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  connection_id UUID REFERENCES nordigen_connections,
  transaction_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  description TEXT,
  category TEXT,
  value_date TIMESTAMPTZ,
  booking_date TIMESTAMPTZ,
  reconciled BOOLEAN DEFAULT FALSE,
  invoice_id UUID REFERENCES invoices,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. API Route Structure

```
/api/nordigen/
  ├── link/route.ts          - Generate connection link
  ├── callback/route.ts      - OAuth callback
  ├── accounts/route.ts      - List accounts
  ├── transactions/route.ts  - Fetch transactions
  └── sync/route.ts          - Sync endpoint
```

### 4. Frontend Components

```tsx
// components/BankConnectionDialog.tsx
interface BankConnectionDialogProps {
  onSuccess: (accountId: string) => void;
}

// components/TransactionList.tsx
interface TransactionListProps {
  accountId: string;
  allowReconciliation?: boolean;
}
```

## Nordigen API Integration

### Client Setup

```typescript
// lib/nordigen/client.ts
import axios from 'axios';

const NORDIGEN_API = 'https://ob.nordigen.com/api/v2';

export class NordigenClient {
  private secretId: string;
  private secretKey: string;

  constructor() {
    this.secretId = process.env.NORDIGEN_SECRET_ID!;
    this.secretKey = process.env.NORDIGEN_SECRET_KEY!;
  }

  async getAccessToken() {
    const response = await axios.post(`${NORDIGEN_API}/token/new/`, {
      secret_id: this.secretId,
      secret_key: this.secretKey,
    });
    return response.data.access;
  }

  async getInstitutions(country: string = 'FR') {
    const token = await this.getAccessToken();
    const response = await axios.get(
      `${NORDIGEN_API}/institutions/?country=${country}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }

  async createRequisition(redirectUri: string) {
    const token = await this.getAccessToken();
    const response = await axios.post(
      `${NORDIGEN_API}/requisitions/`,
      { redirect: redirectUri },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
}
```

## Features to Implement

### Phase 1: Basic Connection
- [ ] Generate bank link
- [ ] OAuth callback handling
- [ ] Store connection in DB
- [ ] Display connected accounts

### Phase 2: Transaction Sync
- [ ] Fetch transactions via API
- [ ] Store in database
- [ ] Display transaction list
- [ ] Manual categorization

### Phase 3: Automation
- [ ] Automatic sync (webhook/cron)
- [ ] AI categorization
- [ ] Invoice reconciliation
- [ ] Expense matching

### Phase 4: Reporting
- [ ] Expense reports
- [ ] Cash flow analysis
- [ ] Export to accounting
- [ ] VAT reports

## Security Considerations

1. **PSD2 Compliance**: Nordigen is fully PSD2 compliant
2. **Data Encryption**: Encrypt stored credentials
3. **Access Tokens**: Refresh tokens automatically
4. **Rate Limiting**: Respect Nordigen API limits
5. **User Consent**: Clear consent before connecting

## Compliance

- GDPR compliant (Nordigen handles data within EU)
- PSD2 compliant (AIS license)
- French decree on bank data storage
- ISO 27001 certified

## Cost Estimate

- **Free Tier**: 500 requests/day, 3 institutions
- **Growth**: €99/month for 10k requests/day
- **Scale**: €499/month for 100k requests/day

## Timeline

- **Week 1**: Integration setup, authentication
- **Week 2**: Transaction sync, UI components
- **Week 3**: Automation, AI categorization
- **Week 4**: Testing, documentation, launch

## Resources

- [Nordigen Documentation](https://nordigen.com/en/account_information_integration_docs/)
- [GoCardless Open Banking](https://developer.gocardless.com/open-banking)
- [PSD2 Guidelines](https://www.eba.europa.eu/regulation-and-policy/psd2)
