# GitHub 設定ガイド（Actions / Copilot / セキュリティ / ブランチ保護）

このリポジトリの `.github/` 配下の設定が「何をしているか」「なぜそうしたか」「誰が実行・参照するか」、そしてファイルでは表現できない**手動で行う設定**をまとめた、唯一のガイドです。他のプロジェクトへ移植するときの手順も兼ねています。設計判断の要約は [ADR 0009](./adr/0009-github-repository-governance.md) を参照してください。

`.github/` 配下のファイルは、GitHub が**決まった名前と置き場所**で自動的に読み取ります。勝手に改名・移動すると効かなくなります。

> **記載の確認日**: 2026-10-19。GitHub の仕様・設定名は公式ドキュメント（docs.github.com）と各 action のリポジトリで確認しています。確認できなかった点は「**未確認**」と明記しています（末尾の「確認できていない点」に一覧があります）。GitHub の仕様は変わるので、迷ったら公式ドキュメントを優先してください。

## 凡例（実行主体の印）

この文書では、誰が動かす・読むのかを次の印で示します。

| 印    | 実行主体          | 一言でいうと                                                                 |
| ----- | ----------------- | ---------------------------------------------------------------------------- |
| **A** | GitHub Actions    | ランナー上でコードとして**実行**される。Actions の実行時間を消費する         |
| **G** | GitHub 本体の機能 | GitHub が設定として**読む**（Actions のランナーは動かない）                  |
| **C** | Copilot           | Copilot が**読む**、または**起動する**（指示ファイルは実行されないテキスト） |

---

## 1. 全体像

守りたいことを「人の注意力」ではなく「仕組み」で担保する、という方針で 4 層に分けています。

1. **入口の品質**: Issue / PR テンプレート、PR タイトル検査、自動ラベル
2. **マージ前の検証**: CI（`pnpm verify`）、依存関係の審査、ワークフローの検査、CodeQL、Copilot code review
3. **マージの強制**: ruleset（必須チェック・必須レビュー・squash のみ・署名必須）
4. **継続的な保守**: Dependabot（cooldown 付き）、自動マージ、Scorecard による定期点検

### PR が `main` に入るまで

何をすると、どのファイルが働くかを時系列で示します。行末の `[A]` `[G]` `[C]` は実行主体です（凡例を参照）。

```text
Issue を作る ──────────────▶ ISSUE_TEMPLATE/*（入力フォームで情報を集める）            [G]
      │
ブランチを切って実装 ───────▶ CONTRIBUTING.md（開発の流れ）                            [G]
      │
PR を作る ─────────────────▶ PULL_REQUEST_TEMPLATE/*・pull_request_template.md          [G]
      │                      CODEOWNERS（レビュアーを自動指定）                         [G]
      │                      workflows/labeler.yml（領域・種別のラベルを自動付与）      [A]
      ▼
自動検査（並列に実行。すべて GitHub Actions）
  ├─ ci.yml ............... format / lint / typecheck / test / build   → ci-success    [A]
  ├─ pr-title.yml ......... PR タイトルが Conventional Commits か       → pr-title     [A]
  ├─ dependency-review.yml  追加される依存の脆弱性・ライセンス            → dependency-review [A]
  ├─ workflow-lint.yml .... ワークフロー自体の誤りと危険な書き方        → actionlint / zizmor [A]
  └─ codeql.yml ........... ソースコードの脆弱性（静的解析）            → CodeQL       [A]
      │
レビュー ──────────────────▶ Code Owner の人の承認                                     [G]
      │                      Copilot code review（ruleset が依頼。承認数には数えない）  [C]
      │                      （copilot-instructions.md が観点を指示。実行はされない）   [C]
      ▼
rulesets/default-branch.json の条件をすべて満たすと squash マージ可能                  [G]
      │
マージ後 ──────────────────▶ ci.yml が main で再実行                                   [A]
                             release.yml がリリースノートを分類（生成を押したとき）     [G]
定期実行 ──────────────────▶ dependabot.yml（週次の依存更新 PR）                       [G]
                             scorecard.yml・codeql.yml（週次の診断）                    [A]
Issue を Copilot に割り当て ▶ Copilot cloud agent が PR を作成。作業開始前に
                             copilot-setup-steps.yml が Actions のランナー上で動く      [C → A]
```

### この仕組みの考え方

| 考え方                          | 意味                                                                                           | 実現しているファイル                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **人の注意力に頼らない**        | 「テストを回し忘れた」「タイトル形式を間違えた」を、人ではなく機械が止める                     | `ci.yml` / `pr-title.yml` / `rulesets`           |
| **ローカルと CI を同じにする**  | CI 専用の手順を作らず `pnpm verify` を共有する。「手元では通るのに CI で落ちる」を減らす       | `ci.yml` / `actions/setup`                       |
| **最小権限**                    | 各ワークフローには、必要最小限の権限しか与えない                                               | すべての `workflows/*.yml` の `permissions:`     |
| **サプライチェーンを疑う**      | 外部 action・依存パッケージは、乗っ取られる可能性を前提に、固定・待機・審査する                | SHA 固定 / `cooldown` / `dependency-review`      |
| **設定にも理由を残す**          | 各ファイルの冒頭コメントに「なぜそうしたか」と「誰が読む・実行するか」を書く                   | 全ファイル                                       |
| **AI にも同じルールを守らせる** | 人間のコードと同様に、AI エージェント（Copilot）への指示もレビュー対象にし、環境も CI と揃える | `copilot-instructions.md` / `instructions/` ほか |

---

## 2. 実行主体の境界（GitHub Actions / GitHub 本体の機能 / Copilot）

`.github/` には、見た目が似ていても**動かす主体が違う**ファイルが混在しています。特に `copilot-setup-steps.yml` は「Actions のワークフローの形をした Copilot 用の設定」で、境界が分かりにくい代表例です。

### 2.1 3 つの分類

| 分類                               | 該当するファイル                                                                                                                                                      | 性質                                                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. GitHub Actions が実行する**   | `workflows/*.yml`、`actions/setup/action.yml`                                                                                                                         | ランナー（仮想マシン）上で**コードとして動く**。Actions の実行時間を消費する（public リポジトリの標準ランナーは無料。下記 FAQ を参照）。                                      |
| **G. GitHub 本体の機能が読む設定** | `dependabot.yml`、`rulesets/`、`CODEOWNERS`、`ISSUE_TEMPLATE/`、`PULL_REQUEST_TEMPLATE/`、`pull_request_template.md`、`SECURITY.md`、`CONTRIBUTING.md`、`release.yml` | GitHub のサービスが**設定として読む**だけ。Actions のランナーは動かない。`labeler.yml` と `zizmor.yml` は設定データで、**読んで実行するのは Actions 上のツール**。            |
| **C. Copilot が読む／起動する**    | `copilot-instructions.md`、`instructions/*.instructions.md`、`workflows/copilot-setup-steps.yml`、ruleset の `copilot_code_review` ルール                             | 指示ファイルは**実行されないテキスト**。`copilot-setup-steps.yml` は Copilot が起動し Actions のランナー上で動く。`copilot_code_review` は Copilot にレビューを依頼する設定。 |

### 2.2 ファイル別の一覧

「実行されるか」は、**実行**＝コードが動く、**読むだけ**＝設定・文章として参照されるだけ、を表します。

