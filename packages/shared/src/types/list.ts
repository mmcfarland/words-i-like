import { z } from 'zod'

export interface List {
  id: string
  name: string
  isDefault: boolean
  userId: string
  createdAt: number
  updatedAt: number
}

export interface WordListEntry {
  wordId: string
  listId: string
}

export const CreateListSchema = z.object({
  name: z.string().min(1).max(100),
})

export type CreateListInput = z.infer<typeof CreateListSchema>

export const UpdateListSchema = z.object({
  name: z.string().min(1).max(100),
})

export type UpdateListInput = z.infer<typeof UpdateListSchema>

export const AssignWordToListsSchema = z.object({
  listIds: z.array(z.string()).min(1),
})

export type AssignWordToListsInput = z.infer<typeof AssignWordToListsSchema>
