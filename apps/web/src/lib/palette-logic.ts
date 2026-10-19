export type PaletteGroup = 'page' | 'lesson' | 'reference';

export interface PaletteResult {
  id: string;
  group: PaletteGroup;
  title: string;
  subtitle?: string;
  href: string;
}

/** チートシート・用語集の1項目（検索対象）。href は解説先レッスン。 */
export interface ReferenceEntry {
  id: string;
  kind: 'cheatsheet' | 'glossary';
  term: string;
  description: string;
  href: string;
}

const MAX_PAGES = 5;
const MAX_REFERENCE = 6;

/** 大文字小文字・前後の空白を無視し、空白区切りの語をすべて含むものを一致とする */
export function matches(text: string, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return false;
  const haystack = text.toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

/** ページ一覧。入力が空のときは全件、入力があるときはラベルが一致するものだけ。 */
export function filterPages(
  pages: ReadonlyArray<{ href: string; label: string }>,
  query: string,
): PaletteResult[] {
  const q = query.trim();
  const hit = q ? pages.filter((p) => matches(p.label, q)) : pages;
  return hit.slice(0, MAX_PAGES).map((p) => ({
    id: `page-${p.href}`,
    group: 'page' as const,
    title: p.label,
    href: p.href,
  }));
}

/** チートシート・用語集の絞り込み。用語名の一致を、説明文だけの一致より先に並べる。 */
export function filterReference(
  entries: readonly ReferenceEntry[],
  query: string,
): PaletteResult[] {
  const q = query.trim();
  if (!q) return [];
  const scored = entries
    .map((e) => ({
      e,
      inTerm: matches(e.term, q),
      inBody: matches(`${e.term} ${e.description}`, q),
    }))
    .filter((x) => x.inBody);
  scored.sort((a, b) => Number(b.inTerm) - Number(a.inTerm));
  return scored.slice(0, MAX_REFERENCE).map(({ e }) => ({
    id: `ref-${e.id}`,
    group: 'reference' as const,
    title: e.term,
    subtitle: e.description,
    href: e.href,
  }));
}
