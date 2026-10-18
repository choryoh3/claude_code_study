import { badgeKeySchema, type BadgeKey } from '@claude-study/schemas';

/** バッジ定義。DBのBadgeテーブルへのseedと、UI表示の両方で使う。 */
export const BADGE_DEFINITIONS: ReadonlyArray<{
  key: BadgeKey;
  title: string;
  description: string;
}> = [
  { key: 'first-lesson', title: 'はじめの一歩', description: '最初のレッスンを完了した' },
  { key: 'basic-complete', title: '基礎マスター', description: '基礎のレッスンをすべて完了した' },
  {
    key: 'intermediate-complete',
    title: '中級マスター',
    description: '中級のレッスンをすべて完了した',
  },
  {
    key: 'advanced-complete',
    title: '上級マスター',
    description: '上級のレッスンをすべて完了した',
  },
  { key: 'quiz-perfect', title: '全問正解', description: 'クイズで満点を取った' },
  { key: 'streak-3', title: '3日連続', description: '3日連続で学習した' },
  { key: 'streak-7', title: '7日連続', description: '7日連続で学習した' },
];

// 定義とzodスキーマのキーがずれていないことを起動時に保証する
for (const badge of BADGE_DEFINITIONS) badgeKeySchema.parse(badge.key);
