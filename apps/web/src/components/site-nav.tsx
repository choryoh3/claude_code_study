'use client';

import {
  Award,
  BookText,
  LayoutDashboard,
  ListChecks,
  Map as MapIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './site-nav.module.css';

/** ナビゲーションの項目。表示名は辞書（`nav.items.<key>`）から引く。 */
export const NAV_ITEMS: ReadonlyArray<{
  href: string;
  key: 'roadmap' | 'dashboard' | 'cheatsheet' | 'glossary' | 'badges';
  Icon: LucideIcon;
}> = [
  { href: '/roadmap', key: 'roadmap', Icon: MapIcon },
  { href: '/dashboard', key: 'dashboard', Icon: LayoutDashboard },
  { href: '/cheatsheet', key: 'cheatsheet', Icon: ListChecks },
  { href: '/glossary', key: 'glossary', Icon: BookText },
  { href: '/badges', key: 'badges', Icon: Award },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** 広い画面のヘッダーに並べるナビゲーション */
export function DesktopNav() {
  const t = useTranslations('nav');
  const isActive = useActive();
  return (
    <nav aria-label={t('main')} className={styles.desktop}>
      {NAV_ITEMS.map(({ href, key }) => (
        <Link
          key={href}
          href={href}
          className={styles.link}
          aria-current={isActive(href) ? 'page' : undefined}
        >
          {t(`items.${key}`)}
        </Link>
      ))}
    </nav>
  );
}

/** 狭い画面では、親指で届く画面下部のタブバーにする */
export function MobileTabBar() {
  const t = useTranslations('nav');
  const isActive = useActive();
  return (
    <nav aria-label={t('mainBottom')} className={styles.tabbar}>
      {NAV_ITEMS.map(({ href, key, Icon }) => (
        <Link
          key={href}
          href={href}
          className={styles.tab}
          aria-current={isActive(href) ? 'page' : undefined}
        >
          <Icon size={22} strokeWidth={2} aria-hidden="true" />
          <span>{t(`items.${key}`)}</span>
        </Link>
      ))}
    </nav>
  );
}