| ファイル                                      | 誰が読む・実行するか                                                               | いつ動くか（トリガー）                                                          | 実行されるか                               | 費用・権限の注意                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `workflows/ci.yml`                            | **A** Actions                                                                      | push(main) / PR / マージキュー / 手動                                           | 実行                                       | Actions 時間を消費。`contents: read`。                                                           |
| `workflows/pr-title.yml`                      | **A** Actions                                                                      | PR の作成・タイトル編集・push・再オープン                                       | 実行（シェル 1 本）                        | Actions 時間を消費。権限なし（`permissions: {}`）。                                              |
| `workflows/dependency-review.yml`             | **A** Actions（依存グラフは GitHub 本体が提供）                                    | PR                                                                              | 実行                                       | `pull-requests: write`（失敗時のコメント用）。private では GitHub Code Security（有償）が必要。  |
| `workflows/workflow-lint.yml`                 | **A** Actions                                                                      | push(main) / PR / マージキュー / 手動                                           | 実行                                       | Actions 時間を消費。`contents: read`。                                                           |
| `workflows/codeql.yml`                        | **A** Actions（結果は GitHub の Code scanning が受け取る）                         | push(main) / PR / 週次 / 手動                                                   | 実行                                       | `security-events: write`。public は無料、private は GitHub Code Security（有償）。               |
| `workflows/scorecard.yml`                     | **A** Actions                                                                      | 保護ルール変更 / 週次 / push(main) / 手動                                       | 実行                                       | `security-events: write` と `id-token: write`（結果公開用）。                                    |
| `workflows/labeler.yml`                       | **A** Actions                                                                      | PR の作成・更新・再オープン（`pull_request_target`）                            | 実行                                       | `pull-requests: write`。`pull_request_target` なので PR のコードを実行してはいけない。           |
| `workflows/dependabot-auto-merge.yml`         | **A** Actions                                                                      | `pull_request`（作成者が Dependabot の PR のみ処理）                            | 実行                                       | `contents: write` / `pull-requests: write`。実際のマージは GitHub 本体が条件を満たしたとき行う。 |
| `workflows/copilot-setup-steps.yml`           | **C** が起動（Copilot cloud agent / Copilot code review）、実体は **A** のランナー | Copilot の作業開始時。加えて、自分自身の変更 PR・push(main)・手動（動作確認用） | 実行（Actions のランナー上）               | `contents: read`。Copilot 起動分の課金の扱いは下記 FAQ。default ブランチにあって初めて有効。     |
| `actions/setup/action.yml`                    | **A** Actions（呼び出し元ジョブの 1 ステップとして）                               | `ci.yml` / `copilot-setup-steps.yml` から呼ばれたとき                           | 実行（単体では動かない）                   | 呼び出し元のジョブの権限で動く。                                                                 |
| `dependabot.yml`                              | **G** Dependabot                                                                   | 週次（月曜 9:00 JST）。セキュリティ更新は随時                                   | 読むだけ（Actions のワークフローではない） | 作られた PR には **A** の検査が走る（FAQ 参照）。                                                |
| `rulesets/default-branch.json`                | **G** Rulesets（**手動で取り込んで**初めて有効）                                   | 取り込み後、`main` への変更のたび                                               | 読むだけ（置いただけでは無効）             | JSON は取り込み用の控え。取り込み後は画面側が正。                                                |
| `CODEOWNERS`                                  | **G**                                                                              | PR 作成時（レビュアー自動指定）、マージ判定時                                   | 読むだけ                                   | ruleset の Code Owner 承認要件と組み合わせて初めて強制力を持つ。                                 |
| `labeler.yml`                                 | **A** 上の `actions/labeler` が読む設定データ                                      | `workflows/labeler.yml` の実行時                                                | 読むだけ                                   | `pull_request_target` で動くため、変更は main にマージされてから反映される。                     |
| `release.yml`                                 | **G**（リリースノート生成）                                                        | Releases で「Generate release notes」を押す／API で生成したとき                 | 読むだけ                                   | なし。                                                                                           |
| `zizmor.yml`                                  | **A** 上の zizmor が読む設定データ                                                 | `workflow-lint.yml` の実行時（自動検出）                                        | 読むだけ                                   | 例外の追加は理由のレビューが必要。                                                               |
| `ISSUE_TEMPLATE/*.yml`                        | **G**（Issue 作成画面）                                                            | Issue 作成時                                                                    | 読むだけ（フォームを描画）                 | Copilot cloud agent に Issue を割り当てると、入力内容が作業指示として **C** に読まれる。         |
| `pull_request_template.md`                    | **G**（PR 作成画面）                                                               | PR 作成時（既定）                                                               | 読むだけ（本文欄に挿入）                   | なし。                                                                                           |
| `PULL_REQUEST_TEMPLATE/*.md`                  | **G**（PR 作成画面）                                                               | URL の `?template=<ファイル名>` を付けて PR を作るとき                          | 読むだけ（本文欄に挿入）                   | なし。                                                                                           |
| `SECURITY.md`                                 | **G**（Security タブ・Issue 作成画面）                                             | 画面表示時                                                                      | 読むだけ                                   | 「Private vulnerability reporting」の有効化が前提。                                              |
| `CONTRIBUTING.md`                             | **G**（Issue / PR 作成画面のリンク）                                               | 画面表示時                                                                      | 読むだけ                                   | なし。                                                                                           |
| `copilot-instructions.md`                     | **C** Copilot（チャット・cloud agent・code review）                                | Copilot が動くたび（リポジトリ全体に適用）                                      | **読むだけ**（Actions では実行されない）   | Copilot の利用プランが必要。                                                                     |
| `instructions/github-actions.instructions.md` | **C** Copilot                                                                      | 対象ファイル（`applyTo`）が絡む作業のとき                                       | **読むだけ**（Actions では実行されない）   | 同上。                                                                                           |
| （ruleset の `copilot_code_review` ルール）   | **G** Rulesets が **C** にレビューを依頼する設定                                   | PR 作成時、`review_on_push: true` により push のたび（下書き PR は除く）        | 設定のみ。レビュー自体は Copilot が行う    | Copilot のライセンス・利用枠が必要。レビューは必須チェックにも承認数にもならない（FAQ 参照）。   |

### 2.3 紛らわしい点（FAQ）

回答は公式ドキュメントで確認できた範囲だけを書き、確認できなかった点は「**未確認**」と明記しています。

**Q1. `copilot-setup-steps.yml` は Actions のワークフローか？**

形式は Actions のワークフローで、**ランナー上で動きます**（公式: Copilot の環境は「powered by GitHub Actions」。`runs-on` に GitHub ホスト・larger・セルフホストのランナーを指定できる）。ただし、通常の CI と違い、**起動するのは Copilot** です。Copilot cloud agent がタスクを始めるとき、このジョブの `steps` が先に実行され、出力は Copilot のセッションログに出ます。

- ジョブ名は `copilot-setup-steps` 固定。Copilot が読むのは `steps` / `permissions` / `runs-on` / `services` / `snapshot` / `timeout-minutes`（最大 59）だけで、他は無視される。
- `on:` はファイルを変更した PR で動作確認するためのもの（公式の例と同じ考え方）。`workflow_dispatch` で、マージ後に手動確認もできる。
- default ブランチにマージされて初めて Copilot に使われる。
- step が非ゼロで終了すると、Copilot は残りのセットアップ step を飛ばし、その時点の環境で作業を始める。
- Copilot code review も、既定ではこのファイルを使う（公式。専用の `copilot-code-review.yml` を作れば別設定にできる。このリポジトリでは使っていない）。

**Q2. Copilot の指示ファイル（`copilot-instructions.md` など）は Actions で実行されるのか？**

**実行されません。** Copilot が読むだけのテキストです。公式ドキュメント（code review）によると、読まれるのは `.github/copilot-instructions.md`（全体）、`.github/instructions/**/*.instructions.md`（変更ファイルが `applyTo` に合うとき）、ルートの `AGENTS.md` です。code review では**PR のブランチ側（head）の内容**が読まれると書かれています。このリポジトリでは、指示の変更も `ai-config` ラベルと CODEOWNERS でレビュー対象にしています。

**Q3. Dependabot の PR に対して Actions は動くか？ 権限は？**

動きます。ただし**制限付き**です（公式ドキュメント「Dependabot on GitHub Actions のトラブルシュート」）。

- Dependabot が起こした `pull_request` などのイベントは、**fork からの実行と同じ扱い**になる。
- `GITHUB_TOKEN` は**既定で読み取り専用**。ワークフローの `permissions:` で引き上げられる（`dependabot-auto-merge.yml` はこれを使っている）。
- 使えるシークレットは **Dependabot secrets** だけ。Actions secrets は使えない。
- Dependabot 自体（更新 PR を作る処理）は `dependabot.yml` を読む **G** の機能で、このリポジトリのワークフローではない。
- `pull_request_target` で動く `labeler.yml` が、Dependabot の PR でどう動くかは、公式ドキュメントに記載が見つからなかった（**未確認**）。

**Q4. Copilot cloud agent が作った PR で、CI（Actions）はどう動くか？**

公式（Copilot の PR のレビュー方法）: 「**既定では、Copilot が PR に push しても Actions のワークフローは自動で実行されない**」。PR のマージボックスの「**Approve and run workflows**」を押すと実行され、承認なしで自動実行するようにも設定できる（設定名は**未確認**）。

- そのため、承認して実行するまで、必須チェック（`ci-success` など）は揃わないはずです（上記からの推論。このリポジトリでは**実機未確認**）。
- 必須の承認レビューがある場合、**依頼した本人の承認は数えられず**、別のレビュアーの承認が必要（公式）。
- ruleset の公式ドキュメントには、Copilot が作った（人に帰属しない）PR は、設定した承認数より**もう 1 件多く承認が必要**になる設定（public preview、既定で有効）が載っている。このリポジトリでは承認 1 件の設定なので、2 件必要になる可能性がある（**実機未確認**）。
- Copilot は default ブランチへの push やマージはできず、ruleset の対象になる（公式）。ruleset が Copilot と非互換だとアクセスがブロックされ、その場合は Copilot を bypass actor に追加する（公式）。`required_signatures` や `required_linear_history` との互換性の具体的な記載は見つからなかった（**未確認**）。

**Q5. Copilot code review は必須チェック（status check）になるか？**

**なりません。** `copilot_code_review` ルールは「Copilot にレビューを依頼する」設定で、`required_status_checks` の一覧には入っていません。さらに公式では、**既定では Copilot のレビューは必須の承認数に数えられません**（Copilot approvals の設定を有効にした場合は数えられる、public preview）。つまり、Copilot のレビューは人の承認の**代わりにはならず**、補助です（ADR 0009 の方針どおり）。Copilot のレビューが status check として表示されるか・名前は何か、は**未確認**です。

**Q6. Copilot の利用に必要なプラン・設定と、Actions の実行時間の課金の違いは？**

課金の軸が**別**です（金額は書きません）。

| 項目                                  | 軸                                                                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Copilot 自体（レビュー・cloud agent） | Copilot の利用枠（公式の billing ページで、旧来の premium requests と新しい usage-based の AI credits の両方が説明されている。**どちらが自分のアカウントに適用されるかは設定画面で確認**） |
| Actions の実行時間（A の分類すべて）  | Actions の実行時間。**public リポジトリで標準の GitHub ホストランナーなら無料**（公式）。セルフホストも無料。                                                                              |
| Copilot code review の Actions 時間   | 公式の changelog によると、2026-06-01 から **private リポジトリ**で Actions の実行時間も消費する。public は対象外。このリポジトリ（public）では影響しない見込み                            |
| Copilot cloud agent の Actions 時間   | 環境は Actions で動く（公式）。課金の扱いは、確認できた公式ページには記載が見つからなかった（**未確認**。検索結果の要約では Actions 時間も使うとされている）                               |

- **プラン**: Copilot code review の自動レビューは Pro / Pro+ / Max / Business / Enterprise で利用可、**Free プランは対象外**（公式）。cloud agent は「機能はプランと組織のポリシーによる」とされている（具体的な一覧は**未確認**）。
- **設定**: ruleset の `copilot_code_review` は Copilot のライセンスが前提。cloud agent は Settings > Copilot で有効化する。

