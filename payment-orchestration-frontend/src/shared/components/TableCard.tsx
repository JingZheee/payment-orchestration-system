import type { ReactNode } from 'react';
import styles from './TableCard.module.css';

interface TableCardProps {
  children: ReactNode;
  className?: string;
}

export default function TableCard({ children, className }: TableCardProps) {
  return (
    <div className={className ? `${styles.card} ${className}` : styles.card}>
      {children}
    </div>
  );
}
