import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import styles from './site-header.module.css';

const NAV = [
  { href: '/roadmap', label: 'ロードマップ' },
  { href: '/dashboard', label: 'ダッシュボード' },
] as const;

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="Claude Code 学習ロードマップ ホーム">
          <span className={styles.logo} aria-hidden="true">
            &gt;_
          </span>
          <span className={styles.brandText}>Claude Code 学習</span>
        </Link>
        <nav aria-label="メイン" className={styles.nav}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
