'use client';

import { Check } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { statusOf } from '@/lib/progress-logic';
import { setLessonStatus, useIsClient, useProgress } from '@/lib/progress-store';
import styles from './lesson-actions.module.css';

/** 開いただけで「学習中」にし、読み終えたら手動で「完了」にできる */
export function LessonActions({ slug }: { slug: string }) {
  const progress = useProgress();
  const ready = useIsClient();
  const status = statusOf(progress, slug);
  const marked = useRef(false);

  useEffect(() => {
    if (ready && !marked.current && status === 'not_started') {
      marked.current = true;
      setLessonStatus(slug, 'in_progress');
    }
  }, [ready, slug, status]);

  if (!ready) return <div className={styles.placeholder} aria-hidden="true" />;

  const done = status === 'completed';
  return (
    <div className={styles.wrap} data-done={done || undefined}>
      <button
        type="button"
        className={`btn ${done ? 'btn-ghost' : 'btn-primary'}`}
        aria-pressed={done}
        onClick={() => setLessonStatus(slug, done ? 'in_progress' : 'completed')}
      >
        {done ? (
          <>
            <Check size={18} aria-hidden="true" />
            完了済み（クリックで戻す）
          </>
        ) : (
          'このレッスンを完了にする'
        )}
      </button>
      <p className={styles.note} role="status" aria-live="polite">
        {done
          ? 'おつかれさまでした。次のレッスンへ進みましょう。'
          : '内容を試し終えたら、完了にしましょう。'}
      </p>
    </div>
  );
}
