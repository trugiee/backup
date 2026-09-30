/**
 * The @capgo/capacitor-updater Android sources use qualified enum switch labels
 * (e.g. `case DelayUntilNext.background:`), a Java 21 feature. This project pins
 * every Android module to Java 17 in android/build.gradle, which makes javac
 * reject them with "an enum switch case label must be the unqualified name of an
 * enumeration constant".
 *
 * Unqualified labels (`case background:`) are behaviourally identical, so rewrite
 * them for any enum declared in the same file. Runs on install and is idempotent.
 *
 * Re-run manually with: node scripts/patch-capgo-java17.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidSrc = path.join(
  root,
  'node_modules',
  '@capgo',
  'capacitor-updater',
  'android',
  'src'
);

if (!fs.existsSync(androidSrc)) {
  console.log('[patch-capgo-java17] @capgo/capacitor-updater not installed, skipping.');
  process.exit(0);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.java')) out.push(full);
  }
  return out;
}

let patchedFiles = 0;
let patchedLabels = 0;

for (const file of walk(androidSrc)) {
  const source = fs.readFileSync(file, 'utf8');
  const enums = [...source.matchAll(/\benum\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  if (enums.length === 0) continue;

  let next = source;
  let changed = 0;
  for (const name of new Set(enums)) {
    const pattern = new RegExp(`\\bcase\\s+${name}\\.(\\w+)\\s*:`, 'g');
    next = next.replace(pattern, (match, constant) => {
      changed += 1;
      return `case ${constant}:`;
    });
  }

  if (changed > 0) {
    fs.writeFileSync(file, next);
    patchedFiles += 1;
    patchedLabels += changed;
    console.log(
      `[patch-capgo-java17] ${path.relative(root, file)}: ${changed} label(s)`
    );
  }
}

console.log(
  patchedFiles === 0
    ? '[patch-capgo-java17] already applied or no work needed.'
    : `[patch-capgo-java17] patched ${patchedLabels} label(s) across ${patchedFiles} file(s).`
);
