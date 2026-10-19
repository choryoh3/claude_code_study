'use client';

import { BADGE_DEFINITIONS } from '@claude-study/schemas';
import { Lock } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { BADGE_ICONS } from '@/lib/badge-meta';
import { useIsClient, useProgress } from '@/lib/progress-store';
import styles from './badges-view.module.css';

export function BadgesView() {
  const t = useTranslations('badges');
  const format = useFormatter();
  const progress = useProgress();
  const ready = useIsClient();
  const earnedCount = BADGE_DEFINITIONS.filter((b) => progress.badges[b.key]).length;

  return (
    <div className="container">
      <header className={styles.head}>
        <h1>{t('heading')}</h1>
        <p>
          {t('intro')}
          {ready && (
            <>
              {' '}
              {t.rich('earnedCount', {
                count: earnedCount,
                total: BADGE_DEFINITIONS.length,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
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
              <h2>{t(`items.${badge.key}.title`)}</h2>
              <p className={styles.desc}>{t(`items.${badge.key}.description`)}</p>
              {earnedAt ? (
                <p className={styles.status}>
                  <span className="sr-only">{t('earnedSr')}</span>
                  {t('earnedOn', {
                    date: format.dateTime(new Date(earnedAt), { dateStyle: 'long' }),
                  })}
                </p>
              ) : (
                <p className={styles.hint}>
                  <span className="sr-only">{t('lockedSr')}</span>
                  {t(`items.${badge.key}.hint`)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
