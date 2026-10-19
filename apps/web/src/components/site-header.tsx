import { Terminal } from 'lucide-react';
import Link from 'next/link';
import { PaletteTrigger } from './command-palette';
import { DesktopNav } from './site-nav';
import { ThemeToggle } from './theme-toggle';
import styles from './site-header.module.css';

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="Claude Code 学習ロードマップ ホーム">
          <span className={styles.logo} aria-hidden="true">
            <Terminal size={18} strokeWidth={2.5} />
          </span>
          <span className={styles.brandText}>Claude Code 学習</span>
        </Link>
        <DesktopNav />
        <PaletteTrigger />
        <ThemeToggle />
      </div>
    </header>
  );
}
