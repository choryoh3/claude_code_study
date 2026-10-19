'use client';

import type { LessonSummary } from '@claude-study/schemas';
import Link from 'next/link';
import { lessonHref } from '@/lib/lesson-href';
import type { LevelGroup } from '@/lib/lessons';
import { countCompleted, pickNextLesson, statusOf } from '@/lib/progress-logic';
import { useIsClient, useProgress } from '@/lib/progress-store';
import styles from './roadmap-view.module.css';

const STATUS_LABEL = {
  completed: '完了',
  in_progress: '学習中',
  not_started: '未着手',
} as const;

const STATUS_MARK = { completed: '✓', in_progress: '●', not_started: '' } as const;

export function RoadmapView({ groups }: { groups: LevelGroup[] }) {
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
                {group.name}
              </span>
              <h2 id={`level-${group.level}`}>{group.tagline}</h2>
              <p className={styles.count}>
                {group.lessons.length > 0 ? `${done} / ${group.lessons.length} 完了` : '準備中'}
              </p>
            </header>

            <ol className={styles.nodes}>
              {group.lessons.map((lesson) => {
                const status = statusOf(progress, lesson.slug);
                const isNext = next?.slug === lesson.slug;
                return (
                  <li key={lesson.slug} className={styles.node} data-status={status}>
                    <span className={styles.dot} aria-hidden="true">
                      {STATUS_MARK[status]}
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
                        {isNext && <span className={styles.nextTag}>次はここ</span>}
                        <span className={styles.statusText}>{STATUS_LABEL[status]}</span>
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
                    <span className={styles.soon}>準備中</span>
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
