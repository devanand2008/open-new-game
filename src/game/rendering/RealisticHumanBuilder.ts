import * as THREE from 'three';
import type { OutfitPreset } from '../world/WorldConfig';

export type HumanBodyType = 'athletic_male' | 'muscular_male' | 'athletic_female' | 'rugged_male';
export type HairStyleType =
  | 'swept_rugged'
  | 'sleek_ponytail'
  | 'wavy_long'
  | 'short_fade'
  | 'cap_outdoor'
  | 'short_crop';

export interface CharacterStyleConfig {
  skinColor: string;
  hairColor: string;
  jacketColor: string;
  shirtColor: string;
  pantsColor: string;
  bootsColor: string;
  accentColor: string;
  heightScale: number;
  eyeColor?: string;
  lipColor?: string;
  bodyType?: HumanBodyType;
  hairStyle?: HairStyleType;
  facialHair?: 'none' | 'stubble' | 'trimmed_beard';
  hasGlasses?: boolean;
  hasCap?: boolean;
  hasBackpack?: boolean;
  hasHeadphones?: boolean;
  hasGoldChain?: boolean;
  hasWatch?: boolean;
  isSuit?: boolean;
  isMuscular?: boolean;
  isLeatherJacket?: boolean;
  skinBump?: THREE.Texture;
  fabricBump?: THREE.Texture;
}

export interface CharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torsoGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftShin: THREE.Group;
  rightShin: THREE.Group;
  leftFoot: THREE.Group;
  rightFoot: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForeArm: THREE.Group;
  rightForeArm: THREE.Group;
  head: THREE.Group;
  eyelids: THREE.Mesh[];
  jacketMat: THREE.MeshPhysicalMaterial;
  shirtMat: THREE.MeshPhysicalMaterial;
  pantsMat: THREE.MeshPhysicalMaterial;
  accentMat: THREE.MeshStandardMaterial;
  baseHeightScale: number;
}

// ---------------------------------------------------------------------------
// 1. PROCEDURAL HIGH-RESOLUTION FACE & GARMENT TEXTURES (UV-MAPPED)
// ---------------------------------------------------------------------------

function shadeHex(hex: string, factor: number, redShift = 0): string {
  const c = new THREE.Color(hex);
  const r = Math.min(255, Math.max(0, Math.round(c.r * 255 * factor + redShift)));
  const g = Math.min(255, Math.max(0, Math.round(c.g * 255 * factor)));
  const b = Math.min(255, Math.max(0, Math.round(c.b * 255 * factor * 0.96)));
  return `rgb(${r},${g},${b})`;
}

/**
 * Generates a 512x512 realistic UV human portrait texture mapped onto the sculpted
 * cranium (SphereGeometry rotated +PI/2 around Y so u=0.5 faces -Z front).
 */