**Q7. `rulesets/default-branch.json` をリポジトリに置いたら適用されるか？**

**されません。** Settings > Rules > Rulesets から**取り込んで**初めて有効になります。2026-10-19 時点で、このリポジトリに ruleset は 1 つも無いことを `gh api` で確認しました（下記「手動で行う設定」）。

**Q8. Dependabot の PR に対して、どの検査が実際に走るか？**

`ci.yml`・`pr-title.yml`・`dependency-review.yml`・`workflow-lint.yml`・`codeql.yml`・`dependabot-auto-merge.yml` など、`pull_request` で動くものは走ります（上記 Q3 の権限制限つき）。タイトルは `dependabot.yml` の `commit-message` で `chore(deps): ...` / `ci(deps): ...` になるので、`pr-title` に通ります。

---

## 3. ファイル一覧（早見表）

各ファイルの先頭に、目的・理由と「このファイルを読む／実行するのは誰か」をコメントで書いています（JSON と Markdown の一部を除く）。

| パス                                          | 種類               | 一言でいうと                                  | 主体  |
| --------------------------------------------- | ------------------ | --------------------------------------------- | ----- |
| `workflows/ci.yml`                            | ワークフロー       | コードの品質ゲート（`pnpm verify`）           | A     |
| `workflows/pr-title.yml`                      | ワークフロー       | PR タイトルの形式検査                         | A     |
| `workflows/dependency-review.yml`             | ワークフロー       | 追加される依存の脆弱性・ライセンス審査        | A     |
| `workflows/workflow-lint.yml`                 | ワークフロー       | ワークフロー自体の検査（actionlint / zizmor） | A     |
| `workflows/codeql.yml`                        | ワークフロー       | ソースコードの静的セキュリティ解析            | A     |
| `workflows/scorecard.yml`                     | ワークフロー       | リポジトリのセキュリティ慣行を外部基準で採点  | A     |
| `workflows/labeler.yml`                       | ワークフロー       | PR にラベルを自動付与                         | A     |
| `workflows/dependabot-auto-merge.yml`         | ワークフロー       | 低リスクな依存更新の自動マージを予約          | A     |
| `workflows/copilot-setup-steps.yml`           | ワークフロー       | Copilot の作業環境を準備                      | C → A |
| `actions/setup/action.yml`                    | 共通部品           | Node.js・pnpm・依存のセットアップ（共通化）   | A     |
| `rulesets/default-branch.json`                | 設定（取り込み用） | `main` ブランチの保護ルール                   | G     |
| `CODEOWNERS`                                  | 設定               | パスごとのレビュー責任者                      | G     |
| `dependabot.yml`                              | 設定               | 依存関係の自動更新ルール                      | G     |
| `labeler.yml`                                 | 設定               | ラベル付与のルール定義                        | A     |
| `release.yml`                                 | 設定               | リリースノートの分類ルール                    | G     |
| `zizmor.yml`                                  | 設定               | zizmor の例外設定（理由付き）                 | A     |
| `ISSUE_TEMPLATE/config.yml`                   | テンプレート       | Issue 作成画面の設定                          | G     |
| `ISSUE_TEMPLATE/bug_report.yml`               | テンプレート       | バグ報告フォーム                              | G     |
| `ISSUE_TEMPLATE/feature_request.yml`          | テンプレート       | 機能要望フォーム                              | G     |
| `pull_request_template.md`                    | テンプレート       | PR の既定テンプレート（重要度: 中）           | G     |
| `PULL_REQUEST_TEMPLATE/large.md`              | テンプレート       | PR テンプレート（重要度: 大）                 | G     |
| `PULL_REQUEST_TEMPLATE/medium.md`             | テンプレート       | PR テンプレート（重要度: 中。既定と同内容）   | G     |
| `PULL_REQUEST_TEMPLATE/small.md`              | テンプレート       | PR テンプレート（重要度: 小）                 | G     |
| `CONTRIBUTING.md`                             | ドキュメント       | 開発の流れとマージ条件                        | G     |
| `SECURITY.md`                                 | ドキュメント       | 脆弱性の非公開報告の案内                      | G     |
| `copilot-instructions.md`                     | AI 向け指示        | Copilot への共通指示とレビュー観点            | C     |
| `instructions/github-actions.instructions.md` | AI 向け指示        | ワークフロー編集時だけの規約                  | C     |

`.github/` の外にある関連ファイル:

- `.node-version`: Node のバージョンの唯一の定義（現在 22）。CI・Copilot 環境（`actions/setup` 経由）・ローカルのバージョンマネージャーが共通で読む。pnpm のバージョンは `package.json` の `packageManager` から読む。

---

## 4. 各ファイルの詳細

### 4.1 品質ゲート（コードが壊れていないことを保証する）

#### `workflows/ci.yml` — CI（継続的インテグレーション） [A]

- **機能**: コードを取得し、環境を整え、`pnpm verify`（format・lint・型チェック・テスト・ビルド）を実行します。最後に `ci-success` という集約ジョブで結果をまとめます。
- **効果**: `main` に入るコードが、常に「ビルドでき、テストが通る」状態になります。ローカルと同じコマンドを使うので、結果の食い違いが起きにくくなります。
- **押さえどころ**:
  - **`ci-success`（集約ジョブ）**: ruleset の必須チェックには、このジョブ 1 つだけを登録します。ジョブを増やしても、ruleset を編集せず `needs:` に追記するだけで必須化できます。`if: always()` が付いているのは、検査が失敗したときにこのジョブが「スキップ」になると、GitHub がスキップを成功扱いして、失敗した PR をマージできてしまうためです。
  - **`concurrency`**: 同じ PR に続けて push したとき、古い実行をキャンセルして時間を節約します。`main` への push はキャンセルせず、全コミットの結果を残します。
  - **`permissions: contents: read`**: トークンを読み取り専用に絞ります。
  - **`persist-credentials: false`**: チェックアウトしたトークンを `.git/config` に残さず、後続ステップに盗まれる余地をなくします。
  - **`timeout-minutes`**: ハングしたジョブが長時間ランナーを占有するのを防ぎます。
- **やってはいけないこと**: `on:` に `paths:` を付けない（必須チェックがスキップされて Pending のまま残り、PR がマージできなくなる）。

#### `actions/setup/action.yml` — 共通セットアップ（composite action） [A]

- **機能**: pnpm → Node.js → 依存インストール（`pnpm install --frozen-lockfile`）という手順を 1 か所にまとめた部品です。`ci.yml` と `copilot-setup-steps.yml` が `uses: ./.github/actions/setup` で呼び出します。
- **効果**: 複数のワークフローに同じ手順をコピーすると、Node のバージョンやキャッシュ設定が少しずつズレて「CI では通るのに Copilot の環境では落ちる」といった不一致が起きます。ここを唯一の定義にすれば、変更は 1 ファイルで済み、レビューも 1 か所で済みます。
- **押さえどころ**:
  - **pnpm を `setup-node` より先に入れる**: `setup-node` の `cache: pnpm` が pnpm コマンドでストアの場所を調べるため、順序を入れ替えると失敗します。
  - **バージョンはワークフローに直書きしない**: pnpm は `package.json` の `packageManager`、Node は `.node-version` から読みます。ローカルと CI のバージョンを 1 つの情報源で一致させるためです。
  - **`--frozen-lockfile`**: lockfile と `package.json` が食い違っていたら失敗させ、CI がこっそり別の依存で検証するのを防ぎます。
  - **`install` 入力**: 依存インストールを省きたい軽量ジョブ向けのスイッチ（`'true'` / `'false'` の文字列で渡す）。
- **前提**: 先に `actions/checkout` が必要です（`./` はチェックアウト済みのワークスペース内を指すため）。

---

### 4.2 セキュリティ（脆弱性と攻撃を防ぐ・見つける）

#### `workflows/codeql.yml` — CodeQL（ソースコードの静的解析） [A]

- **機能**: GitHub の CodeQL でソースコードを解析し、SQL インジェクション・XSS・パストラバーサルなどをデータフローまで追って検出します。対象は `javascript-typescript` と、ワークフロー自体を調べる `actions` の 2 つです。
- **効果**: レビューでは見落としやすい脆弱性を、マージ前に自動で見つけます。結果は Security タブの Code scanning に表示され、PR には差分の指摘が付きます。ruleset の `code_scanning` ルールと組み合わせると、重大度 High 以上のアラートがある PR はマージできません。
- **押さえどころ**:
  - **`queries: security-extended`**: 既定より検出範囲が広いクエリです。誤検知はやや増えますが、公開アプリでは見逃しの損失のほうが大きいため採用しています。
  - **週次の定期実行**: コードが変わらなくても CodeQL のクエリは更新されるため、定期的に再スキャンします。
  - **`security-events: write`**: 結果をアップロードするために必要な、唯一の書き込み権限です。
- **前提**: リポジトリ設定で CodeQL が「default setup」になっていると、このワークフローのアップロードが失敗します。**Settings > Code security > CodeQL analysis を「Advanced」にしてください。**
- **注意**: ruleset の `code_scanning` ルールは、公式ドキュメントによると「必須のツールが**未設定**」「解析が**実行中**」のときもマージをブロックします。ruleset を取り込む前に、`codeql.yml` が一度は完了していることを確認してください。
- **コスト**: public リポジトリは無料。private は有償（GitHub Code Security）が必要です。

#### `workflows/dependency-review.yml` — 依存関係の審査 [A]

- **機能**: PR で追加・更新される依存関係を、依存グラフの差分から審査します。
- **効果**: 既知の脆弱性を持つパッケージや、ライセンス上問題のあるパッケージを、**マージされる前に**止めます。
  - `moderate` 以上の既知脆弱性を含む依存の追加をブロック（`low` まで止めると頻繁に止まり、形骸化するため）。
  - 強いコピーレフト（AGPL・SSPL）は拒否。ネットワーク越しに使うだけでソース公開義務が生じ得るためです。
  - OpenSSF Scorecard の点数と、修正済みバージョンを表示します（ブロックはしない判断材料）。
