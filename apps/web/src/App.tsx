import { useCallback, useState } from 'react'
import { AppShell } from './components/AppShell'
import { ListFilter } from './components/ListFilter'
import { ListPicker } from './components/ListPicker'
import { SearchOverlay } from './components/SearchOverlay'
import { AuthTooltip } from './components/Tooltip'
import { WordFeed } from './components/WordFeed'
import { WordInput } from './components/WordInput'
import { useAuth } from './hooks/useAuth'
import { useDefinitionRetry } from './hooks/useDefinitionRetry'
import { useLists } from './hooks/useLists'
import { useSearch } from './hooks/useSearch'
import { useSync } from './hooks/useSync'
import { useWordCollection } from './hooks/useWordCollection'
import { wordStore } from './db'

export function App() {
  const {
    filteredWords,
    addWord,
    toggleExpanded,
    expandedIds,
    isLoading,
    refreshWords,
    filterByListId,
    setFilterByListId,
    searchQuery,
    setSearchQuery,
  } = useWordCollection()
  const { isAuthenticated, user, signIn, signOut } = useAuth()
  const {
    lists,
    createList,
    assignWordToList,
    removeWordFromList,
    getListsForWord,
  } = useLists()
  const {
    isSearchActive,
    activateSearch,
    deactivateSearch,
    debouncedQuery,
  } = useSearch()

  const [listPickerWordId, setListPickerWordId] = useState<string | null>(null)
  const [showListSelector, setShowListSelector] = useState(false)

  useDefinitionRetry(refreshWords)
  useSync(isAuthenticated, refreshWords)

  // Keep word collection search in sync with debounced query
  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [setSearchQuery])

  // Use debouncedQuery to drive the actual filtering
  // We update setSearchQuery on debouncedQuery changes
  useCallback(() => {
    setSearchQuery(debouncedQuery)
  }, [debouncedQuery, setSearchQuery])

  const handleSubmit = useCallback(async (text: string) => {
    await addWord(text)
  }, [addWord])

  const handleSearchDismiss = useCallback(() => {
    deactivateSearch()
    setSearchQuery('')
  }, [deactivateSearch, setSearchQuery])

  const handleAssignToList = useCallback((wordId: string) => {
    setListPickerWordId(wordId)
  }, [])

  const handleListPickerClose = useCallback(() => {
    setListPickerWordId(null)
    refreshWords()
  }, [refreshWords])

  // TopBar list button: show list selector to filter
  const handleListClick = useCallback(() => {
    setShowListSelector(true)
  }, [])

  const handleListSelectorClose = useCallback(() => {
    setShowListSelector(false)
  }, [])

  const handleSelectListFilter = useCallback((listId: string | null) => {
    setFilterByListId(listId)
    setShowListSelector(false)
  }, [setFilterByListId])

  const handleClearListFilter = useCallback(() => {
    setFilterByListId(null)
  }, [setFilterByListId])

  const handleExamplesGenerated = useCallback(async (wordId: string, examples: string[]) => {
    await wordStore.update(wordId, { examples })
    refreshWords()
  }, [refreshWords])

  const selectedList = lists.find(l => l.id === filterByListId) ?? null

  if (isLoading) {
    return null
  }

  return (
    <AppShell
      user={user}
      onSignIn={signIn}
      onSignOut={signOut}
      onSearchClick={activateSearch}
      onListClick={handleListClick}
    >
      <SearchOverlay
        isActive={isSearchActive}
        query={searchQuery}
        onQueryChange={handleSearchQueryChange}
        onDismiss={handleSearchDismiss}
      />
      <ListFilter list={selectedList} onClear={handleClearListFilter} />
      {!isSearchActive && <WordInput onSubmit={handleSubmit} />}
      {!isAuthenticated && !isSearchActive && <AuthTooltip />}
      <WordFeed
        words={filteredWords}
        expandedIds={expandedIds}
        onToggle={toggleExpanded}
        onAssignToList={handleAssignToList}
        onExamplesGenerated={handleExamplesGenerated}
      />

      {/* ListPicker for assigning a word to lists */}
      {listPickerWordId && (
        <ListPicker
          isOpen={!!listPickerWordId}
          onClose={handleListPickerClose}
          lists={lists}
          wordId={listPickerWordId}
          onCreateList={createList}
          onAssign={assignWordToList}
          onRemove={removeWordFromList}
          getListsForWord={getListsForWord}
        />
      )}

      {/* List selector for filtering (reuse ListPicker UI as a simple list) */}
      {showListSelector && (
        <ListPicker
          isOpen={showListSelector}
          onClose={handleListSelectorClose}
          lists={lists}
          wordId=""
          onCreateList={createList}
          onAssign={async (_wordId, listId) => handleSelectListFilter(listId)}
          onRemove={async () => handleSelectListFilter(null)}
          getListsForWord={async () => filterByListId ? [filterByListId] : []}
        />
      )}
    </AppShell>
  )
}
