import { describe, expect, it } from 'vitest';
import { filterPages, filterReference, matches, type ReferenceEntry } from './palette-logic';

const pages = [
  { href: '/roadmap', label: 'ロードマップ' },
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/cheatsheet', label: 'チートシート' },
];

const entry = (id: string, term: string, description: string): ReferenceEntry => ({
  id,
  kind: 'cheatsheet',
  term,
  description,
  href: `/learn/basic/${id}`,
});
const reference = [
  entry('a', '/clear', '会話履歴を消して、新しい会話を始める。'),
  entry('b', '/compact', '会話を要約して、コンテキストを空ける。'),
  entry('c', 'Esc', '実行中の処理を中断する。会話履歴は残る。'),
];

describe('matches', () => {
  it('大文字小文字を区別せず、空白区切りの語をすべて含むときだけ一致する', () => {
    expect(matches('Plan Mode', 'plan')).toBe(true);
    expect(matches('Plan Mode', 'plan mode')).toBe(true);
    expect(matches('Plan Mode', 'plan hooks')).toBe(false);
  });

  it('空の検索語は一致しない', () => {
    expect(matches('Plan Mode', '')).toBe(false);
    expect(matches('Plan Mode', '   ')).toBe(false);
  });
});

describe('filterPages', () => {
  it('入力が空のときは全ページを返す', () => {
    expect(filterPages(pages, '').map((r) => r.href)).toEqual([
      '/roadmap',
      '/dashboard',
      '/cheatsheet',
    ]);
  });

  it('入力があるときはラベルが一致するものだけを返す', () => {
    expect(filterPages(pages, 'チート').map((r) => r.href)).toEqual(['/cheatsheet']);
    expect(filterPages(pages, 'zzz')).toEqual([]);
  });
});

describe('filterReference', () => {
  it('入力が空のときは何も返さない（ページ一覧だけを見せる）', () => {
    expect(filterReference(reference, '')).toEqual([]);
  });

  it('用語名の一致を、説明文だけの一致より先に並べる', () => {
    // 「会話」は /clear・/compact・Esc の説明文にあるが、用語名には無い。「Esc」は用語名にある。
    expect(filterReference(reference, 'esc')[0]?.title).toBe('Esc');
    const byBody = filterReference(reference, '会話');
    expect(byBody.map((r) => r.title).sort()).toEqual(['/clear', '/compact', 'Esc']);
  });

  it('解説先レッスンへのリンクを返す', () => {
    const [first] = filterReference(reference, '/clear');
    expect(first).toMatchObject({ group: 'reference', href: '/learn/basic/a' });
  });

  it('件数を絞る', () => {
    const many = Array.from({ length: 20 }, (_, i) => entry(`x${i}`, `/cmd${i}`, '会話を扱う。'));
    expect(filterReference(many, '会話')).toHaveLength(6);
  });
});
