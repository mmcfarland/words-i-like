import type { ListRecord } from './db'
import { useCallback, useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { IntroCard } from './components/IntroCard'
import { ListPicker } from './components/ListPicker'
import { ListSelector } from './components/ListSelector'
import { OfflineIndicator } from './components/OfflineIndicator'
import { SearchOverlay } from './components/SearchOverlay'
import { Toast } from './components/Toast'
import { AuthTooltip } from './components/Tooltip'
import { WordFeed } from './components/WordFeed'
import { WordInput } from './components/WordInput'
import { listStore, wordStore } from './db'
import { useAuth } from './hooks/useAuth'
import { useDefinitionRetry } from './hooks/useDefinitionRetry'
import { useLists } from './hooks/useLists'
import { useSearch } from './hooks/useSearch'
import { useSync } from './hooks/useSync'
import { authService } from './services/auth'
import { analytics } from './services/analytics'
import { useWordCollection } from './hooks/useWordCollection'

const AVATAR_POPOVER_SEEN_KEY = 'words-avatar-popover-seen'
const SWIPE_HINT_SEEN_KEY = 'words-swipe-hint-seen'
const AUTH_TOOLTIP_TEN_WORDS_DISMISSED_KEY = 'words-tooltip-dismissed-10-words'

interface AppProps {
  initialListId?: string | null
}

async function shareCurrentCollection(list: ListRecord | null): Promise<string | null> {
  try {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const allWords = await wordStore.getAll()
    const listId = list?.id ?? `all-words-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const listName = list?.name ?? 'All Words'
    const words = list
      ? (await listStore.getWordIdsForList(list.id))
          .map(id => allWords.find(word => word.id === id))
          .filter((word): word is NonNullable<typeof word> => Boolean(word))
          .map(word => ({
            text: word.text,
            definitions: word.definitions,
            pronunciation: word.pronunciation,
            definitionStatus: word.definitionStatus,
          }))
      : allWords.map(word => ({
          text: word.text,
          definitions: word.definitions,
          pronunciation: word.pronunciation,
          definitionStatus: word.definitionStatus,
        }))

    const response = await fetch(`${apiBase}/api/lists/${listId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
      body: JSON.stringify({
        listName,
        words,
      }),
    })
    if (!response.ok)
      return null
    const data = await response.json()
    return `${window.location.origin}/shared/${data.shareToken}`
  }
  catch {
    return null
  }
}

