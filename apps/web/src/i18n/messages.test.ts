import { BADGE_DEFINITIONS, badgeKeySchema, levelSchema } from '@claude-study/schemas';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultLocale, locales } from './config';

const MESSAGES_DIR = join(__dirname, '..', '..', 'messages');

type Tree = { [key: string]: string | Tree };
const load = (locale: string): Tree =>
  JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), 'utf8')) as Tree;

/** ネストしたメッセージを、`a.b.c` 形式のキーと値の組に平らにする */
function flatten(tree: Tree, prefix = ''): Array<[string, string]> {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string'
      ? ([[`${prefix}${key}`, value]] as Array<[string, string]>)
      : flatten(value, `${prefix}${key}.`),
  );
}

/** ICUの引数名（`{count}`）とリッチテキストのタグ名（`<link>`）を取り出す */
const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}|<(\w+)>/g)].map((m) => m[1] ?? m[2]).sort();

describe('messages', () => {
  const base = flatten(load(defaultLocale));

  it('対応する言語ごとに、辞書ファイルがある', () => {
    const files = readdirSync(MESSAGES_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -'.json'.length))
      .sort();
    expect(files).toEqual([...locales].sort());
  });

  it('空のメッセージがない', () => {
    for (const [key, value] of base) expect(value.trim().length, key).toBeGreaterThan(0);
  });

  it('どの言語も、基準の言語（ja）とキー構造が同一で、引数・タグも一致する', () => {
    const baseMap = new Map(base);
    for (const locale of locales) {
      const map = new Map(flatten(load(locale)));
      expect([...map.keys()].sort(), `${locale} のキー`).toEqual([...baseMap.keys()].sort());
      for (const [key, value] of map) {
        expect(placeholders(value), `${locale}: ${key} の引数`).toEqual(
          placeholders(baseMap.get(key)!),
        );
      }
    }
  });

  it('引数の検査が、実際に引数の過不足を検出できる', () => {
    expect(placeholders('{count}本公開中')).toEqual(['count']);
    // タグは開きタグだけを数える（閉じタグ </link> は数えない）
    expect(placeholders('<link>公式</link>の{name}')).toEqual(['link', 'name']);
    expect(placeholders('{a}と{b}')).not.toEqual(placeholders('{a}だけ'));
  });

  it('レベルの名前と見出しが、すべてのレベルにある', () => {
    const levels = load(defaultLocale).levels as Tree;
    expect(Object.keys(levels).sort()).toEqual([...levelSchema.options].sort());
    for (const level of levelSchema.options) {
      expect(Object.keys(levels[level] as Tree).sort()).toEqual(['name', 'tagline']);
    }
  });

  it('バッジの辞書が、定義（packages/schemas）と過不足なく対応し、日本語の内容も一致している', () => {
    const items = (load(defaultLocale).badges as Tree).items as Tree;
    expect(Object.keys(items).sort()).toEqual([...badgeKeySchema.options].sort());
    for (const def of BADGE_DEFINITIONS) {
      const item = items[def.key] as Record<string, string>;
      expect(Object.keys(item).sort(), def.key).toEqual(['description', 'hint', 'title']);
      // DBのseedと画面表示で、バッジの名前がずれないようにする（jaのみ。他言語は訳してよい）
      expect(item.title, def.key).toBe(def.title);
      expect(item.description, def.key).toBe(def.description);
    }
  });
});
