import type { DictionaryMeaning } from '@words/shared'
import { animate, motion, useAnimationControls, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
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
const DIRECTION_LOCK_THRESHOLD = 8

interface GestureState {
  startX: number
  startY: number
  startTime: number
  mode: 'pending' | 'horizontal' | 'vertical'
}

export function Flashcard({ text, meanings, pronunciation, flipped, showHint = true, swipeEnabled = true, onFlip, onSwipeLeft, onSwipeRight }: FlashcardProps) {
  const prefersReducedMotion = useReducedMotion()
  const controls = useAnimationControls()
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-220, 0, 220], [0.3, 1, 0.3])
  const wasDragging = useRef(false)
  const gesture = useRef<GestureState | null>(null)
  const dragLayerRef = useRef<HTMLDivElement>(null)

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

  const finishGesture = useCallback((clientX: number) => {
    const current = gesture.current
    gesture.current = null
    if (!current || current.mode !== 'horizontal')
      return

    const dx = clientX - current.startX
    const elapsedSeconds = Math.max((performance.now() - current.startTime) / 1000, 0.001)
    const velocity = dx / elapsedSeconds
    animate(x, 0, { duration: 0.18, ease: 'easeOut' })
    requestAnimationFrame(() => {
      wasDragging.current = false
    })

    if (dx < -SWIPE_THRESHOLD || velocity < -SWIPE_VELOCITY)
      onSwipeLeft?.()
    else if (dx > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY)
      onSwipeRight?.()
  }, [onSwipeLeft, onSwipeRight, x])

  const updateGesture = useCallback((clientX: number, clientY: number, preventDefault: () => void) => {
    const current = gesture.current
    if (!current)
      return

    const dx = clientX - current.startX
    const dy = clientY - current.startY
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)

    if (current.mode === 'pending' && Math.max(absX, absY) > DIRECTION_LOCK_THRESHOLD)
      current.mode = absX > absY * 1.2 ? 'horizontal' : 'vertical'

    if (current.mode !== 'horizontal')
      return

    preventDefault()
    wasDragging.current = true
    x.set(dx)
  }, [x])

  const startGesture = useCallback((clientX: number, clientY: number) => {
    if (!swipeEnabled || prefersReducedMotion)
      return
    gesture.current = {
      startX: clientX,
      startY: clientY,
      startTime: performance.now(),
      mode: 'pending',
    }
  }, [prefersReducedMotion, swipeEnabled])

  useEffect(() => {
    const node = dragLayerRef.current
    if (!node)
      return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (touch)
        startGesture(touch.clientX, touch.clientY)
    }
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (touch)
        updateGesture(touch.clientX, touch.clientY, () => e.cancelable && e.preventDefault())
    }
    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0]
      if (touch)
        finishGesture(touch.clientX)
    }
    const handleTouchCancel = () => {
      gesture.current = null
      animate(x, 0, { duration: 0.18, ease: 'easeOut' })
    }

    node.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true })
    node.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false })
    node.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true })
    node.addEventListener('touchcancel', handleTouchCancel, { capture: true, passive: true })
    return () => {
      node.removeEventListener('touchstart', handleTouchStart, { capture: true })
      node.removeEventListener('touchmove', handleTouchMove, { capture: true })
      node.removeEventListener('touchend', handleTouchEnd, { capture: true })
      node.removeEventListener('touchcancel', handleTouchCancel, { capture: true })
    }
  }, [finishGesture, startGesture, updateGesture, x])

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
        ref={dragLayerRef}
        className={styles.dragLayer}
        style={{ x, opacity, touchAction: flipped ? 'pan-y' : 'none' }}
        onPointerDownCapture={(e) => {
          if (e.pointerType !== 'touch')
            startGesture(e.clientX, e.clientY)
        }}
        onPointerMoveCapture={(e) => {
          if (e.pointerType !== 'touch')
            updateGesture(e.clientX, e.clientY, () => e.preventDefault())
        }}
        onPointerUpCapture={(e) => {
          if (e.pointerType !== 'touch')
            finishGesture(e.clientX)
        }}
        onPointerCancelCapture={(e) => {
          if (e.pointerType !== 'touch') {
            gesture.current = null
            animate(x, 0, { duration: 0.18, ease: 'easeOut' })
          }
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
