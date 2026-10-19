'use client';

import {
  Award,
  BookText,
  LayoutDashboard,
  ListChecks,
  Map as MapIcon,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './site-nav.module.css';

export const NAV_ITEMS: ReadonlyArray<{ href: string; label: string; Icon: LucideIcon }> = [
  { href: '/roadmap', label: 'ロードマップ', Icon: MapIcon },
  { href: '/dashboard', label: 'ダッシュボード', Icon: LayoutDashboard },
  { href: '/cheatsheet', label: 'チートシート', Icon: ListChecks },
  { href: '/glossary', label: '用語集', Icon: BookText },
  { href: '/badges', label: 'バッジ', Icon: Award },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** 広い画面のヘッダーに並べるナビゲーション */
export function DesktopNav() {
  const isActive = useActive();
  return (
    <nav aria-label="メイン" className={styles.desktop}>
      {NAV_ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={styles.link}
          aria-current={isActive(href) ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** 狭い画面では、親指で届く画面下部のタブバーにする */
export function MobileTabBar() {
  const isActive = useActive();
  return (
    <nav aria-label="メイン（下部）" className={styles.tabbar}>
      {NAV_ITEMS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={styles.tab}
          aria-current={isActive(href) ? 'page' : undefined}
        >
          <Icon size={22} strokeWidth={2} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
