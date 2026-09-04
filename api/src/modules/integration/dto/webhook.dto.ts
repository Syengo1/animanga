export interface CanonicalWebhookInput {
  provider: string; // e.g., 'DARAJA'
  providerEventId: string; // CheckoutRequestID
  providerTransactionId?: string; // MpesaReceiptNumber (if successful)
  internalReferenceId: string; // CheckoutRequestID maps to our checkoutSessionId
  eventType: 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED';
  amount?: string;
  currency: string;
  timestamp: Date;
  rawPayload: unknown;
}
