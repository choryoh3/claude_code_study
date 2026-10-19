import { levelSchema, type Level } from '@claude-study/schemas';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LessonParseError, parseLesson, type ParsedLesson } from './parse';

/** 既定のレッスン置き場。バンドラ越しでも動くよう import.meta.url から求める（呼ばれた時だけ評価）。 */
export function defaultLessonsDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'lessons');
}

export interface Lesson extends ParsedLesson {
  level: Level;
}

/**
 * lessons/<level>/NN-slug.mdx をすべて読み込んで検証する。
 * 不正なファイルが1つでもあれば例外にする（壊れたコンテンツを公開しないため）。
 */
export function loadLessons(dir: string = defaultLessonsDir()): Lesson[] {
  const lessons: Lesson[] = [];
  // レッスンの置き場所は実行時に決まる。ビルドのトレース対象を広げないよう、動的アクセスであることを明示する
  for (const levelName of readdirSync(/* turbopackIgnore: true */ dir)) {
    const levelDir = join(dir, levelName);
    const level = levelSchema.safeParse(levelName);
    if (!level.success) continue; // README等は無視
    if (!existsSync(levelDir)) continue;

    for (const file of readdirSync(/* turbopackIgnore: true */ levelDir)
      .filter((f) => f.endsWith('.mdx'))
      .sort()) {
      const lesson = parseLesson(file, readFileSync(join(levelDir, file), 'utf8'));
      if (lesson.frontmatter.level !== level.data) {
        throw new LessonParseError(
          file,
          `frontmatterのlevel(${lesson.frontmatter.level})が置き場所(${level.data})と一致しません`,
        );
      }
      lessons.push({ ...lesson, level: level.data });
    }
  }

  const seen = new Set<string>();
  for (const l of lessons) {
    if (seen.has(l.slug)) throw new Error(`slug が重複しています: ${l.slug}`);
    seen.add(l.slug);
  }
  const order: Record<Level, number> = { basic: 0, intermediate: 1, advanced: 2 };
  return lessons.sort(
    (a, b) => order[a.level] - order[b.level] || a.frontmatter.order - b.frontmatter.order,
  );
}
