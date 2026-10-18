---
paths:
  - 'apps/web/**'
---

# apps/web の規約

- App Router。デフォルトはServer Component。状態やイベントが必要な箇所だけ `'use client'`
- APIは Hono のRPCクライアント（型付き）経由で呼ぶ。`fetch` を直書きしない
- スタイルはデザインシステムのトークン（CSS変数）を使う。色や余白を直書きしない
- ライト/ダーク、モバイルファーストで実装する
- `prefers-reduced-motion` を尊重する。フォーカス可視、ARIA、コントラスト（WCAG AA）を満たす
- ロード・空・エラーの3状態を必ず設計する
- UIを変更したらPlaywright MCPでスクリーンショットを撮って確認する
