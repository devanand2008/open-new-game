import * as THREE from 'three';

export interface SolaraTextureSet {
  asphalt: THREE.CanvasTexture;
  asphaltBump: THREE.CanvasTexture;
  roadRoughness: THREE.CanvasTexture;
  sidewalk: THREE.CanvasTexture;
  glassFacade: THREE.CanvasTexture;
  glassEmissive: THREE.CanvasTexture;
  artDecoFacade: THREE.CanvasTexture;
  sand: THREE.CanvasTexture;
  runway: THREE.CanvasTexture;
  socialBillboard: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  skinBump: THREE.CanvasTexture;
  fabricBump: THREE.CanvasTexture;
  dispose: () => void;
}

function configureColorTex(tex: THREE.CanvasTexture, maxAniso: number, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAniso);
  tex.needsUpdate = true;
  return tex;
}

function configureDataTex(tex: THREE.CanvasTexture, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export function createSolaraTextures(renderer: THREE.WebGLRenderer): SolaraTextureSet {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // 1. High-Detail Coastal Avenue Asphalt (aggregate grain, curb gutters, tire tracks, crisp markings)
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rctx = roadCanvas.getContext('2d')!;
  rctx.fillStyle = '#252b35';
  rctx.fillRect(0, 0, 512, 512);

  // Subtle multi-tone aggregate speckles
  for (let i = 0; i < 8500; i++) {
    const x = (i * 73 + (i % 13) * 19) % 512;
    const y = (i * 197 + Math.floor(i / 7) * 13) % 512;
    const v = 30 + (i % 24);
    rctx.fillStyle = `rgb(${v},${v + 4},${v + 9})`;
    rctx.fillRect(x, y, 2, 2);
  }

  // Subtle asphalt patching & tire wear grooves
  rctx.fillStyle = 'rgba(13,17,24,0.26)';
  rctx.fillRect(82, 0, 48, 512);
  rctx.fillRect(156, 0, 32, 512);
  rctx.fillRect(324, 0, 32, 512);
  rctx.fillRect(382, 0, 48, 512);

  // Concrete curbs + dark drainage gutter shadows
  rctx.fillStyle = '#5b6472';
  rctx.fillRect(0, 0, 14, 512);
  rctx.fillRect(498, 0, 14, 512);
  rctx.fillStyle = '#181e27';
  rctx.fillRect(14, 0, 5, 512);
  rctx.fillRect(493, 0, 5, 512);

  // Crisp white shoulder lines
  rctx.fillStyle = '#dce3ec';
  rctx.fillRect(24, 0, 6, 512);
  rctx.fillRect(482, 0, 6, 512);

  // Dashed lane divider strips (inner lane guides)
  rctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
  for (let y = 16; y < 512; y += 64) {
    rctx.fillRect(138, y, 4, 28);
    rctx.fillRect(370, y, 4, 28);
  }

  // Vivid double amber centerline
  rctx.fillStyle = '#f59e0b';
  rctx.fillRect(247, 0, 6, 512);
  rctx.fillRect(259, 0, 6, 512);
  const asphalt = configureColorTex(new THREE.CanvasTexture(roadCanvas), maxAniso, 1, 1);

  // 2. Asphalt micro-grain bump map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bctx = bumpCanvas.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) {
    const x = (i * 59) % 256;
    const y = (i * 131 + Math.floor(i / 5) * 11) % 256;
    const g = 86 + (i % 82);
    bctx.fillStyle = `rgb(${g},${g},${g})`;
    bctx.fillRect(x, y, 2, 2);
  }
  const asphaltBump = configureDataTex(new THREE.CanvasTexture(bumpCanvas), 4, 4);

  // 2b. Organic Wet-Asphalt Streak Roughness Map (used dynamically when road is wet)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 512;
  const rgctx = roughCanvas.getContext('2d')!;
  rgctx.fillStyle = 'rgb(205,205,205)';
  rgctx.fillRect(0, 0, 512, 512);
  // Natural fine asphalt pore grain
  for (let i = 0; i < 4800; i++) {
    const x = (i * 83) % 512;
    const y = (i * 149) % 512;
    const g = 155 + (i % 75);
    rgctx.fillStyle = `rgb(${g},${g},${g})`;
    rgctx.fillRect(x, y, 4, 4);
  }
  // Subtle lengthwise tire-track rainwater film & curb drainage sheen (no polka dots)
  const sheenTracks: Array<[number, number]> = [
    [32, 34],
    [106, 56],
    [176, 36],
    [336, 36],
    [406, 56],
    [480, 34],
  ];
  for (const [tx, tw] of sheenTracks) {
    const tGrad = rgctx.createLinearGradient(tx - tw, 0, tx + tw, 0);
    tGrad.addColorStop(0, 'rgba(195,195,195,0)');
    tGrad.addColorStop(0.5, 'rgba(110,110,110,0.68)');
    tGrad.addColorStop(1, 'rgba(195,195,195,0)');
    rgctx.fillStyle = tGrad;
    rgctx.fillRect(tx - tw, 0, tw * 2, 512);
  }
  const roadRoughness = configureDataTex(new THREE.CanvasTexture(roughCanvas), 1, 1);

  // 3. Sunlit Coastal Limestone & Travertine Sidewalk Pavers
  const swCanvas = document.createElement('canvas');
  swCanvas.width = 256;
  swCanvas.height = 256;
  const sctx = swCanvas.getContext('2d')!;
  sctx.fillStyle = '#9a9386';
  sctx.fillRect(0, 0, 256, 256);

  // Per-tile subtle warm limestone tone variation
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const h = (row * 13 + col * 29) % 14;
      sctx.fillStyle = `rgb(${148 + h}, ${141 + h}, ${129 + h})`;
      sctx.fillRect(col * 64 + 2, row * 64 + 2, 60, 60);
      // Top-left bevel highlight
      sctx.fillStyle = 'rgba(255, 250, 238, 0.14)';
      sctx.fillRect(col * 64 + 2, row * 64 + 2, 60, 2);
      sctx.fillRect(col * 64 + 2, row * 64 + 2, 2, 60);
    }
  }
  // Grout joints
  sctx.strokeStyle = '#6c665b';
  sctx.lineWidth = 3;
  for (let p = 0; p <= 256; p += 64) {
    sctx.beginPath();
    sctx.moveTo(p, 0);
    sctx.lineTo(p, 256);
    sctx.stroke();
    sctx.beginPath();
    sctx.moveTo(0, p);
    sctx.lineTo(256, p);
    sctx.stroke();
  }
  for (let i = 0; i < 2200; i++) {
    const x = (i * 89) % 256;
    const y = (i * 151) % 256;
    sctx.fillStyle = i % 2 === 0 ? 'rgba(255,248,235,0.09)' : 'rgba(35,32,28,0.10)';
    sctx.fillRect(x, y, 2, 2);
  }
  const sidewalk = configureColorTex(new THREE.CanvasTexture(swCanvas), maxAniso, 34, 34);

  // 4. Downtown Luxury Glass Curtain Wall + Detailed Office Night Emissive Map
  const glassCanvas = document.createElement('canvas');
  glassCanvas.width = 256;
  glassCanvas.height = 512;
  const gctx = glassCanvas.getContext('2d')!;

  const emCanvas = document.createElement('canvas');
  emCanvas.width = 256;
  emCanvas.height = 512;
  const ectx = emCanvas.getContext('2d')!;

  gctx.fillStyle = '#142233';
  gctx.fillRect(0, 0, 256, 512);
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, 256, 512);

  const cols = 8;
  const rows = 16;
  const cw = 256 / cols;
  const rh = 512 / rows;
  for (let r = 0; r < rows; r++) {
    // Structural spandrel slab band per floor
    gctx.fillStyle = '#1d3047';
    gctx.fillRect(0, r * rh, 256, 5);
    gctx.fillStyle = 'rgba(186, 230, 253, 0.22)';
    gctx.fillRect(0, r * rh + 5, 256, 1.5);

    for (let c = 0; c < cols; c++) {
      const hash = ((r * 31 + c * 17) ^ (r * 7 + c * 3)) % 100;
      const paneGrad = gctx.createLinearGradient(0, r * rh + 6, 0, (r + 1) * rh - 2);
      const base = 42 + (hash % 34);
      paneGrad.addColorStop(0, `rgb(${base + 22},${base + 56},${base + 88})`);
      paneGrad.addColorStop(0.55, `rgb(${base},${base + 28},${base + 54})`);
      paneGrad.addColorStop(1, `rgb(${base - 10},${base + 14},${base + 34})`);
      gctx.fillStyle = paneGrad;
      gctx.fillRect(c * cw + 2.5, r * rh + 6.5, cw - 5, rh - 9);

      // Subtle diagonal sky reflection glint on select panes
      if (hash % 5 === 0) {
        gctx.fillStyle = 'rgba(224, 242, 254, 0.14)';
        gctx.fillRect(c * cw + 3, r * rh + 7, cw * 0.45, rh - 11);
      }

      // Interior blinds / ceiling light strips
      if (hash > 38) {
        const warm = hash > 68;
        ectx.fillStyle = warm ? '#fbbf24' : '#7dd3fc';
        ectx.fillRect(c * cw + 4, r * rh + 8, cw - 8, rh - 13);
        // Subtle darker office ceiling/floor divider inside lit pane
        ectx.fillStyle = 'rgba(0,0,0,0.32)';
        ectx.fillRect(c * cw + 4, r * rh + 14, cw - 8, 2);
      }
    }
  }
  const glassFacade = configureColorTex(new THREE.CanvasTexture(glassCanvas), maxAniso, 1, 1);
  const glassEmissive = configureColorTex(new THREE.CanvasTexture(emCanvas), maxAniso, 1, 1);

  // 5. Sun-Washed Pastel Art-Deco / Coastal Stucco Window Facade
  const decoCanvas = document.createElement('canvas');
  decoCanvas.width = 256;
  decoCanvas.height = 256;
  const dctx = decoCanvas.getContext('2d')!;
  dctx.fillStyle = '#f5eee4';
  dctx.fillRect(0, 0, 256, 256);

  // Fine Mediterranean stucco grain
  for (let i = 0; i < 2400; i++) {
    const x = (i * 71) % 256;
    const y = (i * 137) % 256;
    dctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(130,115,98,0.1)';
    dctx.fillRect(x, y, 2, 2);
  }

  // Horizontal art-deco fluted cornice lines
  for (let y = 0; y < 256; y += 64) {
    dctx.fillStyle = 'rgba(255,255,255,0.45)';
    dctx.fillRect(0, y, 256, 4);
    dctx.fillStyle = 'rgba(30,41,59,0.12)';
    dctx.fillRect(0, y + 4, 256, 4);
  }
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      // Recessed shadow frame
      dctx.fillStyle = '#1c3146';
      dctx.fillRect(c * 64 + 13, r * 64 + 15, 38, 36);
      // Warm/sky tinted glass
      const wGrad = dctx.createLinearGradient(0, r * 64 + 16, 0, r * 64 + 48);
      wGrad.addColorStop(0, '#3b5c78');
      wGrad.addColorStop(1, '#1e354b');
      dctx.fillStyle = wGrad;
      dctx.fillRect(c * 64 + 15, r * 64 + 17, 34, 31);
      // Center window mullion
      dctx.fillStyle = '#cbd5e1';
      dctx.fillRect(c * 64 + 31, r * 64 + 17, 2, 31);
      // Balcony ledge & cast shadow
      dctx.fillStyle = '#f8fafc';
      dctx.fillRect(c * 64 + 10, r * 64 + 48, 44, 6);
      dctx.fillStyle = 'rgba(15,23,42,0.18)';
      dctx.fillRect(c * 64 + 12, r * 64 + 54, 40, 4);
    }
  }
  const artDecoFacade = configureColorTex(new THREE.CanvasTexture(decoCanvas), maxAniso, 1, 1);

  // 6. Wind-Rippled Golden Palm Beach Sand Texture
  const sandCanvas = document.createElement('canvas');
  sandCanvas.width = 256;
  sandCanvas.height = 256;
  const sactx = sandCanvas.getContext('2d')!;
  sactx.fillStyle = '#ebd3a2';
  sactx.fillRect(0, 0, 256, 256);

  // Soft wind-blown sand ripples
  for (let y = 0; y < 256; y += 16) {
    const ripGrad = sactx.createLinearGradient(0, y, 0, y + 16);
    ripGrad.addColorStop(0, 'rgba(255,248,225,0.18)');
    ripGrad.addColorStop(0.5, 'rgba(186,148,92,0.14)');
    ripGrad.addColorStop(1, 'rgba(255,248,225,0.04)');
    sactx.fillStyle = ripGrad;
    sactx.fillRect(0, y, 256, 16);
  }
  for (let i = 0; i < 4200; i++) {
    const x = (i * 67) % 256;
    const y = (i * 113 + Math.floor(i / 6) * 7) % 256;
    sactx.fillStyle = i % 3 === 0 ? 'rgba(255,250,232,0.28)' : 'rgba(176,138,84,0.18)';
    sactx.fillRect(x, y, 2, 2);
  }
  const sand = configureColorTex(new THREE.CanvasTexture(sandCanvas), maxAniso, 16, 28);

  // 7. Soft Radial Contact Shadow Disc
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 128;
  shCanvas.height = 128;
  const shctx = shCanvas.getContext('2d')!;
  const grad = shctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(5, 10, 20, 0.72)');
  grad.addColorStop(0.55, 'rgba(5, 10, 20, 0.34)');
  grad.addColorStop(1, 'rgba(5, 10, 20, 0)');
  shctx.fillStyle = grad;
  shctx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;

  // 8. Coastline International Airport Runway 09/27 Texture (threshold keys, centerline, touchdown bars)
  const rwCanvas = document.createElement('canvas');
  rwCanvas.width = 1024;
  rwCanvas.height = 256;
  const rwctx = rwCanvas.getContext('2d')!;
  rwctx.fillStyle = '#1e2530';
  rwctx.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 6500; i++) {
    const x = (i * 97) % 1024;
    const y = (i * 53 + Math.floor(i / 11) * 7) % 256;
    const g = 26 + (i % 18);
    rwctx.fillStyle = `rgb(${g},${g + 3},${g + 8})`;
    rwctx.fillRect(x, y, 2, 2);
  }
  // White runway side edge stripes
  rwctx.fillStyle = '#e2e8f0';
  rwctx.fillRect(0, 14, 1024, 6);
  rwctx.fillRect(0, 236, 1024, 6);
  // Piano-key threshold markings at both ends
  for (let py = 30; py <= 210; py += 22) {
    rwctx.fillRect(18, py, 56, 12);
    rwctx.fillRect(950, py, 56, 12);
  }
  // Runway numbers 09 / 27
  rwctx.font = 'bold 42px monospace';
  rwctx.textAlign = 'center';
  rwctx.textBaseline = 'middle';
  rwctx.fillText('09', 112, 128);
  rwctx.fillText('27', 912, 128);
  // Touchdown zone blocks
  rwctx.fillRect(185, 58, 46, 16);
  rwctx.fillRect(185, 182, 46, 16);
  rwctx.fillRect(793, 58, 46, 16);
  rwctx.fillRect(793, 182, 46, 16);
  // Dashed white centerline
  for (let rx = 160; rx < 860; rx += 56) {
    rwctx.fillRect(rx, 123, 30, 10);
  }
  const runway = configureColorTex(new THREE.CanvasTexture(rwCanvas), maxAniso, 1, 1);

  // 9. @SolaraPulse Digital Social Media Billboard Texture
  const bbCanvas = document.createElement('canvas');
  bbCanvas.width = 512;
  bbCanvas.height = 256;
  const bbctx = bbCanvas.getContext('2d')!;
  const bbGrad = bbctx.createLinearGradient(0, 0, 512, 256);
  bbGrad.addColorStop(0, '#0f172a');
  bbGrad.addColorStop(0.5, '#3b0764');
  bbGrad.addColorStop(1, '#0c4a6e');
  bbctx.fillStyle = bbGrad;
  bbctx.fillRect(0, 0, 512, 256);

  // Accent frame & glowing live badge
  bbctx.strokeStyle = '#38bdf8';
  bbctx.lineWidth = 6;
  bbctx.strokeRect(10, 10, 492, 236);
  bbctx.fillStyle = '#ec4899';
  bbctx.fillRect(28, 28, 124, 34);
  bbctx.fillStyle = '#ffffff';
  bbctx.font = 'bold 18px sans-serif';
  bbctx.fillText('LIVE · FEED', 42, 51);

  bbctx.fillStyle = '#fbbf24';
  bbctx.font = '900 44px sans-serif';
  bbctx.fillText('@SOLARAPULSE', 28, 118);

  bbctx.fillStyle = '#e2e8f0';
  bbctx.font = '600 20px sans-serif';
  bbctx.fillText('TRENDING IN SOLARA BAY', 30, 154);

  bbctx.fillStyle = '#38bdf8';
  bbctx.font = 'bold 21px monospace';
  bbctx.fillText('#SolaraSunset  #CoastlineAir  #IronportCargo', 28, 194);

  bbctx.fillStyle = '#f472b6';
  bbctx.font = '600 17px sans-serif';
  bbctx.fillText('OPEN PHONE [P] -> SNAP & POST FROM ANY DISTRICT', 28, 226);

  const socialBillboard = configureColorTex(new THREE.CanvasTexture(bbCanvas), maxAniso, 1, 1);

  // 10. Human Skin Micro-Pore Bump Texture (linear data map for PBR realistic skin shading)
  const skinCanvas = document.createElement('canvas');
  skinCanvas.width = 128;
  skinCanvas.height = 128;
  const skctx = skinCanvas.getContext('2d')!;
  skctx.fillStyle = '#808080';
  skctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2400; i++) {
    const x = (i * 53 + (i % 7) * 11) % 128;
    const y = (i * 97 + Math.floor(i / 9) * 5) % 128;
    const v = 112 + (i % 34);
    skctx.fillStyle = `rgb(${v},${v},${v})`;
    skctx.fillRect(x, y, 2, 2);
  }
  const skinBump = configureDataTex(new THREE.CanvasTexture(skinCanvas), 3, 3);

  // 11. Woven Fabric & Grain Leather Micro-Bump Texture
  const fabCanvas = document.createElement('canvas');
  fabCanvas.width = 128;
  fabCanvas.height = 128;
  const fctx = fabCanvas.getContext('2d')!;
  fctx.fillStyle = '#7c7c7c';
  fctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 4) {
    for (let x = 0; x < 128; x += 4) {
      const alt = ((x + y) / 4) % 2 === 0;
      fctx.fillStyle = alt ? '#969696' : '#646464';
      fctx.fillRect(x, y, 3, 2);
      fctx.fillStyle = alt ? '#6c6c6c' : '#8e8e8e';
      fctx.fillRect(x, y + 2, 2, 2);
    }
  }
  const fabricBump = configureDataTex(new THREE.CanvasTexture(fabCanvas), 4, 4);

  return {
    asphalt,
    asphaltBump,
    roadRoughness,
    sidewalk,
    glassFacade,
    glassEmissive,
    artDecoFacade,
    sand,
    runway,
    socialBillboard,
    contactShadow,
    skinBump,
    fabricBump,
    dispose: () => {
      asphalt.dispose();
      asphaltBump.dispose();
      roadRoughness.dispose();
      sidewalk.dispose();
      glassFacade.dispose();
      glassEmissive.dispose();
      artDecoFacade.dispose();
      sand.dispose();
      runway.dispose();
      socialBillboard.dispose();
      contactShadow.dispose();
      skinBump.dispose();
      fabricBump.dispose();
    },
  };
}
