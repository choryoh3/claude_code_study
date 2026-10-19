'use client';

import type { LessonSummary } from '@claude-study/schemas';
import { Check, Circle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { lessonHref } from '@/lib/lesson-href';
import type { LevelGroup } from '@/lib/lessons';
import { countCompleted, pickNextLesson, statusOf } from '@/lib/progress-logic';
import { useIsClient, useProgress } from '@/lib/progress-store';
import styles from './roadmap-view.module.css';

export function RoadmapView({ groups }: { groups: LevelGroup[] }) {
  const t = useTranslations('roadmap');
  const tLevels = useTranslations('levels');
  const tCommon = useTranslations('common');
  const progress = useProgress();
  // localStorage を読むまでは進捗に依存する表示（次はここ・状態）を出さず、誤った情報が一瞬見えるのを避ける
  const ready = useIsClient();
  const all: LessonSummary[] = groups.flatMap((g) => g.lessons);
  const next = ready ? pickNextLesson(progress, all) : undefined;

  return (
    <div className={styles.tree} data-ready={ready || undefined}>
      {groups.map((group) => {
        const done = countCompleted(progress, group.lessons);
        return (
          <section
            key={group.level}
            className={styles.level}
            data-level={group.level}
            aria-labelledby={`level-${group.level}`}
          >
            <header className={styles.levelHead}>
              <span className="level-chip" data-level={group.level}>
                {tLevels(`${group.level}.name`)}
              </span>
              <h2 id={`level-${group.level}`}>{tLevels(`${group.level}.tagline`)}</h2>
              <p className={styles.count}>
                {group.lessons.length > 0
                  ? t('count', { done, total: group.lessons.length })
                  : tCommon('comingSoon')}
              </p>
            </header>

            <ol className={styles.nodes}>
              {group.lessons.map((lesson) => {
                const status = statusOf(progress, lesson.slug);
                const isNext = next?.slug === lesson.slug;
                return (
                  <li key={lesson.slug} className={styles.node} data-status={status}>
                    <span className={styles.dot} aria-hidden="true">
                      {status === 'completed' && <Check size={14} strokeWidth={3} />}
                      {status === 'in_progress' && (
                        <Circle size={8} fill="currentColor" strokeWidth={0} />
                      )}
                    </span>
                    <Link
                      href={lessonHref(lesson.level, lesson.slug)}
                      className={styles.card}
                      data-next={isNext || undefined}
                    >
                      <span className={styles.order}>{String(lesson.order).padStart(2, '0')}</span>
                      <span className={styles.body}>
                        <span className={styles.title}>{lesson.title}</span>
                        <span className={styles.summary}>{lesson.summary}</span>
                      </span>
                      <span className={styles.state}>
                        {isNext && <span className={styles.nextTag}>{t('next')}</span>}
                        <span className={styles.statusText}>{t(`status.${status}`)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}

              {group.planned.map((topic) => (
                <li key={topic.slug} className={styles.node} data-status="planned">
                  <span className={styles.dot} aria-hidden="true" />
                  <Link href={lessonHref(group.level, topic.slug)} className={styles.planned}>
                    <span className={styles.title}>{topic.title}</span>
                    <span className={styles.soon}>{tCommon('comingSoon')}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
