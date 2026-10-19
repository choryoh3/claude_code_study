'use client';

import type { GradeResult } from '@claude-study/schemas';
import { Check, PartyPopper, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import {
  buildGradeRequest,
  toDisplayQuestions,
  unansweredCount,
  type DisplayQuestion,
} from '@/lib/quiz-logic';
import { recordQuizResult, useProgress } from '@/lib/progress-store';
import styles from './quiz-panel.module.css';

type Phase = 'idle' | 'loading' | 'answering' | 'grading' | 'result' | 'error';

/** エラーは文言ではなく「種類」で持ち、表示のときに辞書から引く（言語を切り替えても対応できる） */
type ErrorKey = 'notFound' | 'rateLimited' | 'loadFailed' | 'gradeFailed' | 'network';

const STATUS_ERRORS: Record<number, ErrorKey> = { 404: 'notFound', 429: 'rateLimited' };

export function QuizPanel({ slug }: { slug: string }) {
  const t = useTranslations('quiz');
  const best = useProgress().quiz[slug];
  const [phase, setPhase] = useState<Phase>('idle');
  const [questions, setQuestions] = useState<DisplayQuestion[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  // 採点結果が出たら、見出しにフォーカスを移して、スクリーンリーダーにも結果を伝える
  useEffect(() => {
    if (phase === 'result') resultRef.current?.focus();
  }, [phase]);

  async function start() {
    setPhase('loading');
    setErrorKey(null);
    try {
      const res = await api.api.quiz[':slug'].$get({ param: { slug } });
      if (res.status !== 200) {
        setErrorKey(STATUS_ERRORS[res.status] ?? 'loadFailed');
        setPhase('error');
        return;
      }
      // 選択肢は試行のたびにシャッフルする（正解の位置から答えを推測できないように）
      setQuestions(toDisplayQuestions(await res.json()));
      setSelected({});
      setResult(null);
      setPhase('answering');
    } catch {
      setErrorKey('network');
      setPhase('error');
    }
  }

  async function submit() {
    setPhase('grading');
    try {
      const res = await api.api.quiz[':slug'].grade.$post({
        param: { slug },
        json: buildGradeRequest(questions, selected),
      });
      if (res.status !== 200) {
        setErrorKey(STATUS_ERRORS[res.status] ?? 'gradeFailed');
        setPhase('error');
        return;
      }
      const graded = await res.json();
      setResult(graded);
      recordQuizResult(slug, graded.score, graded.total);
      setPhase('result');
    } catch {
      setErrorKey('network');
      setPhase('error');
    }
  }

  const remaining = unansweredCount(questions, selected);
  const busy = phase === 'loading' || phase === 'grading';

  return (
    <section className={styles.panel} aria-labelledby="quiz" id="quiz-section">
      <header className={styles.head}>
        <h2 id="quiz">{t('title')}</h2>
        {best && (
          <p className={styles.best}>
            {t.rich('best', {
              score: best.score,
              total: best.total,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        )}
      </header>

      {(phase === 'idle' || phase === 'error') && (
        <div className={styles.intro}>
          <p>{t('intro')}</p>
          {phase === 'error' && errorKey && (
            <p className={styles.error} role="alert">
              {t(`errors.${errorKey}`)}
            </p>
          )}
          <button type="button" className="btn btn-primary" onClick={start}>
            {phase === 'error' ? t('retryAfterError') : best ? t('retry') : t('start')}
          </button>
        </div>
      )}

      {busy && phase === 'loading' && <p role="status">{t('loading')}</p>}

      {(phase === 'answering' || phase === 'grading') && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (remaining === 0) void submit();
          }}
        >
          <ol className={styles.questions}>
            {questions.map((q, qi) => (
              <li key={q.id}>
                <fieldset className={styles.question} disabled={phase === 'grading'}>
                  <legend>
                    <span className={styles.qno}>Q{qi + 1}</span>
                    {q.prompt}
                  </legend>
                  <div className={styles.choices}>
                    {q.choices.map((c, ci) => (
                      <label key={c.original} className={styles.choice}>
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={ci}
                          checked={selected[q.id] === ci}
                          onChange={() => setSelected((s) => ({ ...s, [q.id]: ci }))}
                        />
                        <span>{c.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>
          <div className={styles.actions}>
            <button type="submit" className="btn btn-primary" disabled={remaining > 0 || busy}>
              {phase === 'grading' ? t('grading') : t('grade')}
            </button>
            {remaining > 0 && <p className={styles.hint}>{t('remaining', { count: remaining })}</p>}
          </div>
        </form>
      )}

      {phase === 'result' && result && (
        <div className={styles.result}>
          <h3 ref={resultRef} tabIndex={-1} className={styles.score}>
            {result.score === result.total && (
              <PartyPopper size={24} aria-hidden="true" className={styles.party} />
            )}
            {result.score === result.total
              ? t('perfect')
              : t('score', { total: result.total, score: result.score })}
          </h3>
          <ol className={styles.questions}>
            {questions.map((q, qi) => {
              const r = result.results.find((x) => x.questionId === q.id);
              if (!r) return null;
              const correctLabel = q.choices.find((c) => c.original === r.correctIndex)?.label;
              const chosen = selected[q.id] === undefined ? undefined : q.choices[selected[q.id]!];
              return (
                <li key={q.id} className={styles.review} data-correct={r.correct}>
                  <p className={styles.reviewHead}>
                    <span className={styles.mark} aria-hidden="true">
                      {r.correct ? (
                        <Check size={18} strokeWidth={3} />
                      ) : (
                        <X size={18} strokeWidth={3} />
                      )}
                    </span>
                    <span className="sr-only">{r.correct ? t('correctSr') : t('incorrectSr')}</span>
                    <span className={styles.qno}>Q{qi + 1}</span>
                    {q.prompt}
                  </p>
                  {!r.correct && chosen && (
                    <p className={styles.yours}>{t('yourAnswer', { answer: chosen.label })}</p>
                  )}
                  <p className={styles.correct}>
                    {t('correctAnswer', { answer: correctLabel ?? '' })}
                  </p>
                  <p className={styles.explain}>{r.explanation}</p>
                </li>
              );
            })}
          </ol>
          <button type="button" className="btn btn-ghost" onClick={start}>
            {t('retry')}
          </button>
        </div>
      )}
    </section>
  );
}
