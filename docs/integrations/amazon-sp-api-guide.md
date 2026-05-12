# Amazon Selling Partner API (SP-API) Integration

## Overview

The Amazon Selling Partner API enables Factu.me to fetch sales data, orders, and financial reports from Amazon Seller Central accounts. This is essential for e-commerce merchants using FBA or FBA.

## Use Case

E-commerce sellers can:
- Automatically import Amazon orders
- Generate invoices from Amazon sales
- Track fees and commissions
- Reconcile Amazon payouts
- Calculate VAT on sales

## API Endpoints

### Authentication
- **POST** `/api/amazon/connect` - Initiate LWA (Login with Amazon)
- **POST** `/api/amazon/callback` - Handle OAuth callback
- **GET** `/api/amazon/credentials` - List connected marketplaces

### Orders
- **GET** `/api/amazon/orders` - Fetch orders
- **GET** `/api/amazon/orders/:orderId` - Get order details
- **POST** `/api/amazon/invoices/create` - Generate invoice from order

### Finances
- **GET** `/api/amazon/financial-events` - Fetch financial events
- **GET** `/api/amazon/payouts` - List payouts
- **POST** `/api/amazon/reconcile` - Reconcile with invoices

## Implementation Steps

### 1. Environment Variables

```env
# Amazon SP-API
AMAZON_APP_ID=amzn1.application-oa2-client.xxx
AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxx
AMAZON_CLIENT_SECRET=xxx
AMAZON_LWA_CLIENT_ID=amzn1.application-oa2-client.xxx
AMAZON_CALLBACK_URI=https://factu.me/api/amazon/callback

# AWS credentials for SP-API
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=eu-west-1
```

### 2. Database Schema

```sql
CREATE TABLE amazon_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  seller_id TEXT UNIQUE NOT NULL,
  marketplace_id TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE amazon_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  amazon_order_id TEXT UNIQUE NOT NULL,
  marketplace_id TEXT NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  customer_email TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  invoice_id UUID REFERENCES invoices,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE amazon_financial_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  seller_order_id TEXT,
  transaction_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  description TEXT,
  reconciled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. SP-API Client Setup

```typescript
// lib/amazon/sp-api-client.ts
import axios from 'axios';

const SP_API_BASE = 'https://sellingpartnerapi-eu.amazon.com';

export class AmazonSPClient {
  private accessToken: string | null = null;

  async getAccessToken(): Promise<string> {
    // Exchange refresh token for access token via LWA
    const response = await axios.post(
      'https://api.amazon.com/auth/o2/token',
      {
        grant_type: 'refresh_token',
        refresh_token: process.env.AMAZON_REFRESH_TOKEN,
        client_id: process.env.AMAZON_LWA_CLIENT_ID,
        client_secret: process.env.AMAZON_CLIENT_SECRET,
      }
    );
    this.accessToken = response.data.access_token;
    return this.accessToken;
  }

