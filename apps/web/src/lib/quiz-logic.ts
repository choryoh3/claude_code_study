import type { GradeRequest, PublicQuizQuestion } from '@claude-study/schemas';

/** 画面に出す1問。選択肢の並びは試行ごとにシャッフルするが、採点には元の番号を使う。 */
export interface DisplayQuestion {
  id: string;
  prompt: string;
  /** 表示順の選択肢。`original` はサーバーが知っている元の番号（採点にはこちらを送る）。 */
  choices: Array<{ original: number; label: string }>;
}

/** 0..n-1 を並べ替える（Fisher–Yates）。乱数は注入できる（テストで固定するため）。 */
export function shuffledOrder(n: number, random: () => number = Math.random): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

/**
 * 選択肢をシャッフルして表示用にする。
 * 正解の位置が偏っていても、毎回ばらけるので、位置から答えを推測できなくなる。
 */
export function toDisplayQuestions(
  questions: readonly PublicQuizQuestion[],
  random: () => number = Math.random,
): DisplayQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    choices: shuffledOrder(q.choices.length, random).map((original) => ({
      original,
      label: q.choices[original]!,
    })),
  }));
}

/** 選択（問題ID → 表示順の位置）から、採点APIの入力を作る。未回答の問題は含めない。 */
export function buildGradeRequest(
  questions: readonly DisplayQuestion[],
  selected: Readonly<Record<string, number>>,
): GradeRequest {
  const answers = questions.flatMap((q) => {
    const position = selected[q.id];
    const choice = position === undefined ? undefined : q.choices[position];
    return choice ? [{ questionId: q.id, choiceIndex: choice.original }] : [];
  });
  return { answers };
}

export function unansweredCount(
  questions: readonly DisplayQuestion[],
  selected: Readonly<Record<string, number>>,
): number {
  return questions.filter((q) => selected[q.id] === undefined).length;
}
