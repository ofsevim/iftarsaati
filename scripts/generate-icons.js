import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ANDROID_DENSITIES = [
  { name: 'mdpi', launcher: 48, foreground: 108 },
  { name: 'hdpi', launcher: 72, foreground: 162 },
  { name: 'xhdpi', launcher: 96, foreground: 216 },
  { name: 'xxhdpi', launcher: 144, foreground: 324 },
  { name: 'xxxhdpi', launcher: 192, foreground: 432 },
];

async function generateAssets() {
  try {
    const svgIcon = fs.readFileSync('public/icon.svg');
    const svg192 = fs.readFileSync('public/icon-192.svg');
    const svg512 = fs.readFileSync('public/icon-512.svg');
    const svgMaskable = fs.readFileSync('public/icon-maskable.svg');
    const svgForeground = fs.readFileSync('public/icon-foreground.svg');
    const svgScreenshotNarrow = fs.readFileSync('public/screenshot-narrow.svg');

    // Web & PWA icons
    await sharp(svg192).resize(192, 192).png().toFile('public/icon-192.png');
    await sharp(svg512).resize(512, 512).png().toFile('public/icon-512.png');
    await sharp(svgMaskable).resize(192, 192).png().toFile('public/icon-maskable-192.png');
    await sharp(svgMaskable).resize(512, 512).png().toFile('public/icon-maskable-512.png');
    await sharp(svg192).resize(180, 180).png().toFile('public/apple-touch-icon.png');
    await sharp(svg192).resize(32, 32).png().toFile('public/favicon.png');
    await sharp(svg192).resize(48, 48).png().toFile('public/favicon-48.png');
    await sharp(svgScreenshotNarrow).resize(540, 720).png().toFile('public/screenshot-narrow.png');

    console.log('✓ Web, PWA, favicon & narrow screenshot assets generated');

    // Android launcher icons & adaptive foregrounds
    const androidResDir = path.join('android', 'app', 'src', 'main', 'res');
    if (fs.existsSync(androidResDir)) {
      for (const { name, launcher, foreground } of ANDROID_DENSITIES) {
        const mipmapDir = path.join(androidResDir, `mipmap-${name}`);
        fs.mkdirSync(mipmapDir, { recursive: true });

        await sharp(svgIcon)
          .resize(launcher, launcher)
          .png()
          .toFile(path.join(mipmapDir, 'ic_launcher.png'));

        const roundMask = Buffer.from(
          `<svg width="${launcher}" height="${launcher}" viewBox="0 0 ${launcher} ${launcher}"><circle cx="${launcher / 2}" cy="${launcher / 2}" r="${launcher / 2}" fill="#fff"/></svg>`
        );
        await sharp(svgMaskable)
          .resize(launcher, launcher)
          .composite([{ input: roundMask, blend: 'dest-in' }])
          .png()
          .toFile(path.join(mipmapDir, 'ic_launcher_round.png'));

        await sharp(svgForeground)
          .resize(foreground, foreground)
          .png()
          .toFile(path.join(mipmapDir, 'ic_launcher_foreground.png'));
      }
      console.log('✓ Android mipmap launcher icons & foregrounds generated');
    }
  } catch (error) {
    console.error('Error generating PNG icons:', error);
    process.exit(1);
  }
}

generateAssets();