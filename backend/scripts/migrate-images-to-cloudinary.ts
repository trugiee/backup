/**
 * migrate-images-to-cloudinary.ts
 *
 * Uploads every file in backend/uploads/ to Cloudinary,
 * then updates all DB records that have the old /uploads/<filename> URL.
 *
 * Run with:  npx tsx scripts/migrate-images-to-cloudinary.ts
 */

import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const prisma = new PrismaClient();
const uploadsDir = path.join(process.cwd(), 'uploads');

// Map: local filename → cloudinary URL
const urlMap: Record<string, string> = {};

async function uploadAllFiles() {
  const files = fs.readdirSync(uploadsDir);
  console.log(`\n📁 Found ${files.length} file(s) in uploads/\n`);

  for (const filename of files) {
    const localPath = path.join(uploadsDir, filename);
    const oldUrl = `/uploads/${filename}`;

    const ext = path.extname(filename).toLowerCase();
    const isVideo = ['.mp4', '.mov', '.avi', '.webm'].includes(ext);
    let success = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await cloudinary.uploader.upload(localPath, {
          folder: 'ggallery',
          resource_type: isVideo ? 'video' : 'image',
          overwrite: true,
          timeout: 120000, // 2 minute timeout
        });
        urlMap[oldUrl] = result.secure_url;
        console.log(`✅ Uploaded: ${filename}`);
        console.log(`   → ${result.secure_url}`);
        success = true;
        break;
      } catch (err: any) {
        const msg = err?.message || JSON.stringify(err) || 'unknown error';
        if (attempt < 3) {
          console.warn(`⚠️  Attempt ${attempt} failed for ${filename}: ${msg} — retrying in 3s...`);
          await new Promise(r => setTimeout(r, 3000));
        } else {
          console.error(`❌ Failed to upload ${filename} after 3 attempts: ${msg}`);
        }
      }
    }

    if (!success) continue;

    // Small delay between uploads to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
}

async function patchDatabase() {
  console.log('\n🔄 Patching database records...\n');

  // --- Artwork.imageUrl ---
  const artworks = await prisma.artwork.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, imageUrl: true, media: true },
  });

  for (const artwork of artworks) {
    const updates: any = {};

    // Fix imageUrl
    if (artwork.imageUrl && urlMap[artwork.imageUrl]) {
      updates.imageUrl = urlMap[artwork.imageUrl];
    }

    // Fix media JSON array: [{ type, url }, ...]
    if (Array.isArray(artwork.media)) {
      const patchedMedia = (artwork.media as any[]).map((item: any) => {
        if (item.url && urlMap[item.url]) {
          return { ...item, url: urlMap[item.url] };
        }
        return item;
      });
      updates.media = patchedMedia;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.artwork.update({ where: { id: artwork.id }, data: updates });
      console.log(`✅ Artwork [${artwork.id}] patched`);
    }
  }

  // --- Exhibitor.profilePicture ---
  const exhibitors = await prisma.exhibitor.findMany({
    where: { profilePicture: { not: null } },
    select: { id: true, profilePicture: true },
  });

  for (const ex of exhibitors) {
    if (ex.profilePicture && urlMap[ex.profilePicture]) {
      await prisma.exhibitor.update({
        where: { id: ex.id },
        data: { profilePicture: urlMap[ex.profilePicture] },
      });
      console.log(`✅ Exhibitor [${ex.id}] profilePicture patched`);
    }
  }

  // --- Collector.profilePicture ---
  const collectors = await prisma.collector.findMany({
    where: { profilePicture: { not: null } },
    select: { id: true, profilePicture: true },
  });

  for (const col of collectors) {
    if (col.profilePicture && urlMap[col.profilePicture]) {
      await prisma.collector.update({
        where: { id: col.id },
        data: { profilePicture: urlMap[col.profilePicture] },
      });
      console.log(`✅ Collector [${col.id}] profilePicture patched`);
    }
  }

  // --- Achievement.proofImageUrl ---
  const achievements = await prisma.achievement.findMany({
    where: { proofImageUrl: { not: null } },
    select: { id: true, proofImageUrl: true },
  });

  for (const ach of achievements) {
    if (ach.proofImageUrl && urlMap[ach.proofImageUrl]) {
      await prisma.achievement.update({
        where: { id: ach.id },
        data: { proofImageUrl: urlMap[ach.proofImageUrl] },
      });
      console.log(`✅ Achievement [${ach.id}] proofImageUrl patched`);
    }
  }
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
