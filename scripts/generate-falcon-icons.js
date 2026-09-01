const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Ultra-Modern, Sleek, Geometric Falcon Apex App Icon (512x512)
const falconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Deep Space Midnight Background -->
    <radialGradient id="bgGrad" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="45%" stop-color="#0f172a" />
      <stop offset="85%" stop-color="#050814" />
      <stop offset="100%" stop-color="#02040a" />
    </radialGradient>

    <!-- Vibrant Electric Wing Gradient (Left) -->
    <linearGradient id="wingLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="35%" stop-color="#6366f1" />
      <stop offset="75%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#4f46e5" />
    </linearGradient>

    <!-- Vibrant Neon Wing Gradient (Right) -->
    <linearGradient id="wingRightGrad" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#818cf8" />
      <stop offset="40%" stop-color="#a855f7" />
      <stop offset="80%" stop-color="#d946ef" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>

    <!-- Apex Amber & Gold Falcon Crest -->
    <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb" />
      <stop offset="25%" stop-color="#fde047" />
      <stop offset="60%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>

    <!-- Core Falcon Body & Shield -->
    <linearGradient id="bodyShield" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="30%" stop-color="#e0e7ff" />
      <stop offset="70%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#4338ca" />
    </linearGradient>

    <!-- Outer Neon Border Gradient -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9" />
      <stop offset="35%" stop-color="#818cf8" stop-opacity="0.8" />
      <stop offset="70%" stop-color="#c084fc" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.9" />
    </linearGradient>

    <!-- Glass Top Highlight -->
    <linearGradient id="glassSheen" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.15" />
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.03" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>

    <!-- Soft Glow Filter -->
    <filter id="iconGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#6366f1" flood-opacity="0.55" />
    </filter>

    <!-- Beak & Eye Sharp Drop Shadow -->
    <filter id="coreShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#020617" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Base Squircle Container (iOS & Android Native Squircle standard) -->
  <rect width="512" height="512" rx="120" fill="url(#bgGrad)" />

  <!-- Outer Glassmorphism & Neon Perimeter Strokes -->
  <rect x="6" y="6" width="500" height="500" rx="114" fill="none" stroke="url(#borderGrad)" stroke-width="4.5" />
  <rect x="14" y="14" width="484" height="484" rx="106" fill="url(#glassSheen)" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.1" />

  <!-- Dynamic Ambient Nebula Lights -->
  <circle cx="256" cy="240" r="150" fill="#6366f1" fill-opacity="0.22" filter="blur(40px)" />
  <circle cx="256" cy="180" r="90" fill="#38bdf8" fill-opacity="0.2" filter="blur(30px)" />
  <circle cx="256" cy="300" r="80" fill="#f59e0b" fill-opacity="0.15" filter="blur(25px)" />

  <!-- AERODYNAMIC FALCON EMBLEM (Apex Soaring Silhouette) -->
  <g filter="url(#iconGlow)">
    
    <!-- UPPER TIER LEFT WING (Primary Apex Blade) -->
    <path d="M 256 185 
             C 210 115, 140 70, 68 88 
             C 102 128, 145 168, 195 198 
             C 142 195, 96 218, 92 245 
             C 134 254, 180 252, 226 242 
             Z" 
          fill="url(#wingLeftGrad)" />

    <!-- UPPER TIER RIGHT WING (Primary Apex Blade) -->
    <path d="M 256 185 
             C 302 115, 372 70, 444 88 
             C 410 128, 367 168, 317 198 
             C 370 195, 416 218, 420 245 
             C 378 254, 332 252, 286 242 
             Z" 
          fill="url(#wingRightGrad)" />

    <!-- LOWER TIER LEFT WING (Secondary Aerodynamic Feathers) -->
    <path d="M 235 245 
             C 185 260, 130 280, 126 315 
             C 168 318, 208 302, 240 276 
             C 212 300, 186 332, 202 355 
             C 228 355, 248 322, 256 288 
             Z" 
          fill="url(#wingLeftGrad)" fill-opacity="0.88" />

    <!-- LOWER TIER RIGHT WING (Secondary Aerodynamic Feathers) -->
    <path d="M 277 245 
             C 327 260, 382 280, 386 315 
             C 344 318, 304 302, 272 276 
             C 300 300, 326 332, 310 355 
             C 284 355, 264 322, 256 288 
             Z" 
          fill="url(#wingRightGrad)" fill-opacity="0.88" />

    <!-- TAIL FEATHERS (Propulsion Flare) -->
    <path d="M 256 295 
             L 282 375 
             L 256 425 
             L 230 375 
             Z" 
          fill="url(#crestGold)" />
    
    <!-- TAIL ACCENT FLAKES -->
    <path d="M 230 375 L 210 405 L 238 395 Z" fill="#f59e0b" fill-opacity="0.8" />
    <path d="M 282 375 L 302 405 L 274 395 Z" fill="#f59e0b" fill-opacity="0.8" />

    <!-- CHEST FUSELAGE / ARMOR SHIELD -->
    <g filter="url(#coreShadow)">
      <path d="M 256 165 
               L 294 228 
               L 286 318 
               L 256 360 
               L 226 318 
               L 218 228 
               Z" 
            fill="url(#bodyShield)" stroke="#ffffff" stroke-width="2.5" stroke-opacity="0.7" />

      <!-- Center Dynamic Speed Ridge -->
      <path d="M 256 165 L 256 360" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-opacity="0.9" />
    </g>

    <!-- MAJESTIC FALCON HEAD & SHARP HOOK BEAK -->
    <g filter="url(#coreShadow)">
      <!-- Falcon Crown & Forehead -->
      <path d="M 256 86 
               C 278 86, 296 102, 298 126 
               C 310 132, 328 144, 324 168 
               C 310 172, 296 164, 290 156 
               L 285 195 
               L 227 195 
               L 222 156 
               C 216 164, 202 172, 188 168 
               C 184 144, 202 132, 214 126 
               C 216 102, 234 86, 256 86 
               Z" 
            fill="url(#crestGold)" stroke="#ffffff" stroke-width="2.5" />

      <!-- Piercing Falcon Eye (Right) -->
      <circle cx="274" cy="128" r="6.5" fill="#090d16" stroke="#ffffff" stroke-width="2" />
      <circle cx="276" cy="126" r="2.2" fill="#38bdf8" />

      <!-- Piercing Falcon Eye (Left) -->
      <circle cx="238" cy="128" r="6.5" fill="#090d16" stroke="#ffffff" stroke-width="2" />
      <circle cx="236" cy="126" r="2.2" fill="#38bdf8" />

      <!-- Apex Diamond Star Crest on Forehead -->
      <polygon points="256,64 263,80 256,76 249,80" fill="#ffffff" stroke="#fde047" stroke-width="1.5" />
    </g>
  </g>

  <!-- SUBTLE BOTTOM SPEED PARTICLES -->
  <circle cx="160" cy="435" r="2.5" fill="#38bdf8" fill-opacity="0.6" />
  <circle cx="352" cy="435" r="2.5" fill="#d946ef" fill-opacity="0.6" />
  <circle cx="256" cy="460" r="3" fill="#fde047" fill-opacity="0.7" />
