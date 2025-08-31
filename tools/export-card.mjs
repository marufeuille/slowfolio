import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import fs from "node:fs";
import { chromium } from "playwright";
import http from "node:http";
import { createReadStream, statSync, existsSync } from "node:fs";
import { extname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---- CLI args -------------------------------------------------
const args = process.argv.slice(2);
const getArg = (name, fallback=null) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i+1] || "") : fallback;
};

const slug   = getArg("--slug");                  // 例: 2025-08-31
const scope  = getArg("--scope", "private");      // private | cards
const site   = getArg("--site", ".");          // サイトルート
const scale  = Number(getArg("--scale", "2"));
const out    = getArg("--out", `exports/${slug}.png`);
const width  = Number(getArg("--width", "820"));
const height = Number(getArg("--height","1600"));
const port   = Number(getArg("--port","8787"));

if (!slug) {
  console.error("Usage: node tools/export-card.mjs --slug 2025-08-31 [--scope private|cards] [--site site] [--scale 2] [--out exports/xxx.png]");
  process.exit(1);
}

// ---- Paths ----------------------------------------------------
const repoRoot   = resolve(__dirname, "..");
const siteDir    = resolve(repoRoot, site);
const outDir     = resolve(repoRoot, "public_export");
const exportPath = resolve(repoRoot, out);

// ---- Config detection ----------------------------------------
const hasToml = fs.existsSync(join(siteDir, "hugo.toml"));
const hasYaml = fs.existsSync(join(siteDir, "config.yaml"));
const hasJson = fs.existsSync(join(siteDir, "config.json"));
if (!hasToml && !hasYaml && !hasJson) {
  console.error(`✗ Hugo config not found in: ${siteDir}
  Place hugo.toml (or config.yaml/json) here, or pass --site <path> to this script.`);
  process.exit(1);
}

// ---- 1) Hugo build (draft含む) --------------------------------
console.log(`• Building site (cwd: ${siteDir})…`);
fs.rmSync(outDir, { recursive: true, force: true });
execSync(`hugo -D -d "${outDir}"`, { stdio: "inherit", cwd: siteDir });

// ---- 2) Start static server for outDir ------------------------
const serveDir = outDir;
const mime = {
  ".html":"text/html; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".webp":"image/webp",
  ".gif":"image/gif",
  ".svg":"image/svg+xml",
  ".ico":"image/x-icon",
  ".json":"application/json"
};

const server = http.createServer((req, res) => {
  // デフォルトで index.html を解決
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  let filePath = resolve(serveDir, "." + urlPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }
  if (!existsSync(filePath)) {
    res.statusCode = 404; res.end("Not Found"); return;
  }
  try {
    const stat = statSync(filePath);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Type", mime[extname(filePath)] || "application/octet-stream");
    createReadStream(filePath).pipe(res);
  } catch (e) {
    res.statusCode = 500; res.end("Server Error");
  }
});

await new Promise(resolve => server.listen(port, resolve));
console.log(`• Static server: http://127.0.0.1:${port}/`);

// ---- 3) Screenshot with Playwright ----------------------------
console.log("• Launching headless Chromium…");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height, deviceScaleFactor: scale } });

// サーバ経由で絶対パスが解決される
const url = `http://127.0.0.1:${port}/${scope}/cards/${slug}/`;
await page.goto(url, { waitUntil: "networkidle" });

// 画像のロード完了を待つ
await page.evaluate(() => Promise.all(
  Array.from(document.images).map(img => {
    if (img.complete) return true;
    return new Promise(res => { img.onload = res; img.onerror = res; });
  })
));

const card = page.locator(".card");
await card.waitFor({ state: "visible", timeout: 5000 });

fs.mkdirSync(resolve(exportPath, ".."), { recursive: true });
await card.screenshot({ path: exportPath, type: "png" });

await browser.close();
server.close();
console.log(`✓ Exported: ${exportPath}`);
