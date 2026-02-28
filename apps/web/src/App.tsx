import { useCallback, useState } from 'react'
import { AppShell } from './components/AppShell'
import { WordInput } from './components/WordInput'

export function App() {
  const [words, setWords] = useState<string[]>([])

  const handleSubmit = useCallback((word: string) => {
    setWords(prev => [word, ...prev])
  }, [])

  return (
    <AppShell>
      <WordInput onSubmit={handleSubmit} />
      <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', padding: 'var(--space-4)' }}>
        {words.map((word, i) => (
          <p key={`${word}-${i}`} style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)' }}>
            {word}
          </p>
        ))}
      </div>
    </AppShell>
  )
}
