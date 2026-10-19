import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadLessons } from './load';
import { ReferenceError, loadReference } from './reference';

const slugs = new Set(loadLessons().map((l) => l.slug));
const dirs: string[] = [];

function makeDir(cheatsheet: string, glossary: string) {
  const dir = mkdtempSync(join(tmpdir(), 'claude-study-ref-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'cheatsheet.yaml'), cheatsheet);
  writeFileSync(join(dir, 'glossary.yaml'), glossary);
  return dir;
}
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const validCheatsheet = `
sections:
  - id: slash-commands
    title: スラッシュコマンド
    items:
      - term: /clear
        description: 会話を消す。
        lesson: install
`;
const validGlossary = `
terms:
  - term: コンテキスト
    description: 会話の記憶。
    lesson: install
`;

describe('loadReference（実データ）', () => {
  const { cheatsheet, glossary } = loadReference(slugs);

  it('チートシートは指定の5セクションが、この順でそろっている', () => {
    expect(cheatsheet.sections.map((s) => s.id)).toEqual([
      'slash-commands',
      'shortcuts',
      'permission-modes',
      'cli',
      'memory',
    ]);
    for (const s of cheatsheet.sections) expect(s.items.length, s.id).toBeGreaterThanOrEqual(5);
  });

  it('用語集に十分な語数があり、すべて実在のレッスンに紐づく', () => {
    expect(glossary.terms.length).toBeGreaterThanOrEqual(15);
    for (const t of glossary.terms) expect(slugs.has(t.lesson), t.term).toBe(true);
  });

  it('よく使うコマンドが載っている', () => {
    const terms = cheatsheet.sections.flatMap((s) => s.items.map((i) => i.term));
    expect(terms).toEqual(expect.arrayContaining(['/clear', '/compact', 'Shift+Tab']));
  });
});

describe('loadReference（不正なデータの検出）', () => {
  it('正しいデータは読み込める', () => {
    const dir = makeDir(validCheatsheet, validGlossary);
    expect(loadReference(slugs, dir).glossary.terms).toHaveLength(1);
  });

  it('存在しないレッスンへのリンクを拒否する', () => {
    const dir = makeDir(
      validCheatsheet.replace('lesson: install', 'lesson: no-such-lesson'),
      validGlossary,
    );
    expect(() => loadReference(slugs, dir)).toThrow(/解説先レッスンが存在しません/);
  });

  it('用語・項目の重複を拒否する', () => {
    const dup = validGlossary + validGlossary.replace('terms:', '');
    expect(() => loadReference(slugs, makeDir(validCheatsheet, dup))).toThrow(/重複/);
  });

  it('YAMLの不正と、必須項目の欠落を拒否する', () => {
    expect(() => loadReference(slugs, makeDir('sections: [', validGlossary))).toThrow(
      ReferenceError,
    );
    const noDesc = validCheatsheet.replace(/ +description: .*\n/, '');
    expect(() => loadReference(slugs, makeDir(noDesc, validGlossary))).toThrow(/形式が不正/);
  });

  it('ファイルが無いとファイル名つきで失敗する', () => {
    const dir = mkdtempSync(join(tmpdir(), 'claude-study-ref-'));
    dirs.push(dir);
    expect(() => loadReference(slugs, dir)).toThrow(/cheatsheet\.yaml/);
  });
});
