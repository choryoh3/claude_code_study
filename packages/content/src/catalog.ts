import type { LessonSummary, QuizQuestion } from '@claude-study/schemas';
import type { Lesson } from './load';

/**
 * apps/api の LessonCatalog と同じ形。apps/api が content に依存しないよう、
 * 型はここで構造的に合わせている（実際の注入は apps/web で行う）。
 */
export interface LessonCatalog {
  list(): LessonSummary[];
  get(slug: string): LessonSummary | undefined;
  quiz(slug: string): QuizQuestion[] | undefined;
  search(query: string): LessonSummary[];
}

function toSummary(l: Lesson): LessonSummary {
  return { slug: l.slug, ...l.frontmatter };
}

/** 全文検索の対象テキスト（タイトル・要約・本文）を小文字化して返す */
function haystack(l: Lesson): string {
  return `${l.frontmatter.title}\n${l.frontmatter.summary}\n${l.body}`.toLowerCase();
}

export function createCatalog(lessons: readonly Lesson[]): LessonCatalog {
  const bySlug = new Map(lessons.map((l) => [l.slug, l]));
  const index = lessons.map((l) => ({ lesson: l, text: haystack(l) }));

  return {
    list: () => lessons.map(toSummary),
    get: (slug) => {
      const l = bySlug.get(slug);
      return l ? toSummary(l) : undefined;
    },
    quiz: (slug) => bySlug.get(slug)?.quiz,
    search: (query) => {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      if (terms.length === 0) return [];
      return index
        .filter(({ text }) => terms.every((t) => text.includes(t)))
        .map(({ lesson, text }) => ({
          lesson,
          // タイトル一致を優先して並べる
          score: terms.filter((t) => lesson.frontmatter.title.toLowerCase().includes(t)).length,
          pos: text.indexOf(terms[0]!),
        }))
        .sort((a, b) => b.score - a.score || a.pos - b.pos)
        .map(({ lesson }) => toSummary(lesson));
    },
  };
}
