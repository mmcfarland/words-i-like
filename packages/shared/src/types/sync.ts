import { z } from 'zod'

export const SyncWordSchema = z.object({
  id: z.string(),
  text: z.string(),
  definitions: z.unknown().default([]),
  pronunciation: z.string().optional(),
  pronunciationAudio: z.string().optional(),
  definitionStatus: z.enum(['found', 'not_found', 'pending']),
  examples: z.array(z.string()).optional(),
  sourceUrl: z.string().optional(),
  shareToken: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type SyncWord = z.infer<typeof SyncWordSchema>

export const SyncDeletedWordSchema = z.object({
  text: z.string().min(1),
  deletedAt: z.number(),
})

export type SyncDeletedWord = z.infer<typeof SyncDeletedWordSchema>

export const SyncRequestSchema = z.object({
  words: z.array(SyncWordSchema),
  deleted: z.array(SyncDeletedWordSchema).default([]),
  lastSyncedAt: z.number().optional(),
})

export type SyncRequest = z.infer<typeof SyncRequestSchema>

export interface SyncResponse {
  words: SyncWord[]
  deleted: SyncDeletedWord[]
  syncedAt: number
}

export type DefinitionStatusPrecedence = 'found' | 'not_found' | 'pending'

export const DEFINITION_STATUS_RANK: Record<DefinitionStatusPrecedence, number> = {
  found: 3,
  not_found: 2,
  pending: 1,
}
