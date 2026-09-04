export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ON_SALE = 'ON_SALE',
  SOLD_OUT = 'SOLD_OUT',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum ReservationStatus {
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  EXPIRED = 'EXPIRED',
  RELEASED = 'RELEASED',
}

export enum KeyStatus {
  // Renamed from SigningKeyStatus to match our entity
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export enum TicketStatus {
  ISSUED = 'ISSUED',
  SCANNED = 'SCANNED',
  REVOKED = 'REVOKED',
  REFUNDED = 'REFUNDED',
}

export enum ScanResult {
  // Expanded for rich forensic logging
  VALID = 'VALID',
  DUPLICATE = 'DUPLICATE',
  REVOKED = 'REVOKED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  WRONG_EVENT = 'WRONG_EVENT',
  EXPIRED = 'EXPIRED',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  KEY_REVOKED = 'KEY_REVOKED',
  NOT_FOUND = 'NOT_FOUND',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DEAD_LETTER = 'DEAD_LETTER',
}

export enum DeliveryChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}
