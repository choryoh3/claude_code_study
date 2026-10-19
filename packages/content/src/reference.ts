import { slugSchema } from '@claude-study/schemas';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const itemSchema = z.object({
  term: z.string().min(1),
  description: z.string().min(1),
  /** この項目を解説しているレッスンの slug（利用者が詳しく読めるようにする） */
  lesson: slugSchema,
});

export const cheatsheetSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        title: z.string().min(1),
        items: z.array(itemSchema).min(1),
      }),
    )
    .min(1),
});

export const glossarySchema = z.object({
  terms: z.array(itemSchema).min(1),
});

export type CheatsheetItem = z.infer<typeof itemSchema>;
export type Cheatsheet = z.infer<typeof cheatsheetSchema>;
export type Glossary = z.infer<typeof glossarySchema>;

export class ReferenceError extends Error {
  constructor(file: string, message: string) {
    super(`${file}: ${message}`);
    this.name = 'ReferenceError';
  }
}

/** 既定の置き場所。バンドラ越しでも動くよう import.meta.url から求める（呼ばれた時だけ評価）。 */
export function defaultReferenceDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'reference');
}

function readYaml<T>(file: string, dir: string, schema: z.ZodType<T>): T {
  const path = join(dir, file);
  if (!existsSync(path)) throw new ReferenceError(file, 'ファイルが見つかりません');
  let data: unknown;
  try {
    data = parseYaml(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new ReferenceError(file, `YAMLが不正です: ${(e as Error).message.split('\n')[0]}`);
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new ReferenceError(file, `形式が不正です (${detail})`);
  }
  return parsed.data;
}

function assertNoDuplicates(file: string, label: string, values: readonly string[]) {
  const seen = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) throw new ReferenceError(file, `${label}が重複しています: ${v}`);
    seen.add(v);
  }
}

/**
 * チートシートと用語集を読み込んで検証する。
 * 解説先のレッスン(`lesson`)が実在しなければ例外にする（リンク切れの公開を防ぐ）。
 */
export function loadReference(
  lessonSlugs: ReadonlySet<string>,
  dir: string = defaultReferenceDir(),
): { cheatsheet: Cheatsheet; glossary: Glossary } {
  const cheatsheet = readYaml('cheatsheet.yaml', dir, cheatsheetSchema);
  const glossary = readYaml('glossary.yaml', dir, glossarySchema);

  assertNoDuplicates(
    'cheatsheet.yaml',
    'セクションidが',
    cheatsheet.sections.map((s) => s.id),
  );
  assertNoDuplicates(
    'glossary.yaml',
    '用語が',
    glossary.terms.map((t) => t.term),
  );
  for (const section of cheatsheet.sections) {
    assertNoDuplicates(
      'cheatsheet.yaml',
      `「${section.title}」の項目が`,
      section.items.map((i) => i.term),
    );
  }

  const links = [
    ...cheatsheet.sections.flatMap((s) => s.items.map((i) => ['cheatsheet.yaml', i] as const)),
    ...glossary.terms.map((t) => ['glossary.yaml', t] as const),
  ];
  for (const [file, item] of links) {
    if (!lessonSlugs.has(item.lesson)) {
      throw new ReferenceError(
        file,
        `「${item.term}」の解説先レッスンが存在しません: ${item.lesson}`,
      );
    }
  }
  return { cheatsheet, glossary };
}
