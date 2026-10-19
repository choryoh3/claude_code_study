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

/** バッジのアイコン（Lucide）。タイトル・説明・ヒントは辞書（messages の `badges.items`）にある。 */
export const BADGE_ICONS: Record<BadgeKey, LucideIcon> = {
  'first-lesson': Sprout,
  'basic-complete': Compass,
  'intermediate-complete': Wrench,
  'advanced-complete': Mountain,
  'quiz-perfect': Target,
  'streak-3': Flame,
  'streak-7': Zap,
};
