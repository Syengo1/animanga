// Opaque Identity Payload - No PII or complex state
export interface TicketDeliveryJobData {
  outboxMessageId: string;
  ticketId: string;
  orderId: string;
}
