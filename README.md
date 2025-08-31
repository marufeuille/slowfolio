# 📖 slowfolio

**slowfolio** は「1 日 1 枚のポストカード」を積み上げていく、スローなインターネットのためのミニマルアルバムです。
Google フォトや「みてね」などの“貯蔵庫”とは別に、**選んだ 1 枚に物語を添えて見せる**ことを目的としています。

- 📸 **写真 + 短い文章** をカード化
- 🔒 **Private (家族向け)** と 🌍 **Public (公開用)** を切替可能
- 🖼 スマホで見やすく、スクショ 1 枚で共有できる
- 🖨 将来的に印刷用（L 判比率）や PNG 化にも対応

---

## 🛠 セットアップ

### 1. 環境

- Hugo (>= 0.126 推奨)
- Node.js (>= 18, Playwright 使用時)
- Git

### 2. インストール

```bash
git clone <this-repo> slowfolio
cd slowfolio/site
hugo server -D
```

ブラウザで `http://localhost:1313/private/cards/YYYY-MM-DD/` を開くとカードが見られます。

---

## 📂 ディレクトリ構成

```
slowfolio/
  site/
    hugo.toml
    content/
      cards/              # 公開カード
        2025-09-01/
          index.md
          photo.jpg
      private/
        cards/            # 非公開カード（デフォルト）
          2025-09-02/
            index.md
            photo.jpg
    layouts/
      shortcodes/postcard.html
      _default/single.html
    assets/css/story.css
  tools/
    export-card.mjs       # PNGエクスポートスクリプト
```

- **private/cards/** … デフォルトの置き場（家族向け）。Cloudflare Access などで保護。
- **cards/** … 公開用。誰でも閲覧可。

---

## ✍️ カードの作り方

1. 日付フォルダを作成

   ```bash
   mkdir -p site/content/private/cards/2025-09-02
   ```

2. 写真を配置

   ```
   site/content/private/cards/2025-09-02/beach.jpg
   ```

3. `index.md` を作成

   ```markdown
   ---
   title: "海、はじまりの一枚"
   date: 2025-09-02
   summary: "波の音と笑い声。"
   ---

   {{< postcard
   photo="beach.jpg"
   title="海、はじまりの一枚"
   footer="2025.09.02 / 逗子"
   ratio="insta" # insta=4:5（デフォ）, l=3:2（印刷用）
   pad="md"

   > }}
   > 今日の一枚をここに書く。  
   > 行末スペース 2 つで改行もできる。

   空行で段落分けも可能。
   {{< /postcard >}}
   ```

4. プレビュー

   ```bash
   cd site
   hugo server -D
   ```

   → `http://localhost:1313/private/cards/2025-09-02/` にアクセス

---

## 🔐 公開ポリシー

- **プライベート**: `content/private/cards/` → `/private/cards/`

  - Cloudflare Access で `/private/*` を保護（Google ログイン or メール OTP）。

- **パブリック**: `content/cards/` → `/cards/`

  - 誰でも閲覧可。

- 公開化は **フォルダを `private/` → `cards/` に移動**するだけ。

---

## 🖼 PNG エクスポート（ローカルのみ）

1. 依存インストール

   ```bash
   npm i -D playwright
   npx playwright install chromium
   ```

2. コマンド実行

   ```bash
   node tools/export-card.mjs \
     --slug 2025-09-02 \
     --scope private \
     --site site \
     --scale 2 \
     --out exports/2025-09-02.png
   ```

   - `--slug` = フォルダ名（例: `2025-09-02`）
   - `--scope private|cards` = 非公開/公開のどちらを見るか
   - `--scale` = 解像度倍率（2 or 3 推奨）
   - `--out` = 出力ファイルパス

   → `exports/2025-09-02.png` が生成されます。LINE や SNS に直接貼れる。

---

## ⚙️ パラメータ一覧

ショートコード `postcard` のパラメータ：

| パラメータ | 値                                             | 説明                                             |
| ---------- | ---------------------------------------------- | ------------------------------------------------ |
| `photo`    | ファイル名                                     | index.md と同じフォルダに置いた画像              |
| `title`    | 文字列                                         | カードの見出し                                   |
| `footer`   | 文字列                                         | 日付や場所                                       |
| `ratio`    | `insta` / `square` / `l`                       | insta=4:5（デフォ）、square=1:1、l=3:2（印刷用） |
| `pad`      | `none`/`sm`/`md`/`lg`                          | 内側余白                                         |
| `fit`      | `cover` / `contain`                            | cover=切り抜き、contain=全体表示                 |
| `focus`    | `center` / `top` / `bottom` / `left` / `right` | cover 時の焦点位置                               |
| `bg`       | CSS 色                                         | contain 時の余白色                               |

本文はショートコードの内側に Markdown で記述できます。

---

## ✅ 運用フロー（MVP）

1. その日の 1 枚を選んで `private/cards/YYYY-MM-DD/` に追加
2. Hugo で確認
3. 家族に URL or PNG を共有
4. 公開したいときは `cards/` に移動

---

## 🚀 今後の拡張アイデア

- 月別・年別アーカイブ自動生成
- OGP 画像の自動生成
- CLI ツール化（YAML からカード生成）
- SaaS 化（ストレージは各自、配置は YAML push で生成）

---

これで「slowfolio = 1 日 1 枚のポストカード」を運用開始できます。
📌 プライベート運用から始めて、公開や印刷も後から拡張できる設計です。
