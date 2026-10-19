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
- 画面の文言（ラベル・メッセージ・aria-label・メタデータ）は、コードに直書きせず `messages/ja.json` に置く。サーバーでは `getTranslations`、クライアントでは `useTranslations` を使う（ADR 0007）
- 文言を足したら、辞書にキーを追加する。キーは型で検査される。直書きは `no-hardcoded-text.test.ts` が検出する
- 見た目に関わる文言（強調・リンク）は、辞書のタグ（`t.rich`）で持たせ、語順が変わっても辞書だけで対応できるようにする
- アイコンは `lucide-react` を使う（絵文字や記号文字をアイコン代わりにしない）
- UIを変更したらPlaywright MCPでスクリーンショットを撮って確認する
- スクリーンショットは `evidence/<トピック>/` に保存する（`evidence/` は git に含めない）
