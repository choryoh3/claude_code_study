import { z } from 'zod';

// ---- 共通 ----
export const levelSchema = z.enum(['basic', 'intermediate', 'advanced']);
export type Level = z.infer<typeof levelSchema>;

export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug は小文字英数字とハイフンのみ');

// ---- レッスン ----
export const lessonFrontmatterSchema = z.object({
  title: z.string().min(1),
  level: levelSchema,
  order: z.number().int().nonnegative(),
  summary: z.string().min(1),
  /** 公式ドキュメントで内容を確認した日 (YYYY-MM-DD) */
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type LessonFrontmatter = z.infer<typeof lessonFrontmatterSchema>;

export const lessonSummarySchema = lessonFrontmatterSchema.extend({ slug: slugSchema });
export type LessonSummary = z.infer<typeof lessonSummarySchema>;

// ---- クイズ ----
export const quizQuestionSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    choices: z.array(z.string().min(1)).min(2).max(6),
    /** 正解の選択肢インデックス。クライアントには返さない */
    answerIndex: z.number().int().nonnegative(),
    explanation: z.string().min(1),
  })
  .refine((q) => q.answerIndex < q.choices.length, {
    message: 'answerIndex は choices の範囲内にしてください',
    path: ['answerIndex'],
  });
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

/** クライアントに公開する問題（正解と解説を含まない） */
export const publicQuizQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)),
});
export type PublicQuizQuestion = z.infer<typeof publicQuizQuestionSchema>;

export const gradeRequestSchema = z.object({
  answers: z
    .array(z.object({ questionId: z.string().min(1), choiceIndex: z.number().int().nonnegative() }))
    .min(1)
    .max(50),
});
export type GradeRequest = z.infer<typeof gradeRequestSchema>;

export const gradeResultSchema = z.object({
  score: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  results: z.array(
    z.object({
      questionId: z.string(),
      correct: z.boolean(),
      correctIndex: z.number().int().nonnegative(),
      explanation: z.string(),
    }),
  ),
});
export type GradeResult = z.infer<typeof gradeResultSchema>;

// ---- 進捗 ----
export const progressStatusSchema = z.enum(['not_started', 'in_progress', 'completed']);
export type ProgressStatus = z.infer<typeof progressStatusSchema>;

export const progressEntrySchema = z.object({
  lessonSlug: slugSchema,
  status: progressStatusSchema,
  /** ISO 8601。completed のときのみ */
  completedAt: z.string().datetime().nullable(),
});
export type ProgressEntry = z.infer<typeof progressEntrySchema>;

export const updateProgressRequestSchema = z.object({ status: progressStatusSchema });
export type UpdateProgressRequest = z.infer<typeof updateProgressRequestSchema>;

/** ゲストのlocalStorage進捗を、ログイン時にサーバーへ取り込むための入力 */
export const mergeProgressRequestSchema = z.object({
  entries: z.array(progressEntrySchema).max(500),
  /** 学習した日 (YYYY-MM-DD)。ストリーク計算に使う */
  studyDays: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .max(400)
    .default([]),
});
export type MergeProgressRequest = z.infer<typeof mergeProgressRequestSchema>;

// ---- バッジ ----
export const badgeKeySchema = z.enum([
  'first-lesson',
  'basic-complete',
  'intermediate-complete',
  'advanced-complete',
  'quiz-perfect',
  'streak-3',
  'streak-7',
]);
export type BadgeKey = z.infer<typeof badgeKeySchema>;

export const userBadgeSchema = z.object({
  badgeKey: badgeKeySchema,
  earnedAt: z.string().datetime(),
});
export type UserBadge = z.infer<typeof userBadgeSchema>;

// ---- ユーザー（個人情報は最小限） ----
export const userSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});
export type User = z.infer<typeof userSchema>;

// ---- エラー ----
export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
