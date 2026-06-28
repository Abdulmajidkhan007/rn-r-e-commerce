import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Brand colors — mirrors palette.primary[500] from packages/theme/src/colors.ts
const BRAND_PRIMARY = '#ff5a3c';

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

const svgPath = resolve(ROOT, 'assets/source/kidswear-mark.svg');
const svgBuffer = readFileSync(svgPath);

// Ensure output dirs exist
mkdirSync(resolve(ROOT, 'apps/mobile/assets'), { recursive: true });
mkdirSync(resolve(ROOT, 'apps/web/public'), { recursive: true });

const primaryRgb = hexToRgb(BRAND_PRIMARY);

async function renderMark(size, markFraction) {
  // Render the SVG mark at markFraction * size
  const markSize = Math.round(size * markFraction);
  const markBuffer = await sharp(svgBuffer)
    .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return markBuffer;
}

async function makeOpaque(size, markFraction) {
  const markBuffer = await renderMark(size, markFraction);
  const bg = { r: primaryRgb.r, g: primaryRgb.g, b: primaryRgb.b, alpha: 255 };
  return sharp({
    create: { width: size, height: size, channels: 4, background: bg }
  })
    .composite([{ input: markBuffer, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function makeTransparent(size, markFraction) {
  const markBuffer = await renderMark(size, markFraction);
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: markBuffer, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function writeFile(outPath, buffer) {
  const { writeFileSync } = await import('fs');
  writeFileSync(outPath, buffer);
  const kb = (buffer.length / 1024).toFixed(1);
  console.log(`  written  ${outPath.replace(ROOT + '/', '')}  (${kb} KB)`);
}

async function generateOgImage() {
  const svgText = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#ff5a3c"/>
  <text x="600" y="345" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-weight="800" font-size="120" fill="white">KidsWear</text>
</svg>`);

  const outPath = resolve(ROOT, 'apps/web/public/og-image.png');
  const buffer = await sharp(svgText).png().toBuffer();
  await writeFile(outPath, buffer);
}

async function main() {
  console.log('Generating KidsWear brand assets...\n');

  // mobile/assets/icon.png — 1024x1024 opaque
  await writeFile(
    resolve(ROOT, 'apps/mobile/assets/icon.png'),
    await makeOpaque(1024, 0.55)
  );

  // mobile/assets/adaptive-icon.png — 1024x1024 transparent, 50% mark (25% safe zone each side)
  await writeFile(
    resolve(ROOT, 'apps/mobile/assets/adaptive-icon.png'),
    await makeTransparent(1024, 0.50)
  );

  // mobile/assets/notification-icon.png — 96x96 transparent white silhouette
  await writeFile(
    resolve(ROOT, 'apps/mobile/assets/notification-icon.png'),
    await makeTransparent(96, 0.70)
  );

  // mobile/assets/splash-icon.png — 1024x1024 transparent
  await writeFile(
    resolve(ROOT, 'apps/mobile/assets/splash-icon.png'),
    await makeTransparent(1024, 0.55)
  );

  // mobile/assets/favicon.png — 48x48 opaque
  await writeFile(
    resolve(ROOT, 'apps/mobile/assets/favicon.png'),
    await makeOpaque(48, 0.55)
  );

  // web/public/favicon-32.png — 32x32 opaque
  await writeFile(
    resolve(ROOT, 'apps/web/public/favicon-32.png'),
    await makeOpaque(32, 0.55)
  );

  // web/public/favicon.ico — 32x32 (PNG-encoded, .ico extension)
  await writeFile(
    resolve(ROOT, 'apps/web/public/favicon.ico'),
    await makeOpaque(32, 0.55)
  );

  // web/public/apple-touch-icon-180.png — 180x180 opaque
  await writeFile(
    resolve(ROOT, 'apps/web/public/apple-touch-icon-180.png'),
    await makeOpaque(180, 0.55)
  );

  // web/public/maskable-192.png — 192x192 opaque, 60% mark
  await writeFile(
    resolve(ROOT, 'apps/web/public/maskable-192.png'),
    await makeOpaque(192, 0.60)
  );

  // web/public/maskable-512.png — 512x512 opaque, 60% mark
  await writeFile(
    resolve(ROOT, 'apps/web/public/maskable-512.png'),
    await makeOpaque(512, 0.60)
  );

  // web/public/og-image.png — 1200x630 OG image
  await generateOgImage();

  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
