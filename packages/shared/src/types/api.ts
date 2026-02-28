import { z } from 'zod'

// Word creation request
export const CreateWordSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1).max(100),
  definitions: z.array(z.object({
    partOfSpeech: z.string(),
    definitions: z.array(z.object({
      definition: z.string(),
      example: z.string().optional(),
      synonyms: z.array(z.string()),
      antonyms: z.array(z.string()),
    })),
    synonyms: z.array(z.string()),
    antonyms: z.array(z.string()),
  })).default([]),
  pronunciation: z.string().optional(),
  definitionStatus: z.enum(['found', 'not_found', 'pending']).default('pending'),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
})

export type CreateWordInput = z.infer<typeof CreateWordSchema>

// Word update request
export const UpdateWordSchema = z.object({
  text: z.string().min(1).max(100).optional(),
  definitions: z.array(z.object({
    partOfSpeech: z.string(),
    definitions: z.array(z.object({
      definition: z.string(),
      example: z.string().optional(),
      synonyms: z.array(z.string()),
      antonyms: z.array(z.string()),
    })),
    synonyms: z.array(z.string()),
    antonyms: z.array(z.string()),
  })).optional(),
  pronunciation: z.string().optional(),
  definitionStatus: z.enum(['found', 'not_found', 'pending']).optional(),
})

export type UpdateWordInput = z.infer<typeof UpdateWordSchema>

// API response types
export interface ApiWord {
  id: string
  text: string
  definitions: unknown
  pronunciation: string | null
  definitionStatus: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
}
