import { Injectable, PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';

@Injectable()
export class ZodValidationPipe<TOutput = unknown> implements PipeTransform {
  // We use TOutput so the return type is strictly inferred instead of 'any'
  constructor(private schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    // Let Zod throw natively. The GlobalExceptionFilter will catch and format it.
    return this.schema.parse(value);
  }
}