function createRealisticFaceTexture(
  cfg: CharacterStyleConfig,
  isFemale: boolean
): THREE.CanvasTexture | undefined {
  if (typeof document === 'undefined') return undefined;

  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;

  ctx.fillStyle = cfg.skinColor;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;

  // Forehead, nose-bridge & cheekbone warm skin tone highlights
  const tZone = ctx.createRadialGradient(cx, h * 0.43, 6, cx, h * 0.46, 90);
  tZone.addColorStop(0, shadeHex(cfg.skinColor, 1.06, 3));
  tZone.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = tZone;
  ctx.fillRect(cx - 120, h * 0.24, 240, 210);

  // Warm cheek blush & natural facial plane contouring
  for (const side of [-1, 1]) {
    const cheek = ctx.createRadialGradient(cx + side * 46, h * 0.555, 4, cx + side * 46, h * 0.555, 34);
    cheek.addColorStop(0, isFemale ? 'rgba(202, 102, 98, 0.24)' : 'rgba(176, 94, 82, 0.14)');
    cheek.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cheek;
    ctx.beginPath();
    ctx.arc(cx + side * 46, h * 0.555, 34, 0, Math.PI * 2);
    ctx.fill();

    const hollow = ctx.createRadialGradient(cx + side * 66, h * 0.62, 2, cx + side * 66, h * 0.62, 26);
    hollow.addColorStop(0, 'rgba(65, 36, 26, 0.16)');
    hollow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hollow;
    ctx.beginPath();
    ctx.arc(cx + side * 66, h * 0.62, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft under-jaw neck crease shadow
  const jawShade = ctx.createLinearGradient(0, h * 0.73, 0, h * 0.94);
  jawShade.addColorStop(0, 'rgba(0,0,0,0)');
  jawShade.addColorStop(1, 'rgba(48, 28, 22, 0.36)');
  ctx.fillStyle = jawShade;
  ctx.fillRect(0, h * 0.73, w, h * 0.24);

  // Subtle nose bridge highlight & side shading
  const noseBridge = ctx.createLinearGradient(cx - 8, h * 0.48, cx + 8, h * 0.48);
  noseBridge.addColorStop(0, 'rgba(62, 34, 26, 0.14)');
  noseBridge.addColorStop(0.5, 'rgba(255, 244, 236, 0.16)');
  noseBridge.addColorStop(1, 'rgba(62, 34, 26, 0.14)');
  ctx.fillStyle = noseBridge;
  ctx.fillRect(cx - 8, h * 0.49, 16, 48);

  // Soft nostrils & nose base shadow
  ctx.fillStyle = 'rgba(54, 28, 22, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, h * 0.594, 12, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(34, 18, 14, 0.52)';
  ctx.beginPath();
  ctx.ellipse(cx - 6.0, h * 0.593, 3.6, 2.0, 0.15, 0, Math.PI * 2);
  ctx.ellipse(cx + 6.0, h * 0.593, 3.6, 2.0, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Subtle philtrum dip
  ctx.fillStyle = 'rgba(68, 38, 28, 0.14)';
  ctx.fillRect(cx - 3.2, h * 0.604, 6.4, 15);

  // Eyes, upper/lower lashlines, orbital socket AO & feathered brows
  const eyeY = h * 0.494;
  const eyeOffsetX = 32;
  const eyeW = isFemale ? 17.5 : 16.5;
  const eyeH = isFemale ? 8.6 : 7.5;
  const irisColor = cfg.eyeColor ?? '#4a3321';

  for (const side of [-1, 1]) {
    const ex = cx + side * eyeOffsetX;

    const socket = ctx.createRadialGradient(ex, eyeY, 4, ex, eyeY, 22);
    socket.addColorStop(0, 'rgba(58, 32, 24, 0.30)');
    socket.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = socket;
    ctx.beginPath();
    ctx.arc(ex, eyeY, 22, 0, Math.PI * 2);
    ctx.fill();

    // Eyelid crease line
    ctx.strokeStyle = 'rgba(60, 32, 22, 0.46)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(ex - eyeW * 0.95, eyeY - 3.6);
    ctx.quadraticCurveTo(ex, eyeY - eyeH * 1.72, ex + eyeW * 0.95, eyeY - 3.2);
    ctx.stroke();

    // Almond sclera clipping path
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ex - eyeW, eyeY + 0.8);
    ctx.quadraticCurveTo(ex, eyeY - eyeH * 1.25, ex + eyeW, eyeY + 0.5);
    ctx.quadraticCurveTo(ex, eyeY + eyeH * 1.05, ex - eyeW, eyeY + 0.8);
    ctx.closePath();
    ctx.clip();

    const scleraGrad = ctx.createRadialGradient(ex, eyeY, 2, ex, eyeY, eyeW * 1.15);
    scleraGrad.addColorStop(0, '#f8f5f2');
    scleraGrad.addColorStop(0.75, '#e8dfd8');
    scleraGrad.addColorStop(1, '#c6b0a8');
    ctx.fillStyle = scleraGrad;
    ctx.fillRect(ex - eyeW - 2, eyeY - eyeH - 2, eyeW * 2 + 4, eyeH * 2 + 4);

    // Iris + Pupil + Catchlight
    const irisR = isFemale ? 7.4 : 6.9;
    const irisGrad = ctx.createRadialGradient(ex, eyeY + 0.4, 1.4, ex, eyeY, irisR);
    irisGrad.addColorStop(0, shadeHex(irisColor, 1.38));
    irisGrad.addColorStop(0.68, irisColor);
    irisGrad.addColorStop(1, '#100c0a');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(ex, eyeY - 0.3, irisR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#06070a';
    ctx.beginPath();
    ctx.arc(ex, eyeY - 0.3, irisR * 0.46, 0, Math.PI * 2);
    ctx.fill();

    const lidCast = ctx.createLinearGradient(0, eyeY - eyeH, 0, eyeY - 1);
    lidCast.addColorStop(0, 'rgba(18, 10, 8, 0.60)');
    lidCast.addColorStop(1, 'rgba(18, 10, 8, 0)');
    ctx.fillStyle = lidCast;
    ctx.fillRect(ex - eyeW, eyeY - eyeH - 1, eyeW * 2, eyeH);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.beginPath();
    ctx.arc(ex - 2.3, eyeY - 2.1, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
    ctx.beginPath();
    ctx.arc(ex + 2.4, eyeY + 1.8, 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Lashlines
    ctx.strokeStyle = '#141010';
    ctx.lineWidth = isFemale ? 2.7 : 2.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - eyeW * 0.96, eyeY + 0.6);
    ctx.quadraticCurveTo(ex, eyeY - eyeH * 1.24, ex + eyeW * 1.02, eyeY + 0.2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(44, 28, 22, 0.34)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(ex - eyeW * 0.85, eyeY + 1.2);
    ctx.quadraticCurveTo(ex, eyeY + eyeH * 0.95, ex + eyeW * 0.85, eyeY + 1.0);
    ctx.stroke();

    // Feathered eyebrows
    const browY = eyeY - (isFemale ? 17.5 : 15.5);
    ctx.strokeStyle = cfg.hairColor;
    ctx.lineCap = 'round';
    ctx.lineWidth = isFemale ? 3.8 : 5.4;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(ex - side * 19, browY + 2.6);
    ctx.quadraticCurveTo(ex + side * 4, browY - (isFemale ? 5.2 : 3.2), ex + side * 21, browY + 2.8);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  // Natural Lips
  const mouthY = h * 0.654;
  const mouthW = isFemale ? 21 : 23;
  const lipBase = cfg.lipColor ?? (isFemale ? '#b96f6a' : shadeHex(cfg.skinColor, 0.78, 16));

  ctx.fillStyle = shadeHex(lipBase, 0.88);
  ctx.beginPath();
  ctx.moveTo(cx - mouthW, mouthY);
  ctx.quadraticCurveTo(cx - mouthW * 0.35, mouthY - 6.6, cx, mouthY - 3.4);
  ctx.quadraticCurveTo(cx + mouthW * 0.35, mouthY - 6.6, cx + mouthW, mouthY);
  ctx.quadraticCurveTo(cx, mouthY + 1.8, cx - mouthW, mouthY);
  ctx.fill();

  ctx.fillStyle = lipBase;
  ctx.beginPath();
  ctx.moveTo(cx - mouthW * 0.92, mouthY + 0.4);
  ctx.quadraticCurveTo(cx, mouthY + (isFemale ? 10.2 : 9.0), cx + mouthW * 0.92, mouthY + 0.4);
  ctx.quadraticCurveTo(cx, mouthY + 1.8, cx - mouthW * 0.92, mouthY + 0.4);
  ctx.fill();

  ctx.strokeStyle = 'rgba(40, 16, 16, 0.58)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - mouthW * 0.95, mouthY + 0.2);
  ctx.quadraticCurveTo(cx, mouthY + 1.6, cx + mouthW * 0.95, mouthY + 0.2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 240, 236, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, mouthY + 4.6, 7.2, 2.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // Blended facial hair / designer stubble baked into UV
  const facialHair = cfg.facialHair ?? 'none';
  if (facialHair !== 'none') {
    const hairCol = new THREE.Color(cfg.hairColor);
    const hr = Math.round(hairCol.r * 255);
    const hg = Math.round(hairCol.g * 255);
    const hb = Math.round(hairCol.b * 255);
    const alpha = facialHair === 'trimmed_beard' ? 0.56 : 0.22;

    const beardGrad = ctx.createRadialGradient(cx, h * 0.72, 18, cx, h * 0.72, 84);
    beardGrad.addColorStop(0, `rgba(${hr},${hg},${hb},${alpha})`);
    beardGrad.addColorStop(0.70, `rgba(${hr},${hg},${hb},${alpha * 0.70})`);
    beardGrad.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
    ctx.fillStyle = beardGrad;
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.725, 74, 52, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(${hr},${hg},${hb},${alpha * 0.85})`;
    ctx.beginPath();
    ctx.ellipse(cx, mouthY - 8.2, 24, 5.6, 0, 0, Math.PI * 2);
    ctx.fill();

    let seed = 4219;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const dotCount = facialHair === 'trimmed_beard' ? 1400 : 850;
    ctx.fillStyle = `rgba(${hr},${hg},${hb},${facialHair === 'trimmed_beard' ? 0.52 : 0.30})`;
    for (let i = 0; i < dotCount; i++) {
      const a = rand() * Math.PI * 2;
      const rad = Math.sqrt(rand());
      const px = cx + Math.cos(a) * rad * 70;
      const py = h * 0.72 + Math.sin(a) * rad * 46;
      if (Math.abs(px - cx) < 23 && Math.abs(py - mouthY) < 7.5) continue;
      if (py < h * 0.61) continue;
      ctx.fillRect(px, py, 1.4, 2.0);
    }
  }

  // Soft forehead hairline transition
  const hairline = ctx.createLinearGradient(0, h * 0.14, 0, h * 0.31);
  hairline.addColorStop(0, cfg.hairColor);
  hairline.addColorStop(0.62, cfg.hairColor);
  hairline.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hairline;
  ctx.fillRect(0, 0, w, h * 0.32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates subtle procedural woven/leather garment shading & seam detail on a neutral
 * white-multiplier texture so material.color continues to drive dynamic outfit changes!
 */
function createGarmentDetailTexture(kind: 'jacket' | 'shirt' | 'pants'): THREE.CanvasTexture | undefined {
  if (typeof document === 'undefined') return undefined;
  const s = 256;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;

  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(0, 0, s, s);

  // Subtle fabric/leather grain noise
  let seed = kind === 'jacket' ? 101 : kind === 'pants' ? 202 : 303;
  const rand = () => {
    seed = (seed * 48271) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 4200; i++) {
    const x = Math.floor(rand() * s);
    const y = Math.floor(rand() * s);
    const v = 228 + Math.floor(rand() * 24);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, kind === 'pants' ? 2 : 3, kind === 'shirt' ? 1 : 2);
  }

  if (kind === 'jacket') {
    // Subtle vertical shoulder/back yoke seam and hem stitch
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.25);
    ctx.lineTo(s, s * 0.25);
    ctx.moveTo(0, s * 0.92);
    ctx.lineTo(s, s * 0.92);
    ctx.stroke();

    // Subtle metallic front-edge trim along u=0 and u=1 (jacket opening edges)
    const edgeL = ctx.createLinearGradient(0, 0, 14, 0);
    edgeL.addColorStop(0, 'rgba(20,20,24,0.35)');
    edgeL.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = edgeL;
    ctx.fillRect(0, 0, 14, s);

    const edgeR = ctx.createLinearGradient(s - 14, 0, s, 0);
    edgeR.addColorStop(0, 'rgba(0,0,0,0)');
    edgeR.addColorStop(1, 'rgba(20,20,24,0.35)');
    ctx.fillStyle = edgeR;
    ctx.fillRect(s - 14, 0, 14, s);
  } else if (kind === 'pants') {
    // Denim/twill highlight down front thigh & subtle outseam stitching
    const sheen = ctx.createLinearGradient(0, 0, s, 0);
    sheen.addColorStop(0, 'rgba(255,255,255,0.08)');
    sheen.addColorStop(0.5, 'rgba(0,0,0,0.06)');
    sheen.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, s, s);

    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(s * 0.25, 0);
    ctx.lineTo(s * 0.25, s);
    ctx.moveTo(s * 0.75, 0);
    ctx.lineTo(s * 0.75, s);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // Shirt subtle collar & chest contour shading
    const grad = ctx.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, 'rgba(0,0,0,0.12)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// 2. ANATOMICAL SCULPTING HELPERS (Seamless Meshes — ZERO Ball Joints!)
// ---------------------------------------------------------------------------

function createOrganicLimbGeo(
  length: number,
  profile: Array<[number, number]>,
  radialSegments = 16
): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = profile.map(([t, r]) => new THREE.Vector2(Math.max(0.002, r), -t * length));
  const geo = new THREE.LatheGeometry(pts, radialSegments);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Vertex-sculpted human cranium & face pre-rotated +PI/2 around Y so u=0.5 faces -Z.
 */
function createSculptedHumanHeadGeo(isFemale: boolean): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.102, 32, 24);
  geo.rotateY(Math.PI / 2);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    x *= isFemale ? 0.85 : 0.90;
    y *= 1.14;
    z *= 0.98;

    const frontMask = Math.max(0, -z / 0.102);
    const absX = Math.abs(x);

    if (y > 0.01 && y < 0.075 && absX > 0.058) {
      x *= 0.95;
    }

    if (z > 0.025 && y > -0.02) {
      z += 0.011 * Math.cos((y - 0.025) * 14);
    }

    // Subtle brow ridge
    if (frontMask > 0.4 && y > 0.014 && y < 0.04 && absX < 0.06) {
      const bf = Math.sin(((y - 0.014) / 0.026) * Math.PI);
      z -= (isFemale ? 0.004 : 0.007) * bf * frontMask;
    }

    // Recessed orbital eye sockets (so UV eye aligns smoothly in socket)
    if (frontMask > 0.5 && y > -0.014 && y < 0.016 && absX > 0.014 && absX < 0.056) {
      const dx = (absX - 0.034) / 0.021;
      const dy = (y - 0.002) / 0.014;
      const d2 = dx * dx + dy * dy;
      if (d2 < 1) {
        z += 0.006 * (1 - d2);
      }
    }

    // Sculpted nose bridge & tip
    if (frontMask > 0.65 && absX < 0.017 && y > -0.032 && y < 0.012) {
      const nx = Math.cos((absX / 0.017) * Math.PI * 0.5);
      const ny = Math.sin(((y + 0.032) / 0.044) * Math.PI);
      const tipBoost = y < -0.012 ? 1.32 : 0.85;
      z -= 0.015 * nx * ny * tipBoost * frontMask;
    }

    // Zygomatic cheekbones
    if (frontMask > 0.35 && y > -0.038 && y < -0.004 && absX > 0.038 && absX < 0.078) {
      const cheek = Math.sin(((y + 0.038) / 0.034) * Math.PI);
      x += Math.sign(x) * 0.004 * cheek;
      z -= 0.004 * cheek * frontMask;
    }

    // Subtle mouth fullness
    if (frontMask > 0.65 && absX < 0.026 && y > -0.064 && y < -0.034) {
      const mx = Math.cos((absX / 0.026) * Math.PI * 0.5);
      const my = Math.sin(((y + 0.064) / 0.03) * Math.PI);
      z -= 0.006 * mx * my * frontMask;
    }

    // Tapered jawline & chin
    if (y < -0.02) {
      const jawT = Math.min(1, (-y - 0.02) / 0.095);
      x *= isFemale ? 1 - jawT * 0.34 : 1 - jawT * 0.24;
      if (z < 0 && absX < 0.034 && y < -0.055) {
        z -= 0.007 * jawT * frontMask;
      }
      if (z > 0.01) {
        z *= 1 - jawT * 0.30;
      }
    }

    pos.setXYZ(i, x, y, z);
  }

  geo.computeVertexNormals();
  return geo;
}

function evalTorsoRadii(
  t: number,
  bodyType: HumanBodyType,
  outwardOffset = 0
): { rx: number; rz: number; chestPush: number; backCurve: number } {
  const isFemale = bodyType === 'athletic_female';
  const isMuscular = bodyType === 'muscular_male';

  const waistRx = isMuscular ? 0.168 : isFemale ? 0.122 : 0.152;
  const chestRx = isMuscular ? 0.228 : isFemale ? 0.162 : 0.198;
  const shoulderRx = isMuscular ? 0.240 : isFemale ? 0.168 : 0.208;
  const waistRz = isMuscular ? 0.118 : isFemale ? 0.092 : 0.106;
  const chestRz = isMuscular ? 0.142 : isFemale ? 0.112 : 0.126;

  let rx: number;
  let rz: number;
  if (t < 0.25) {
    const u = t / 0.25;
    rx = THREE.MathUtils.lerp(waistRx * (isFemale ? 1.10 : 1.02), waistRx, u);
    rz = THREE.MathUtils.lerp(waistRz * 1.04, waistRz, u);
  } else if (t < 0.85) {
    const u = (t - 0.25) / 0.60;
    const ease = Math.sin(u * Math.PI * 0.5);
    rx = THREE.MathUtils.lerp(waistRx, chestRx, ease);
    rz = THREE.MathUtils.lerp(waistRz, chestRz, ease);
    if (u > 0.72) {
      rx = THREE.MathUtils.lerp(rx, shoulderRx, (u - 0.72) / 0.28);
    }
  } else {
    const u = (t - 0.85) / 0.15;
    const smooth = u * u * (3 - 2 * u);
    rx = THREE.MathUtils.lerp(shoulderRx, 0.066, smooth);
    rz = THREE.MathUtils.lerp(chestRz * 0.90, 0.062, smooth);
  }

  const chestPush =
    t > 0.36 && t < 0.78
      ? Math.sin(((t - 0.36) / 0.42) * Math.PI) * (isFemale ? 0.022 : isMuscular ? 0.020 : 0.012)
      : 0;
  const backCurve =
    t > 0.48 && t < 0.88
      ? Math.sin(((t - 0.48) / 0.40) * Math.PI) * 0.014
      : t < 0.32
        ? -Math.sin((t / 0.32) * Math.PI) * 0.008
        : 0;

  return {
    rx: rx + outwardOffset,
    rz: rz + outwardOffset,
    chestPush,
    backCurve,
  };
}

function createSculptedTorsoGeo(
  bodyType: HumanBodyType,
  height = 0.52,
  outwardOffset = 0,
  openFrontV = false
): THREE.BufferGeometry {
  const radSegs = 28;
  const hSegs = 14;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= hSegs; iy++) {
    const t = iy / hSegs;
    const y = t * height;
    const { rx, rz, chestPush, backCurve } = evalTorsoRadii(t, bodyType, outwardOffset);

    const openHalfAngle = openFrontV ? 0.28 + t * 0.22 : 0;
    const startAngle = openFrontV ? -Math.PI * 0.5 + openHalfAngle : 0;
    const endAngle = openFrontV ? Math.PI * 1.5 - openHalfAngle : Math.PI * 2;

    for (let ix = 0; ix <= radSegs; ix++) {
      const u = ix / radSegs;
      const a = THREE.MathUtils.lerp(startAngle, endAngle, u);
      const ca = Math.cos(a);
      const sa = Math.sin(a);

      let px = ca * rx;
      let pz = sa * rz;

      if (sa < 0) {
        pz -= chestPush * (-sa);
      } else {
        pz += backCurve * sa;
      }

      if (openFrontV && t < 0.08) {
        px *= 1.02;
        pz *= 1.02;
      }

      positions.push(px, y, pz);
      uvs.push(u, t);
    }
  }

  const stride = radSegs + 1;
  for (let iy = 0; iy < hSegs; iy++) {
    for (let ix = 0; ix < radSegs; ix++) {
      const a = iy * stride + ix;
      const b = a + 1;
      const c = (iy + 1) * stride + ix;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createSculptedPelvisGeo(bodyType: HumanBodyType): THREE.BufferGeometry {
  const isFemale = bodyType === 'athletic_female';
  const isMuscular = bodyType === 'muscular_male';
  const waistRx = isMuscular ? 0.168 : isFemale ? 0.128 : 0.154;
  const hipRx = isMuscular ? 0.184 : isFemale ? 0.168 : 0.172;
  const waistRz = isMuscular ? 0.118 : isFemale ? 0.095 : 0.108;
  const hipRz = isMuscular ? 0.128 : isFemale ? 0.118 : 0.120;

  const radSegs = 24;
  const hSegs = 8;
  const height = 0.21;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= hSegs; iy++) {
    const t = iy / hSegs;
    const y = (t - 0.5) * height;
    const bulge = Math.sin(t * Math.PI);
    const rx = THREE.MathUtils.lerp(hipRx * 0.96, waistRx, t) + bulge * 0.008;
    const rz = THREE.MathUtils.lerp(hipRz * 0.94, waistRz, t) + bulge * 0.008;

    for (let ix = 0; ix <= radSegs; ix++) {
      const u = ix / radSegs;
      const a = u * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const px = ca * rx;
      const glute = sa > 0 ? Math.sin(t * Math.PI) * (isFemale ? 0.018 : 0.012) * sa : 0;
      const pz = sa * rz + glute;
      positions.push(px, y, pz);
      uvs.push(u, t);
    }
  }

  const stride = radSegs + 1;
  for (let iy = 0; iy < hSegs; iy++) {
    for (let ix = 0; ix < radSegs; ix++) {
      const a = iy * stride + ix;
      const b = a + 1;
      const c = (iy + 1) * stride + ix;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildRealisticShoe(
  bootsMat: THREE.Material,
  soleMat: THREE.Material,
  laceMat: THREE.Material
): THREE.Group {
  const foot = new THREE.Group();

  const shape = new THREE.Shape();
  shape.moveTo(-0.041, 0.068);
  shape.quadraticCurveTo(-0.049, -0.02, -0.044, -0.105);
  shape.quadraticCurveTo(-0.036, -0.158, 0.0, -0.162);
  shape.quadraticCurveTo(0.038, -0.158, 0.046, -0.105);
  shape.quadraticCurveTo(0.049, -0.02, 0.041, 0.068);
  shape.quadraticCurveTo(0.0, 0.084, -0.041, 0.068);

  const soleGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  soleGeo.rotateX(Math.PI / 2);
  const sole = new THREE.Mesh(soleGeo, soleMat);
  sole.position.set(0, -0.056, 0.015);
  sole.castShadow = true;
  foot.add(sole);

  const vamp = new THREE.Mesh(new THREE.SphereGeometry(0.050, 14, 10), bootsMat);
  vamp.scale.set(0.92, 0.72, 1.85);
  vamp.position.set(0, -0.035, -0.035);
  vamp.castShadow = true;
  foot.add(vamp);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.065, 14), bootsMat);
  collar.position.set(0, -0.002, 0.008);
  collar.castShadow = true;
  foot.add(collar);

  for (let i = 0; i < 3; i++) {
    const lace = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.006, 0.008), laceMat);
    lace.position.set(0, -0.008 - i * 0.009, -0.036 - i * 0.019);
    lace.rotation.x = 0.28;
    foot.add(lace);
  }

  return foot;
}

function buildRealisticHand(side: number, skinMat: THREE.Material): THREE.Group {
  const hand = new THREE.Group();

  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), skinMat);
  palm.scale.set(0.62, 1.28, 0.94);
  palm.position.set(0, -0.032, -0.002);
  palm.castShadow = true;
  hand.add(palm);

  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.026, 4, 8), skinMat);
  thumb.position.set(-side * 0.015, -0.036, -0.024);
  thumb.rotation.x = 0.32;
  thumb.rotation.z = side * 0.28;
  hand.add(thumb);

  const fingerLens = [0.038, 0.043, 0.040, 0.032];
  const fingerZs = [-0.018, -0.005, 0.008, 0.020];
  for (let f = 0; f < 4; f++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.0072, fingerLens[f], 4, 6), skinMat);
    finger.position.set(-side * 0.003, -0.076 - (f === 1 ? 0.003 : 0), fingerZs[f]);
    finger.rotation.z = -side * 0.10;
    hand.add(finger);
  }

  return hand;
}

function buildRealisticHair(
  head: THREE.Group,
  hairStyle: HairStyleType,
  hairMat: THREE.Material,
  capMat: THREE.Material,
  headCenterY: number
): void {
  if (hairStyle === 'cap_outdoor') {
    const hairUnder = new THREE.Mesh(
      new THREE.SphereGeometry(0.104, 18, 12, 0, Math.PI * 2, 0.25, Math.PI * 0.45),
      hairMat
    );
    hairUnder.scale.set(0.90, 1.08, 1.01);
    hairUnder.position.set(0, headCenterY + 0.002, 0.008);
    head.add(hairUnder);

    const capCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.112, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.50),
      capMat
    );
    capCrown.scale.set(0.92, 1.0, 1.03);
    capCrown.position.set(0, headCenterY + 0.024, 0.003);
    capCrown.castShadow = true;
    head.add(capCrown);

    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.104, 0.112, 0.011, 18, 1, false, Math.PI * 0.65, Math.PI * 0.70),
      capMat
    );
    brim.position.set(0, headCenterY + 0.026, -0.056);
    brim.rotation.x = 0.08;
    brim.castShadow = true;
    head.add(brim);
    return;
  }

  const capAngle = hairStyle === 'short_fade' ? Math.PI * 0.48 : Math.PI * 0.58;
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 22, 16, 0, Math.PI * 2, 0, capAngle),
    hairMat
  );
  hairCap.scale.set(0.91, 1.12, 1.02);
  hairCap.position.set(0, headCenterY + 0.010, 0.014);
  hairCap.rotation.x = 0.30;
  hairCap.castShadow = true;
  head.add(hairCap);

  if (hairStyle === 'swept_rugged') {
    // Marco Vega: natural medium-length swept locks (low-profile crown + sweeping temple curls)
    const crownSweep = new THREE.Mesh(new THREE.SphereGeometry(0.098, 16, 12), hairMat);
    crownSweep.scale.set(0.92, 0.50, 1.02);
    crownSweep.position.set(0, headCenterY + 0.080, 0.004);
    crownSweep.rotation.x = 0.18;
    crownSweep.castShadow = true;
    head.add(crownSweep);

    // Swept front hair tufts arching naturally off forehead
    for (const side of [-1, 1]) {
      const tuftCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.014, headCenterY + 0.094, -0.044),
        new THREE.Vector3(side * 0.054, headCenterY + 0.072, -0.056),
        new THREE.Vector3(side * 0.084, headCenterY + 0.024, -0.010),
      ]);
      const tuft = new THREE.Mesh(new THREE.TubeGeometry(tuftCurve, 10, 0.018, 8, false), hairMat);
      tuft.castShadow = true;
      head.add(tuft);
    }

    const nape = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), hairMat);
    nape.scale.set(0.92, 0.78, 0.62);
    nape.position.set(0, headCenterY + 0.012, 0.068);
    head.add(nape);
  } else if (hairStyle === 'sleek_ponytail') {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.098, 18, 12), hairMat);
    crown.scale.set(0.92, 0.54, 1.04);
    crown.position.set(0, headCenterY + 0.078, 0.008);
    head.add(crown);

    for (const side of [-1, 1]) {
      const bangCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.018, headCenterY + 0.090, -0.054),
        new THREE.Vector3(side * 0.062, headCenterY + 0.048, -0.065),
        new THREE.Vector3(side * 0.082, headCenterY - 0.012, -0.032),
      ]);
      const bang = new THREE.Mesh(new THREE.TubeGeometry(bangCurve, 10, 0.012, 7, false), hairMat);
      head.add(bang);
    }

    const tie = new THREE.Mesh(
      new THREE.TorusGeometry(0.022, 0.0055, 6, 14),
      new THREE.MeshStandardMaterial({ color: '#a855f7', roughness: 0.45 })
    );
    tie.position.set(0, headCenterY + 0.042, 0.104);
    tie.rotation.x = 0.45;
    head.add(tie);

    const ponyCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, headCenterY + 0.042, 0.105),
      new THREE.Vector3(0, headCenterY - 0.018, 0.140),
      new THREE.Vector3(0, headCenterY - 0.105, 0.132),
      new THREE.Vector3(0, headCenterY - 0.165, 0.114),
    ]);
    const pony = new THREE.Mesh(new THREE.TubeGeometry(ponyCurve, 12, 0.026, 10, false), hairMat);
    pony.scale.set(1.0, 1.0, 0.78);
    pony.castShadow = true;
    head.add(pony);
  } else if (hairStyle === 'wavy_long') {
    const topVol = new THREE.Mesh(new THREE.SphereGeometry(0.102, 18, 12), hairMat);
    topVol.scale.set(0.95, 0.58, 1.05);
    topVol.position.set(0, headCenterY + 0.074, 0.008);
    head.add(topVol);

    for (const side of [-1, 1]) {
      const waveCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.066, headCenterY + 0.072, -0.022),
        new THREE.Vector3(side * 0.096, headCenterY - 0.005, 0.002),
        new THREE.Vector3(side * 0.090, headCenterY - 0.092, 0.018),
        new THREE.Vector3(side * 0.082, headCenterY - 0.155, 0.002),
      ]);
      const lock = new THREE.Mesh(new THREE.TubeGeometry(waveCurve, 12, 0.024, 8, false), hairMat);
      lock.castShadow = true;
      head.add(lock);
    }

    const backFall = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.145, 6, 12), hairMat);
    backFall.scale.set(1.22, 1.0, 0.48);
    backFall.position.set(0, headCenterY - 0.055, 0.076);
    backFall.castShadow = true;
    head.add(backFall);
  } else if (hairStyle === 'short_fade') {
    const flatTop = new THREE.Mesh(new THREE.SphereGeometry(0.092, 16, 10), hairMat);
    flatTop.scale.set(0.92, 0.40, 0.98);
    flatTop.position.set(0, headCenterY + 0.082, 0.006);
    head.add(flatTop);
  } else {
    const crop = new THREE.Mesh(new THREE.SphereGeometry(0.096, 16, 10), hairMat);
    crop.scale.set(0.94, 0.48, 1.02);
    crop.position.set(0, headCenterY + 0.076, 0.004);
    head.add(crop);
  }
}

// ---------------------------------------------------------------------------
// 3. MAIN REALISTIC HUMAN CHARACTER BUILDER
// ---------------------------------------------------------------------------

export function buildCharacterRig(
  cfg: CharacterStyleConfig,
  shadowTex: THREE.Texture
): CharacterRig {
  const root = new THREE.Group();

  const shadowGeo = new THREE.CircleGeometry(0.50, 24);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = 0.015;
  root.add(shadowMesh);

  const bodyPivot = new THREE.Group();
  bodyPivot.scale.setScalar(cfg.heightScale);
  root.add(bodyPivot);

  const bodyType: HumanBodyType =
    cfg.bodyType ??
    (cfg.isMuscular
      ? 'muscular_male'
      : cfg.isSuit || cfg.hasGlasses
        ? 'athletic_female'
        : cfg.hasCap
          ? 'rugged_male'
          : 'athletic_male');

  const isFemale = bodyType === 'athletic_female';
  const isMuscular = bodyType === 'muscular_male';

  const hairStyle: HairStyleType =
    cfg.hairStyle ??
    (cfg.hasCap
      ? 'cap_outdoor'
      : isMuscular
        ? 'short_fade'
        : isFemale
          ? cfg.hasGlasses
            ? 'sleek_ponytail'
            : 'wavy_long'
          : 'swept_rugged');

  // -------------------------------------------------------------------------
  // PBR SKIN, GARMENT & HARDWARE MATERIALS (Matte/Satin Realism)
  // -------------------------------------------------------------------------
  const faceTex = createRealisticFaceTexture(cfg, isFemale);
  const jacketTex = createGarmentDetailTexture('jacket');
  const shirtTex = createGarmentDetailTexture('shirt');
  const pantsTex = createGarmentDetailTexture('pants');

  // Natural human skin: subtle warm sheen, low clearcoat so skin never glows bright orange under sun
  const faceSkinMat = new THREE.MeshPhysicalMaterial({
    color: faceTex ? '#ffffff' : cfg.skinColor,
    ...(faceTex ? { map: faceTex } : {}),
    roughness: 0.72,
    metalness: 0.0,
    sheen: 0.14,
    sheenRoughness: 0.88,
    sheenColor: new THREE.Color('#e8a890'),
    ...(cfg.skinBump ? { bumpMap: cfg.skinBump, bumpScale: 0.0020 } : {}),
  });

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: cfg.skinColor,
    roughness: 0.72,
    metalness: 0.0,
    sheen: 0.14,
    sheenRoughness: 0.88,
    sheenColor: new THREE.Color('#e8a890'),
    ...(cfg.skinBump ? { bumpMap: cfg.skinBump, bumpScale: 0.0022 } : {}),
  });

  const isLeather = cfg.isLeatherJacket ?? (!cfg.isSuit && !cfg.hasCap && !isMuscular);
  const jacketMat = new THREE.MeshPhysicalMaterial({
    color: cfg.jacketColor,
    ...(jacketTex ? { map: jacketTex } : {}),
    roughness: isLeather ? 0.58 : cfg.isSuit ? 0.72 : 0.84,
    metalness: isLeather ? 0.04 : 0.0,
    clearcoat: isLeather ? 0.06 : 0.0,
    clearcoatRoughness: 0.75,
    sheen: isLeather ? 0.05 : 0.16,
    sheenRoughness: 0.85,
    side: THREE.DoubleSide,
    ...(cfg.fabricBump ? { bumpMap: cfg.fabricBump, bumpScale: isLeather ? 0.007 : 0.005 } : {}),
  });

  const shirtMat = new THREE.MeshPhysicalMaterial({
    color: cfg.shirtColor,
    ...(shirtTex ? { map: shirtTex } : {}),
    roughness: 0.88,
    metalness: 0.0,
    sheen: 0.15,
    sheenRoughness: 0.90,
    ...(cfg.fabricBump ? { bumpMap: cfg.fabricBump, bumpScale: 0.004 } : {}),
  });

  const pantsMat = new THREE.MeshPhysicalMaterial({
    color: cfg.pantsColor,
    ...(pantsTex ? { map: pantsTex } : {}),
    roughness: 0.88,
    metalness: 0.0,
    sheen: 0.12,
    sheenRoughness: 0.92,
    ...(cfg.fabricBump ? { bumpMap: cfg.fabricBump, bumpScale: 0.006 } : {}),
  });

  const bootsMat = new THREE.MeshPhysicalMaterial({
    color: cfg.bootsColor,
    roughness: 0.48,
    metalness: 0.05,
    clearcoat: 0.08,
    clearcoatRoughness: 0.65,
  });

  const soleMat = new THREE.MeshStandardMaterial({
    color: '#17191e',
    roughness: 0.94,
    metalness: 0.0,
  });

  const hairMat = new THREE.MeshPhysicalMaterial({
    color: cfg.hairColor,
    roughness: 0.68,
    metalness: 0.02,
    sheen: 0.20,
    sheenRoughness: 0.68,
    sheenColor: new THREE.Color(cfg.hairColor).offsetHSL(0, 0, 0.14),
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: cfg.accentColor,
    roughness: 0.42,
    metalness: 0.26,
  });

  const hardwareMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.28,
    metalness: 0.85,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    roughness: 0.24,
    metalness: 0.90,
  });

  const laceMat = new THREE.MeshStandardMaterial({
    color: '#d4d4d8',
    roughness: 0.9,
  });

  // Tucked shoulder coordinates so arms exit seamlessly beneath the shoulder seam
  const shoulderHalfX = isMuscular ? 0.214 : isFemale ? 0.148 : 0.184;
  const hipHalfX = isFemale ? 0.088 : isMuscular ? 0.104 : 0.096;

  // -------------------------------------------------------------------------
  // 1. CONTINUOUS SCULPTED PELVIS, TROUSER WAIST & BELT
  // -------------------------------------------------------------------------
  const pelvis = new THREE.Mesh(createSculptedPelvisGeo(bodyType), pantsMat);
  pelvis.position.set(0, 0.89, 0);
  pelvis.castShadow = true;
  bodyPivot.add(pelvis);

  const beltRx = isMuscular ? 0.172 : isFemale ? 0.130 : 0.158;
  const beltRz = isMuscular ? 0.122 : isFemale ? 0.098 : 0.112;
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.044, 24), bootsMat);
  belt.scale.set(beltRx, 1, beltRz);
  belt.position.set(0, 0.975, 0);
  bodyPivot.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.044, 0.016), hardwareMat);
  buckle.position.set(0, 0.975, -beltRz - 0.005);
  bodyPivot.add(buckle);

  // -------------------------------------------------------------------------
  // 2. ARTICULATED ANATOMICAL UPPER TORSO & TAILORED JACKET WITH LAPELS
  // -------------------------------------------------------------------------
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.985, 0);
  bodyPivot.add(torsoGroup);

  const torsoH = 0.51;

  const innerTorso = new THREE.Mesh(createSculptedTorsoGeo(bodyType, torsoH, 0.0, false), shirtMat);
  innerTorso.castShadow = true;
  torsoGroup.add(innerTorso);

  const jacketShell = new THREE.Mesh(createSculptedTorsoGeo(bodyType, torsoH * 0.95, 0.015, true), jacketMat);
  jacketShell.position.y = -0.012;
  jacketShell.castShadow = true;
  torsoGroup.add(jacketShell);

  // Sculpted stand-up collar wrapping nape & shoulders smoothly
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.076, 0.090, 0.058, 20, 1, true, -Math.PI * 0.58, Math.PI * 1.16),
    jacketMat
  );
  collar.position.set(0, torsoH - 0.025, 0.008);
  torsoGroup.add(collar);

  // Sculpted front jacket lapels & vertical zipper/seam lines following chest curvature
  const chestRadii = evalTorsoRadii(0.62, bodyType, 0.018);
  for (const side of [-1, 1]) {
    // Sleek angled lapel fold hugging the V-opening
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.165, 0.014), jacketMat);
    lapel.position.set(side * (chestRadii.rx * 0.36), 0.355, -(chestRadii.rz + chestRadii.chestPush) * 0.93);
    lapel.rotation.z = side * 0.16;
    lapel.rotation.y = -side * 0.32;
    lapel.rotation.x = -0.08;
    torsoGroup.add(lapel);

    // Metallic zipper trim along lower jacket front edge
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.25, 0.010), hardwareMat);
    zip.position.set(side * (chestRadii.rx * 0.27), 0.145, -(chestRadii.rz + chestRadii.chestPush) * 0.93);
    torsoGroup.add(zip);
  }

  // Character-Specific Accessories
  if (cfg.hasGoldChain) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.0045, 8, 22), goldMat);
    chain.position.set(0, torsoH - 0.055, -0.044);
    chain.rotation.x = Math.PI * 0.44;
    torsoGroup.add(chain);
  }

  if (cfg.isSuit) {
    const pendant = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.004, 8, 18, Math.PI), goldMat);
    pendant.position.set(0, torsoH - 0.068, -0.062);
    pendant.rotation.z = Math.PI;
    torsoGroup.add(pendant);
  }

  if (isMuscular) {
    const tacRig = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.21, 0.026), accentMat);
    tacRig.position.set(0, 0.25, -(chestRadii.rz + chestRadii.chestPush) + 0.008);
    torsoGroup.add(tacRig);
    for (const px of [-0.075, 0, 0.075]) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.078, 0.028), bootsMat);
      pouch.position.set(px, 0.145, -(chestRadii.rz + chestRadii.chestPush) - 0.004);
      torsoGroup.add(pouch);
    }
  }

  if (cfg.hasHeadphones || (cfg.hasGlasses && isFemale)) {
    const hpBandMat = new THREE.MeshStandardMaterial({ color: '#1e1b2e', roughness: 0.40, metalness: 0.45 });
    const hpGlowMat = new THREE.MeshStandardMaterial({
      color: '#a855f7',
      emissive: '#9333ea',
      emissiveIntensity: 0.45,
      roughness: 0.28,
      metalness: 0.40,
    });
    const neckBand = new THREE.Mesh(new THREE.TorusGeometry(0.090, 0.011, 10, 22, Math.PI * 1.24), hpBandMat);
    neckBand.rotation.x = Math.PI * 0.54;
    neckBand.rotation.z = -Math.PI * 0.12;
    neckBand.position.set(0, torsoH - 0.032, 0.004);
    torsoGroup.add(neckBand);
    for (const side of [-1, 1]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.034, 0.020, 14), hpBandMat);
      cup.rotation.z = Math.PI * 0.5;
      cup.position.set(side * 0.090, torsoH - 0.054, -0.054);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0038, 6, 14), hpGlowMat);
      ring.rotation.y = Math.PI * 0.5;
      ring.position.set(side * 0.101, torsoH - 0.054, -0.054);
      torsoGroup.add(cup, ring);
    }
  }

  if (cfg.hasBackpack) {
    const packGroup = new THREE.Group();
    packGroup.position.set(0, 0.24, chestRadii.rz + 0.055);
    const packBody = new THREE.Mesh(new THREE.SphereGeometry(0.142, 14, 12), accentMat);
    packBody.scale.set(0.90, 1.22, 0.48);
    packBody.castShadow = true;
    const packPocket = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.11, 0.042), bootsMat);
    packPocket.position.set(0, -0.055, 0.065);
    packGroup.add(packBody, packPocket);
    torsoGroup.add(packGroup);
  }

  // -------------------------------------------------------------------------
  // 3. SEAMLESS ARTICULATED LEGS (Tapered Tailored Trousers + Contoured Shoes)
  // -------------------------------------------------------------------------
  const thighLen = 0.43;
  const shinLen = 0.40;

  const buildLeg = (side: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * hipHalfX, 0.89, 0);

    const thighRTop = isMuscular ? 0.088 : isFemale ? 0.075 : 0.082;
    const thighRKnee = isMuscular ? 0.062 : isFemale ? 0.051 : 0.057;
    const thighGeo = createOrganicLimbGeo(
      thighLen,
      [
        [0.0, thighRTop * 0.94],
        [0.14, thighRTop],
        [0.45, thighRTop * 0.90],
        [0.78, thighRKnee * 1.06],
        [1.0, thighRKnee],
      ],
      16
    );
    const thigh = new THREE.Mesh(thighGeo, pantsMat);
    thigh.castShadow = true;
    legGroup.add(thigh);

    const shinGroup = new THREE.Group();
    shinGroup.position.set(0, -thighLen, 0);
    legGroup.add(shinGroup);

    const kneeBlend = new THREE.Mesh(new THREE.SphereGeometry(thighRKnee * 0.95, 12, 10), pantsMat);
    shinGroup.add(kneeBlend);

    const calfMax = isMuscular ? 0.064 : isFemale ? 0.052 : 0.058;
    const ankleR = isFemale ? 0.036 : 0.041;
    const shinGeo = createOrganicLimbGeo(
      shinLen,
      [
        [0.0, thighRKnee * 0.95],
        [0.24, calfMax],
        [0.54, calfMax * 0.90],
        [0.84, ankleR * 1.08],
        [1.0, ankleR],
      ],
      16
    );
    const shin = new THREE.Mesh(shinGeo, pantsMat);
    shin.castShadow = true;
    shinGroup.add(shin);

    const footGroup = new THREE.Group();
    footGroup.position.set(0, -shinLen, 0);
    shinGroup.add(footGroup);
    footGroup.add(buildRealisticShoe(bootsMat, soleMat, laceMat));

    return { legGroup, shinGroup, footGroup };
  };

  const leftL = buildLeg(-1);
  const rightL = buildLeg(1);
  bodyPivot.add(leftL.legGroup, rightL.legGroup);

  // -------------------------------------------------------------------------
  // 4. SEAMLESS ARTICULATED ARMS (Tucked Into Shoulder Seam — ZERO Bulbous Cap!)
  // -------------------------------------------------------------------------
  const upperArmLen = 0.275;
  const foreArmLen = 0.250;
  const armMat = isMuscular ? skinMat : jacketMat;

  const buildArm = (side: number) => {
    const armGroup = new THREE.Group();
    // Anchored neatly inside the anatomical deltoid pocket below shoulder slope
    armGroup.position.set(side * shoulderHalfX, torsoH - 0.088, 0.004);

    // Flattened organic deltoid cap tucked seamlessly under shoulder line
    const deltoidR = isMuscular ? 0.062 : isFemale ? 0.045 : 0.054;
    const shoulderBlend = new THREE.Mesh(new THREE.SphereGeometry(deltoidR * 0.94, 14, 10), armMat);
    shoulderBlend.scale.set(0.84, 0.70, 0.88);
    armGroup.add(shoulderBlend);

    const upperArmGeo = createOrganicLimbGeo(
      upperArmLen,
      [
        [0.0, deltoidR * 0.90],
        [0.22, deltoidR * 0.94],
        [0.62, deltoidR * 0.82],
        [1.0, deltoidR * 0.72],
      ],
      14
    );
    const upperArm = new THREE.Mesh(upperArmGeo, armMat);
    upperArm.castShadow = true;
    armGroup.add(upperArm);

    const foreArmGroup = new THREE.Group();
    foreArmGroup.position.set(0, -upperArmLen, 0);
    armGroup.add(foreArmGroup);

    const elbowR = deltoidR * 0.70;
    const wristR = isFemale ? 0.027 : 0.033;
    const elbowBlend = new THREE.Mesh(new THREE.SphereGeometry(elbowR * 0.94, 10, 8), armMat);
    foreArmGroup.add(elbowBlend);

    const foreArmGeo = createOrganicLimbGeo(
      foreArmLen,
      [
        [0.0, elbowR * 0.94],
        [0.26, elbowR * 0.96],
        [0.72, wristR * 1.15],
        [1.0, wristR],
      ],
      14
    );
    const foreArm = new THREE.Mesh(foreArmGeo, armMat);
    foreArm.castShadow = true;
    foreArmGroup.add(foreArm);

    if (!isMuscular) {
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(wristR * 1.08, wristR * 1.08, 0.024, 14),
        accentMat
      );
      cuff.position.y = -foreArmLen + 0.014;
      foreArmGroup.add(cuff);
    }

    if (cfg.hasWatch && side === -1) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(wristR * 1.14, wristR * 1.14, 0.018, 14), hardwareMat);
      band.position.y = -foreArmLen + 0.008;
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.007, 12), goldMat);
      dial.rotation.z = Math.PI * 0.5;
      dial.position.set(-wristR * 1.16, -foreArmLen + 0.008, 0);
      foreArmGroup.add(band, dial);
    }

    if (cfg.hasGlasses && isFemale && side === -1) {
      const techDeck = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.026, 0.036),
        new THREE.MeshStandardMaterial({
          color: '#22d3ee',
          emissive: '#06b6d4',
          emissiveIntensity: 1.0,
          roughness: 0.25,
        })
      );
      techDeck.position.set(0, -foreArmLen + 0.025, -0.005);
      foreArmGroup.add(techDeck);
    }

    const hand = buildRealisticHand(side, skinMat);
    hand.position.set(0, -foreArmLen + 0.006, 0);
    foreArmGroup.add(hand);

    return { armGroup, foreArmGroup };
  };

  const leftA = buildArm(-1);
  const rightA = buildArm(1);
  torsoGroup.add(leftA.armGroup, rightA.armGroup);

  // -------------------------------------------------------------------------
  // 5. PROPORTIONAL NECK, UV-PAINTED HUMAN FACE, HAIR & RECESSED BLINK LIDS
  // -------------------------------------------------------------------------
  const head = new THREE.Group();
  head.position.set(0, torsoH - 0.016, -0.002);
  torsoGroup.add(head);

  const neckR = isMuscular ? 0.055 : isFemale ? 0.041 : 0.048;
  const neckGeo = createOrganicLimbGeo(
    0.076,
    [
      [0.0, neckR * 0.96],
      [0.45, neckR * 0.92],
      [0.85, neckR * 1.12],
      [1.0, neckR * 1.28],
    ],
    16
  );
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.set(0, 0.074, 0.006);
  neck.castShadow = true;
  head.add(neck);

  const headCenterY = 0.132;
  const skullMesh = new THREE.Mesh(createSculptedHumanHeadGeo(isFemale), faceSkinMat);
  skullMesh.position.set(0, headCenterY, 0);
  skullMesh.castShadow = true;
  head.add(skullMesh);

  // Eyelids tucked cleanly ABOVE the eye socket (+0.42 rad tilts pole into +Z brow crease when open;
  // rotating negative toward -1.15 sweeps the lid down across -Z eye only during blink!)
  const eyelids: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const lid = new THREE.Mesh(
      new THREE.SphereGeometry(0.0135, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.44),
      skinMat
    );
    lid.scale.set(1.22, 0.85, 0.85);
    lid.position.set(side * 0.032, headCenterY + 0.005, -0.081);
    lid.rotation.x = 0.35; // Tucked cleanly inside brow socket when open — painted iris/sclera shine clearly!
    head.add(lid);
    eyelids.push(lid);

    // Ears
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), skinMat);
    ear.scale.set(0.42, 1.30, 0.72);
    ear.position.set(side * (isFemale ? 0.086 : 0.091), headCenterY - 0.004, 0.008);
    ear.rotation.y = side * 0.18;
    head.add(ear);

    if (cfg.isSuit) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0022, 6, 14), goldMat);
      hoop.position.set(side * 0.090, headCenterY - 0.028, 0.008);
      hoop.rotation.y = Math.PI * 0.5;
      head.add(hoop);
    }
  }

  buildRealisticHair(head, hairStyle, hairMat, accentMat, headCenterY);

  if (cfg.hasGlasses) {
    const frameMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.28, metalness: 0.75 });
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: '#cbd5e1',
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.20,
    });
    for (const side of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0024, 8, 18), frameMat);
      rim.scale.set(1.25, 0.82, 1);
      rim.position.set(side * 0.032, headCenterY + 0.002, -0.102);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 14), lensMat);
      lens.scale.set(1.22, 0.78, 1);
      lens.position.set(side * 0.032, headCenterY + 0.002, -0.102);
      lens.rotation.y = Math.PI;
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.0032, 0.0032, 0.090), frameMat);
      temple.position.set(side * 0.060, headCenterY + 0.004, -0.053);
      head.add(rim, lens, temple);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.0032, 0.0035), frameMat);
    bridge.position.set(0, headCenterY + 0.004, -0.103);
    head.add(bridge);
  }

  return {
    root,
    bodyPivot,
    torsoGroup,
    leftLeg: leftL.legGroup,
    rightLeg: rightL.legGroup,
    leftShin: leftL.shinGroup,
    rightShin: rightL.shinGroup,
    leftFoot: leftL.footGroup,
    rightFoot: rightL.footGroup,
    leftArm: leftA.armGroup,
    rightArm: rightA.armGroup,
    leftForeArm: leftA.foreArmGroup,
    rightForeArm: rightA.foreArmGroup,
    head,
    eyelids,
    jacketMat,
    shirtMat,
    pantsMat,
    accentMat,
    baseHeightScale: cfg.heightScale,
  };
}

export function applyOutfitToRig(rig: CharacterRig, outfit: OutfitPreset): void {
  rig.jacketMat.color.set(outfit.jacketColor);
  rig.shirtMat.color.set(outfit.shirtColor);
  rig.pantsMat.color.set(outfit.pantsColor);
  rig.accentMat.color.set(outfit.accentColor);
}

/**
 * Biomechanical realistic human animation loop:
 * - Coordinated hip flexion, knee recovery, and ankle push-off
 * - Spinal counter-rotation, subtle breathing chest rise & natural arm hang
 * - Head stabilization, subtle idle glances, and realistic periodic eye blinking
 */
export function animateCharacterRig(
  rig: CharacterRig,
  moveSpeed: number,
  gaitPhase: number,
  grounded: boolean,
  time: number,
  squashY: number
): void {
  const speedRatio = Math.min(1, moveSpeed / 9.5);
  const swingAmp = grounded ? speedRatio * 0.78 : 0.32;
  const swing = Math.sin(gaitPhase) * swingAmp;
  const phaseCos = Math.cos(gaitPhase);

  rig.leftLeg.rotation.x = swing;
  rig.rightLeg.rotation.x = -swing;

  const leftKnee = grounded ? Math.max(0, -phaseCos * 0.72 * speedRatio) + 0.05 * speedRatio : 0.44;
  const rightKnee = grounded ? Math.max(0, phaseCos * 0.72 * speedRatio) + 0.05 * speedRatio : 0.24;
  rig.leftShin.rotation.x = leftKnee;
  rig.rightShin.rotation.x = rightKnee;

  rig.leftFoot.rotation.x = grounded ? -swing * 0.32 - leftKnee * 0.20 : 0.24;
  rig.rightFoot.rotation.x = grounded ? swing * 0.32 - rightKnee * 0.20 : 0.14;

  rig.leftArm.rotation.x = -swing * 0.80;
  rig.rightArm.rotation.x = swing * 0.80;
  rig.leftArm.rotation.z = 0.06 + speedRatio * 0.03;
  rig.rightArm.rotation.z = -(0.06 + speedRatio * 0.03);

  const baseElbowBend = grounded ? -0.14 - speedRatio * 0.54 : -0.42;
  rig.leftForeArm.rotation.x = baseElbowBend - Math.max(0, swing) * 0.30;
  rig.rightForeArm.rotation.x = baseElbowBend - Math.max(0, -swing) * 0.30;

  const twist = grounded ? Math.sin(gaitPhase) * 0.10 * speedRatio : 0;
  rig.torsoGroup.rotation.y = twist;
  rig.torsoGroup.rotation.z = grounded ? Math.cos(gaitPhase) * 0.028 * speedRatio : 0;
  const breath = Math.sin(time * 2.1) * 0.010;
  rig.torsoGroup.scale.set(1 + breath * 0.5, 1 + breath * 0.3, 1 + breath);

  rig.head.rotation.y = -twist * 0.78 + Math.sin(time * 0.72) * 0.055 * (1 - speedRatio);
  rig.head.rotation.x = Math.sin(time * 0.45) * 0.020 * (1 - speedRatio) + speedRatio * 0.04;

  // Periodic realistic blink (~every 3.85s, 140ms): +0.35 rad = open, -1.15 rad = closed
  const blinkCycle = time % 3.85;
  const blinkAmt = blinkCycle < 0.14 ? Math.sin((blinkCycle / 0.14) * Math.PI) : 0;
  const lidAngle = 0.35 - blinkAmt * 1.50;
  for (let i = 0; i < rig.eyelids.length; i++) {
    rig.eyelids[i].rotation.x = lidAngle;
  }

  const bob = grounded
    ? Math.abs(Math.sin(gaitPhase)) * 0.048 * speedRatio + Math.sin(time * 2.1) * 0.006
    : 0.032;
  rig.bodyPivot.position.y = bob;
  rig.bodyPivot.rotation.x = grounded ? -speedRatio * 0.10 : -0.05;

  const invSqrt = 1 / Math.sqrt(Math.max(0.68, squashY));
  const h = rig.baseHeightScale;
  rig.bodyPivot.scale.set(h * invSqrt, h * squashY, h * invSqrt);
}
