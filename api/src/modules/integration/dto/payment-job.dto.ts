export interface PaymentJobData {
  providerEventId: string;
  provider: 'DARAJA' | 'KOPO_KOPO' | 'PAYSTACK';
  eventType:
    | 'PAYMENT_SUCCESS'
    | 'PAYMENT_FAILED'
    | 'PAYMENT_EXPIRED'
    | 'REFUND_SUCCESS'
    | 'DISPUTE_OPENED'
    | 'PAYMENT_REVERSED';
  internalReferenceId: string;
  providerTransactionId: string;
  amount: string;
  currency: string;
}
