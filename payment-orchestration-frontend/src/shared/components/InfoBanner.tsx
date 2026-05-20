import type { ReactNode } from 'react';
import styles from './InfoBanner.module.css';

interface InfoBannerProps {
  icon?: string;
  children: ReactNode;
  variant?: 'amber' | 'subtle';
  className?: string;
}

export default function InfoBanner({ icon = 'info', children, variant = 'amber', className }: InfoBannerProps) {
  const isSubtle = variant === 'subtle';
  const baseClass = isSubtle ? styles.bannerSubtle : styles.banner;
  return (
    <div className={className ? `${baseClass} ${className}` : baseClass}>
      <span className={`material-symbols-outlined ${isSubtle ? styles.iconSubtle : styles.icon}`}>
        {icon}
      </span>
      <div className={isSubtle ? styles.contentSubtle : styles.content}>{children}</div>
    </div>
  );
}
