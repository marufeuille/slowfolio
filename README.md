# Story Album (Hugo)

要求に合わせた、Markdownベースのフォトストーリーサイトのひな形です。

## できること

- ストーリー性ある章立て（前後ナビ、タイムライン）
- 簡易レイアウト短縮記法（shortcodes）
  - `photo` 1枚＋キャプション
  - `grid` 複数枚の等幅グリッド
  - `mosaic`/`tile` モザイク状配置（任意のスパン）
  - `spread` 見開き（写真＋本文）
  - `spacer` 任意余白
  - `gate` 簡易パスワードゲート（限定公開用）
- モバイル最適化（レスポンシブ）

## 起動手順（最初から）

1) Hugo のインストール
- macOS: `brew install hugo`
- 確認: `hugo version`

2) このディレクトリで開発サーバを起動
- `hugo server -D`
- ブラウザ: http://localhost:1313

3) 画像を配置
- `static/albums/<album>/` に写真を置き、Markdown からは `/albums/<album>/<file>.jpg` と書きます。

トラブルシュート
- 「module "" not found … themes」エラーが出る場合:
  - `hugo.toml` の `theme` 設定を削除済みです（テーマは使いません）。
  - もし手元に古い設定が残っていれば、`theme = "..."` 行を削除して再起動してください。

## 章ごと別ページを YAML から自動生成

- コンセプト: 「1ページ=1レイアウト」。レイアウトを選び、必要枚数の写真とコメントを指定するだけで `.md` を生成します。
- 入力は YAML（`.yaml`）。JSON も読めますが YAML を推奨します。

1) ストーリーデータを用意
- 例: `data/stories/trip-2024.yaml`（このリポジトリにサンプル済み。JSONも同名で存在しますがYAMLでOK）
- 構造:
  - `title`, `summary`
  - `chapters[]`: `{ slug, title, layout, photos[], text, gateHash?, gateHint? }`
  - レイアウト: `one | two-grid | three-grid | four-grid | spread-left | spread-right`

2) 生成コマンド
- `node scripts/generate.mjs --key trip-2024`
- 出力: `content/albums/trip-2024/_index.md`（存在しない場合）と各章 `NN-<slug>.md`
- 章順は YAML の並び順。`data/albums/trip-2024.yaml` が自動生成され、タイムラインとページャがその順に従います。

3) 補足
- JSON 版ファイルがあっても、同名の YAML が優先されます。

レイアウトと生成されるMarkdownの対応
- `one`: 1枚 +（任意で本文）→ `photo`
- `two-grid`: 2枚グリッド → `grid` 2列
- `three-grid`: 3枚グリッド → `grid` 3列
- `four-grid`: 4枚グリッド → `grid` 4列
- `spread-left/right`: 見開き（写真＋本文） → `spread`
- 章単位の簡易ゲート: `gateHash`/`gateHint`（章全体を `gate` でラップ）

## YAML の書き方（スキーマと例）

- ルート
  - `title`: アルバム名
  - `summary`: 説明（任意）
  - `chapters[]`: 章の配列（並び順=章順）
- 章（chapter）
  - `slug`: ページのスラッグ（ファイル名にも使われる）
  - `title`: 章タイトル
  - `layout`: 下記のいずれか
    - `one | two-grid | three-grid | four-grid | spread-left | spread-right`
  - `photos[]`: 使用写真（必要枚数分）
    - `src`: 画像パス（例 `/albums/<key>/photo.jpg`）
    - `alt`: 代替テキスト（任意）
    - `caption`: キャプション（任意）
  - `text`: 本文（任意、複数行可）
  - `gateHash`, `gateHint`: 章単位の簡易ゲート（任意）

