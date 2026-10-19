'use client';

import { Moon, Sun, SunMoon, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import styles from './theme-toggle.module.css';

type Theme = 'system' | 'light' | 'dark';
const KEY = 'claude-study:theme';
const ORDER: Theme[] = ['system', 'light', 'dark'];
const ICON: Record<Theme, LucideIcon> = { system: SunMoon, light: Sun, dark: Moon };

const listeners = new Set<() => void>();

function readTheme(): Theme {
  try {
    const t = window.localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function apply(theme: Theme) {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    if (theme === 'system') window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, theme);
  } catch {
    // 保存できなくても、現在のページでは切り替わる
  }
  for (const l of listeners) l();
}

export function ThemeToggle() {
  const t = useTranslations('theme');
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'system' as Theme);
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length] ?? 'system';
  const Icon = ICON[theme];

  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => apply(next)}
      aria-label={t('toggle', { current: t(`modes.${theme}`), next: t(`modes.${next}`) })}
      title={t('title', { current: t(`modes.${theme}`) })}
    >
      <Icon size={18} aria-hidden="true" />
      <span className={styles.label}>{t(`modes.${theme}`)}</span>
    </button>
  );
}
