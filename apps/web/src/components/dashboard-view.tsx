'use client';

import { BADGE_DEFINITIONS, currentStreak } from '@claude-study/schemas';
import { Award, Flame, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { lessonHref } from '@/lib/lesson-href';
import type { LevelGroup } from '@/lib/lessons';
import { countCompleted, pickNextLesson, statusOf, toLocalDate } from '@/lib/progress-logic';
import { useIsClient, useProgress } from '@/lib/progress-store';
import { ProgressRing } from './progress-ring';
import styles from './dashboard-view.module.css';

export function DashboardView({ groups }: { groups: LevelGroup[] }) {
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
        <h1 className={styles.heading}>ダッシュボード</h1>
        <div className={styles.skeleton} role="status" aria-label="読み込み中" />
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className={styles.heading}>ダッシュボード</h1>

      <div className={styles.grid}>
        <section className={`${styles.card} ${styles.overview}`} aria-labelledby="overview-h">
          <ProgressRing value={done} max={lessons.length} label="全体の進捗" />
          <div>
            <h2 id="overview-h">全体の進捗</h2>
            <p className={styles.big}>
              {done}
              <span> / {lessons.length} レッスン完了</span>
            </p>
            <p className={styles.streak}>
              <Flame size={18} aria-hidden="true" className={styles.flame} />
              {streak > 0 ? `${streak}日連続で学習中` : '今日から連続記録をはじめましょう'}
            </p>
            <p className={styles.streak}>
              <Award size={18} aria-hidden="true" className={styles.flame} />
              <Link href="/badges">
                獲得バッジ {badgeCount} / {BADGE_DEFINITIONS.length}
              </Link>
            </p>
          </div>
        </section>

        <section className={`${styles.card} ${styles.next}`} aria-labelledby="next-h">
          <h2 id="next-h">次にやること</h2>
          {next ? (
            <>
              <span className="level-chip" data-level={next.level}>
                {groups.find((g) => g.level === next.level)?.name}
              </span>
              <p className={styles.nextTitle}>{next.title}</p>
              <p className={styles.nextSummary}>{next.summary}</p>
              <Link className="btn btn-primary" href={lessonHref(next.level, next.slug)}>
                {started ? '続きから学ぶ' : '最初のレッスンをはじめる'}
              </Link>
            </>
          ) : (
            <>
              <p className={styles.nextTitle}>
                <PartyPopper size={22} aria-hidden="true" className={styles.flame} />{' '}
                公開中のレッスンをすべて完了しました
              </p>
              <p className={styles.nextSummary}>
                新しいレッスンは順次追加されます。復習にはロードマップをご利用ください。
              </p>
              <Link className="btn btn-ghost" href="/roadmap">
                ロードマップを見る
              </Link>
            </>
          )}
        </section>

        <section className={`${styles.card} ${styles.levels}`} aria-labelledby="levels-h">
          <h2 id="levels-h">レベル別の進み具合</h2>
          <ul>
            {groups.map((g) => {
              const c = countCompleted(progress, g.lessons);
              const total = g.lessons.length;
              return (
                <li key={g.level} data-level={g.level}>
                  <div className={styles.levelRow}>
                    <span className="level-chip" data-level={g.level}>
                      {g.name}
                    </span>
                    <span className={styles.levelNum}>
                      {total > 0 ? `${c} / ${total}` : '準備中'}
                    </span>
                  </div>
                  <div
                    className={styles.bar}
                    role="progressbar"
                    aria-label={`${g.name}の進捗`}
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

      {!started && (
        <p className={styles.hint}>
          進捗はこのブラウザに保存されます。登録なしでそのまま続けられます。
        </p>
      )}
    </div>
  );
}
