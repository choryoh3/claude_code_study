import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * 画面の文言は messages/<locale>.json に集約する。コードに日本語を直書きすると、多言語化のときに
 * 訳し漏れになる。コメントは対象外で、文字列リテラル・テンプレート・JSXの文字だけを検査する
 * （構文木を使うので、コメントや URL の `//` を誤検知しない）。
 */

const SRC = join(__dirname, '..');
// ひらがな・カタカナ・漢字・全角記号（句読点、全角の括弧・コロンなど）
const JAPANESE = /[\u3000-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]/;

/**
 * 直書きを許す例外。開発者向けの例外メッセージで、画面には出ない。
 * 追加するときは、画面に出ないことを確認し、理由をここに書く。
 */
const ALLOWED: Record<string, string> = {
  'lib/lessons.ts': 'レッスンの置き場所が見つからないときの開発者向けエラー',
  'lib/server-api.ts': 'ストア未接続のときの開発者向けエラー（ログイン機能がある間は呼ばれない）',
};

const toRel = (file: string) => relative(SRC, file).split('\\').join('/');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && name !== 'global.d.ts'
      ? [path]
      : [];
  });
}

/** 日本語を含む文字列・JSXテキストを、行番号つきで返す */
function findJapanese(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    const isText =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node);
    if (isText && JAPANESE.test(node.text)) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart());
      hits.push(`${line + 1}: ${node.text.trim().slice(0, 40)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return hits;
}

describe('画面の文言をコードに直書きしない', () => {
  const files = sourceFiles(SRC);

  it('検査対象のファイルが見つかる（テスト自体が空振りしていない）', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('日本語の文字列は、辞書（messages）にだけ置く', () => {
    const violations = files.flatMap((file) => {
      const rel = toRel(file);
      if (rel in ALLOWED) return [];
      return findJapanese(file).map((h) => `${rel}:${h}`);
    });
    expect(violations, `辞書に移してください:\n${violations.join('\n')}`).toEqual([]);
    // 全ソースを構文木に解析するため、他のテストと並行して動くと、既定の5秒を超えることがある
    // （実際に 7 秒かかって、時間切れで失敗した）。このテストだけ、余裕を持たせる。
  }, 30_000);

  it('例外の許可リストが、実在するファイルだけを指している', () => {
    const rels = new Set(files.map(toRel));
    for (const rel of Object.keys(ALLOWED)) expect(rels.has(rel), rel).toBe(true);
  });

  it('検査ロジックが、日本語の直書きを実際に検出できる', () => {
    const sample = ts.createSourceFile(
      'sample.tsx',
      [
        "const a = 'こんにちは';",
        '// コメントは無視',
        'const b = <p>全角（括弧）</p>;',
        "const c = 'https://example.com//ok';",
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const found: string[] = [];
    const visit = (n: ts.Node) => {
      if ((ts.isStringLiteral(n) || ts.isJsxText(n)) && JAPANESE.test(n.text)) found.push(n.text);
      ts.forEachChild(n, visit);
    };
    visit(sample);
    expect(found).toEqual(['こんにちは', '全角（括弧）']);
  });
});