- **Dependabot との役割分担**: Dependabot alerts は「すでに入っている依存」の脆弱性を事後に知らせ、Dependency Review は「これから入る依存」を事前に止めます。
- **押さえどころ**: `checkout` をしません。差分は API から取得するので、PR のコードをランナーに展開せず、攻撃面が小さくなります。PR 専用のイベント（`pull_request`）なので、将来マージキューを導入するときは必須チェックの構成を見直す必要があります。

#### `workflows/scorecard.yml` — OpenSSF Scorecard（セキュリティ慣行の採点） [A]

- **機能**: ブランチ保護・SHA 固定・最小権限・依存の自動更新などを、外部の基準（OpenSSF）で定期的に自己診断します。
- **効果**: このディレクトリの設定は「入れた時点」では正しくても、運用中に劣化しやすいものです（誰かが保護を外した、など）。第三者基準での継続的な点検で、その劣化に気づけます。ブランチ保護ルールが変更されたときにも即座に再評価されます。
- **押さえどころ**: 結果を公開（`publish_results: true`）する場合、ワークフローの書き方に制約があります（トップレベルの `env` 禁止など）。**このファイルに他のステップを足すと公開が失敗することがある**ので、変更は最小限に。private リポジトリでは `publish_results` を `false` にしてください。

#### `workflows/workflow-lint.yml` と `zizmor.yml` — ワークフロー自体の検査 [A]

- **機能**: GitHub Actions のワークフローを、2 つのツールで検査します。
  - **actionlint**: 構文・型・式の誤り、存在しない入力名、`run:` スクリプトのバグ（shellcheck 同梱）を検出します（「動かない」を見つける）。
  - **zizmor**: 過剰な権限、SHA 未固定、テンプレートインジェクション、危険なトリガー、資格情報の残留などを検出します（「危ない」を見つける）。
- **効果**: ワークフローは**本番やシークレットに触れ得る、最も権限の強いコード**です。アプリのコードと同等以上に検査することで、CI 経由の攻撃や設定ミスを防ぎます。
- **押さえどころ**:
  - **パス条件を付けない**: 必須チェックにするため（スキップされると Pending のまま残る）。どちらも数十秒で終わります。
  - **Docker イメージをバージョン指定で使う**: `curl | bash` で取得する方式は、取得元が改ざんされると任意コードが実行されるため避けています。
  - **`advanced-security: false` + `annotations: true`**: 指摘を PR の該当行に表示し、指摘があればジョブを失敗させます（GHAS の無い private リポジトリでも動く）。zizmor-action の README によると、1 ステップが画面に出せる注釈は 10 件までという GitHub 側の制限があります。
- **`zizmor.yml`（例外設定）**: 監査そのものは無効化せず、意図して許容する箇所だけを**ファイル単位で**除外し、**理由を必ず書く**方針です。現在の例外は次の 3 つです。

  | ルール               | 除外対象                            | 理由                                                                                                                                                                 |
  | -------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `dangerous-triggers` | `labeler.yml`                       | `pull_request_target` を使うが、PR のコードを checkout も実行もせず、変更ファイル一覧を API で取得するだけのため                                                     |
  | `artipacked`         | `copilot-setup-steps.yml`           | Copilot は作業結果をコミットするため、認証情報を残す既定のままにしている。トークンは `contents: read` のみで、漏れても書き込めない（Copilot 側の必要性は**未確認**） |
  | `self-repository`    | `ci.yml`、`copilot-setup-steps.yml` | 推奨の `$/` 構文（GitHub が 2026-07-30 に導入）に actionlint 1.7.12 が未対応（対応 PR rhysd/actionlint#732 は、2026-10-19 時点で未マージ）のため、当面は `./` を使う |

  例外を追加する PR では、**理由の妥当性をレビュー**してください。`$/` に対応したら、`./` を置き換えて `self-repository` の除外を削除します。

#### `dependabot.yml` — 依存関係の自動更新 [G]

- **機能**: npm（pnpm の lockfile 対応、ワークスペース全体）と GitHub Actions の依存を、週 1 回（月曜 9:00 JST）チェックし、更新 PR を作ります。
- **効果**: ライブラリや action を継続的に最新へ追従させ、脆弱性の修正版を素早く取り込めます。古い依存ほど、いざという時のメジャー更新が辛くなります。
- **押さえどころ**:
  - **週 1 回にまとめる**: 毎日だと PR が多すぎてレビューされなくなり、形骸化します。
  - **グループ化**: minor / patch は 1 つの PR にまとめます（PR 数と CI 実行回数の削減）。**major は個別の PR** にして、破壊的変更を 1 つずつ確認できるようにします。
  - **`cooldown: 7 日`**: 公開から 7 日未満のバージョンには更新しません（公式の既定は 3 日。zizmor は 7 日以上を推奨）。パッケージ乗っ取り（悪意ある版の公開）の多くは数日以内に発見・削除されるため、少し待つだけでその種の攻撃を避けられます。**セキュリティ更新には適用されません**（公式: `cooldown` は version updates のみ）。
  - **`commit-message`**: Conventional Commits に合わせます（`chore(deps): …` / `ci(deps): …`）。`prefix-development` は npm など一部のエコシステムのみ対応です。
  - **GitHub Actions も対象**: SHA 固定した action を、末尾の `# vX.Y.Z` コメントごと更新します。`directory: /` は `.github/workflows` とルートの `action.yml` を見るので、composite action（`/.github/actions/*`）は `directories` で明示的に追加しています（`directories` はグロブ対応、`directory` は非対応）。
  - **ラベル**: 既定で `dependencies` とエコシステムのラベル（npm なら `javascript`）が付きます。`labeler.yml` の `dependencies` は、Dependabot の PR（ブランチ名 `dependabot/`）も対象にして、`sync-labels` が Dependabot 付与のラベルを外さないようにしています。
- **前提**: セキュリティ更新（脆弱性の即時修正 PR）は、Settings > Code security で「Dependabot security updates」を有効にしたときだけ作られます。

#### `workflows/dependabot-auto-merge.yml` — 低リスクな更新の自動マージ予約 [A]

- **機能**: Dependabot の PR のうち、**パッチ更新**と**開発依存の minor 更新**だけに、auto-merge（条件を満たしたら自動でマージ）を予約します。
- **効果**: 毎週の低リスクなマージ作業をなくし、依存を新しく保ちます。
- **安全装置**:
  - 行うのは「予約」だけです。実際のマージは、ruleset の必須チェックと必須レビューがすべて満たされた時点で GitHub が行います。CI が落ちればマージされません。
  - major 更新と本番依存の minor 更新は、破壊的変更の可能性があるため、必ず人がレビューします。
  - 判定は `github.actor` ではなく **PR の作成者**（`user.login`）で行います。`actor` は「最後に操作した人」なので、攻撃者が Dependabot の PR を細工して偽装できます（zizmor の `bot-conditions` が指摘する点）。
  - 更新内容を取得する `fetch-metadata` は、コミットが本当に Dependabot によるもの（署名）かも検証します。
  - `pull_request_target` ではなく `pull_request` を使います。Dependabot のトークンは既定で読み取り専用ですが、`permissions:` で `contents: write` と `pull-requests: write` に引き上げています（公式の自動マージの例と同じ構成）。
- **前提**: **Settings > General > Pull Requests の「Allow auto-merge」を有効にする**必要があります。承認レビューを必須にしている場合、人が Approve した時点でマージされます（Actions に PR の承認を許可する設定は、権限昇格の経路になるので有効にしないでください）。マージキューを使う場合は `GITHUB_TOKEN` では PR をキューに入れられないため、別のトークンが必要です（公式）。

#### `SECURITY.md` — 脆弱性報告のポリシー [G]

- **機能**: サポート対象（最新の `main` のみ）、報告方法、対応の流れ（受領連絡は 5 営業日以内を目標）を示します。リポジトリの Security タブと Issue 作成画面に案内が表示されます。
- **効果**: 脆弱性が**公開 Issue に書かれる（修正前に攻撃者へ知られる）のを防ぎ**、非公開の報告経路（Security Advisories）へ誘導します。
- **前提**: Settings > Code security で「Private vulnerability reporting」を有効にしてください。

---

### 4.3 ガバナンス（誰が・どんな条件でマージできるか）

#### `rulesets/default-branch.json` — `main` ブランチの保護ルール [G]

- **機能**: デフォルトブランチ（`~DEFAULT_BRANCH`）に対するルールを、JSON として定義したものです。
- **効果**: 「ルール」を人の約束ではなく、**GitHub が強制する仕組み**にします。
- **重要**: **このファイルを置いただけでは適用されません。** Settings > Rules > Rulesets の「Import a ruleset」から取り込んで初めて有効になります（取り込み後は、画面側が正になります）。各項目の理由は「7. ruleset の各項目と理由」を参照してください。
- **含まれるルール**:

  | ルール                    | 内容                                                                                            | 効果                                                     |
  | ------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
  | `deletion`                | ブランチの削除を禁止                                                                            | `main` を誤って消せない                                  |
  | `non_fast_forward`        | force push を禁止                                                                               | 履歴の書き換えを防ぐ                                     |
  | `required_linear_history` | マージコミットを禁止し、履歴を一直線にする                                                      | 履歴が読みやすく、問題のコミットを特定・取り消ししやすい |
  | `required_signatures`     | 署名付きコミットを必須化（PR のブランチ側のコミットにも効く。後述）                             | コミット作者のなりすましを防ぐ                           |
  | `pull_request`            | 承認 1 件以上・Code Owner の承認・push 後に再承認・レビュー指摘の解決・マージ方法は squash のみ | レビューを必須にし、承認後のすり替えを防ぐ               |
  | `required_status_checks`  | `ci-success` / `pr-title` / `dependency-review` / `actionlint` / `zizmor` の成功を必須化        | 検査を通らないコードをマージ不可にする                   |
  | `code_scanning`           | CodeQL で重大度 High 以上のアラートがあればマージ不可                                           | 重大な脆弱性を持ち込ませない                             |
  | `copilot_code_review`     | push のたびに Copilot がレビュー（下書き PR は除く）。**必須チェックでも承認数でもない**        | 人のレビューを補う、機械的な一次チェック                 |

