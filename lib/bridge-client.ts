const BRIDGE_API_URL = 'https://api.bridgeapi.io/v2';

export class BridgeClient {
  private clientId: string;
  private clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${BRIDGE_API_URL}${path}`, {
      ...options,
      headers: {
        'Client-Id': this.clientId,
        'Client-Secret': this.clientSecret,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Bridge API ${res.status}: ${body}`);
    }

    return res.json();
  }

  private async requestWithToken(path: string, accessToken: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${BRIDGE_API_URL}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': this.clientId,
        'Client-Secret': this.clientSecret,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Bridge API ${res.status}: ${body}`);
    }

    return res.json();
  }

  async initializeUser(userUuid: string): Promise<{ resource: { user_uuid: string; email?: string } }> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify({ user_uuid: userUuid }),
    });
  }

  async getConnectUrl(userUuid: string): Promise<string> {
    await this.initializeUser(userUuid);
    return `https://connect.bridgeapi.io?client_id=${this.clientId}&user_uuid=${userUuid}`;
  }

  async getBanks(): Promise<any[]> {
    const data = await this.request('/banks?limit=200');
    return data.resources || [];
  }

  async getAccounts(accessToken: string): Promise<any[]> {
    const data = await this.requestWithToken('/accounts', accessToken);
    return data.resources || [];
  }

  async getTransactions(accessToken: string, accountId: string, since?: string): Promise<any[]> {
    let path = `/accounts/${accountId}/transactions?limit=500`;
    if (since) path += `&since=${since}`;
    const data = await this.requestWithToken(path, accessToken);
    return data.resources || [];
  }

  async refreshConnection(accessToken: string, connectionId: string): Promise<void> {
    await this.requestWithToken(`/connections/${connectionId}/refresh`, accessToken, {
      method: 'POST',
    });
  }

  async deleteConnection(accessToken: string, connectionId: string): Promise<void> {
    await this.requestWithToken(`/connections/${connectionId}`, accessToken, {
      method: 'DELETE',
    });
  }
}
