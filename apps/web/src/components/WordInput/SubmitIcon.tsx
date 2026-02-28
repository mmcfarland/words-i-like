import { AnimatePresence, motion } from 'framer-motion'
import styles from './SubmitIcon.module.css'

interface SubmitIconProps {
  isSubmitting: boolean
  disabled: boolean
}

export function SubmitIcon({ isSubmitting, disabled }: SubmitIconProps) {
  return (
    <button
      type="submit"
      className={`${styles.button} ${isSubmitting ? styles.submitted : ''}`}
      disabled={disabled}
      aria-label="Submit word"
    >
      <AnimatePresence mode="wait">
        {isSubmitting
          ? (
              <motion.svg
                key="check"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <motion.path
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.15, ease: [0.33, 1, 0.68, 1] }}
                />
              </motion.svg>
            )
          : (
              <motion.svg
                key="feather"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
                <line x1="16" y1="8" x2="2" y2="22" />
                <line x1="17.5" y1="15" x2="9" y2="15" />
              </motion.svg>
            )}
      </AnimatePresence>
    </button>
  )
}