</svg>`;

async function buildIcons() {
  const publicIconsDir = path.join(__dirname, '..', 'public', 'icons');
  const publicDir = path.join(__dirname, '..', 'public');

  if (!fs.existsSync(publicIconsDir)) {
    fs.mkdirSync(publicIconsDir, { recursive: true });
  }

  const svgBuffer = Buffer.from(falconSvg);

  // 1. Save SVG files
  fs.writeFileSync(path.join(publicIconsDir, 'icon.svg'), falconSvg);
  fs.writeFileSync(path.join(publicIconsDir, 'icon-192x192.svg'), falconSvg);
  fs.writeFileSync(path.join(publicIconsDir, 'icon-512x512.svg'), falconSvg);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), falconSvg);

  // 2. Generate 512x512 PNG (Master PWA / Android Play Store & Launcher)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicIconsDir, 'icon-512x512.png'));
  console.log('✓ Generated 512x512 PNG');

  // 3. Generate 192x192 PNG (PWA Home Screen standard)
  await sharp(svgBuffer)
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(publicIconsDir, 'icon-192x192.png'));
  console.log('✓ Generated 192x192 PNG');

  // 4. Generate Apple Touch Icon (180x180 for iOS Safari & iPad)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(publicIconsDir, 'apple-touch-icon.png'));
  console.log('✓ Generated Apple Touch Icon');

  // 5. Generate Favicon PNGs
  await sharp(svgBuffer)
    .resize(48, 48)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('✓ Generated favicon.ico');

  console.log('🎉 All Falcon High-Resolution App Icons generated successfully!');
}

buildIcons().catch(err => {
  console.error('Failed generating icons', err);
  process.exit(1);
});
