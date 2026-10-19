import {
  LEVEL_LABELS,
  PLANNED_TOPICS,
  loadReference,
  loadLessons,
  type Cheatsheet,
  type Glossary,
  type Lesson,
  type PlannedTopic,
} from '@claude-study/content';
import type { Level, LessonSummary } from '@claude-study/schemas';
import { existsSync } from 'node:fs';
import { lessonHref } from './lesson-href';

export { lessonHref };
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

let referenceCache: { cheatsheet: Cheatsheet; glossary: Glossary } | undefined;

/** チートシートと用語集。解説先レッスンが実在することも、ここで検証される。 */
export function getReference() {
  const dir = [
    path.resolve(process.cwd(), '../../packages/content/reference'),
    path.resolve(process.cwd(), 'packages/content/reference'),
  ].find((p) => existsSync(p));
  if (!dir) throw new Error('チートシート・用語集のディレクトリが見つかりません');
  referenceCache ??= loadReference(new Set(getLessons().map((l) => l.slug)), dir);
  return referenceCache;
}

/** 解説先レッスンの表示用情報（タイトルとURL）を slug から引く */
export function getLessonLinks(): Record<string, { title: string; href: string }> {
  return Object.fromEntries(
    getLessons().map((l) => [
      l.slug,
      { title: l.frontmatter.title, href: lessonHref(l.level, l.slug) },
    ]),
  );
}
