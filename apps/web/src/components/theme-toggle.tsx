'use client';

import { useSyncExternalStore } from 'react';
import styles from './theme-toggle.module.css';

type Theme = 'system' | 'light' | 'dark';
const KEY = 'claude-study:theme';
const ORDER: Theme[] = ['system', 'light', 'dark'];
const LABEL: Record<Theme, string> = { system: '自動', light: 'ライト', dark: 'ダーク' };
const ICON: Record<Theme, string> = { system: '◐', light: '☀', dark: '☾' };

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
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'system' as Theme);
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length] ?? 'system';

  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => apply(next)}
      aria-label={`テーマを切り替える（現在: ${LABEL[theme]}、次: ${LABEL[next]}）`}
      title={`テーマ: ${LABEL[theme]}`}
    >
      <span aria-hidden="true" className={styles.icon}>
        {ICON[theme]}
      </span>
      <span className={styles.label}>{LABEL[theme]}</span>
    </button>
  );
}
