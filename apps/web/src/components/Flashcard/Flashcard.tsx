import type { DictionaryMeaning } from '@words/shared'
import { motion, useAnimationControls, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useCallback, useEffect, useRef } from 'react'
import styles from './Flashcard.module.css'

interface FlashcardProps {
  text: string
  meanings: DictionaryMeaning[]
  pronunciation?: string
  flipped: boolean
  showHint?: boolean
  swipeEnabled?: boolean
  onFlip: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

const JIGGLE_DELAY_MS = 7000
const SWIPE_THRESHOLD = 70
const SWIPE_VELOCITY = 350

export function Flashcard({ text, meanings, pronunciation, flipped, showHint = true, swipeEnabled = true, onFlip, onSwipeLeft, onSwipeRight }: FlashcardProps) {
  const prefersReducedMotion = useReducedMotion()
  const controls = useAnimationControls()
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-220, 0, 220], [0.3, 1, 0.3])
  const wasDragging = useRef(false)

  useEffect(() => {
    controls.start({ rotateY: flipped ? 180 : 0, transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] } })
  }, [flipped, controls, prefersReducedMotion])

  // While face-down, nudge the card back-and-forth after a quiet stretch to hint
  // it can be flipped. Skips when already flipped or reduced motion is on.
  useEffect(() => {
    if (flipped || prefersReducedMotion)
      return
    const timer = window.setTimeout(() => {
      controls.start({ rotateY: [0, -22, 18, -10, 0], transition: { duration: 0.9, ease: 'easeInOut' } })
    }, JIGGLE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [flipped, prefersReducedMotion, controls])

  const handleClick = useCallback(() => {
    if (wasDragging.current)
      return
    onFlip()
  }, [onFlip])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onFlip()
      }
    },
    [onFlip],
  )

  return (
    <div className={styles.scene}>
      <motion.div
        className={styles.dragLayer}
        style={{ x, opacity, touchAction: flipped ? 'pan-y' : 'none' }}
        drag={swipeEnabled ? 'x' : false}
        dragSnapToOrigin
        dragElastic={0.7}
        dragMomentum={false}
        onDragStart={() => { wasDragging.current = true }}
        onDragEnd={(_, info) => {
          requestAnimationFrame(() => {
            wasDragging.current = false
          })
          if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY)
            onSwipeLeft?.()
          else if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY)
            onSwipeRight?.()
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={flipped ? `Definition of ${text}` : `Tap to reveal definition of ${text}`}
      >
        <motion.div className={styles.card} animate={controls}>
          <div className={`${styles.face} ${styles.front}`}>
            <h2 className={styles.word}>{text.toLowerCase()}</h2>
            {pronunciation && <span className={styles.pronunciation}>{pronunciation}</span>}
            {showHint && <span className={styles.tapHint}>tap to flip</span>}
          </div>
          <div className={`${styles.face} ${styles.back}`}>
            <div className={styles.backInner}>
              {meanings.map((meaning, i) => (
                <div key={`${meaning.partOfSpeech}-${i}`} className={styles.meaning}>
                  <span className={styles.pos}>{meaning.partOfSpeech}</span>
                  <ol className={styles.definitions}>
                    {meaning.definitions.map((def, j) => (
                      <li key={j} className={styles.definition}>
                        {def.definition}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
