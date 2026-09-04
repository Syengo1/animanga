export type CanonicalEventType =
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_EXPIRED'
  | 'PAYMENT_REVERSED';

export interface CanonicalPaymentEvent {
  idempotencyKey: string;
  provider: 'DARAJA' | 'KOPO_KOPO' | 'CARD';
  providerEventId: string; // The webhook/callback ID
  providerTransactionId: string; // The actual M-Pesa Receipt Number
  internalReferenceId: string; // Our internal checkout/order ID
  eventType: CanonicalEventType;
  amount: string; // Strictly a string decimal
  currency: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  rawPayload: unknown;
}
