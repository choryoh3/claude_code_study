'use client';

import type { BadgeKey, Level } from '@claude-study/schemas';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { BADGE_ICONS } from '@/lib/badge-meta';
import { missingBadges, toLocalDate } from '@/lib/progress-logic';
import { awardBadges, useProgress } from '@/lib/progress-store';
import styles from './badge-engine.module.css';

const SHOW_MS = 5200;

/**
 * 学習状態を見張り、条件を満たしたバッジを付与して、控えめに知らせる（画面の隅のトースト）。
 * レイアウトに1つだけ置く。付与済みのバッジは再判定されないので、二重に祝うことはない。
 */
export function BadgeEngine({
  lessons,
}: {
  lessons: ReadonlyArray<{ slug: string; level: Level }>;
}) {
  const t = useTranslations('badges');
  const tCommon = useTranslations('common');
  const progress = useProgress();
  const [queue, setQueue] = useState<BadgeKey[]>([]);

  useEffect(() => {
    const fresh = missingBadges(progress, lessons, toLocalDate(new Date()));
    if (fresh.length === 0) return;
    awardBadges(fresh);
    setQueue((q) => [...q, ...fresh]);
  }, [progress, lessons]);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), SHOW_MS);
    return () => clearTimeout(t);
  }, [current]);

  const Icon = current ? BADGE_ICONS[current] : undefined;
  return (
    <div className={styles.region} role="status" aria-live="polite" aria-atomic="true">
      {current && Icon && (
        <div key={current} className={styles.toast}>
          <span className={styles.icon} aria-hidden="true">
            <Icon size={24} strokeWidth={2} />
          </span>
          <span className={styles.text}>
            <strong>{t('toastTitle')}</strong>
            <span>
              {t('toastItem', {
                title: t(`items.${current}.title`),
                description: t(`items.${current}.description`),
              })}
            </span>
          </span>
          <button
            type="button"
            className={styles.close}
            aria-label={tCommon('close')}
            onClick={() => setQueue((q) => q.slice(1))}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
