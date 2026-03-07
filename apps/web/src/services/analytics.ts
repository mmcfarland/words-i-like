// Thin wrapper around Umami's tracking API
// Gracefully no-ops when Umami script isn't loaded

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, string | number>) => void
    }
  }
}

function track(event: string, data?: Record<string, string | number>) {
  try {
    window.umami?.track(event, data)
  }
  catch {
    // Analytics should never break the app
  }
}

export const analytics = {
  wordAdded: (text: string) => track('word_added', { word_length: text.length }),
  wordDeleted: () => track('word_deleted'),
  wordCorrected: () => track('word_corrected'),
  definitionFound: (source: string) => track('definition_found', { source }),
  definitionNotFound: () => track('definition_not_found'),
  examplesGenerated: () => track('examples_generated'),
  listCreated: () => track('list_created'),
  listDeleted: () => track('list_deleted'),
  listShared: () => track('list_shared'),
  wordShared: () => track('word_shared'),
  signedIn: () => track('signed_in'),
  signedOut: () => track('signed_out'),
  syncCompleted: () => track('sync_completed'),
  searchUsed: () => track('search_used'),
  sharedListViewed: () => track('shared_list_viewed'),
  sharedWordViewed: () => track('shared_word_viewed'),
  wordAdopted: () => track('word_adopted'),
}
