<!--
  セキュリティポリシー
  - 読む主体: GitHub 本体（Security タブに表示する）。Actions も Copilot も関与しない。
  - .github/SECURITY.md に置くと、リポジトリの Security タブと Issue 作成画面に案内が表示される。
  - 目的: 脆弱性を公開 Issue に書かれる（= 修正前に攻撃者へ知られる）のを防ぎ、非公開の報告経路へ誘導する。
  - 前提: Settings > Code security で「Private vulnerability reporting」を有効にすること。
-->

# セキュリティポリシー

## サポート対象

最新の `main` ブランチのみを対象とします。過去のコミットやフォークは対象外です。

## 脆弱性の報告方法

**公開 Issue・PR・Discussion には書かないでください。**

[Security Advisories の非公開報告フォーム](https://github.com/choryoh3/claude_code_study/security/advisories/new)から報告してください。報告内容は報告者とメンテナーだけが閲覧できます。

報告には次の情報を含めてください。

- 脆弱性の種類（例: XSS、認可の欠落、情報漏えい）
- 影響を受ける URL・ファイル・API エンドポイント
- 再現手順（可能であれば概念実証）
- 想定される影響

## 対応の流れ

1. 受領の連絡: 5 営業日以内を目標とします
2. 調査と深刻度の判定
3. 修正版の公開後、報告者と調整のうえ Security Advisory を公開します

報告者のクレジット表記を希望される場合はお知らせください。
