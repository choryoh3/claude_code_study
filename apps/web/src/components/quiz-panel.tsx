'use client';

import type { GradeResult } from '@claude-study/schemas';
import { Check, PartyPopper, X } from 'lucide-react';
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

const ERROR_MESSAGES: Record<number, string> = {
  404: 'このレッスンのクイズが見つかりませんでした。',
  429: '短時間にリクエストが集中しました。少し待ってから、もう一度お試しください。',
};

export function QuizPanel({ slug }: { slug: string }) {
  const best = useProgress().quiz[slug];
  const [phase, setPhase] = useState<Phase>('idle');
  const [questions, setQuestions] = useState<DisplayQuestion[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState('');
  const resultRef = useRef<HTMLHeadingElement>(null);

  // 採点結果が出たら、見出しにフォーカスを移して、スクリーンリーダーにも結果を伝える
  useEffect(() => {
    if (phase === 'result') resultRef.current?.focus();
  }, [phase]);

  async function start() {
    setPhase('loading');
    setError('');
    try {
      const res = await api.api.quiz[':slug'].$get({ param: { slug } });
      if (res.status !== 200) {
        setError(ERROR_MESSAGES[res.status] ?? 'クイズを読み込めませんでした。');
        setPhase('error');
        return;
      }
      // 選択肢は試行のたびにシャッフルする（正解の位置から答えを推測できないように）
      setQuestions(toDisplayQuestions(await res.json()));
      setSelected({});
      setResult(null);
      setPhase('answering');
    } catch {
      setError('通信に失敗しました。接続を確認して、もう一度お試しください。');
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
        setError(ERROR_MESSAGES[res.status] ?? '採点できませんでした。もう一度お試しください。');
        setPhase('error');
        return;
      }
      const graded = await res.json();
      setResult(graded);
      recordQuizResult(slug, graded.score, graded.total);
      setPhase('result');
    } catch {
      setError('通信に失敗しました。接続を確認して、もう一度お試しください。');
      setPhase('error');
    }
  }

  const remaining = unansweredCount(questions, selected);
  const busy = phase === 'loading' || phase === 'grading';

  return (
    <section className={styles.panel} aria-labelledby="quiz" id="quiz-section">
      <header className={styles.head}>
        <h2 id="quiz">クイズ</h2>
        {best && (
          <p className={styles.best}>
            これまでの最高: <strong>{best.score}</strong> / {best.total}
          </p>
        )}
      </header>

      {(phase === 'idle' || phase === 'error') && (
        <div className={styles.intro}>
          <p>理解できたかを、数問のクイズで確かめましょう。選択肢は毎回、並びが変わります。</p>
          {phase === 'error' && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-primary" onClick={start}>
            {phase === 'error' ? 'もう一度試す' : best ? 'もう一度挑戦する' : 'クイズに挑戦する'}
          </button>
        </div>
      )}

      {busy && phase === 'loading' && <p role="status">読み込み中…</p>}

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
              {phase === 'grading' ? '採点中…' : '採点する'}
            </button>
            {remaining > 0 && <p className={styles.hint}>あと {remaining} 問、選んでください。</p>}
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
              ? '全問正解です！'
              : `${result.total}問中 ${result.score}問 正解`}
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
                    <span className="sr-only">{r.correct ? '正解' : '不正解'}：</span>
                    <span className={styles.qno}>Q{qi + 1}</span>
                    {q.prompt}
                  </p>
                  {!r.correct && chosen && (
                    <p className={styles.yours}>あなたの答え: {chosen.label}</p>
                  )}
                  <p className={styles.correct}>正解: {correctLabel}</p>
                  <p className={styles.explain}>{r.explanation}</p>
                </li>
              );
            })}
          </ol>
          <button type="button" className="btn btn-ghost" onClick={start}>
            もう一度挑戦する
          </button>
        </div>
      )}
    </section>
  );
}
