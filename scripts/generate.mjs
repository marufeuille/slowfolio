#!/usr/bin/env node
// Generate chapter Markdown files from a story JSON.
// Usage: node scripts/generate.mjs --key trip-2024

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { keys: [], all: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--key' || a === '--keys') {
      const v = args[++i];
      if (!v) continue;
      v.split(',').forEach((k) => k && out.keys.push(k.trim()));
    } else if (a === '--all') {
      out.all = true;
    } else if (!a.startsWith('--')) {
      out.keys.push(a);
    }
  }
  return out;
}

function fm(obj) {
  const yaml = Object.entries(obj)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n');
  return `---\n${yaml}\n---\n\n`;
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function passthroughCaption(c) {
  return c ? c.replace(/"/g, '\\"') : '';
}

function renderContent(ch) {
  const layout = ch.layout || 'one';
  const photos = ch.photos || [];
  const text = ch.text || '';
  const cap = (i) => passthroughCaption(photos[i]?.caption || '');
  const src = (i) => photos[i]?.src || '';
  const alt = (i) => photos[i]?.alt || '';

  let body = '';
  switch (layout) {
    case 'spread-left':
      body += `{{< spread image="${src(0)}" alt="${alt(0)}" side="left" caption="${cap(0)}" >}}\n`;
      body += text + '\n';
      body += `{{< /spread >}}\n`;
      break;
    case 'spread-right':
      body += `{{< spread image="${src(0)}" alt="${alt(0)}" side="right" caption="${cap(0)}" >}}\n`;
      body += text + '\n';
      body += `{{< /spread >}}\n`;
      break;
    case 'two-grid':
      body += `{{< grid cols="2" >}}\n`;
      for (let i = 0; i < Math.min(2, photos.length); i++) {
        body += `  {{< photo src="${src(i)}" alt="${alt(i)}" caption="${cap(i)}" >}}\n`;
      }
      body += `{{< /grid >}}\n`;
      if (text) body += `\n${text}\n`;
      break;
    case 'three-grid':
      body += `{{< grid cols="3" >}}\n`;
      for (let i = 0; i < Math.min(3, photos.length); i++) {
        body += `  {{< photo src="${src(i)}" alt="${alt(i)}" caption="${cap(i)}" >}}\n`;
      }
      body += `{{< /grid >}}\n`;
      if (text) body += `\n${text}\n`;
      break;
    case 'four-grid':
      body += `{{< grid cols="4" >}}\n`;
      for (let i = 0; i < Math.min(4, photos.length); i++) {
        body += `  {{< photo src="${src(i)}" alt="${alt(i)}" caption="${cap(i)}" >}}\n`;
      }
      body += `{{< /grid >}}\n`;
      if (text) body += `\n${text}\n`;
      break;
    case 'one':
    default:
      body += `{{< photo src="${src(0)}" alt="${alt(0)}" caption="${cap(0)}" width="wide" >}}\n`;
      if (text) body += `\n${text}\n`;
      break;
  }
  return body;
}

function parseScalar(raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null' || raw === '~') return null;
  if (!isNaN(Number(raw))) return Number(raw);
  // strip quotes if present
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith('\'') && raw.endsWith('\''))) {
    return raw.slice(1, -1);
  }
  return raw;
}