#### `CODEOWNERS` — パスごとのレビュー責任者 [G]

- **機能**: PR が触れたパスに応じて、レビュー責任者を自動でレビュアーに追加します。書式は `.gitignore` と同じパターンで、**後に書いた行ほど優先**されます。
- **効果**: ruleset の「Code Owner の承認を必須」と組み合わせると、オーナーの承認なしにはマージできません。
- **このリポジトリでの方針**:
  - 既定のオーナー（`*`）と、領域ごと（`apps/web`・`apps/api`・`packages/*`）を定義しています。
  - **高リスク領域**を明示しています。CI/CD（`.github/`）と DB マイグレーション（不可逆な変更になり得る）です。
  - **AI エージェントの設定**（`CLAUDE.md`・`.claude/`・`.mcp.json`）も対象です。エージェントの権限や挙動を変えるため、人間のコードと同じくレビュー対象にします。
- **注意**: `.github/` 自体を厳しく保護してください。ここを書き換えられると、レビュー要件そのものを外せてしまいます。個人の代わりにチーム（`@org/backend` など）を指定すると、異動・退職でも設定変更が不要になります。

#### `workflows/pr-title.yml` — PR タイトルの形式検査 [A]

- **機能**: PR タイトルが Conventional Commits 形式（`feat:` / `fix:` / `docs:` など、スコープ `(api)` と破壊的変更 `!` は任意）かを検査します。
- **効果**: このリポジトリは squash マージのみで、**PR タイトルがそのまま `main` のコミットメッセージ**になります（そのための設定は「6. 手動で行う設定」）。タイトル 1 か所を検査すれば、履歴全体が揃います。作業途中の細かいコミットを縛らないので、開発者の負担も最小です。履歴からリリースノートを自動生成でき、`feat!:` のような破壊的変更も一目で分かります。
- **押さえどころ**:
  - **PR タイトルは外部の人が自由に書ける「信頼できない入力」**です。`run:` に `${{ github.event.pull_request.title }}` を直接書くと、タイトルにコマンドを仕込むだけで実行されてしまいます（スクリプトインジェクション）。**必ず `env:` 経由**で渡し、シェル変数として扱っています。
  - 外部の action を使わず、正規表現 1 つのシェルで書いています（依存を増やさず、攻撃面を小さくする）。
  - `edited` イベントを含むので、タイトルを直すだけで再検査されます（コードの push 不要）。
  - トークンは不要なので `permissions: {}` です。

---

### 4.4 自動化（ラベルとリリースノート）

#### `workflows/labeler.yml` と `labeler.yml` — PR への自動ラベル付け [A]

- **機能**: PR で変更されたファイルのパスとブランチ名から、ラベルを自動で付けます。ルールの定義が `labeler.yml`（設定データ）、それを実行するのが `workflows/labeler.yml`（Actions）です。
- **効果**: PR 一覧で「どの領域の変更か」が一目で分かり、レビュアーの割り当て・検索・リリースノートの分類に使えます。
- **付与されるラベル**:

  | ラベル                                                        | 付く条件                                                                                | 狙い                                                            |
  | ------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
  | `area/web` `area/api` `area/db` `area/content` `area/schemas` | 対応するディレクトリを変更                                                              | 領域をディレクトリ構成から機械的に決める                        |
  | `dependencies`                                                | `package.json`・`pnpm-lock.yaml`・`pnpm-workspace.yaml` を変更、または Dependabot の PR | ライセンス・脆弱性・lockfile の妥当性という特殊な観点でレビュー |
  | `ci`                                                          | `.github/workflows/**`・`.github/actions/**` を変更                                     | 権限やシークレットに影響し得るため、目立たせて慎重にレビュー    |
  | `ai-config`                                                   | `CLAUDE.md`・`.claude/**`・`.mcp.json`・Copilot 関連の指示を変更                        | エージェントへの指示もレビュー対象にする                        |
  | `documentation`                                               | 変更ファイルが**すべて**ドキュメントのとき                                              | コード変更を含む PR には付けない                                |
  | `enhancement`                                                 | ブランチ名が `feat/`・`feature/` で始まる                                               | 種別を、GitHub 既定のラベル名に合わせて共通化                   |
  | `bug`                                                         | ブランチ名が `fix/`・`bugfix/`・`hotfix/` で始まる                                      | 同上（Issue テンプレート・リリースノートと共通）                |

- **押さえどころ（セキュリティ）**:
  - **`pull_request_target` を使います。** fork からの PR にもラベルを付けるために必要ですが、このトリガーは**書き込み権限付き**で、**`main` 側のワークフロー定義**で動きます。そのため、**このワークフローでは PR のコードを絶対に checkout・実行してはいけません**（攻撃者が仕込んだコードが書き込み権限付きで動く "pwn request" 攻撃になります）。`actions/labeler` は変更ファイル一覧を API で取得するだけなので安全です。この理由で `zizmor.yml` に例外が書かれています。
  - `pull_request_target` は `main` 側の設定で動くため、`labeler.yml` を変更する PR 自身には新しいルールが適用されません（actions/labeler の README の注意）。マージ後に反映されます。
  - **ラベルの条件の書き方**: `actions/labeler` では、同じラベルの下の条件は**既定で AND** です。OR にしたいときは `any:` で囲みます（`dependencies` がその例）。
  - **`sync-labels: true`**: 条件に合わなくなったラベルは外します。`labeler.yml` に定義のない手動ラベルは外されません。
  - ラベルが存在しなければ、付与時に自動作成されます（色は後から Settings > Labels で調整可能）。

#### `release.yml` — リリースノートの分類 [G]

- **機能**: Releases で「Generate release notes」を使ったとき、マージ済み PR をラベルごとに見出しで分類します。
- **効果**: 手書きのリリースノートが不要になります。ラベルは labeler・Issue テンプレート・Dependabot が自動で付けるので、人が意識しなくても分類されます。
- **分類の順序**（**上から順に、最初に一致したカテゴリ**に入ります）: ⚠️ 破壊的変更 → ✨ 新機能 → 🐛 バグ修正 → 📝 ドキュメント → 🔧 CI / 開発環境 → 📦 依存関係 → その他。
- **押さえどころ**: 破壊的変更を最上位に置いて見落としを防ぎます。最後の `'*'`（その他）は、どれにも当てはまらない PR の受け皿で、これが無いと PR がリリースノートから漏れます。`skip-changelog` ラベルを付けた PR は除外されます。GitHub Actions の更新 PR は `ci` と `dependencies` の両方が付くため、先に一致する「CI / 開発環境」に入ります。

---

### 4.5 コラボレーション（Issue・PR・参加方法）

#### `ISSUE_TEMPLATE/` — Issue のフォーム [G]

- **`config.yml`**: テンプレートを使わない白紙の Issue を**禁止**し（`blank_issues_enabled: false`）、脆弱性報告を非公開の窓口へ誘導します。再現手順や環境が欠けた Issue は、聞き返しの往復でトリアージ時間を浪費するためです。
- **`bug_report.yml`**: バグ報告フォーム（Issue Forms 形式）。
  - 必須項目（何が起きたか・再現手順・期待した動作）を**強制**できます。Markdown のテンプレートでは強制できません。
  - ログ欄は `render: shell` で、貼り付けた内容が自動でコードブロックになります。
  - 「シークレットや個人情報を含まない」の確認チェックを必須にしています。
  - `bug` ラベルが自動付与され、リリースノートの分類にも使われます。
- **`feature_request.yml`**: 機能要望フォーム。**解決策より先に「課題」を書かせる**構成です（思いついた解決策が最適とは限らず、課題が明確なら別解を検討できるため）。「受け入れ条件」は、そのまま実装者（人や Copilot cloud agent）への完了条件になります。`enhancement` ラベルが自動付与されます。

#### `pull_request_template.md` と `PULL_REQUEST_TEMPLATE/` — PR テンプレート（重要度: 大・中・小） [G]

- **機能**: PR 作成時に、本文欄へ説明とチェックリストの雛形を入れます。重要度に応じて 3 種類あります（選び方は「9. PR テンプレートの選び方」）。
- **仕組み（公式ドキュメントより）**: 複数のテンプレートは `PULL_REQUEST_TEMPLATE/` ディレクトリ（ルート・`docs/`・`.github/` のいずれか）に置き、URL の `template` クエリパラメータで選びます。PR の作成画面には、Issue のような**テンプレートの選択画面はありません**。テンプレートは default ブランチにマージされて初めて使えます。
- **このリポジトリの構成**:
  - `pull_request_template.md`（既定）: パラメータなしで PR を作ったときの内容。**「中」と同一内容**にしています。最も多い通常の変更向けを既定にし、重い「大」を毎回消す手間を避けるためです。
  - `PULL_REQUEST_TEMPLATE/large.md` / `medium.md` / `small.md`: URL の `?template=large.md` などで選びます。
  - 既定ファイルと `medium.md` の本文は同じなので、**片方を直したらもう片方も直す**こと。
