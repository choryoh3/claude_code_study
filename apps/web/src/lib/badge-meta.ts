import type { BadgeKey } from '@claude-study/schemas';
import {
  Compass,
  Flame,
  Mountain,
  Sprout,
  Target,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** バッジのアイコン（Lucide）。タイトルと説明は packages/schemas の BADGE_DEFINITIONS。 */
export const BADGE_ICONS: Record<BadgeKey, LucideIcon> = {
  'first-lesson': Sprout,
  'basic-complete': Compass,
  'intermediate-complete': Wrench,
  'advanced-complete': Mountain,
  'quiz-perfect': Target,
  'streak-3': Flame,
  'streak-7': Zap,
};

/** まだ獲得していないバッジに添える「どうすれば取れるか」のヒント */
export const BADGE_HINTS: Record<BadgeKey, string> = {
  'first-lesson': 'レッスンを1つ完了にする',
  'basic-complete': '基礎のレッスンをすべて完了にする',
  'intermediate-complete': '中級のレッスンをすべて完了にする（準備中）',
  'advanced-complete': '上級のレッスンをすべて完了にする（準備中）',
  'quiz-perfect': 'いずれかのクイズで全問正解する',
  'streak-3': '3日連続で、レッスンかクイズに取り組む',
  'streak-7': '7日連続で、レッスンかクイズに取り組む',
};
