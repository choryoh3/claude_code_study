import {
  lessonFrontmatterSchema,
  quizQuestionSchema,
  slugSchema,
  type LessonFrontmatter,
  type QuizQuestion,
} from '@claude-study/schemas';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

/** レッスン本文のH2見出し。この名前・この順序で1回ずつ使う（クイズはfrontmatterに持つ）。 */
export const REQUIRED_SECTIONS = [
  'ゴール',
  '前提',
  '解説',
  'ハンズオン',
  'よくある失敗',
  '次へ',
] as const;

export const lessonFileFrontmatterSchema = lessonFrontmatterSchema.extend({
  quiz: z.array(quizQuestionSchema).min(3).max(5),
});

export interface ParsedLesson {
  slug: string;
  frontmatter: LessonFrontmatter;
  quiz: QuizQuestion[];
  /** frontmatter を除いた本文（MDX） */
  body: string;
  /** 本文中のH2見出し（コードブロック内は除く） */
  headings: string[];
}

export class LessonParseError extends Error {
  constructor(
    public readonly file: string,
    message: string,
  ) {
    super(`${file}: ${message}`);
    this.name = 'LessonParseError';
  }
}

/** `01-install.mdx` → { order: 1, slug: 'install' } */
export function parseFileName(fileName: string): { order: number; slug: string } | null {
  const m = /^(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.mdx$/.exec(fileName);
  if (!m) return null;
  return { order: Number(m[1]), slug: m[2]! };
}

function splitFrontmatter(source: string): { raw: string; body: string } | null {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  return m ? { raw: m[1]!, body: m[2]! } : null;
}

/** コードブロック(```)の外にあるH2見出しを順に集める */
export function extractH2Headings(body: string): string[] {
  const headings: string[] = [];
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = /^## (.+?)\s*$/.exec(line);
    if (m) headings.push(m[1]!);
  }
  return headings;
}

/** 1ファイルを読み、frontmatter・クイズ・本文構造を検証する。不正なら LessonParseError。 */
export function parseLesson(fileName: string, source: string): ParsedLesson {
  const named = parseFileName(fileName);
  if (!named) {
    throw new LessonParseError(
      fileName,
      'ファイル名は NN-slug.mdx（例: 01-install.mdx）にしてください',
    );
  }
  slugSchema.parse(named.slug);

  const parts = splitFrontmatter(source);
  if (!parts) throw new LessonParseError(fileName, 'frontmatter(---)がありません');

  let data: unknown;
  try {
    data = parseYaml(parts.raw);
  } catch (e) {
    throw new LessonParseError(fileName, `frontmatterのYAMLが不正です: ${(e as Error).message}`);
  }

  const parsed = lessonFileFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new LessonParseError(fileName, `frontmatterが不正です (${detail})`);
  }
  const { quiz, ...frontmatter } = parsed.data;

  if (frontmatter.order !== named.order) {
    throw new LessonParseError(
      fileName,
      `order(${frontmatter.order}) がファイル名の番号(${named.order})と一致しません`,
    );
  }

  const ids = quiz.map((q) => q.id);
  if (new Set(ids).size !== ids.length) {
    throw new LessonParseError(fileName, 'クイズの id が重複しています');
  }

  const headings = extractH2Headings(parts.body);
  if (headings.join('|') !== REQUIRED_SECTIONS.join('|')) {
    throw new LessonParseError(
      fileName,
      `H2見出しは「${REQUIRED_SECTIONS.join(' / ')}」の順で1回ずつにしてください（実際: ${headings.join(' / ') || 'なし'}）`,
    );
  }

  return { slug: named.slug, frontmatter, quiz, body: parts.body, headings };
}
