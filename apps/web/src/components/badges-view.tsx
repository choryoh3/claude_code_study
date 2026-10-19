'use client';

import { BADGE_DEFINITIONS } from '@claude-study/schemas';
import { Lock } from 'lucide-react';
import { BADGE_HINTS, BADGE_ICONS } from '@/lib/badge-meta';
import { useIsClient, useProgress } from '@/lib/progress-store';
import styles from './badges-view.module.css';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function BadgesView() {
  const progress = useProgress();
  const ready = useIsClient();
  const earnedCount = BADGE_DEFINITIONS.filter((b) => progress.badges[b.key]).length;

  return (
    <div className="container">
      <header className={styles.head}>
        <h1>バッジ</h1>
        <p>
          学習の節目で獲得できます。
          {ready && (
            <>
              {' '}
              獲得済み: <strong>{earnedCount}</strong> / {BADGE_DEFINITIONS.length}
            </>
          )}
        </p>
      </header>

      <ul className={styles.grid}>
        {BADGE_DEFINITIONS.map((badge) => {
          const earnedAt = ready ? progress.badges[badge.key] : undefined;
          const Icon = BADGE_ICONS[badge.key];
          return (
            <li key={badge.key} className={styles.card} data-earned={earnedAt ? true : undefined}>
              <span className={styles.icon} aria-hidden="true">
                {earnedAt ? <Icon size={30} strokeWidth={2} /> : <Lock size={26} strokeWidth={2} />}
              </span>
              <h2>{badge.title}</h2>
              <p className={styles.desc}>{badge.description}</p>
              {earnedAt ? (
                <p className={styles.status}>
                  <span className="sr-only">獲得済み：</span>
                  {formatDate(earnedAt)} に獲得
                </p>
              ) : (
                <p className={styles.hint}>
                  <span className="sr-only">未獲得：</span>
                  {BADGE_HINTS[badge.key]}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
