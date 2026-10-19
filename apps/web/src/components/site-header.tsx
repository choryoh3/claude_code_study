import { Terminal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { PaletteTrigger } from './command-palette';
import { DesktopNav } from './site-nav';
import { ThemeToggle } from './theme-toggle';
import styles from './site-header.module.css';

export function SiteHeader() {
  const t = useTranslations('header');
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label={t('home')}>
          <span className={styles.logo} aria-hidden="true">
            <Terminal size={18} strokeWidth={2.5} />
          </span>
          <span className={styles.brandText}>{t('brand')}</span>
        </Link>
        <DesktopNav />
        <PaletteTrigger />
        <ThemeToggle />
      </div>
    </header>
  );
}
