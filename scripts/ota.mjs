#!/usr/bin/env node
/**
 * OTA release tooling.
 *
 * Usage:
 *   node scripts/ota.mjs            Build a bundle zip from frontend/dist and publish it to backend/updates
 *   node scripts/ota.mjs verify     Fail if the Android versionName does not match the frontend bundle version
 *
 * The Android versionName baked into the APK is the baseline a freshly installed
 * device compares against. It must equal the frontend bundle version at APK build
 * time, or a fresh install will immediately redownload the bundle it already has.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPDATES_DIR = path.join(root, 'backend', 'updates');
const MANIFEST_PATH = path.join(UPDATES_DIR, 'current.json');
const DIST_DIR = path.join(root, 'frontend', 'dist');
const MOBILE_DIR = path.join(root, 'mobile');
const GRADLE_PATH = path.join(root, 'mobile', 'android', 'app', 'build.gradle');
const FRONTEND_PKG = path.join(root, 'frontend', 'package.json');
const APP_ID = 'com.ggallery.app';
const KEEP_BUNDLES = 3;

function die(message) {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readBundleVersion() {
  return readJson(FRONTEND_PKG).version;
}

function readNativeVersion() {
  const gradle = fs.readFileSync(GRADLE_PATH, 'utf8');
  const match = gradle.match(/versionName\s+"([^"]+)"/);
  return match ? match[1] : null;
}

/** Returns <0, 0 or >0 comparing two dotted versions. Pre-release suffixes are ignored. */
function compareVersions(a, b) {
  const parse = (v) =>
    String(v)
      .replace(/^v/i, '')
      .split(/[.+-]/)
      .map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function verifyGradle() {
  const bundleVersion = readBundleVersion();
  const nativeVersion = readNativeVersion();
  if (!nativeVersion) die(`Could not read versionName from ${GRADLE_PATH}`);
  if (compareVersions(nativeVersion, bundleVersion) !== 0) {
    die(
      `Android versionName (${nativeVersion}) does not match the frontend bundle version (${bundleVersion}).\n` +
        `Update versionName in mobile/android/app/build.gradle before building an APK.`
    );
  }
  console.log(`OK: Android versionName and frontend bundle version are both ${bundleVersion}`);
}

function release() {
  const version = readBundleVersion();
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    die(`frontend/package.json version "${version}" is not a valid semver (x.y.z).`);
  }
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    die('frontend/dist/index.html not found. Run `npm run build --prefix frontend` first.');
  }

  fs.mkdirSync(UPDATES_DIR, { recursive: true });

  let previous = null;
  if (fs.existsSync(MANIFEST_PATH)) previous = readJson(MANIFEST_PATH);
  if (previous && compareVersions(version, previous.version) <= 0) {
    die(
      `frontend/package.json version (${version}) is not newer than the published bundle (${previous.version}).\n` +
        `Bump the version before releasing.`
    );
  }

  const zipName = `${APP_ID}_${version}.zip`;
  // The bundler writes next to the capacitor config it discovers, so run it in mobile/.
  const zipPath = path.join(MOBILE_DIR, zipName);
  if (fs.existsSync(zipPath)) fs.rmSync(zipPath);

  // Installed apps cannot download a new APK over OTA, and the website serves
  // that file straight from public/. Keep it out of the bundle.
  const apkInDist = path.join(DIST_DIR, 'ggallery.apk');
  if (fs.existsSync(apkInDist)) {
    fs.rmSync(apkInDist);
    console.log('Removed dist/ggallery.apk from the bundle.');
  }

  console.log(`Bundling frontend/dist as ${version}...`);
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const command = `${npx} --yes @capgo/cli@latest bundle zip ${APP_ID} --path ../frontend/dist --bundle ${version} --json`;
  const stdout = execSync(command, { cwd: MOBILE_DIR, shell: true, encoding: 'utf8' });

  // The CLI frames its JSON with spinner/box-drawing lines, so grab the object
  // itself rather than assuming a clean line.
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  let result;
  try {
    result = JSON.parse(stdout.slice(start, end + 1));
  } catch {
    die(`Could not parse bundler output:\n${stdout}`);
  }
  if (!result.checksum) die(`Bundler did not return a checksum:\n${stdout}`);
  if (!fs.existsSync(zipPath)) die(`Expected bundle at ${zipPath} but it was not created.`);

  const targetPath = path.join(UPDATES_DIR, zipName);
  fs.copyFileSync(zipPath, targetPath);
  fs.rmSync(zipPath);

  const manifest = {
    version,
    file: zipName,
    checksum: result.checksum,
    size: fs.statSync(targetPath).size,
    releasedAt: new Date().toISOString(),
  };
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  // Keep the repo lean: only retain the newest bundles.
  const keep = new Set(
    fs
      .readdirSync(UPDATES_DIR)
      .filter((name) => name.endsWith('.zip'))
      .sort()
      .reverse()
      .slice(0, KEEP_BUNDLES)
  );
  for (const name of fs.readdirSync(UPDATES_DIR)) {
    if (name.endsWith('.zip') && !keep.has(name)) fs.rmSync(path.join(UPDATES_DIR, name));
  }

  console.log(`\nPublished ${version}`);
  console.log(`  ${path.join('backend', 'updates', zipName)} (${(manifest.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  checksum ${result.checksum}\n`);
  console.log('Next:');
  console.log('  1. Commit and push so the backend deploy picks up backend/updates/.');
  console.log('  2. Installed apps pick up the bundle on their next launch.\n');

  const nativeVersion = readNativeVersion();
  if (nativeVersion && compareVersions(nativeVersion, version) !== 0) {
    console.log(
      `Note: Android versionName is ${nativeVersion}, bundle is ${version}. ` +
        `Fine for OTA-only releases; sync them before building a new APK (node scripts/ota.mjs verify).\n`
    );
  }
}

const [command = 'release'] = process.argv.slice(2);
if (command === 'verify') verifyGradle();
else if (command === 'release') release();
else die(`Unknown command "${command}". Use "release" or "verify".`);