- **効果**: 「なぜ変更したか」（コードから読み取れない情報）の書き漏れを防ぎます。チェックリストは `CLAUDE.md` の Definition of Done と対応しています。
- **押さえどころ**:
  - `Closes #123` と書くと、マージ時に Issue が自動でクローズされます。
  - 該当しない項目は**消さずに「対象外」と書く**運用です（消すと「確認し忘れた」のか「不要と判断した」のかレビュアーが区別できないため）。
  - 「AI が生成したコードを自分で読み、説明できる」という項目があります。AI を使うことを前提に、責任の所在を明確にするためです。
  - ルートの単一ファイルとディレクトリを**併用**したときの挙動は、公式ドキュメントに記載がありません（**未確認**）。最初の PR 作成時に、パラメータなしで既定の内容が出ることを確認してください。

#### `CONTRIBUTING.md` — コントリビューションガイド [G]

- **機能**: 開発の流れ（Issue → ブランチ → `pnpm verify` → PR（重要度に合ったテンプレート）→ レビュー → squash マージ）と、マージの条件を示します。`.github/` に置くと、Issue・PR の作成画面にリンクが表示されます。
- **効果**: 初めて参加する人が、迷わず同じ手順で進められます。詳細な規約は `CLAUDE.md` と `.claude/rules/` にあり、ここには**流れだけ**を書くことで二重管理を避けています。

---

### 4.6 AI エージェント（Copilot）向けの設定 [C]

#### `copilot-instructions.md` — Copilot への共通指示

- **機能**: Copilot（VS Code のチャット、cloud agent、code review）が読む指示です。**実行はされません。**
- **効果**: プロジェクトの構成・守ること・**コードレビューの観点**を Copilot に伝え、レビューやコード提案の品質を揃えます。
- **押さえどころ**:
  - **正（Single Source of Truth）は `CLAUDE.md`** です。ここには Copilot に必要な要点と、`CLAUDE.md` にない「レビュー観点」だけを書き、重複を避けます（片方だけ更新されて矛盾するのを防ぐため）。指示が矛盾したら `CLAUDE.md` を優先します。
  - **短く保つ**: 長い指示は重要な部分が埋もれ、守られにくくなります。
  - **レビュー観点の優先順位**: ①セキュリティ → ②正しさ → ③契約（`packages/schemas` との整合）→ ④テスト → ⑤保守性。好みの問題（命名の細部など）は指摘させません。

#### `instructions/github-actions.instructions.md` — ワークフロー編集時だけの規約

- **機能**: `applyTo` で `.github/workflows/**` と `.github/actions/**` に限定した指示です。これらに関わる作業のときだけ Copilot が読みます。**実行はされません。**
- **効果**: ワークフローは**最も権限の強いコード**なので、ルールを明文化して AI にも守らせます。多くは `actionlint` / `zizmor` でも機械的に検査されているので、**文章と機械の二重**で守られます。
- **必須ルール**: `uses:` は 40 文字のコミット SHA で固定（`# vX.Y.Z` を付ける）／最小の `permissions:`／`persist-credentials: false`／`timeout-minutes`／外部入力を `run:` に直接書かない／`pull_request_target` で PR のコードを実行しない。
- **推奨**: `concurrency` の設定／必須チェックに `paths` を付けない／新しい必須ジョブは `ci-success` の `needs` に追加／サードパーティ action の追加前にシェル数行で書けないか検討する。

#### `workflows/copilot-setup-steps.yml` — Copilot の作業環境の準備 [C → A]

- **機能**: Copilot cloud agent が Issue から PR を作るとき、または Copilot が PR をレビューするとき、作業の**開始前**にこのジョブが **Actions のランナー上で**実行されます。依存のインストールと、Prisma Client の生成を行います。起動するのは Copilot です（境界の詳細は「2.3 FAQ」の Q1）。
- **効果**: Copilot が試行錯誤でインストールする時間を省き、テストや lint を確実に実行できるようにします。**CI と同じ `actions/setup` を使う**ので、「CI で通る環境」と「Copilot が作業する環境」が一致し、Copilot が CI で落ちる PR を作るのを減らせます。
- **仕様上の制約**（公式ドキュメントより）:
  - ファイル名は `copilot-setup-steps.yml` 固定、**ジョブ名も `copilot-setup-steps` 固定**（違うと認識されません）。
  - Copilot が読むのは、ジョブの `steps` / `permissions` / `runs-on` / `services` / `snapshot` / `timeout-minutes`（最大 59）だけで、それ以外の設定は無視されます。`actions/checkout` の `fetch-depth` は Copilot 側で上書きされます。
  - **default ブランチにマージされて初めて有効**になります。
- **押さえどころ**: `on:` には手動実行と、このファイル・共通セットアップを変更した PR/push を入れてあります（セットアップが壊れていないかの確認用）。これは必須チェックではないので、`paths` で絞っても問題ありません。`persist-credentials` を既定のままにしているのは、Copilot が後でコミットを積むためと想定しています（トークンは `contents: read` のみ。Copilot 側で本当に必要かは**未確認**）。`zizmor.yml` に、その旨の例外があります。

---

## 5. 共通の設計原則

ワークフローはすべて次の原則で書いています。新しく追加するときも守ってください（`instructions/github-actions.instructions.md` にも同じ内容があり、Copilot にも守らせています）。

- **action は SHA で固定**: タグは付け替え可能なため、action が乗っ取られると悪意あるコードが CI で動く（2025 年の tj-actions/changed-files 事件）。SHA なら内容が変わらない。末尾の `# vX.Y.Z` は Dependabot が自動更新する
- **最小権限**: ワークフロー先頭で `permissions` を絞り、書き込みはジョブ単位で理由付きで付与する
- **資格情報を残さない**: `actions/checkout` に `persist-credentials: false`（例外は `zizmor.yml` に理由付きで記録）
- **外部入力を `run:` に直接展開しない**: PR タイトル等は `env:` 経由で渡す（スクリプトインジェクション対策）
- **`pull_request_target` で PR のコードを実行しない**
- **全ジョブに `timeout-minutes`**: ハング時のランナー時間の浪費を防ぐ
- **必須チェックのワークフローに `paths` 条件を付けない**: スキップされると Pending のまま残りマージ不能になる
- **各設定に「なぜ」と「誰が読む・実行するか」を日本語コメントで書く**

---

## 6. 手動で行う設定（ファイルでは表現できないもの）

以下はリポジトリ設定画面（Settings）で行います。新しいリポジトリに移植したときも、この順に設定してください。

> **現状（2026-10-19 に `gh api` の読み取りで確認）**: 下の「現状」の列の値は、この日時点のスナップショットです。「要対応」は、このガイドの前提とまだ食い違っている点です（設定そのものは、このガイドの作業では変更していません）。

### チェックリスト

- [ ] **Rulesets**: `rulesets/default-branch.json` を取り込む（Settings > Rules > Rulesets）。現状: ruleset は**ゼロ**（要対応）
- [ ] **Allow auto-merge** を有効にする（`dependabot-auto-merge.yml` の前提）。現状: **無効**（要対応）
- [ ] **Squash マージのみ**を許可する。現状: merge commit が**有効**・rebase が**有効**（要対応）
- [ ] squash の既定コミットメッセージを **PR タイトル**にする（`pr-title.yml` の前提）。現状: `COMMIT_OR_PR_TITLE`（単一コミットの PR ではコミットメッセージが使われる。要対応）
- [ ] **Automatically delete head branches** を有効にする。現状: **無効**（要対応）
- [ ] **Always suggest updating pull request branches** を有効にする。現状: **無効**（要対応）
- [ ] **Dependabot security updates** を有効にする。現状: **無効**（要対応）
- [ ] **CodeQL analysis を「Advanced」**にする（`codeql.yml` の前提）。現状: 未確認（`gh api` では判定していない）
- [ ] **Dependency graph** を有効にする（public は既定で有効）
- [ ] **Private vulnerability reporting** を有効にする（`SECURITY.md` の前提）。現状: 未確認
- [ ] **Actions に PR の承認を許可しない**。現状: 許可していない（OK）
- [ ] **Workflow permissions を読み取りのみ**にする。現状: `read`（OK）
- [ ] **Require actions to be pinned to a full-length commit SHA** を有効にする。現状: **無効**（要対応。リポジトリの action はすべて SHA 固定済みなので、有効にしても動く見込み）
- [ ] Actions の許可範囲を絞る。現状: `all`（要対応・任意）
- [ ] Secret scanning と Push protection を有効にする。現状: どちらも**有効**（OK）
- [ ] **署名付きコミット**を使える状態にする（`required_signatures` の前提。下記）
- [ ] **Copilot**: code review のライセンス、cloud agent を使うなら Settings > Copilot で有効化（下記）

### 1. General

- Pull Requests
  - 「Allow merge commits」「Allow rebase merging」を**オフ**、「Allow squash merging」のみ**オン**
  - squash の Default commit message を「**Pull request title**」または「**Pull request title and description**」にする（PR タイトル = main のコミットメッセージになる。`pr-title.yml` の前提。API の値は `squash_merge_commit_title: PR_TITLE`）
  - 「Always suggest updating pull request branches」を**オン**
  - 「Allow auto-merge」を**オン**（`dependabot-auto-merge.yml` の前提）
  - 「Automatically delete head branches」を**オン**（マージ済みブランチの散らかりを防ぐ）

### 2. Actions > General

- Actions permissions: 「Allow OWNER, and select non-OWNER, actions and reusable workflows」（個人リポジトリの表記。組織・エンタープライズでは文言が変わる）を選び、GitHub 製と認証済み作成者の action に加えて、使用中の action（`pnpm/action-setup`、`ossf/scorecard-action`、`zizmorcore/zizmor-action`、`dependabot/fetch-metadata`）を許可する
- 「Require actions to be pinned to a full-length commit SHA」を**オン**（SHA 固定をプラットフォーム側でも強制）
- Workflow permissions: 「**Read repository contents and packages permissions**」（既定トークンを読み取り専用に）
- 「Allow GitHub Actions to create and approve pull requests」を**オフ**（ワークフローが自分で PR を承認できると、レビュー必須を迂回できるため）
- Fork pull request workflows: 「Require approval for first-time contributors」以上（外部からの初回 PR で勝手に CI を回させない）

