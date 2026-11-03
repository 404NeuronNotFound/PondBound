import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('pondbound-api'),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const readinessResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), database: z.literal('connected') }),
  z.object({ status: z.literal('not_ready'), database: z.enum(['unconfigured', 'unavailable']) }),
]);
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;

export const apiInfoResponseSchema = z.object({ service: z.literal('pondbound-api'), apiVersion: z.literal('1') });
export type ApiInfoResponse = z.infer<typeof apiInfoResponseSchema>;

export const apiErrorResponseSchema = z.object({
  statusCode: z.number().int().min(400).max(599),
  error: z.string(),
  message: z.union([z.string(), z.array(z.string())]),
  path: z.string(),
  timestamp: z.iso.datetime(),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
