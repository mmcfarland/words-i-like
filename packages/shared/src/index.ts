export { CreateWordSchema, UpdateWordSchema } from './types/api.js'
export type { ApiError, ApiWord, CreateWordInput, UpdateWordInput } from './types/api.js'

export type { AppConfig } from './types/app.js'

export type { AuthState, TokenPayload, UserProfile } from './types/auth.js'

export { AssignWordToListsSchema, CreateListSchema, UpdateListSchema } from './types/list.js'
export type { AssignWordToListsInput, CreateListInput, List, UpdateListInput, WordListEntry } from './types/list.js'

export type { SharedListResponse, SharedWordResponse, ShareResponse } from './types/share.js'

export { DEFINITION_STATUS_RANK, SyncDeletedWordSchema, SyncRequestSchema, SyncWordSchema } from './types/sync.js'
export type { DefinitionStatusPrecedence, SyncDeletedWord, SyncRequest, SyncResponse, SyncWord } from './types/sync.js'
export type {
  DefinitionStatus,
  DictionaryDefinition,
  DictionaryEntry,
  DictionaryMeaning,
  DictionaryPhonetic,
  Word,
} from './types/word.js'
