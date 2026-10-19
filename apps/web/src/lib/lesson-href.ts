import type { Level } from '@claude-study/schemas';

/**
 * レッスンのURL。ブラウザ側のコンポーネントからも使うため、node:fs を使う lessons.ts とは別ファイルにしている
 * （lessons.ts を client から import すると、ブラウザ用のバンドルに node:fs が混ざってビルドが失敗する）。
 */
export function lessonHref(level: Level, slug: string): string {
  return `/learn/${level}/${slug}`;
}
