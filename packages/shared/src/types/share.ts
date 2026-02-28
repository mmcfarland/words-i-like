export interface SharedListResponse {
  name: string
  words: SharedWordResponse[]
}

export interface SharedWordResponse {
  id: string
  text: string
  definitions: unknown
  pronunciation: string | null
  definitionStatus: string
}

export interface ShareResponse {
  shareToken: string
  url: string
}
