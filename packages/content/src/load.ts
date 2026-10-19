import { levelSchema, type Level } from '@claude-study/schemas';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LessonParseError, parseLesson, type ParsedLesson } from './parse';

export const LESSONS_DIR = join(__dirname, '..', 'lessons');

export interface Lesson extends ParsedLesson {
  level: Level;
}

/**
 * lessons/<level>/NN-slug.mdx をすべて読み込んで検証する。
 * 不正なファイルが1つでもあれば例外にする（壊れたコンテンツを公開しないため）。
 */
export function loadLessons(dir: string = LESSONS_DIR): Lesson[] {
  const lessons: Lesson[] = [];
  for (const levelName of readdirSync(dir)) {
    const levelDir = join(dir, levelName);
    const level = levelSchema.safeParse(levelName);
    if (!level.success) continue; // README等は無視
    if (!existsSync(levelDir)) continue;

    for (const file of readdirSync(levelDir)
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