例（3章）
```yaml
title: 夏の友人旅行 2024
summary: 海と山、ゆっくり流れる時間を記録した旅のアルバム。
chapters:
  - slug: prologue
    title: 序章 — 集合と出発
    layout: spread-left
    text: |
      車に乗り込む前に、コンビニで温かいコーヒーを買った…
    photos:
      - src: /albums/trip-2024/meet.jpg
        alt: 朝の集合
        caption: まだ眠そうだけど、わくわくが勝つ朝。
  - slug: seaside
    title: 第一章 — 海辺の昼下がり
    layout: three-grid
    text: 砂浜に足跡を残しながら、潮の香りを吸い込む。
    photos:
      - src: /albums/trip-2024/a.jpg
        caption: 貝殻
      - src: /albums/trip-2024/b.jpg
        caption: 足跡
      - src: /albums/trip-2024/c.jpg
        caption: 海藻
  - slug: family-only
    title: 家族限定 — 宿での夜更け話
    layout: two-grid
    gateHash: <sha256-hex>
    gateHint: 家族の合言葉
    photos:
      - src: /albums/trip-2024/room.jpg
        caption: 和室にて
      - src: /albums/trip-2024/snacks.jpg
        caption: 差し入れのお菓子
```

## レイアウト詳細（必要枚数・生成ショートコード）

- one: 1枚 +（任意で本文）
  - 必要枚数: 1
  - 生成: `{{< photo src="…" width="wide" >}}` + 本文

- two-grid: 2枚を等幅で横並び
  - 必要枚数: 2
  - 生成: `{{< grid cols="2" >}}` の中に `photo`×2

- three-grid: 3枚を等幅で横並び
  - 必要枚数: 3
  - 生成: `{{< grid cols="3" >}}` の中に `photo`×3

- four-grid: 4枚を等幅で横並び
  - 必要枚数: 4
  - 生成: `{{< grid cols="4" >}}` の中に `photo`×4

- spread-left: 見開き（左に画像、右に本文）
  - 必要枚数: 1
  - 生成: `{{< spread image="…" side="left" >}}本文{{< /spread >}}`

- spread-right: 見開き（右に画像、左に本文）
  - 必要枚数: 1
  - 生成: `{{< spread image="…" side="right" >}}本文{{< /spread >}}`

- gate（章全体の簡易ゲート）
  - YAMLの章に `gateHash`/`gateHint` がある場合、章の本文全体を `{{< gate … >}}…{{< /gate >}}` でラップします。

注意
- 指定より写真が少ない場合は不足分が空になります。基本は必要枚数ぴったりで記述してください。
- 画像パスは `static/albums/<key>/` 以下に置き、`/albums/<key>/<file>` で参照してください。

## Grid システム（CSS/ショートコード）

- 概要: `.grid` + `.cols-N`（2/3/4）で等幅グリッドを実現。
- 余白: `gap: 8px`（`static/css/main.css`）。
- レスポンシブ:
  - 640px未満では `.cols-3`/`.cols-4` は2列にフォールバック。
- 使い方（手書き時）:
  - `{{< grid cols="3" >}} … {{< /grid >}}` の中に `{{< photo … >}}` を並べる。
- 写真サイズのバリエーション（`photo` の `width`）
  - `full`（デフォルト）/`wide`/`half`/`third` のユーティリティあり。
- モザイク（オプション）
  - `{{< mosaic >}} {{< tile src="…" span="2x1" >}} … {{< /mosaic >}}`
  - CSSは `.mosaic` でグリッド（6列, 自動行高）。スマホでは3列。
  - 生成スクリプトの対象外（手作業で使いたい場合にどうぞ）。

## サンプル画像の配置について

- 確認用のダミー画像（SVG）を追加済みです。配置先と使い方:
  - 画像: `static/albums/trip-2024/*.svg`
  - 参照例: `/albums/trip-2024/meet.svg`

## ページャ（前後リンク）のルール

- 並びは `data/albums/<key>.yaml` の `order` を最優先（ジェネレータが章順で自動生成）。
- 未設定の場合はファイル名順。
- 方向: 左=前／右=次。必要なら `hugo.toml` の `params.pagerReverse = true` で反転可能。

