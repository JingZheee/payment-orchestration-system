import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?: string;
  message: string;
}

export default function EmptyState({ icon = 'inbox', message }: EmptyStateProps) {
  return (
    <div className={styles.root}>
      <span className={`material-symbols-outlined ${styles.icon}`}>{icon}</span>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