  async getOrders(createdAfter: Date, marketplaceId: string) {
    const token = await this.getAccessToken();
    const response = await axios.get(
      `${SP_API_BASE}/orders/v0/orders`,
      {
        params: { CreatedAfter: createdAfter.toISOString(), MarketplaceIds: marketplaceId },
        headers: {
          'x-amz-access-token': token,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.payload;
  }

  async getFinancialEvents(orderId: string) {
    const token = await this.getAccessToken();
    const response = await axios.get(
      `${SP_API_BASE}/finances/v0/orders/${orderId}/financialEvents`,
      {
        headers: {
          'x-amz-access-token': token,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.payload;
  }
}
```

### 4. Frontend Components

```tsx
// components/AmazonConnectionDialog.tsx
interface AmazonConnectionProps {
  onSuccess: (sellerId: string) => void;
}

// components/AmazonOrderList.tsx
interface OrderListProps {
  sellerId: string;
  onCreateInvoice: (orderId: string) => void;
}

// components/AmazonSyncSettings.tsx
interface SyncSettingsProps {
  autoSync: boolean;
  syncInterval: number;
}
```

## Amazon SP-API Scope

### Required Operations

1. **Orders API**
   - `getOrders` - Fetch orders
   - `getOrder` - Get order details
   - `getOrderItems` - Get order line items

2. **Finances API**
   - `listFinancialEvents` - Financial transactions
   - `getFinancialEvents` - Order-level finances

3. **Sellers API**
   - `getMarketplaceParticipations` - Active marketplaces

4. **Merchant Fulfillment API**
   - `getEligibleShippingServices` - Shipping options (optional)

## Features to Implement

### Phase 1: Basic Connection
- [ ] LWA authentication flow
- [ ] Store credentials securely
- [ ] List connected marketplaces
- [ ] Display seller dashboard

### Phase 2: Orders Sync
- [ ] Fetch orders via SP-API
- [ ] Store orders in database
- [ ] Display order list with filters
- [ ] Manual invoice generation

### Phase 3: Automation
- [ ] Automatic order sync (hourly)
- [ ] Auto-generate invoices for orders
- [ ] Handle VAT calculations
- [ ] Multi-currency support

### Phase 4: Financial Reconciliation
- [ ] Sync financial events
- [ ] Match Amazon payouts
- [ ] Calculate net profit after fees
- [ ] Export for accounting

## Amazon Fees Structure

### Types of Fees to Track

1. **Referral Fees**: 8-15% of sale price (category-dependent)
2. **FBA Fees**: Fulfillment, storage, handling
3. **Advertising**: Sponsored Products, Brands
4. **Other**: Returns, cancellations, adjustments

### Fee Calculation

```typescript
interface AmazonFees {
  referralFee: number;
  fbaFee: number;
  advertising: number;
  other: number;
  total: number;
}

function calculateAmazonFees(orderTotal: number, category: string): AmazonFees {
  const referralRate = getCategoryReferralRate(category);
  return {
    referralFee: orderTotal * referralRate,
    fbaFee: calculateFBAFee(orderTotal),
    advertising: 0, // From separate API
    other: 0,
    total: orderTotal * referralRate + calculateFBAFee(orderTotal),
  };
}
```

## VAT Compliance

### EU VAT Rules

1. **OSS (One Stop Shop)**: Handle cross-border VAT
2. **VAT Registration**: Store VAT numbers per marketplace
3. **VAT Rates**: Apply correct rate per destination

### Invoice Requirements

- Amazon order reference
- Seller VAT number
- Buyer VAT number (if B2B)
- Itemized VAT per line item
- Fulfillment method (FBA/FBM)

## Security Considerations

1. **Credentials**: Encrypt refresh tokens at rest
2. **Token Rotation**: Auto-refresh access tokens
3. **Rate Limiting**: Strict SP-API rate limits
4. **Data Residency**: EU data in EU region
5. **Compliance**: GDPR, marketplace ToS

## Rate Limits

- **Orders API**: 10 requests/second, 1000 requests/hour
- **Finances API**: 10 requests/second
- **Feeds API**: 10 requests/second

## Cost Estimate

### Developer Costs
- **Amazon Developer Account**: Free
- **LWA Registration**: Free

### Infrastructure
- **AWS Lambda/EC2** for backend: ~$20/month
- **Database storage**: Included in existing

### Maintenance
- Initial integration: ~40 hours
- Ongoing updates: ~5 hours/month

## Timeline

- **Week 1**: LWA authentication, credentials storage
- **Week 2**: Orders API integration
- **Week 3**: Finances API, reconciliation
- **Week 4**: Automation, testing, documentation

## Resources

- [Amazon SP-API Documentation](https://developer-docs.amazon.com/sp-api)
- [LWA Integration Guide](https://developer-docs.amazon.com/amazon-identity/authentication-with-amazon)
- [Selling Partner Appstore](https://sellercentral.amazon.com/developer-apps)
- [EU VAT Guidelines](https://ec.europa.eu/taxation_customs/vat/)