function loadYAML(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  const N = lines.length;
  function indentOf(s) {
    let n = 0; while (n < s.length && s[n] === ' ') n++; return n;
  }
  function peek() { return i < N ? lines[i] : null; }
  function next() { return i < N ? lines[i++] : null; }
  function eatEmpty() {
    while (i < N) {
      const l = lines[i];
      if (!l || /^\s*(#.*)?$/.test(l)) i++; else break;
    }
  }
  function parseBlock(baseIndent) {
    eatEmpty();
    let l = peek();
    if (l == null) return null;
    let ind = indentOf(l);
    if (ind < baseIndent) return null;
    // sequence?
    if (l.slice(ind).startsWith('- ')) {
      const arr = [];
      while (i < N) {
        l = peek(); if (l == null) break;
        let ind2 = indentOf(l);
        if (ind2 !== ind) break;
        let content = l.slice(ind + 2);
        // collect sub-block lines belonging to this item
        const sub = [ ' '.repeat(ind) + content ];
        next();
        while (i < N) {
          const t = peek(); if (t == null) break;
          const it = indentOf(t);
          if (it <= ind) break;
          sub.push(t);
          next();
        }
        arr.push(parseSub(sub, ind));
      }
      return arr;
    }
    // map
    const obj = {};
    while (i < N) {
      l = peek(); if (l == null) break;
      let ind2 = indentOf(l);
      if (ind2 < baseIndent) break;
      if (l.slice(ind2).startsWith('- ')) break; // next parent will handle sequence
      const line = next();
      const s = line.slice(ind2);
      const m = s.match(/^(\S[^:]*):\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (val === '|') {
        // block scalar
        const acc = [];
        while (i < N) {
          const t = peek(); if (t == null) break;
          const it = indentOf(t);
          if (it <= ind2) break;
          acc.push(t.slice(ind2 + 2));
          next();
        }
        obj[key] = acc.join('\n');
      } else if (val === '' ) {
        // nested block
        const child = parseBlock(ind2 + 2);
        obj[key] = child;
      } else {
        obj[key] = parseScalar(val);
      }
    }
    return obj;
  }
  function parseSub(subLines, baseIndent) {
    // parse a mini-document from subLines as a map or scalar
    // If it contains a colon, treat as map; else scalar
    const hasColon = subLines[0].trim().includes(':');
    if (!hasColon) return parseScalar(subLines[0].trim());
    // create a temporary parser on these lines
    const savedLines = lines.slice();
    const savedI = i;
    lines.length = 0; Array.prototype.push.apply(lines, subLines);
    i = 0; const res = parseBlock(baseIndent);
    // restore
    lines.length = 0; Array.prototype.push.apply(lines, savedLines);
    i = savedI;
    return res;
  }
  const doc = parseBlock(0);
  return doc;
}

function loadStory(key) {
  const root = process.cwd();
  const storyPathYaml = join(root, 'data', 'stories', `${key}.yaml`);
  const storyPathJson = join(root, 'data', 'stories', `${key}.json`);
  if (existsSync(storyPathYaml)) {
    const text = readFileSync(storyPathYaml, 'utf8');
    return loadYAML(text);
  }
  if (existsSync(storyPathJson)) {
    return JSON.parse(readFileSync(storyPathJson, 'utf8'));
  }
  console.error(`Story not found: ${storyPathYaml} or ${storyPathJson}`);
  process.exit(1);
}

function generateFor(key) {
  const root = process.cwd();
  const story = loadStory(key);
  const outDir = join(root, 'content', 'albums', key);
  ensureDir(outDir);

  // Ensure section index exists with key
  const secIndex = join(outDir, '_index.md');
  if (!existsSync(secIndex)) {
    const fmData = {
      title: story.title || key,
      summary: story.summary || '',
      key: key,
    };
    writeFileSync(secIndex, fm(fmData) + (story.summary || '') + '\n');
  }

  const order = [];
  (story.chapters || []).forEach((ch, idx) => {
    const n = String(idx + 1).padStart(2, '0');
    const base = `${n}-${ch.slug || `p${n}`}`;
    order.push(base);
    const p = join(outDir, `${base}.md`);
    const fmData = {
      title: ch.title || base,
      date: ch.date || new Date().toISOString().slice(0,10),
    };
    let content = renderContent(ch);
    if (ch.gateHash) {
      const hint = ch.gateHint || '';
      content = `{{< gate hash="${ch.gateHash}"${hint ? ` hint="${hint.replace(/"/g, '\\"')}"` : ''} >}}\n` + content + `\n{{< /gate >}}\n`;
    }
    writeFileSync(p, fm(fmData) + content);
  });

  // Write album order for pager/list
  const albumsDir = join(root, 'data', 'albums');
  ensureDir(albumsDir);
  const yaml = 'order:\n' + order.map((b) => `  - ${b}`).join('\n') + '\n';
  writeFileSync(join(albumsDir, `${key}.yaml`), yaml);

  console.log(`Generated ${order.length} chapters into ${outDir}`);
}

function listStoryKeys(root) {
  const dir = join(root, 'data', 'stories');
  if (!existsSync(dir)) return [];
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((n) => n.endsWith('.yaml') || n.endsWith('.json'))
    .map((n) => n.replace(/\.(yaml|json)$/i, ''));
  return [...new Set(names)];
}

function main() {
  const args = parseArgs();
  const root = process.cwd();
  let keys = args.keys;
  if (args.all) keys = listStoryKeys(root);
  if (!keys || keys.length === 0) {
    console.error('Usage: node scripts/generate.mjs --key <story-key> | --keys a,b | --all');
    process.exit(1);
  }
  keys.forEach((k) => generateFor(k));
}

main();
