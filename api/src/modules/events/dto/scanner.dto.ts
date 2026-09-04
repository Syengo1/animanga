import { z } from 'zod';

// POST /v1/events/:eventId/scanner/validate
export const ScannerValidationRequestSchema = z.object({
  // STRICT: No ticketId provided by the client. Derived from payload.
  qrPayload: z.record(z.string(), z.unknown()),
  signature: z.string(),
});

export type ScannerValidationRequestDto = z.infer<
  typeof ScannerValidationRequestSchema
>;

// Deterministic response unions based on the ScanResult enum we designed
const ValidScanResponseSchema = z.object({
  result: z.literal('VALID'),
  ticketId: z.string().uuid(),
  ticketType: z.string(),
  scannedAt: z.string().datetime(),
});

const InvalidScanResponseSchema = z.object({
  result: z.enum([
    'DUPLICATE',
    'REVOKED',
    'WRONG_EVENT',
    'INVALID_SIGNATURE',
    'INVALID_PAYLOAD',
    'KEY_REVOKED',
    'NOT_FOUND',
  ]),
  message: z.string(),
  ticketId: z.string().uuid().optional(),
});

export const ScannerValidationResponseSchema = z.union([
  ValidScanResponseSchema,
  InvalidScanResponseSchema,
]);

export type ScannerValidationResponseDto = z.infer<
  typeof ScannerValidationResponseSchema
>;
