import { z } from "zod";

export const CrawlRequestSchema = z.object({
  partyId: z.string().min(1),
  url: z.string().url(),
});

export const ExtractRequestSchema = z.object({
  sourceId: z.string().min(1),
});

export const AnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.number().int().min(-2).max(2).nullable(),
  importance: z.number().int().min(0).max(2).default(1),
  skipped: z.boolean().default(false),
});

export const ScoreRequestSchema = z.object({
  answers: z.array(AnswerSchema).min(1),
});

export const UpdatePositionSchema = z.object({
  summary: z.string().min(1).optional(),
  positionValue: z.number().min(-2).max(2).nullable().optional(),
  reviewStatus: z
    .enum(["PENDING", "APPROVED", "REJECTED", "NEEDS_MORE_SOURCE", "NEEDS_REVIEW", "READY_FOR_APPROVAL"])
    .optional(),
  reviewNote: z.string().optional(),
});

export const ExtractedPositionSchema = z.object({
  topic: z.string().min(1),
  specificQuestion: z.string().min(1),
  summary: z.string().min(1),
  positionValue: z.number().min(-2).max(2).nullable(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]),
  sourceQuote: z.string().min(1),
  aiInterpretation: z.string().min(1),
  reviewStatus: z.enum(["PENDING", "NEEDS_REVIEW", "NEEDS_MORE_SOURCE"]),
  conflictingSources: z.boolean(),
});

export type CrawlRequest = z.infer<typeof CrawlRequestSchema>;
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;
export type ScoreRequest = z.infer<typeof ScoreRequestSchema>;
export type UpdatePosition = z.infer<typeof UpdatePositionSchema>;
export type ExtractedPosition = z.infer<typeof ExtractedPositionSchema>;
export type Answer = z.infer<typeof AnswerSchema>;
