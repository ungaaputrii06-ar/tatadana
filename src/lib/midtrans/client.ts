export interface MidtransSnapTransactionParams {
  orderId: string;
  grossAmount: number;
  customerDetails: {
    first_name?: string;
    phone?: string;
    email?: string;
  };
  itemDetails: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}

export interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

export class MidtransClient {
  private serverKey: string;
  private isProduction: boolean;

  constructor() {
    this.serverKey = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-mock';
    this.isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  }

  private getSnapUrl(): string {
    return this.isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
  }

  /**
   * Creates a Snap payment token for Midtrans popup checkout
   */
  async createSnapTransaction(params: MidtransSnapTransactionParams): Promise<MidtransSnapResponse> {
    if (this.serverKey.includes('mock')) {
      const mockToken = 'mock_snap_' + Math.random().toString(36).substring(2, 10);
      return {
        token: mockToken,
        redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${mockToken}`,
      };
    }

    const authHeader = 'Basic ' + Buffer.from(this.serverKey + ':').toString('base64');

    const body = {
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.grossAmount,
      },
      customer_details: params.customerDetails,
      item_details: params.itemDetails,
    };

    const res = await fetch(this.getSnapUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Midtrans API Error: ${err}`);
    }

    return await res.json();
  }
}
