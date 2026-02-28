import { useCallback } from 'react'
import { AppShell } from './components/AppShell'
import { AuthTooltip } from './components/Tooltip'
import { WordFeed } from './components/WordFeed'
import { WordInput } from './components/WordInput'
import { useAuth } from './hooks/useAuth'
import { useDefinitionRetry } from './hooks/useDefinitionRetry'
import { useSync } from './hooks/useSync'
import { useWordCollection } from './hooks/useWordCollection'

export function App() {
  const { words, addWord, toggleExpanded, expandedIds, isLoading, refreshWords } = useWordCollection()
  const { isAuthenticated, user, signIn, signOut } = useAuth()

  useDefinitionRetry(refreshWords)
  useSync(isAuthenticated, refreshWords)

  const handleSubmit = useCallback(async (text: string) => {
    await addWord(text)
  }, [addWord])

  if (isLoading) {
    return null
  }

  return (
    <AppShell user={user} onSignIn={signIn} onSignOut={signOut}>
      <WordInput onSubmit={handleSubmit} />
      {!isAuthenticated && <AuthTooltip />}
      <WordFeed words={words} expandedIds={expandedIds} onToggle={toggleExpanded} />
    </AppShell>
  )
}
