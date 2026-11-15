# VIVRAS Tech

**技術・教養・生活・考察を、ひと目で理解できる形に。** SEの仕事を起点に、学びと経験を記録する個人メディア。

- サイト：[tech.grasphex.com](https://tech.grasphex.com/)
- 編集方針：[Notion正本](https://app.notion.com/p/419636f0a707814d96fcc19f422e51b3)
- 制作・公開ルール：[docs/chatgpt-article-prompt.md](docs/chatgpt-article-prompt.md)

## 記事を追加する

`content/<slug>.html` を追加してGitHubにコミットする。GitHub Actionsが記事一覧・検索データ・sitemapを生成しGitHub Pagesへ公開する。

- 記事内容：**結論＋全体図 → 必要な仕組み → 根拠**。冗長な章は作らない。
- デザイン：見栄えより先に、初見10秒で理解できる情報構造。
- 安全：著作権・機密・個人情報に注意し、一次資料を確認する。
- 確認：HTML・モバイル・リンク・ビルド・公開URLを別々にチェックする。未確認の公開を成功と呼ばない。

## ローカルビルド

```sh
python3 scripts/build.py
python3 -m http.server 8000 --directory dist
```

- `templates/index.html`：トップページ
- `assets/site.css`：共通デザイン
- `assets/catalog.js`：記事検索
- `content/`：各記事の単体HTML
- `scripts/build.py`：静的ビルド
