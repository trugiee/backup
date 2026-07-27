#!/usr/bin/env node
/**
 * migrate-images-to-cloudinary-curl.ts
 *
 * Uses curl (which works on this machine) to upload files to Cloudinary,
 * then updates all DB records with the new Cloudinary URLs.
 *
 * Run with: npx tsx scripts/migrate-images-to-cloudinary-curl.ts
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
const API_KEY    = process.env.CLOUDINARY_API_KEY!;
const API_SECRET = process.env.CLOUDINARY_API_SECRET!;
const FOLDER     = 'ggallery';

const prisma = new PrismaClient();
const uploadsDir = path.join(process.cwd(), 'uploads');

// Map: /uploads/<filename> → cloudinary secure_url
const urlMap: Record<string, string> = {};

function signUpload(params: Record<string, string | number>): string {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(sorted + API_SECRET).digest('hex');
}

function uploadViaCurl(localPath: string, isVideo: boolean): string | null {
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = { folder: FOLDER, timestamp };
  const signature = signUpload(params);

  const resourceType = isVideo ? 'video' : 'image';
  const apiUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const cmd = [
    'curl', '-s', '--max-time', '60',
    '-F', `file=@${localPath}`,
    '-F', `api_key=${API_KEY}`,
    '-F', `timestamp=${timestamp}`,
    '-F', `folder=${FOLDER}`,
    '-F', `signature=${signature}`,
    apiUrl,
  ].join(' ');

  try {
    const output = execSync(cmd, { encoding: 'utf8', timeout: 70000 });
    const json = JSON.parse(output);
    if (json.error) {
      console.error(`  ❌ Cloudinary error: ${json.error.message}`);
      return null;
    }
    return json.secure_url as string;
  } catch (err: any) {
    console.error(`  ❌ curl error: ${err.message}`);
    return null;
  }
}

async function uploadAllFiles() {
  const files = fs.readdirSync(uploadsDir);
  console.log(`\n📁 Found ${files.length} file(s) in uploads/\n`);

  for (const filename of files) {
    const localPath = path.join(uploadsDir, filename);
    const oldUrl = `/uploads/${filename}`;
    const ext = path.extname(filename).toLowerCase();
    const isVideo = ['.mp4', '.mov', '.avi', '.webm'].includes(ext);

    console.log(`⬆️  Uploading: ${filename}`);
    const secureUrl = uploadViaCurl(localPath, isVideo);

    if (secureUrl) {
      urlMap[oldUrl] = secureUrl;
      console.log(`  ✅ → ${secureUrl}`);
    }
  }

  console.log(`\n📊 Successfully uploaded: ${Object.keys(urlMap).length}/${files.length} files`);
}

async function patchDatabase() {
  if (Object.keys(urlMap).length === 0) {
    console.log('\n⚠️  No files were uploaded, skipping DB patch.\n');
    return;
  }

  console.log('\n🔄 Patching database records...\n');

  // --- Artwork.imageUrl & Artwork.media ---
  const artworks = await prisma.artwork.findMany({
    select: { id: true, imageUrl: true, media: true },
  });

  let artworkPatched = 0;
  for (const artwork of artworks) {
    const updates: any = {};

    if (artwork.imageUrl && urlMap[artwork.imageUrl]) {
      updates.imageUrl = urlMap[artwork.imageUrl];
    }

    if (Array.isArray(artwork.media)) {
      const patchedMedia = (artwork.media as any[]).map((item: any) => {
        if (item.url && urlMap[item.url]) return { ...item, url: urlMap[item.url] };
        return item;
      });
      if (JSON.stringify(patchedMedia) !== JSON.stringify(artwork.media)) {
        updates.media = patchedMedia;
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.artwork.update({ where: { id: artwork.id }, data: updates });
      artworkPatched++;
    }
  }
  console.log(`✅ Artworks patched: ${artworkPatched}`);

  // --- Exhibitor.profilePicture ---
  const exhibitors = await prisma.exhibitor.findMany({ select: { id: true, profilePicture: true } });
  let exPatched = 0;
  for (const ex of exhibitors) {
    if (ex.profilePicture && urlMap[ex.profilePicture]) {
      await prisma.exhibitor.update({ where: { id: ex.id }, data: { profilePicture: urlMap[ex.profilePicture] } });
      exPatched++;
    }
  }
  console.log(`✅ Exhibitor profiles patched: ${exPatched}`);

  // --- Collector.profilePicture ---
  const collectors = await prisma.collector.findMany({ select: { id: true, profilePicture: true } });
  let colPatched = 0;
  for (const col of collectors) {
    if (col.profilePicture && urlMap[col.profilePicture]) {
      await prisma.collector.update({ where: { id: col.id }, data: { profilePicture: urlMap[col.profilePicture] } });
      colPatched++;
    }
  }
  console.log(`✅ Collector profiles patched: ${colPatched}`);

  // --- Achievement.proofImageUrl ---
  const achievements = await prisma.achievement.findMany({ select: { id: true, proofImageUrl: true } });
  let achPatched = 0;
  for (const ach of achievements) {
    if (ach.proofImageUrl && urlMap[ach.proofImageUrl]) {
      await prisma.achievement.update({ where: { id: ach.id }, data: { proofImageUrl: urlMap[ach.proofImageUrl] } });
      achPatched++;
    }
  }
  console.log(`✅ Achievements patched: ${achPatched}`);
}

async function main() {
  try {
    await uploadAllFiles();
    await patchDatabase();
    console.log('\n🎉 Migration complete! All images are now on Cloudinary.\n');
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