### 3. Code security

- Dependency graph: オン
- Dependabot alerts: オン
- Dependabot security updates: オン
- Grouped security updates: オン
- Secret scanning: オン
- Push protection: **オン**（シークレットを含む push 自体をブロックする。事後検知より強力）
- Private vulnerability reporting: **オン**（`SECURITY.md` の前提）
- CodeQL analysis: 「**Advanced**」（default setup が有効だと `codeql.yml` の結果アップロードが失敗する）

### 4. Rulesets（ブランチ保護）

`rulesets/default-branch.json` をインポートします。

- 画面から: Settings > Rules > Rulesets > New ruleset > **Import a ruleset** で JSON を選択
- CLI から（リポジトリ管理者のみ）:

```sh
gh api --method POST repos/{owner}/{repo}/rulesets --input .github/rulesets/default-branch.json
```

**取り込む前に確認すること**（取り込むと、満たせない PR はマージできなくなります）:

- すべての必須チェック（`ci-success`・`pr-title`・`dependency-review`・`actionlint`・`zizmor`）が、一度は実行されていること
- CodeQL（`code_scanning` ルール）が一度は完了していること。公式ドキュメントでは、必須ツールが未設定または解析中のときもマージがブロックされる
- 署名付きコミットの運用ができること（下記）
- 取り込み後、`bypass_actors` に「Repository admin」が表示されること（`actor_id: 5` の意味は、公式の REST ドキュメントに数値の対応表が無く**未確認**）

**署名付きコミット（`required_signatures`）に関する注意**: 公式ドキュメントには「PR のブランチ（head）に署名のないコミットがあると、GitHub が最終的な squash コミットに署名するとしても、squash マージがブロックされ得る」とあります。つまり、**開発者のコミット自体に署名が必要**です（GitHub の画面から作るコミットや、署名を設定したローカルのコミットなど）。署名の設定は、Settings の SSH and GPG keys と、ローカルの `git config` で行います。Copilot cloud agent のコミットについては、公式のガイドレールのチュートリアルで「Copilot はコミットに署名できる」とされています（詳細は**未確認**）。

### 5. Copilot

- Copilot code review: ruleset の `copilot_code_review` ルールで、全 PR に自動レビューを依頼する。Free プランは対象外（Pro / Pro+ / Max / Business / Enterprise で利用可）
- Copilot cloud agent: Settings > Copilot で有効化。Issue を Copilot に割り当てると、`copilot-setup-steps.yml` で準備した環境で PR を作成する
- Copilot が作った PR も通常の PR と同じ ruleset（必須チェック・人のレビュー）を通過しないとマージできない。AI の変更にも人の承認を必須にするための設計。ただし、Copilot の PR では Actions が自動実行されない（「Approve and run workflows」が必要）など、通常の PR と違う点がある（「2.3 FAQ」の Q4）

---

## 7. ruleset の各項目と理由

JSON にはコメントを書けないため、ここで説明します。ルール名とパラメータ名は、GitHub の Rulesets REST API の公式ドキュメントと照合済みです（`pull_request`・`required_status_checks`・`code_scanning`・`copilot_code_review`・`required_signatures` の各キーが仕様どおり。必須キーはすべて指定済み）。

- `conditions.ref_name.include: ["~DEFAULT_BRANCH"]`: default ブランチを対象にする。ブランチ名（main / master）に依存しないので、どのリポジトリにもそのまま使える
- `bypass_actors`（`actor_id: 5, actor_type: "RepositoryRole"` = リポジトリ管理者の想定、`bypass_mode: "pull_request"`）: 管理者は **PR 経由に限り** ルールを迂回してマージできる。一人で開発している場合に、自分の PR を承認できず詰まるのを避けるための逃げ道（Code Owner が自分だけ、かつ `require_last_push_approval` のため、他の承認者がいないとマージできない）。直接 push の迂回は許さない。**チーム開発ではこの項目を削除する**。`actor_id: 5` が管理者を指すことは、公式ドキュメントで確認できなかった（**未確認**。取り込み後に画面で確認する）
- `deletion`: default ブランチの削除を禁止
- `non_fast_forward`: force push を禁止（履歴の書き換えで、レビュー済みのコードが差し替えられるのを防ぐ）
- `required_linear_history`: マージコミットを禁止し、履歴を一直線に保つ（`git bisect` や revert が簡単になる）。公式の条件として、squash か rebase のマージを許可している必要がある
- `required_signatures`: 署名付きコミットのみ許可。**PR の head 側のコミットも署名が必要**（上記「署名付きコミットに関する注意」）
- `pull_request`
  - `required_approving_review_count: 1`: 最低 1 人の承認
  - `dismiss_stale_reviews_on_push: true`: 承認後に push されたら承認を取り消す（承認後にこっそり変更を足すのを防ぐ）
  - `require_code_owner_review: true`: `CODEOWNERS` のオーナーの承認を必須にする
  - `require_last_push_approval: true`: 最後に push した人以外の承認を必須にする（自分で push して自分で承認する抜け道を塞ぐ）
  - `required_review_thread_resolution: true`: 未解決のレビューコメントが残っているとマージ不可
  - `allowed_merge_methods: ["squash"]`: squash のみ（PR タイトル = コミットメッセージの運用を保証）
- `required_status_checks`
  - `strict_required_status_checks_policy: true`: main の最新を取り込んだ状態でチェックが通っていることを要求（PR 単体では通るが、他の PR と組み合わさると壊れる、を防ぐ）。PR が多くて待ちが辛くなったらマージキューの導入を検討する（`ci.yml` と `workflow-lint.yml` は `merge_group` に対応済み。`pr-title.yml` と `dependency-review.yml` は PR 専用なので、その際は必須チェックの構成を見直す）
  - `do_not_enforce_on_create: false`: ブランチの作成時にも必須チェックを適用する（公式 REST ドキュメント上は任意のキー）
  - `integration_id: 15368`: GitHub Actions アプリの ID。同名のチェックを別のアプリ（外部サービス等）が報告して必須チェックを偽装するのを防ぐ
  - 登録しているのは `ci-success`・`pr-title`・`dependency-review`・`actionlint`・`zizmor`。CI のジョブを増やすときは ruleset ではなく `ci-success` の `needs` に追加する
- `code_scanning`: CodeQL で重大度 High 以上のセキュリティアラート（`security_alerts_threshold: high_or_higher`）、またはエラーレベルのアラート（`alerts_threshold: errors`）が出る PR をブロック
- `copilot_code_review`: 全 PR に Copilot の自動レビューを**依頼**する。`review_on_push: true` で push のたびに再レビュー、下書き PR は対象外（作業途中のノイズを避ける）。**必須チェックにも承認数にもならない**（既定。「2.3 FAQ」の Q5）

---

## 8. 必須チェックと、担当ワークフローの対応

ruleset（`rulesets/default-branch.json`）が要求するチェック名は、次のワークフローの**ジョブ名（`name:`）**と**一致している必要があります**（2026-10-19 に、ruleset の 5 つの `context` と各ワークフローのジョブ名の一致を確認済み）。ジョブ名を変えると、チェックが Pending のまま残ってマージできなくなります。

| 必須チェック名      | 出どころ（ファイル → ジョブ）                           | 検査すること                         |
| ------------------- | ------------------------------------------------------- | ------------------------------------ |
| `ci-success`        | `workflows/ci.yml` → `ci-success`                       | format / lint / 型 / テスト / ビルド |
| `pr-title`          | `workflows/pr-title.yml` → `pr-title`                   | PR タイトルの形式                    |
| `dependency-review` | `workflows/dependency-review.yml` → `dependency-review` | 依存の脆弱性・ライセンス             |
| `actionlint`        | `workflows/workflow-lint.yml` → `actionlint`            | ワークフローの構文・式の誤り         |
| `zizmor`            | `workflows/workflow-lint.yml` → `zizmor`                | ワークフローの危険な書き方           |
| （Code scanning）   | `workflows/codeql.yml`（ruleset の `code_scanning`）    | 重大度 High 以上のアラートがないこと |

必須ではないチェック: `codeql.yml` のジョブ（`analyze (...)`）、`scorecard`（ジョブ名 `scorecard`）、`label`、`auto-merge`、`copilot-setup-steps`。

---

## 9. PR テンプレートの選び方（重要度: 大・中・小）

PR の本文は、変更の**重要度**に合わせて 3 種類から選びます。重要度が高いほど、書くことと確認することが増えます（軽い変更に重い雛形を強いると、書かれなくなり形骸化するため）。

### 判断基準

| 重要度    | テンプレート                                                          | 該当する変更                                                                                                                                    | 目安                                                               |
| --------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **大** 🔴 | `PULL_REQUEST_TEMPLATE/large.md`                                      | 破壊的変更 / DB スキーマ・マイグレーション / 認証・認可・セキュリティ / CI/CD・権限・シークレット / 広範囲の変更（公開 API や挙動の変更を含む） | 20 ファイル超、または上記のいずれかに 1 つでも該当。**迷ったら大** |
| **中** 🟡 | `pull_request_template.md`（既定）/ `PULL_REQUEST_TEMPLATE/medium.md` | 通常の機能追加・バグ修正・リファクタリング                                                                                                      | 数ファイル〜20 ファイル程度。公開 API・DB・権限に影響しない        |
| **小** 🟢 | `PULL_REQUEST_TEMPLATE/small.md`                                      | typo・文言・ドキュメント・コメント・依存の軽微な更新・設定の微修正                                                                              | 数ファイル以内。実行時の挙動が変わらない                           |

