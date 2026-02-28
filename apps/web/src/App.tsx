import { useCallback } from 'react'
import { AppShell } from './components/AppShell'
import { WordFeed } from './components/WordFeed'
import { WordInput } from './components/WordInput'
import { useDefinitionRetry } from './hooks/useDefinitionRetry'
import { useWordCollection } from './hooks/useWordCollection'

export function App() {
  const { words, addWord, toggleExpanded, expandedIds, isLoading, refreshWords } = useWordCollection()

  useDefinitionRetry(refreshWords)

  const handleSubmit = useCallback(async (text: string) => {
    await addWord(text)
  }, [addWord])

  if (isLoading) {
    return null
  }

  return (
    <AppShell>
      <WordInput onSubmit={handleSubmit} />
      <WordFeed words={words} expandedIds={expandedIds} onToggle={toggleExpanded} />
    </AppShell>
  )
}
