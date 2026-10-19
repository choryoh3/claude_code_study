import { describe, expect, it } from 'vitest';
import { createCatalog } from './catalog';
import { loadLessons } from './load';
import {
  LessonParseError,
  REQUIRED_SECTIONS,
  extractH2Headings,
  parseFileName,
  parseLesson,
} from './parse';

const quiz = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    [
      `  - id: q${i + 1}`,
      `    prompt: 問題${i + 1}`,
      `    choices: [あ, い]`,
      `    answerIndex: 1`,
      `    explanation: 理由`,
    ].join('\n'),
  ).join('\n');

const sections = REQUIRED_SECTIONS.map((s) => `## ${s}\n\n本文`).join('\n\n');

function lessonSource(
  overrides: { order?: number; level?: string; quizCount?: number; body?: string } = {},
) {
  return [
    '---',
    'title: テスト',
    `level: ${overrides.level ?? 'basic'}`,
    `order: ${overrides.order ?? 1}`,
    'summary: 要約',
    "verifiedAt: '2026-10-19'",
    'quiz:',
    quiz(overrides.quizCount ?? 3),
    '---',
    overrides.body ?? sections,
  ].join('\n');
}

describe('parseFileName', () => {
  it('NN-slug.mdx を分解する', () => {
    expect(parseFileName('01-install.mdx')).toEqual({ order: 1, slug: 'install' });
    expect(parseFileName('12-claude-md.mdx')).toEqual({ order: 12, slug: 'claude-md' });
  });

  it('規約外のファイル名は null', () => {
    expect(parseFileName('install.mdx')).toBeNull();
    expect(parseFileName('1-install.mdx')).toBeNull();
    expect(parseFileName('01-Install.mdx')).toBeNull();
    expect(parseFileName('01-install.md')).toBeNull();
  });
});

describe('extractH2Headings', () => {
  it('コードブロック内の見出しは無視する', () => {
    const body = ['## A', '```md', '## B', '```', '## C', '### D'].join('\n');
    expect(extractH2Headings(body)).toEqual(['A', 'C']);
  });
});

describe('parseLesson', () => {
  it('正しいレッスンを読み込める', () => {
    const lesson = parseLesson('01-install.mdx', lessonSource());
    expect(lesson.slug).toBe('install');
    expect(lesson.frontmatter.title).toBe('テスト');
    expect(lesson.quiz).toHaveLength(3);
    expect(lesson.headings).toEqual([...REQUIRED_SECTIONS]);
  });

  it('orderがファイル名の番号と違うと拒否する', () => {
    expect(() => parseLesson('01-install.mdx', lessonSource({ order: 2 }))).toThrow(/一致しません/);
  });

  it('クイズが3問未満・6問以上だと拒否する', () => {
    expect(() => parseLesson('01-install.mdx', lessonSource({ quizCount: 2 }))).toThrow(
      LessonParseError,
    );
    expect(() => parseLesson('01-install.mdx', lessonSource({ quizCount: 6 }))).toThrow(
      LessonParseError,
    );
  });

  it('frontmatterがないと拒否する', () => {
    expect(() => parseLesson('01-install.mdx', sections)).toThrow(/frontmatter/);
  });

  it('見出しの順序が違う・欠けていると拒否する', () => {
    const swapped = ['ゴール', '解説', '前提', 'ハンズオン', 'よくある失敗', '次へ']
      .map((s) => `## ${s}`)
      .join('\n\n');
    expect(() => parseLesson('01-install.mdx', lessonSource({ body: swapped }))).toThrow(
      /H2見出し/,
    );
    expect(() => parseLesson('01-install.mdx', lessonSource({ body: '## ゴール' }))).toThrow(
      /H2見出し/,
    );
  });

  it('クイズのidが重複していると拒否する', () => {
    const dup = lessonSource().replace('id: q2', 'id: q1');
    expect(() => parseLesson('01-install.mdx', dup)).toThrow(/重複/);
  });

  it('エラーメッセージにファイル名が含まれる', () => {
    expect(() => parseLesson('01-install.mdx', 'x')).toThrow(/01-install\.mdx/);
  });
});

