import styles from './IntroCard.module.css'

export function IntroCard() {
  return (
    <div className={styles.card}>
      <p className={styles.heading}>Start by typing a word you like</p>
      <p className={styles.body}>
        Enter words above to save them with their definitions.
        Organise them into lists and share your collections with friends.
      </p>
    </div>
  )
}
