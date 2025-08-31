# slowfolio — MVP 仕様書（Daily 1 枚版）

## 🎯 目的

- 毎日 1 枚、その日のハイライトを **ポストカード風カード** として残す。
- カードは **プライベート公開**（家族向け）が基本。必要に応じて **パブリック公開**も可能。
- 写真貯蔵は Google フォトやみてねなどに任せ、\*\*slowfolio は「見せる場」\*\*に特化する。
- 将来的に 1 ヶ月・1 年のまとめ（アルバム/ブック化）や PNG 化にも拡張できる。

---

## ✅ 要求（What）

1. **表現**

   - 1 日 1 枚のポストカード（縦長キャンバス）。
   - 写真 1 枚＋短文（タイトル＋本文＋フッター）。
   - **シンプルで落ち着いたデザイン**、スクショして LINE でも共有可。

2. **運用単位**

   - 1 日 = 1 カード。
   - カード作成を「日課」として運用（必ずしも当日撮影でなくても OK）。
   - 将来拡張として「日付＋ suffix」で例外カード（旅行など）も追加可能。

3. **公開範囲**

   - デフォルトは **private/** 配下 → Cloudflare Access で保護。
   - 公開したいものだけ **cards/** 配下に置いてパブリック公開。

4. **将来拡張**

   - カード PNG 化（URL→ 画像化）。
   - YAML/CLI から自動生成。
   - 月別/年別アーカイブ。

---

## 🛠 技術要件

- **ビルド**: Hugo (v0.126 想定)
- **ホスティング**: Cloudflare Pages

  - Build command: `hugo`
  - Output directory: `public`

- **認証**: Cloudflare Access

  - 対象: `/private/*`
  - ログイン: Google アカウント or メール OTP

---

## 📂 ディレクトリ構成（MVP）

```
site/
  content/
    cards/                  # 公開用
      2025-09-02/
        index.md
        photo.jpg
    private/
      cards/                # 非公開用
        2025-09-03/
          index.md
          photo.jpg
```

- **1 日 1 枚前提** → ディレクトリ名は `YYYY-MM-DD`
- 同一構造で `cards/` or `private/cards/` に置き分けるだけで公開/非公開を切替可能

---

## 🎨 表現仕様（ポストカード短コード）

### ショートコード `postcard`

- **パラメータ**:

  - `photo`: 表示画像
  - `title`: 見出し
  - `body`: 本文（Markdown 可）
  - `footer`: 日付や場所など
  - `ratio`: 1080x1350（標準） / 1200x1200
  - `pad`: none|sm|md|lg

### Markdown 例

`site/content/private/cards/2025-09-03/index.md`

```markdown
---
title: "海、はじまりの一枚"
date: 2025-09-03
summary: "波の音と笑い声。最初の一歩。"
---

{{< postcard
photo="beach.jpg"
title="海、はじまりの一枚"
body="波の音と笑い声。最初の一歩だけで、一日が決まる感じ。"
footer="2025.09.03 / 逗子"
ratio="1080x1350"
pad="md"

> }}
```

---

## 🔐 公開ポリシー

- **プライベート**: `content/private/cards/YYYY-MM-DD/` → `/private/cards/YYYY-MM-DD/`

  - Cloudflare Access で保護（Google / OTP）。

- **パブリック**: `content/cards/YYYY-MM-DD/` → `/cards/YYYY-MM-DD/`

  - 誰でも閲覧可能。

- 公開化は **ディレクトリを移動するだけ**。

---

## 📝 ワークフロー

1. その日のハイライトを選ぶ
2. `content/private/cards/YYYY-MM-DD/` に写真と `index.md` を作成
3. Git push → Cloudflare Pages 自動ビルド・デプロイ
4. 家族へ URL 送信（初回は Access でログイン）
5. 公開にしたい場合は `content/cards/` へ移動して再デプロイ

---

## 🚀 将来仕様（拡張）

- **カード PNG 化**:

  - Cloudflare Workers or CLI で URL→PNG レンダリング

- **自動生成**:

  - `config/daily.yaml` から `slowfolio-cli` が `index.md` を吐く

- **アーカイブ**:

  - 月別/年別一覧ページの自動生成

- **テーマ**:

  - 色・フォントを選べる（今は落ち着いたベーシック）

---

## ✅ 受け入れ条件

- 1 日 1 カードが **Markdown ＋写真**で作成できる
- `/private/cards/YYYY-MM-DD/` はログインしないと閲覧不可
- `/cards/YYYY-MM-DD/` は誰でも閲覧可能
- スマホで開いたとき、**1 スクショでカードが綺麗に収まる**

---

これで「slowfolio = 毎日 1 枚のポストカードを積み上げる場所」という軸が明確になります。
📌 将来的な柔軟性は残しつつ、MVP では **“日々の 1 枚”** にフォーカスしてシンプルに始める形です。
