import { describe, expect, it } from 'vitest';
import {
  gradeRequestSchema,
  lessonFrontmatterSchema,
  mergeProgressRequestSchema,
  progressEntrySchema,
  quizQuestionSchema,
  slugSchema,
} from './index';

describe('slugSchema', () => {
  it('小文字英数字とハイフンのslugを受け付ける', () => {
    expect(slugSchema.safeParse('install-claude-code').success).toBe(true);
  });

  it('大文字・空白・先頭ハイフンのslugを拒否する', () => {
    expect(slugSchema.safeParse('Install').success).toBe(false);
    expect(slugSchema.safeParse('a b').success).toBe(false);
    expect(slugSchema.safeParse('-a').success).toBe(false);
  });
});

describe('lessonFrontmatterSchema', () => {
  const valid = {
    title: 'インストール',
    level: 'basic',
    order: 1,
    summary: '導入方法',
    verifiedAt: '2026-10-18',
  };

  it('正しいfrontmatterを受け付ける', () => {
    expect(lessonFrontmatterSchema.safeParse(valid).success).toBe(true);
  });

  it('未知のlevelと不正な日付を拒否する', () => {
    expect(lessonFrontmatterSchema.safeParse({ ...valid, level: 'expert' }).success).toBe(false);
    expect(lessonFrontmatterSchema.safeParse({ ...valid, verifiedAt: '2026/10/18' }).success).toBe(
      false,
    );
  });
});

describe('quizQuestionSchema', () => {
  const q = { id: 'q1', prompt: '?', choices: ['a', 'b'], answerIndex: 1, explanation: 'e' };

  it('answerIndex が範囲内なら受け付ける', () => {
    expect(quizQuestionSchema.safeParse(q).success).toBe(true);
  });

  it('answerIndex が choices の範囲外なら拒否する', () => {
    expect(quizQuestionSchema.safeParse({ ...q, answerIndex: 2 }).success).toBe(false);
  });
});

describe('gradeRequestSchema', () => {
  it('空の回答を拒否する', () => {
    expect(gradeRequestSchema.safeParse({ answers: [] }).success).toBe(false);
  });
});

describe('mergeProgressRequestSchema', () => {
  it('studyDays 省略時は空配列になる', () => {
    const parsed = mergeProgressRequestSchema.parse({ entries: [] });
    expect(parsed.studyDays).toEqual([]);
  });

  it('不正な進捗エントリを拒否する', () => {
    const bad = { lessonSlug: 'x', status: 'done', completedAt: null };
    expect(progressEntrySchema.safeParse(bad).success).toBe(false);
  });
});
