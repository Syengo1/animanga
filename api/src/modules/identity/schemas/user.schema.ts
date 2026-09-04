import { z } from 'zod';

// STRICT: Customers can only patch non-sensitive fields
export const UpdateProfileSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().max(30).optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// STRICT: KYC submission does NOT include verification status!
export const SubmitKycSchema = z
  .object({
    legalName: z.string().min(1).max(255),
    kraPin: z
      .string()
      .length(11, 'KRA PIN must be exactly 11 characters')
      .optional(),
  })
  .strict();

export type SubmitKycInput = z.infer<typeof SubmitKycSchema>;

// STRICT: KYC Document uploads
export const UploadKycDocumentSchema = z
  .object({
    documentType: z.enum([
      'NATIONAL_ID',
      'PASSPORT',
      'CERTIFICATE_OF_INCORPORATION',
    ]),
    // documentStorageKey and Hash will be handled internally by the service after S3 upload
  })
  .strict();

export type UploadKycDocumentInput = z.infer<typeof UploadKycDocumentSchema>;
