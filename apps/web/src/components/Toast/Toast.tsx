import styles from './Toast.module.css'

interface ToastProps {
  message: string
  action?: { label: string, onClick: () => void }
  onDismiss: () => void
}

export function Toast({ message, action, onDismiss }: ToastProps) {
  return (
    <div className={styles.toast} role="status" onClick={onDismiss}>
      <span className={styles.message}>{message}</span>
      {action && (
        <button
          className={styles.action}
          onClick={(e) => {
            e.stopPropagation()
            action.onClick()
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
