// Lint rules from HANDOFF §10 that are cheap to enforce by scanning source:
// no emoji in UI, no light theme, no white text on lime.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const roots = process.argv.slice(2).length ? process.argv.slice(2) : ['src'];
const emoji = /\p{Extended_Pictographic}/u;
const bad = [];
function walk(dir) {
  for (const f of readdirSync(dir)) {
    if (f === 'node_modules' || f.startsWith('.') || f.includes('.generated.')) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (['.ts', '.tsx', '.css'].includes(extname(p))) {
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        if (emoji.test(line)) bad.push(`${p}:${i + 1} emoji in source`);
        if (/#fff(fff)?\b|white/i.test(line) && /lime/i.test(line)) bad.push(`${p}:${i + 1} white text on lime`);
        if (/userInterfaceStyle['"]?\s*:\s*['"](light|automatic)/.test(line) || /prefers-color-scheme:\s*light/.test(line)) bad.push(`${p}:${i + 1} light theme`);
      });
    }
  }
}
roots.forEach(walk);
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log('rules ok');
