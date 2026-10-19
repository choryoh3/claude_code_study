'use client';

import { BADGE_DEFINITIONS, currentStreak } from '@claude-study/schemas';
import { Award, Flame, PartyPopper } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { lessonHref } from '@/lib/lesson-href';
import type { LevelGroup } from '@/lib/lessons';
import { countCompleted, pickNextLesson, statusOf, toLocalDate } from '@/lib/progress-logic';
import { useIsClient, useProgress } from '@/lib/progress-store';
import { ProgressRing } from './progress-ring';
import styles from './dashboard-view.module.css';

export function DashboardView({ groups }: { groups: LevelGroup[] }) {
  const t = useTranslations('dashboard');
  const tLevels = useTranslations('levels');
  const tCommon = useTranslations('common');
  const progress = useProgress();
  const ready = useIsClient();
  const lessons = groups.flatMap((g) => g.lessons);
  const done = countCompleted(progress, lessons);
  const next = pickNextLesson(progress, lessons);
  const streak = currentStreak(progress.studyDays, toLocalDate(new Date()));
  const badgeCount = BADGE_DEFINITIONS.filter((b) => progress.badges[b.key]).length;
  const started = lessons.some((l) => statusOf(progress, l.slug) !== 'not_started');

  // localStorage を読むまでは骨組みだけ表示し、「0%」が一瞬見えるのを避ける
  if (!ready) {
    return (
      <div className="container">
        <h1 className={styles.heading}>{t('heading')}</h1>
        <div className={styles.skeleton} role="status" aria-label={tCommon('loading')} />
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className={styles.heading}>{t('heading')}</h1>

      <div className={styles.grid}>
        <section className={`${styles.card} ${styles.overview}`} aria-labelledby="overview-h">
          <ProgressRing value={done} max={lessons.length} label={t('overview')} />
          <div>
            <h2 id="overview-h">{t('overview')}</h2>
            <p className={styles.big}>
              {t.rich('completed', {
                done,
                total: lessons.length,
                big: (chunks) => <>{chunks}</>,
                small: (chunks) => <span>{chunks}</span>,
              })}
            </p>
            <p className={styles.streak}>
              <Flame size={18} aria-hidden="true" className={styles.flame} />
              {streak > 0 ? t('streak', { count: streak }) : t('streakNone')}
            </p>
            <p className={styles.streak}>
              <Award size={18} aria-hidden="true" className={styles.flame} />
              <Link href="/badges">
                {t('badges', { count: badgeCount, total: BADGE_DEFINITIONS.length })}
              </Link>
            </p>
          </div>
        </section>

        <section className={`${styles.card} ${styles.next}`} aria-labelledby="next-h">
          <h2 id="next-h">{t('next')}</h2>
          {next ? (
            <>
              <span className="level-chip" data-level={next.level}>
                {tLevels(`${next.level}.name`)}
              </span>
              <p className={styles.nextTitle}>{next.title}</p>
              <p className={styles.nextSummary}>{next.summary}</p>
              <Link className="btn btn-primary" href={lessonHref(next.level, next.slug)}>
                {started ? t('continue') : t('start')}
              </Link>
            </>
          ) : (
            <>
              <p className={styles.nextTitle}>
                <PartyPopper size={22} aria-hidden="true" className={styles.flame} /> {t('allDone')}
              </p>
              <p className={styles.nextSummary}>{t('allDoneNote')}</p>
              <Link className="btn btn-ghost" href="/roadmap">
                {t('roadmapLink')}
              </Link>
            </>
          )}
        </section>

        <section className={`${styles.card} ${styles.levels}`} aria-labelledby="levels-h">
          <h2 id="levels-h">{t('levels')}</h2>
          <ul>
            {groups.map((g) => {
              const c = countCompleted(progress, g.lessons);
              const total = g.lessons.length;
              return (
                <li key={g.level} data-level={g.level}>
                  <div className={styles.levelRow}>
                    <span className="level-chip" data-level={g.level}>
                      {tLevels(`${g.level}.name`)}
                    </span>
                    <span className={styles.levelNum}>
                      {total > 0 ? t('levelCount', { done: c, total }) : tCommon('comingSoon')}
                    </span>
                  </div>
                  <div
                    className={styles.bar}
                    role="progressbar"
                    aria-label={t('levelProgress', { level: tLevels(`${g.level}.name`) })}
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={c}
                  >
                    <span style={{ width: `${total > 0 ? (c / total) * 100 : 0}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {!started && <p className={styles.hint}>{t('hint')}</p>}
    </div>
  );
}