- 目安の数字は、判断を助けるための経験則です。**内容（上記の「該当する変更」）が優先**で、行数や件数では決めません。
- Dependabot の PR は、Dependabot が本文を生成します（このテンプレートは使われません）。
- 途中で重要度が変わったら、本文を貼り替えます（小で始めて DB に触れたら、大の内容に差し替える）。

### 選び方（使い方）

| 方法     | 大                                                                                                         | 中（既定）     | 小                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------- |
| ブラウザ | 比較画面の URL に `?template=large.md`（例: `.../compare/main...<branch>?quick_pull=1&template=large.md`） | 何も付けない   | URL に `?template=small.md`                                      |
| `gh` CLI | `gh pr create --template .github/PULL_REQUEST_TEMPLATE/large.md`                                           | `gh pr create` | `gh pr create --template .github/PULL_REQUEST_TEMPLATE/small.md` |

- `gh pr create` の `--template` は「本文の初期テキストに使うファイル」、`--body-file` は「本文そのもの」を渡すオプションです（`gh pr create --help` で確認）。`--template` を使うと、本文を編集してから作成できます。`--fill` や `--body` と一緒に指定した場合の優先順位は `gh pr create --help` を参照してください。
- ブラウザの URL の `template` パラメータは、公式ドキュメントで「`PULL_REQUEST_TEMPLATE` サブディレクトリのテンプレートを追加する」と説明されています。
- テンプレートは **default ブランチにマージされて初めて**他の人の画面で使えます。
- 既定ファイル（`pull_request_template.md`）と `medium.md` の併用時の挙動は**未確認**です（公式に記載なし）。

### 重要度ラベルの自動付与について（未実装・提案）

`importance/large` などのラベルを自動で付けることは、**今は実装していません**。理由と案は次のとおりです。

- PR の本文（どのテンプレートを使ったか）を読んでラベルを付ける処理は、`pull_request_target` で書くと、外部の人が書ける本文を、書き込み権限付きのワークフローで扱うことになり危険です。
- 安全な案 1: `labeler.yml` の変更ファイル条件で「大」相当のパス（`packages/db/prisma/migrations/**`、`.github/workflows/**` など）だけを自動判定する（`pull_request_target` のままで、変更ファイル一覧だけを使うため安全）。ただし、「破壊的変更」や「広範囲」のような**意味の判断**はできない。
- 安全な案 2: ラベルは人が手動で付ける（`importance/large` など）。リリースノートの分類にも使いたい場合は `release.yml` に追加する。

---

## 10. 他のプロジェクトへ移植する手順

1. `.github/` と `.node-version`（言語に応じて置き換え）をコピーする
2. **言語固有の部分を書き換える**
   - `actions/setup/action.yml`: ランタイムのセットアップと依存インストール
   - `ci.yml`: `pnpm verify` を、そのプロジェクトの検証コマンドに
   - `codeql.yml`: `matrix.language`（コンパイル言語なら `build-mode` も）
   - `dependabot.yml`: `package-ecosystem`
   - `copilot-setup-steps.yml`: 生成物の作成など作業前の準備（Prisma の行を置き換え）
3. **プロジェクト固有の部分を書き換える**
   - `CODEOWNERS`・`ISSUE_TEMPLATE/config.yml`・`SECURITY.md` の `choryoh3/claude_code_study`
   - `labeler.yml` の `area/*`
   - `copilot-instructions.md` のプロジェクト説明と規約
   - `dependency-review.yml` のライセンス方針
   - `scorecard.yml`: private リポジトリなら `publish_results: false`
   - `PULL_REQUEST_TEMPLATE/*.md` と `pull_request_template.md` のチェックリスト（`pnpm verify`・`docs/adr/` など）
4. 上記「6. 手動で行う設定」を行う
5. 適当な PR を作り、すべてのチェックが動くことを確認してから ruleset をインポートする

---

## 11. 変更するときのルール

- **`uses:` は SHA で固定する**: タグは後から別のコミットに付け替えられます。コミット SHA 固定なら、action が乗っ取られても気づけます（2025 年の tj-actions 事件が実例）。末尾の `# vX.Y.Z` は注記で、Dependabot が SHA と一緒に更新します。SHA を手で書き換えたときは、`gh api repos/<owner>/<repo>/git/ref/tags/<tag>`（注釈付きタグなら `git/tags/<sha>` もたどる）で、コメントのタグと一致することを確認します。
- **新しい検査を必須にしたいとき**: ruleset を編集せず、`ci.yml` の `ci-success` の `needs:` に追加します。
- **必須チェックのワークフローに `paths:` を付けない**: 条件でスキップされると Pending のまま残ります。
- **外部入力（PR タイトル、ブランチ名、Issue 本文など）を `run:` に直接書かない**: `env:` で受けて、シェル変数として参照します。
- **`pull_request_target` では PR のコードを checkout・実行しない**。
- **例外（`zizmor.yml`）を足すときは、必ず理由を書く**。
- **新しいワークフローを足したら**: `permissions:`・`timeout-minutes`・`concurrency` を確認し、`workflow-lint.yml`（actionlint / zizmor）を通す。ファイル冒頭に「実行主体」を書き、この文書の「2.2 ファイル別の一覧」に行を足す。
- **`.github/` の変更は `CODEOWNERS` で保護され、`ci` ラベルが付く**: 権限やシークレットに影響し得るため、慎重にレビューしてください。
- **PR テンプレートを直すとき**: `pull_request_template.md` と `PULL_REQUEST_TEMPLATE/medium.md` の本文を同じに保つ。

---

## 12. トラブルシュート

| 症状                                          | 原因                                                                    | 対処                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 必須チェックが Pending のまま、マージできない | ワークフローが `paths:` でスキップされた／ジョブ名を変更した            | `paths:` を外す。ジョブ名と ruleset のチェック名を一致させる                         |
| CodeQL の結果アップロードが失敗する           | リポジトリ設定が CodeQL の「default setup」になっている                 | Settings > Code security で「Advanced」に切り替える                                  |
| 自動マージされない                            | 「Allow auto-merge」が無効／必須チェック・レビューが未達                | 設定を有効にする。人が Approve する                                                  |
| 1 人開発で、自分の PR をマージできない        | 承認 1 件・Code Owner・最後の push 以外の承認が必須で、承認者が自分だけ | `bypass_actors`（管理者、PR 経由のみ）でマージする。チーム化したら見直す             |
| 署名の無いコミットでマージできない            | `required_signatures` は PR の head 側のコミットにも効く                | コミットに署名する。または署名付きで作り直す                                         |
| PR タイトルのチェックで落ちる                 | Conventional Commits 形式になっていない                                 | `feat(api): 〇〇を追加` のように直す（コードの push は不要。編集すると再検査される） |
| Copilot の作業環境が使われない                | `copilot-setup-steps.yml` が default ブランチにない／ジョブ名が違う     | `main` にマージする。ジョブ名を `copilot-setup-steps` にする                         |
| Copilot の PR にチェックが付かない            | 既定では、Copilot の push で Actions が自動実行されない                 | PR のマージボックスの「Approve and run workflows」を押す                             |
| Copilot のレビューがあるのにマージできない    | Copilot のレビューは、既定では必須の承認数に数えられない                | 人が承認する                                                                         |
| `zizmor` が新しい指摘を出した                 | 危険な書き方が混入した                                                  | まず直す。意図して許容する場合のみ `zizmor.yml` に理由付きで除外を追加する           |
| Scorecard の結果公開が失敗する                | `scorecard.yml` にステップや `env` を足した／private リポジトリ         | 変更を戻す。private なら `publish_results: false` にする                             |
| Dependabot の PR のラベルが `ci` だけになる   | `labeler.yml` の `dependencies` が、Dependabot の PR を対象にしていない | `dependencies` に `head-branch: ['^dependabot/']` を `any:` で追加する（対応済み）   |

---

## 13. 保守

- action の更新は Dependabot が週次で PR を作る。SHA とバージョンコメントが一緒に更新されることを確認してマージする
- `zizmor.yml` に除外を追加する PR は、理由の妥当性を必ずレビューする
- actionlint が `$/`（self-repository 構文）に対応したら、`./` を置き換えて `zizmor.yml` の `self-repository` 除外を削除する
- Scorecard の結果（Security タブ）を定期的に確認し、点数の低下があれば原因を調べる
- Copilot まわり（cloud agent の名称・課金・承認の挙動）は変わりやすい。FAQ の記述は、半年に 1 回など、公式ドキュメントと照合し直す

---

## 付録: 確認できていない点（2026-10-19 時点）

- ruleset の `bypass_actors` の `actor_id: 5`（`RepositoryRole`）が管理者を指すこと（公式 REST ドキュメントに対応表なし）
- ルートの `pull_request_template.md` と `PULL_REQUEST_TEMPLATE/` を併用したときの挙動
- `copilot_code_review` ルールを取り込むときに、Copilot のプランが無いとエラーになるか
- Copilot code review が status check として表示されるか、その名前
- Copilot cloud agent の PR で Actions を自動実行にする設定の名前と場所
- Copilot の PR（人に帰属しない PR）で、承認が 1 件多く必要になる設定が、このリポジトリで実際に効くか
- Copilot cloud agent の Actions 実行時間の課金の扱い、Copilot の課金がどの単位（premium requests / AI credits）で適用されるか
- Copilot cloud agent と `required_signatures` / `required_linear_history` の互換性
- Copilot cloud agent に `persist-credentials` の既定（資格情報の保持）が必要か
- Dependabot の PR に対する `pull_request_target`（`labeler.yml`）の権限の挙動
- 「CodeQL analysis が Advanced か」「Private vulnerability reporting が有効か」の現状（`gh api` の読み取りでは判定していない）
