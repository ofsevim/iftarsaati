import sharp from 'sharp';
import fs from 'fs';

async function generatePNGFromSVG() {
  try {
    // SVG dosyalarını oku
    const svg192 = fs.readFileSync('public/icon-192.svg', 'utf8');
    const svg512 = fs.readFileSync('public/icon-512.svg', 'utf8');
    
    // 192x192 PNG oluştur
    await sharp(Buffer.from(svg192))
      .resize(192, 192)
      .png()
      .toFile('public/icon-192.png');
    
    console.log('✓ 192x192 PNG icon created: public/icon-192.png');
    
    // 512x512 PNG oluştur
    await sharp(Buffer.from(svg512))
      .resize(512, 512)
      .png()
      .toFile('public/icon-512.png');
    
    console.log('✓ 512x512 PNG icon created: public/icon-512.png');
    
    // Apple touch icon için 180x180 PNG oluştur
    await sharp(Buffer.from(svg192))
      .resize(180, 180)
      .png()
      .toFile('public/apple-touch-icon.png');
    
    console.log('✓ 180x180 Apple touch icon created: public/apple-touch-icon.png');
    
  } catch (error) {
    console.error('Error generating PNG icons:', error);
    process.exit(1);
  }
}

generatePNGFromSVG();