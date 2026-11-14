# VIVRAS Tech — HTML追加だけで記事が増える技術解説サイト

**状態:** 公開用ソース一式。GitHub Pagesへの実デプロイはGitHubアカウント側で行う必要があります。アプリや既存の `grasphex/vivras-learning` とは別の最小サイトです。ブランド名は仮称。

## 何ができるか

- `content/` に `.html` ファイルを追加すると、GitHub Actionsが記事一覧を自動生成してサイトを再公開
- キーワード検索、カテゴリ絞り込み、モバイル表示
- 記事内では任意のHTML/CSS/JSを使用可能
- サンプル：DNSのステップ送り、firewalldの許可ルールシミュレーション
- ランタイムDB・ログイン・Node/npm依存なし

## 最初の公開（GitHub Pages）

1. 新規**公開（Public）**リポジトリを作成する（例 `grasphex/vivras-tech`）。GitHub FreeでPagesを利用する場合は公開リポジトリが必要。
2. 本ZIPを展開し、**中身すべて**（隠しフォルダ `.github` を含む）をリポジトリの `main` ブランチに追加・コミットする。
3. リポジトリの **Settings → Pages → Build and deployment → Source → GitHub Actions** を選ぶ。
4. Actionsの `Publish VIVRAS Tech` の成功を確認する。初回に自動起動しない場合は **Actions → Publish VIVRAS Tech → Run workflow**。
5. 通常のURLは `https://grasphex.github.io/vivras-tech/`（リポジトリ名が `vivras-tech` の場合）。**実際に公開成功していることをURLで確認**する。

## 普段の更新（最重要）

1. ChatGPTに以下のテンプレートを渡し、必要な解説HTMLを生成する。
2. 生成したファイルを `content/<英小文字・数字・ハイフン>.html` に保存する。例：`content/systemd-targets.html`。
3. GitHubにコミットする。自動ビルドで一覧と検索に追加される。記事一覧の手修正は不要。

### ChatGPT用・記事生成プロンプト

> このLPIC学習内容を公開用の技術解説記事にして。結論→必要な前提知識→仕組み→わかりやすい図解→設定例→誤解しがちな点→理解度チェックの順にし、論理の飛躍がない説明にして。可能な箇所にはHTML/CSS/JSで動く図解を追加すること。HTML/CSS/JSの単一HTMLファイルとして出力して。既存サイトに統合するため `<html lang="ja">`, `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width,initial-scale=1">`, `<title>...</title>`, `<meta name="description" content="...">`, `<meta name="category" content="Linux または ネットワーク等">`, `<meta name="keywords" content="...">`, `<meta name="published" content="YYYY-MM-DD">`, `<link rel="stylesheet" href="../assets/site.css">`, `<main>...</main>` を必ず含め、トップに戻るリンクは `../index.html` にすること。画像の外部依存は極力避け、SVGとCSSで実装。出力ファイル名は英小文字・数字・ハイフンのみ。出典と更新日も明記し、実機挙動を確認できていない説明には注意書きをつける。書籍の問題文はコピーせず独自の例題を作成。会社や顧客に関する情報は公開しない。

## 検索エンジン向け

- ビルド時に `sitemap.xml`（トップと全記事のURL）を自動生成します。記事を追加すれば自動で反映されます。
- `static/` のファイルはサイト直下にそのまま公開されます。`static/google*.html` はSearch Consoleの所有権確認用なので削除しないでください。
- Google Search Console に `https://grasphex.github.io/vivras-tech/` をURLプレフィックスとして登録し、`sitemap.xml` を送信すると検索への掲載が早まります。

## ローカルプレビュー

```bash
python3 scripts/build.py
python3 -m http.server 8000 --directory dist
```

`http://localhost:8000` を開いて閲覧できます。`content/` を更新したら再度ビルドしてください。

## 既存一問一答アプリとの連携

- 現時点の教材は単体で読めるものとし、問題の自己採点履歴は未実装。
- 将来 `grasphex/vivras-learning` の `/quiz/<topic>` 等へ「問題演習へ」のリンクを設けられるよう、記事ファイル名を安定したslugにする。
- 試作アプリは認証付き非公開プレビューとして別運用。リンク先を一般公開できるまで、トップページからは誘導しない。

## 公開前のチェック

- 技術的な正確性と公式ドキュメントとの照合
- 書籍・LPIC問題集の設問や図の転載禁止。独自の説明と独自問題にする
- 会社・顧客・社内NW構成・実アドレス・認証情報を含めない
- 資料のライセンス、外部画像、社内データの混入を検査
- 変更した既存設定やコマンドはローカル検証し、破壊的な操作を含めない
- URLを手元のスマートフォンでも開き、図解・検索を確認

## ファイル構成

```
content/                記事のHTML（ここに放り込むだけ）
assets/                 共通CSS・検索用JS
static/                 サイト直下に置くファイル（所有権確認など）
scripts/build.py        自動一覧生成
.github/workflows/      GitHub Pages自動公開
README.md               更新手順
```