// 実際に公開するレッスンファイルを検証する（壊れたコンテンツをCIで止める）
describe('実際のレッスン', () => {
  const lessons = loadLessons();

  it('基礎レッスンが9本、番号順にそろっている', () => {
    const basic = lessons.filter((l) => l.level === 'basic');
    expect(basic.map((l) => l.slug)).toEqual([
      'install',
      'basic-usage',
      'slash-commands',
      'permission-modes',
      'plan-mode',
      'context-management',
      'claude-md',
      'effective-prompts',
      'troubleshooting',
    ]);
    expect(basic.map((l) => l.frontmatter.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('すべてのレッスンに確認日(verifiedAt)とクイズがある', () => {
    for (const l of lessons) {
      expect(l.frontmatter.verifiedAt, l.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(l.quiz.length, l.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it('中級9本・上級7本が、番号順にそろっている', () => {
    const slugsOf = (level: string) => lessons.filter((l) => l.level === level).map((l) => l.slug);
    expect(slugsOf('intermediate')).toEqual([
      'settings',
      'skills',
      'subagents',
      'rules',
      'mcp',
      'memory',
      'git-workflow',
      'worktree',
      'headless',
    ]);
    expect(slugsOf('advanced')).toEqual([
      'parallel-implementation',
      'harness-engineering',
      'custom-skill-agent',
      'build-mcp',
      'ci-integration',
      'cost-context',
      'team-operations',
    ]);
  });

  it('レッスンの slug は、レベルをまたいでも重複しない', () => {
    const slugs = lessons.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('本文中のサイト内リンク（/learn/...）は、すべて実在するレッスンを指す', () => {
    const exists = new Set(lessons.map((l) => `${l.level}/${l.slug}`));
    for (const l of lessons) {
      for (const [, level, slug] of l.body.matchAll(
        /\]\(\/learn\/([a-z]+)\/([a-z0-9-]+)(?:#[^)]*)?\)/g,
      )) {
        expect(exists.has(`${level}/${slug}`), `${l.slug} → /learn/${level}/${slug}`).toBe(true);
      }
    }
  });

  it('「次へ」には、次のレッスン（または最後だけロードマップ）へのリンクがある', () => {
    for (const [i, l] of lessons.entries()) {
      const next = l.body.slice(l.body.indexOf('## 次へ'));
      const links = [...next.matchAll(/\]\((\/[^)\s]+)\)/g)].map((m) => m[1]);
      expect(links.length, `${l.slug}: 次へのリンクが1つ以上必要`).toBeGreaterThan(0);
      const isLast = i === lessons.length - 1;
      if (isLast) expect(links, l.slug).toContain('/roadmap');
      else {
        const following = lessons[i + 1]!;
        // 学習順（基礎→中級→上級）の次のレッスンへ、確実につながっていること
        expect(links, `${l.slug} の次は ${following.slug}`).toContain(
          `/learn/${following.level}/${following.slug}`,
        );
      }
    }
  });

  it('クイズの正解位置が、レッスン内で全問同じにならない（位置から答えを推測できない）', () => {
    for (const l of lessons) {
      const positions = new Set(l.quiz.map((q) => q.answerIndex));
      expect(positions.size, `${l.slug}: 正解位置が全問同じ`).toBeGreaterThanOrEqual(2);
    }
  });

  it('MDXを壊しやすい裸の波括弧がコードの外にない', () => {
    for (const l of lessons) {
      let inFence = false;
      for (const line of l.body.split(/\r?\n/)) {
        if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
        if (inFence) continue;
        const outsideInlineCode = line.replace(/`[^`]*`/g, '');
        expect(outsideInlineCode, `${l.slug}: ${line}`).not.toMatch(/[{}]/);
      }
    }
  });
});

describe('createCatalog', () => {
  const catalog = createCatalog(loadLessons());

  it('一覧・詳細・クイズを返す', () => {
    expect(catalog.list().length).toBeGreaterThanOrEqual(9);
    expect(catalog.get('install')?.title).toBeTruthy();
    expect(catalog.get('nope')).toBeUndefined();
    expect(catalog.quiz('install')?.length).toBeGreaterThanOrEqual(3);
  });

  it('検索は本文も対象で、空白区切りはAND、タイトル一致が先に来る', () => {
    const hits = catalog.search('Plan Mode');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.slug).toBe('plan-mode');
    expect(catalog.search('   ')).toEqual([]);
    expect(catalog.search('zzzzzz存在しない語')).toEqual([]);
  });
});
