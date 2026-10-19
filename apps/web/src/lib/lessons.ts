import {
  LEVEL_LABELS,
  PLANNED_TOPICS,
  loadLessons,
  type Lesson,
  type PlannedTopic,
} from '@claude-study/content';
import type { Level, LessonSummary } from '@claude-study/schemas';
import { existsSync } from 'node:fs';
export { lessonHref } from './lesson-href';
import path from 'node:path';

let cache: Lesson[] | undefined;

/** モノレポのどこから起動されても、レッスンの置き場所を見つける */
function lessonsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), '../../packages/content/lessons'),
    path.resolve(process.cwd(), 'packages/content/lessons'),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error(`レッスンのディレクトリが見つかりません: ${candidates.join(', ')}`);
  return found;
}

/** ビルド時・サーバー描画時に1度だけ読み込んで検証する（壊れたコンテンツは例外で止まる） */
export function getLessons(): Lesson[] {
  cache ??= loadLessons(lessonsDir());
  return cache;
}

export function getLesson(level: string, slug: string): Lesson | undefined {
  return getLessons().find((l) => l.level === level && l.slug === slug);
}

export function toSummary(l: Lesson): LessonSummary {
  return { slug: l.slug, ...l.frontmatter };
}

export interface LevelGroup {
  level: Level;
  name: string;
  tagline: string;
  lessons: LessonSummary[];
  planned: PlannedTopic[];
}

const LEVELS: Level[] = ['basic', 'intermediate', 'advanced'];

/** レベルごとに、公開済みレッスンと準備中のトピックをまとめる */
export function getLevelGroups(): LevelGroup[] {
  const all = getLessons().map(toSummary);
  return LEVELS.map((level) => {
    const published = new Set(all.filter((l) => l.level === level).map((l) => l.slug));
    const planned =
      level === 'basic' ? [] : PLANNED_TOPICS[level].filter((t) => !published.has(t.slug));
    return {
      level,
      ...LEVEL_LABELS[level],
      lessons: all.filter((l) => l.level === level),
      planned,
    };
  });
}
