import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DarajaStkCallback } from '../schemas/daraja-callback.schema';
import { CanonicalWebhookInput } from '../dto/webhook.dto';

export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

@Injectable()
export class DarajaAdapter {
  private readonly logger = new Logger(DarajaAdapter.name);

  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private readonly configService: ConfigService) {}

  normalizeStkCallback(payload: DarajaStkCallback): CanonicalWebhookInput {
    const cb = payload.Body.stkCallback;
    const isSuccess = cb.ResultCode === 0;

    let amount: string | undefined;
    let receiptNumber: string | undefined;

    if (isSuccess && cb.CallbackMetadata?.Item) {
      const amountItem = cb.CallbackMetadata.Item.find(
        (i) => i.Name === 'Amount',
      );
      const receiptItem = cb.CallbackMetadata.Item.find(
        (i) => i.Name === 'MpesaReceiptNumber',
      );

      if (amountItem?.Value) amount = String(amountItem.Value);
      if (receiptItem?.Value) receiptNumber = String(receiptItem.Value);
    }

    return {
      provider: 'DARAJA',
      providerEventId: cb.CheckoutRequestID,
      providerTransactionId: receiptNumber,
      internalReferenceId: cb.CheckoutRequestID,
      eventType: isSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
      amount,
      currency: 'KES',
      timestamp: new Date(),
      rawPayload: payload as unknown as Record<string, unknown>,
    };
  }

  private get environment() {
    return this.configService.get<string>('MPESA_ENVIRONMENT') || 'sandbox';
  }

  private get baseUrl() {
    return this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiry - 30000) {
      return this.cachedToken;
    }

    const consumerKey = this.configService.get<string>('MPESA_CONSUMER_KEY');
    const consumerSecret = this.configService.get<string>(
      'MPESA_CONSUMER_SECRET',
    );

    if (!consumerKey || !consumerSecret) {
      throw new InternalServerErrorException(
        'M-Pesa credentials are not configured.',
      );
    }

    const authBuffer = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      'base64',
    );

    try {
      const response = await fetch(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${authBuffer}` } },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Daraja Auth Failed: ${errorText}`);
        throw new InternalServerErrorException(
          'Failed to authenticate with Daraja',
        );
      }

      const data = (await response.json()) as unknown as {
        access_token: string;
        expires_in: string;
      };

      this.cachedToken = data.access_token;
      this.tokenExpiry = Date.now() + parseInt(data.expires_in, 10) * 1000;

      return this.cachedToken;
    } catch (error) {
      this.logger.error('Network error during Daraja Auth', error);
      throw new InternalServerErrorException('Unable to reach M-Pesa API');
    }
  }

  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) return `254${cleaned.substring(1)}`;
    if (cleaned.startsWith('7') || cleaned.startsWith('1'))
      return `254${cleaned}`;
    if (cleaned.startsWith('254')) return cleaned;
    if (cleaned.startsWith('+254')) return cleaned.substring(1);
    return cleaned;
  }

  async sendStkPush(
    phoneNumber: string,
    amount: number,
    orderId: string,
  ): Promise<StkPushResponse> {
    const token = await this.getAccessToken();
    const shortcode = this.configService.get<string>('MPESA_SHORTCODE');
    const passkey = this.configService.get<string>('MPESA_PASSKEY');
    const callbackUrl = this.configService.get<string>('MPESA_CALLBACK_URL');

    if (!shortcode || !passkey || !callbackUrl) {
      throw new InternalServerErrorException(
        'M-Pesa STK push environment variables are missing.',
      );
    }

    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');

    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
      'base64',
    );
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    const accountReference = orderId
      .replace(/-/g, '')
      .substring(0, 12)
      .toUpperCase();

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.floor(amount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: 'Animanga Platform Checkout',
    };

    try {
      const response = await fetch(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const data = (await response.json()) as unknown as StkPushResponse;

      if (!response.ok) {
        this.logger.error(
          `STK Push Rejected by Daraja: ${JSON.stringify(data)}`,
        );
        throw new InternalServerErrorException(
          'M-Pesa rejected the payment request',
        );
      }

      this.logger.log(`STK Push Sent Successfully for Order: ${orderId}`);
      return data;
    } catch (error) {
      this.logger.error('Network error during Daraja STK Push', error);
      throw new InternalServerErrorException(
        'Unable to reach M-Pesa STK Push API',
      );
    }
  }
}