export function App({ initialListId = null }: AppProps) {
  const {
    words,
    filteredWords,
    addWord,
    deleteWord,
    correctWord,
    toggleExpanded,
    expandedIds,
    isLoading,
    refreshWords,
    localChangeVersion,
    filterByListId,
    setFilterByListId,
    searchQuery,
    setSearchQuery,
  } = useWordCollection()
  const { isAuthenticated, user, signIn, signOut } = useAuth()
  const {
    lists,
    createList,
    deleteList,
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
  const [wordListNames, setWordListNames] = useState<Record<string, string[]>>({})
  const [showAvatarPopover, setShowAvatarPopover] = useState(false)
  const [showSwipeHint, setShowSwipeHint] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [shareFailed, setShareFailed] = useState(false)
  const [deletingActiveList, setDeletingActiveList] = useState(false)
  const [toastState, setToastState] = useState<{ message: string, action?: { label: string, onClick: () => void }, timeoutId: number } | null>(null)
  const [hasAppliedListRoute, setHasAppliedListRoute] = useState(false)
  const showTenWordAuthTooltip = !isAuthenticated && !isSearchActive && words.length >= 10
  const selectedList = lists.find(l => l.id === filterByListId) ?? null
  const visibleWordCount = selectedList ? filteredWords.length : words.length
  const topBarListName = selectedList?.name ?? 'All Words'

  useDefinitionRetry(refreshWords)
  useSync(isAuthenticated, refreshWords, localChangeVersion)

  const showToast = useCallback((message: string, action?: { label: string, onClick: () => void }, duration = 5000) => {
    if (toastState)
      clearTimeout(toastState.timeoutId)
    const timeoutId = window.setTimeout(() => setToastState(null), duration)
    setToastState({ message, action, timeoutId })
  }, [toastState])

  const dismissToast = useCallback(() => {
    if (toastState)
      clearTimeout(toastState.timeoutId)
    setToastState(null)
  }, [toastState])

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
    const trimmedText = text.trim()
    if (!trimmedText)
      return
    const hadNoWords = words.length === 0
    const result = await addWord(trimmedText)

    if (!result.isDuplicate) {
      analytics.wordAdded(trimmedText)
      // Scroll to top so the new word is immediately visible
      document.querySelector('main')?.scrollTo?.({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    else {
      // Scroll to the existing word and show toast
      showToast(`"${trimmedText.toLowerCase()}" is already in your collection`)
      if (result.existingId) {
        const el = document.querySelector(`[data-word-id="${result.existingId}"]`)
        el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      }
    }

    if (selectedList) {
      const targetWord = await wordStore.findByText(trimmedText)
      if (targetWord) {
        await assignWordToList(targetWord.id, selectedList.id)
        await refreshWords()
      }
    }

    if (hadNoWords && !result.isDuplicate && localStorage.getItem(SWIPE_HINT_SEEN_KEY) !== 'true') {
      localStorage.setItem(SWIPE_HINT_SEEN_KEY, 'true')
      setShowSwipeHint(true)
    }
    if (!isAuthenticated && hadNoWords && !result.isDuplicate && localStorage.getItem(AVATAR_POPOVER_SEEN_KEY) !== 'true') {
      localStorage.setItem(AVATAR_POPOVER_SEEN_KEY, 'true')
      setShowAvatarPopover(true)
    }
  }, [addWord, assignWordToList, isAuthenticated, refreshWords, selectedList, words.length, showToast])

  const handleSearchDismiss = useCallback(() => {
    deactivateSearch()
    setSearchQuery('')
  }, [deactivateSearch, setSearchQuery])

  const handleDismissAvatarPopover = useCallback(() => {
    localStorage.setItem(AVATAR_POPOVER_SEEN_KEY, 'true')
    setShowAvatarPopover(false)
  }, [])

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

  const handleDeleteList = useCallback(async (listId: string, listName: string) => {
    const confirmed = window.confirm(`Delete "${listName}"? This only removes the list and keeps your words.`)
    if (!confirmed)
      return
    await deleteList(listId)
    analytics.listDeleted()
    if (filterByListId === listId)
      setFilterByListId(null)
  }, [deleteList, filterByListId, setFilterByListId])

  const handleExamplesGenerated = useCallback(async (wordId: string, examples: string[]) => {
    await wordStore.update(wordId, { examples })
    refreshWords()
  }, [refreshWords])

  const handleDeleteWord = useCallback(async (wordId: string) => {
    const wordToDelete = words.find(w => w.id === wordId)
    if (!wordToDelete)
      return

    await deleteWord(wordId)

    const savedWord = wordToDelete
    showToast(
      `"${savedWord.text}" deleted`,
      {
        label: 'Undo',
        onClick: () => {
          void (async () => {
            await wordStore.add(savedWord)
            refreshWords()
            dismissToast()
          })()
        },
      },
    )
  }, [words, deleteWord, showToast, dismissToast, refreshWords])

  useEffect(() => {
    if (hasAppliedListRoute)
      return
    if (initialListId)
      setFilterByListId(initialListId)
    setHasAppliedListRoute(true)
  }, [hasAppliedListRoute, initialListId, setFilterByListId])

  useEffect(() => {
    if (!hasAppliedListRoute)
      return
    const nextPath = filterByListId ? `/lists/${encodeURIComponent(filterByListId)}` : '/'
    const nextUrl = `${nextPath}${window.location.hash}`
    const currentUrl = `${window.location.pathname}${window.location.hash}`
    if (nextUrl !== currentUrl)
      window.history.replaceState({}, '', nextUrl)
  }, [filterByListId, hasAppliedListRoute])

  const handleShareFromTopBar = useCallback(async () => {
    if (sharing)
      return
    setShareFailed(false)
    setSharing(true)
    const url = await shareCurrentCollection(selectedList)
    setSharing(false)
    if (url) {
      analytics.listShared()
      try {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      }
      catch {
        setShareFailed(true)
        setTimeout(() => setShareFailed(false), 2500)
      }
      return
    }
    setShareFailed(true)
    setTimeout(() => setShareFailed(false), 2500)
  }, [selectedList, sharing])

  const handleShareWord = useCallback(async (wordId: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiBase}/api/words/${wordId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
      })
      if (!response.ok)
        return
      const data = await response.json()
      const url = `${window.location.origin}/shared/${data.shareToken}`
      analytics.wordShared()
      try {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      }
      catch {
        setShareFailed(true)
        setTimeout(() => setShareFailed(false), 2500)
      }
    }
    catch {
      setShareFailed(true)
      setTimeout(() => setShareFailed(false), 2500)
    }
  }, [])

  const handleDeleteFromTopBar = useCallback(async () => {
    if (!selectedList || deletingActiveList)
      return
    setDeletingActiveList(true)
    try {
      await handleDeleteList(selectedList.id, selectedList.name)
    }
    finally {
      setDeletingActiveList(false)
    }
  }, [selectedList, deletingActiveList, handleDeleteList])

  useEffect(() => {
    let cancelled = false
    const listNameById = new Map(lists.map(list => [list.id, list.name]))

    Promise.all(filteredWords.map(async (word) => {
      const ids = await getListsForWord(word.id)
      const names = ids
        .map(id => listNameById.get(id))
        .filter((name): name is string => Boolean(name))
      return [word.id, names] as const
    }))
      .then((entries) => {
        if (cancelled)
          return
        setWordListNames(Object.fromEntries(entries))
      })
      .catch(() => {
        if (!cancelled)
          setWordListNames({})
      })

    return () => {
      cancelled = true
    }
  }, [filteredWords, lists, getListsForWord])

  useEffect(() => {
    if (isAuthenticated)
      setShowAvatarPopover(false)
  }, [isAuthenticated])

  // Refresh word list when auth state changes (e.g. logout clears IndexedDB)
  useEffect(() => {
    refreshWords()
  }, [isAuthenticated, refreshWords])

  useEffect(() => {
    if (!showSwipeHint)
      return
    const timeout = window.setTimeout(() => setShowSwipeHint(false), 1400)
    return () => window.clearTimeout(timeout)
  }, [showSwipeHint])

  if (isLoading) {
    return null
  }

  return (
    <AppShell
      user={user}
      activeListName={topBarListName}
      activeListWordCount={visibleWordCount}
      onShareClick={topBarListName ? handleShareFromTopBar : undefined}
      onDeleteActiveList={selectedList ? () => { void handleDeleteFromTopBar() } : undefined}
      isSharing={sharing}
      isDeletingActiveList={deletingActiveList}
      shareCopied={shareCopied}
      shareFailed={shareFailed}
      onSignIn={signIn}
      onSignOut={signOut}
      onSearchClick={activateSearch}
      onListClick={handleListClick}
      avatarPopoverMessage={showAvatarPopover && !isAuthenticated ? 'Your words are only saved on this device. Log in to save them to your account.' : null}
      onDismissAvatarPopover={handleDismissAvatarPopover}
    >
      <OfflineIndicator />
      <SearchOverlay
        isActive={isSearchActive}
        query={searchQuery}
        onQueryChange={handleSearchQueryChange}
        onDismiss={handleSearchDismiss}
      />
      {!isSearchActive && <WordInput onSubmit={handleSubmit} />}
      {!isSearchActive && words.length === 0 && <IntroCard />}
      {showTenWordAuthTooltip && (
        <AuthTooltip
          onSignIn={signIn}
          dismissStorageKey={AUTH_TOOLTIP_TEN_WORDS_DISMISSED_KEY}
        />
      )}
      <WordFeed
        words={filteredWords}
        wordListNames={wordListNames}
        showSwipeHint={showSwipeHint}
        expandedIds={expandedIds}
        onToggle={toggleExpanded}
        onDelete={handleDeleteWord}
        onCorrectWord={correctWord}
        onAssignToList={handleAssignToList}
        onExamplesGenerated={handleExamplesGenerated}
        onShareWord={handleShareWord}
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

      {/* List selector for filtering feed */}
      {showListSelector && (
        <ListSelector
          isOpen={showListSelector}
          onClose={handleListSelectorClose}
          lists={lists}
          activeListId={filterByListId}
          onSelect={handleSelectListFilter}
          onDeleteList={handleDeleteList}
        />
      )}

      {toastState && (
        <Toast
          message={toastState.message}
          action={toastState.action}
          onDismiss={dismissToast}
        />
      )}
    </AppShell>
  )
}
