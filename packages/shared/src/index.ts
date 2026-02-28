export { CreateWordSchema, UpdateWordSchema } from './types/api'
export type { ApiError, ApiWord, CreateWordInput, UpdateWordInput } from './types/api'

export type { AppConfig } from './types/app'

export type { AuthState, TokenPayload, UserProfile } from './types/auth'

export { AssignWordToListsSchema, CreateListSchema, UpdateListSchema } from './types/list'
export type { AssignWordToListsInput, CreateListInput, List, UpdateListInput, WordListEntry } from './types/list'

export type { SharedListResponse, SharedWordResponse, ShareResponse } from './types/share'

export { DEFINITION_STATUS_RANK, SyncRequestSchema, SyncWordSchema } from './types/sync'
export type { DefinitionStatusPrecedence, SyncRequest, SyncResponse, SyncWord } from './types/sync'
export type {
  DefinitionStatus,
  DictionaryDefinition,
  DictionaryEntry,
  DictionaryMeaning,
  DictionaryPhonetic,
  Word,
} from './types/word'
