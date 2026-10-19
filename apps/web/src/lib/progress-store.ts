'use client';

import type { ProgressStatus } from '@claude-study/schemas';
import { useSyncExternalStore } from 'react';
import {
  EMPTY_PROGRESS,
  parseStoredProgress,
  withStatus,
  type GuestProgress,
} from './progress-logic';

const KEY = 'claude-study:progress:v1';
const listeners = new Set<() => void>();

// useSyncExternalStore は同じ内容なら同じ参照を返す必要がある。生文字列が同じ間は結果を再利用する。
let cachedRaw: string | null | undefined;
let cachedValue: GuestProgress = EMPTY_PROGRESS;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null; // プライベートモード等で使えない場合はメモリ上の空状態として扱う
  }
}

function getSnapshot(): GuestProgress {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseStoredProgress(raw);
  }
  return cachedValue;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) listener();
  };
  window.addEventListener('storage', onStorage); // 他のタブでの更新
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function setLessonStatus(slug: string, status: ProgressStatus) {
  const next = withStatus(getSnapshot(), slug, status, new Date());
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return; // 保存できない環境では何もしない（学習自体は続けられる）
  }
  for (const l of listeners) l();
}

/** ゲストの学習状態。サーバー描画時は空の状態を返し、クライアントで実際の値に切り替わる。 */
export function useProgress(): GuestProgress {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_PROGRESS);
}

const noopSubscribe = () => () => {};

/** ハイドレーション完了後は true。localStorage 由来の表示で、空の状態が一瞬出るのを避けるために使う。 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
