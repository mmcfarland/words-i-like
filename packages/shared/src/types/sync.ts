import { z } from 'zod'

export const SyncWordSchema = z.object({
  id: z.string(),
  text: z.string(),
  definitions: z.unknown().default([]),
  pronunciation: z.string().optional(),
  definitionStatus: z.enum(['found', 'not_found', 'pending']),
  examples: z.array(z.string()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type SyncWord = z.infer<typeof SyncWordSchema>

export const SyncRequestSchema = z.object({
  words: z.array(SyncWordSchema),
  lastSyncedAt: z.number().optional(),
})

export type SyncRequest = z.infer<typeof SyncRequestSchema>

export interface SyncResponse {
  words: SyncWord[]
  syncedAt: number
}

export type DefinitionStatusPrecedence = 'found' | 'not_found' | 'pending'

export const DEFINITION_STATUS_RANK: Record<DefinitionStatusPrecedence, number> = {
  found: 3,
  not_found: 2,
  pending: 1,
}
