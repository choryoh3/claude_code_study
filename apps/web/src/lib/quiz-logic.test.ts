import type { PublicQuizQuestion } from '@claude-study/schemas';
import { describe, expect, it } from 'vitest';
import {
  buildGradeRequest,
  shuffledOrder,
  toDisplayQuestions,
  unansweredCount,
} from './quiz-logic';

/** 先頭から順に決まった値を返す乱数（テスト用） */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

const questions: PublicQuizQuestion[] = [
  { id: 'q1', prompt: '1+1は?', choices: ['1', '2', '3'] },
  { id: 'q2', prompt: '空は?', choices: ['青', '赤'] },
];

describe('shuffledOrder', () => {
  it('0..n-1 をちょうど1回ずつ含む並べ替えを返す', () => {
    for (let n = 0; n <= 8; n++) {
      expect([...shuffledOrder(n)].sort((a, b) => a - b)).toEqual(
        Array.from({ length: n }, (_, i) => i),
      );
    }
  });

  it('乱数が固定なら、結果も決まる', () => {
    expect(shuffledOrder(3, seq(0, 0))).toEqual([1, 2, 0]);
    expect(shuffledOrder(3, seq(0.99, 0.99))).toEqual([0, 1, 2]);
  });

  it('乱数が 1 に達しても範囲外にならない', () => {
    expect([...shuffledOrder(5, () => 1)].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('toDisplayQuestions / buildGradeRequest', () => {
  it('並べ替えても、元の選択肢の中身と番号の対応は保たれる', () => {
    const display = toDisplayQuestions(questions, seq(0, 0, 0));
    for (const [qi, d] of display.entries()) {
      for (const c of d.choices) expect(c.label).toBe(questions[qi]!.choices[c.original]);
    }
  });

  it('表示順の位置ではなく、元の番号を採点に送る', () => {
    const display = toDisplayQuestions(questions, seq(0, 0, 0));
    // q1 の表示順は [1,2,0]。位置0を選ぶと、元の番号は 1
    expect(display[0]!.choices.map((c) => c.original)).toEqual([1, 2, 0]);
    expect(buildGradeRequest(display, { q1: 0, q2: 1 }).answers).toEqual([
      { questionId: 'q1', choiceIndex: 1 },
      { questionId: 'q2', choiceIndex: display[1]!.choices[1]!.original },
    ]);
  });

  it('未回答の問題は採点リクエストに含めない', () => {
    const display = toDisplayQuestions(questions, seq(0.5));
    expect(buildGradeRequest(display, { q1: 0 }).answers).toHaveLength(1);
    expect(buildGradeRequest(display, {}).answers).toEqual([]);
  });

  it('不正な位置（範囲外）は無視する', () => {
    const display = toDisplayQuestions(questions, seq(0.5));
    expect(buildGradeRequest(display, { q1: 99 }).answers).toEqual([]);
  });

  it('未回答の数を数える', () => {
    const display = toDisplayQuestions(questions);
    expect(unansweredCount(display, {})).toBe(2);
    expect(unansweredCount(display, { q1: 0 })).toBe(1);
    expect(unansweredCount(display, { q1: 0, q2: 0 })).toBe(0);
  });
});
