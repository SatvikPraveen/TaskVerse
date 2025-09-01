// apps/web/src/utils/zod-helpers.ts
import { ZodError, ZodSchema } from 'zod';

export interface ValidationError {
  field: string;
  message: string;
}

export function parseZodErrors(error: ZodError): ValidationError[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

export function validateWithZod<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, errors: parseZodErrors(error) };
    }
    throw error;
  }
}

export function safeParseWithZod<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: parseZodErrors(result.error) };
  }
}

export function getFirstError(errors: ValidationError[], field: string): string | undefined {
  return errors.find(error => error.field === field)?.message;
}

export function getFieldErrors(errors: ValidationError[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  
  errors.forEach(error => {
    if (!fieldErrors[error.field]) {
      fieldErrors[error.field] = error.message;
    }
  });
  
  return fieldErrors;
}