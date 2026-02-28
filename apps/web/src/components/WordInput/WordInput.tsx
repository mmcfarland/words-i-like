import type { FormEvent } from 'react'
import { useCallback, useState } from 'react'
import { useScrollState } from '../AppShell'
import { SubmitIcon } from './SubmitIcon'
import styles from './WordInput.module.css'

interface WordInputProps {
  onSubmit: (word: string) => void
}

function validateWordInput(text: string): { valid: boolean, error?: string } {
  const trimmed = text.trim()
  if (!trimmed) {
    return { valid: false, error: 'Enter a word' }
  }
  const wordCount = trimmed.split(/\s+/).length
  if (wordCount > 3) {
    return { valid: false, error: 'Enter up to 3 words' }
  }
  return { valid: true }
}

// eslint-disable-next-line react-refresh/only-export-components
export { validateWordInput }

export function WordInput({ onSubmit }: WordInputProps) {
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const { isScrolled } = useScrollState()

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    const validation = validateWordInput(value)
    if (!validation.valid) {
      setError(validation.error)
      return
    }
    setError(undefined)
    setIsSubmitting(true)
    onSubmit(value.trim())
    setValue('')
    setTimeout(() => setIsSubmitting(false), 600)
  }, [value, onSubmit])

  return (
    <div className={`${styles.container} ${isScrolled ? styles.compact : styles.prominent}`}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error)
              setError(undefined)
          }}
          placeholder="What word caught your eye?"
          aria-label="Enter a word"
          autoComplete="off"
          spellCheck={false}
        />
        <SubmitIcon
          isSubmitting={isSubmitting}
          disabled={!value.trim()}
        />
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  )
}
