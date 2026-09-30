import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const UPDATES_DIR = path.join(process.cwd(), 'updates');
const MANIFEST_PATH = path.join(UPDATES_DIR, 'current.json');

interface UpdateManifest {
  version: string;
  file: string;
  checksum: string;
  size?: number;
}

function readManifest(): UpdateManifest | null {
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const manifest = JSON.parse(raw) as UpdateManifest;
    if (!manifest?.version || !manifest?.file || !manifest?.checksum) return null;
    if (!fs.existsSync(path.join(UPDATES_DIR, manifest.file))) return null;
    return manifest;
  } catch {
    return null;
  }
}

function compareVersions(a: string, b: string): number {
  const parse = (v: string): number[] =>
    String(v)
      .replace(/^v/i, '')
      .split(/[.+-]/)
      .map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * The @capgo/capacitor-updater plugin POSTs this endpoint on every app launch.
 * Respond with `{ url }` to push an OTA bundle, or `{}` to do nothing.
 */
router.post('/app/update', (req: Request, res: Response) => {
  const manifest = readManifest();
  if (!manifest) {
    return res.json({});
  }

  const body = (req.body ?? {}) as {
    version_name?: string;
    version_build?: string;
    device_id?: string;
    platform?: string;
  };

  // `version_name` is the bundle the updater last installed; `builtin` means the
  // device is still running whatever shipped inside the APK.
  const installed =
    body.version_name && body.version_name !== 'builtin' ? body.version_name : body.version_build ?? '';

  if (!installed || compareVersions(manifest.version, installed) <= 0) {
    return res.json({});
  }

  const host = req.get('host');
  if (!host) {
    return res.json({ error: 'no_host', message: 'Could not determine update host' });
  }

  console.log(
    `OTA: ${manifest.version} available for device ${body.device_id ?? 'unknown'} (${body.platform ?? 'unknown'}, on ${installed})`
  );

  res.json({
    version: manifest.version,
    url: `${req.protocol}://${host}/api/updates/${encodeURIComponent(manifest.file)}`,
    checksum: manifest.checksum,
  });
});

/** Read-only view of what is currently published. */
router.get('/app/update', (_req: Request, res: Response) => {
  const manifest = readManifest();
  res.json(manifest ? { ...manifest, url: undefined } : { error: 'no_bundle_published' });
});

export default router;
