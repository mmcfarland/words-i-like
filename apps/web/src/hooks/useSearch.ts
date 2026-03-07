import { useCallback, useEffect, useRef, useState } from 'react'
import { analytics } from '../services/analytics'

export interface SearchResult {
  searchQuery: string
  isSearchActive: boolean
  setSearchQuery: (query: string) => void
  activateSearch: () => void
  deactivateSearch: () => void
  debouncedQuery: string
}

export function useSearch(): SearchResult {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current)
      clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 200)
    return () => {
      if (timerRef.current)
        clearTimeout(timerRef.current)
    }
  }, [searchQuery])

  const activateSearch = useCallback(() => {
    setIsSearchActive(true)
    analytics.searchUsed()
  }, [])

  const deactivateSearch = useCallback(() => {
    setIsSearchActive(false)
    setSearchQuery('')
    setDebouncedQuery('')
  }, [])

  return {
    searchQuery,
    isSearchActive,
    setSearchQuery,
    activateSearch,
    deactivateSearch,
    debouncedQuery,
  }
}