## セクション単位の限定公開（上位パスでのゲート）

- ページ単位の `gate` ショートコードに加え、セクション（パスのまとまり）ごとに簡易ゲートをかけられます。
- 使い方:
  1) `gateHash` にパスフレーズの SHA-256 HEX をセット（ヒントは `gateHint`）。
  2) セクション直下の `_index.md` に設定すると、その配下の一覧・記事詳細の表示をまとめてゲートします。
  3) 例: `content/family/_index.md`
     ```
     ---
     title: 家族用アルバム
     gateHash: "<sha256-hex>"
     gateHint: "家族だけが知っている合言葉"
     ---
     ```
  4) 以後、`content/family/` 配下のページは同じゲートで保護されます。

注意: これは静的サイト上の簡易ゲートです。実際の秘匿には Cloudflare Access などのゼロトラスト保護を併用してください。

## コンテンツ構成

- トップ: `content/_index.md`
- アルバム一覧: `content/albums/_index.md`
- アルバム本体（セクション）: 例 `content/albums/trip-2024/_index.md`
- 章（ページ）: `content/albums/trip-2024/01-prologue.md` など（`weight` で並び順）

## ショートコード

例は `content/albums/trip-2024` を参照。

- photo
  ```
  {{< photo src="/albums/trip-2024/img01.jpg" alt="説明" caption="キャプション" width="full|wide|half|third" >}}
  ```
- grid
  ```
  {{< grid cols="3" >}}
    {{< photo src="/path/a.jpg" caption="a" >}}
    {{< photo src="/path/b.jpg" caption="b" >}}
  {{< /grid >}}
  ```
- mosaic + tile
  ```
  {{< mosaic >}}
    {{< tile src="/path/a.jpg" span="2x2" >}}
    {{< tile src="/path/b.jpg" span="1x1" >}}
  {{< /mosaic >}}
  ```
- spread（見開き）
  ```
  {{< spread image="/path/hero.jpg" side="right" caption="見開きキャプション" >}}
  ここに本文（マークダウン可）
  {{< /spread >}}
  ```
- spacer（余白）
  ```
  {{< spacer size="24" >}}
  ```
- gate（限定公開の簡易保護）
  - 静的サイトのため本格的な認証ではありません（秘匿はできない前提）。Cloudflare Access などと併用すると堅牢です。
  - 使い方:
    1) ハッシュを作成（SHA-256 HEX）。macOS 例: `echo -n 'your-pass' | shasum -a 256 | cut -d' ' -f1`
    2) `content/.../03-family-only.md` の `CHANGE_ME_TO_SHA256_HEX` を置換
    3) 使い回す場合はパスワードは短すぎないものを推奨
  ```
  {{< gate hash="<sha256-hex>" hint="家族の合言葉" >}}
    ここに守りたいコンテンツ
  {{< /gate >}}
  ```

## デプロイ（Cloudflare Pages）

- 新規プロジェクト → Git 連携 → Framework preset: Hugo を選択
- Build command: `hugo`
- Build output directory: `public`
- 環境変数（必要に応じて）
  - `HUGO_VERSION`: 0.125.x など（ローカルと合わせる）
  - `HUGO_ENV`: production
- 限定公開は Cloudflare Access の保護ルール（Application→Access→Add）を推奨。`/albums/*` などパス単位で制御可能。

## カスタマイズの入口

- サイト設定: `hugo.toml`
- スタイル: `static/css/main.css`
- ベースレイアウト: `layouts/_default/baseof.html`
- ナビ/フッタ: 同上内のマークアップ
- ショートコード: `layouts/shortcodes/*.html`

## 留意事項

- このレポジトリの `gate` は**簡易**（ソースから見えます）。真正な秘匿には ID プロバイダ（Cloudflare Access 等）を使ってください。
- 画像のサイズ最適化やサムネイル生成は未実装。必要なら今後 Hugo Pipes でのリサイズ機能を追加可能です。
