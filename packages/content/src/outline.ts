import type { Level } from '@claude-study/schemas';

export interface PlannedTopic {
  slug: string;
  title: string;
}

/**
 * 今後追加する予定のトピック（フェーズ6で執筆）。ロードマップに「準備中」として表示し、
 * 「次へ」リンクが切れないようにする。レッスンが追加されたら、ここから外す。
 */
export const PLANNED_TOPICS: Record<Exclude<Level, 'basic'>, PlannedTopic[]> = {
  intermediate: [
    { slug: 'settings', title: 'settings.json（permissions / hooks / env）' },
    { slug: 'skills', title: 'skills：手順を再利用する' },
    { slug: 'subagents', title: 'subagents：役割を分けて任せる' },
    { slug: 'rules', title: 'rules：パス別に規約を伝える' },
    { slug: 'mcp', title: 'MCP：外部ツールにつなぐ' },
    { slug: 'memory', title: 'メモリ：覚えさせる・忘れさせる' },
    { slug: 'git-workflow', title: 'gitワークフロー' },
    { slug: 'worktree', title: 'worktree：作業を分離する' },
    { slug: 'headless', title: 'ヘッドレス実行' },
  ],
  advanced: [
    { slug: 'parallel-implementation', title: '並列実装（subagent / worktree）' },
    { slug: 'harness-engineering', title: 'ハーネスエンジニアリング' },
    { slug: 'custom-skill-agent', title: 'カスタムskill / agent設計' },
    { slug: 'build-mcp', title: 'MCPを自作する' },
    { slug: 'ci-integration', title: 'CI連携' },
    { slug: 'cost-context', title: 'コスト・コンテキストの最適化' },
    { slug: 'team-operations', title: 'チーム運用' },
  ],
};

export const LEVEL_LABELS: Record<Level, { name: string; tagline: string }> = {
  basic: { name: '基礎', tagline: '基本操作と、安全に任せる考え方' },
  intermediate: { name: '中級', tagline: '設定と拡張で、自分仕様に育てる' },
  advanced: { name: '上級', tagline: '並列化と自己検証で、チームの戦力にする' },
};

/** 準備中のトピックを探す（公開済みのレッスンは含まない） */
export function findPlannedTopic(level: string, slug: string): PlannedTopic | undefined {
  if (level !== 'intermediate' && level !== 'advanced') return undefined;
  return PLANNED_TOPICS[level].find((t) => t.slug === slug);
}
