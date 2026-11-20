import * as THREE from 'three';
import type { VehicleArchetype } from '../world/WorldConfig';

export {
  animateCharacterRig,
  applyOutfitToRig,
  buildCharacterRig,
  type CharacterRig,
  type CharacterStyleConfig,
  type HairStyleType,
  type HumanBodyType,
} from './RealisticHumanBuilder';

// =========================================================================
// UPGRADED COMPOSITE VEHICLES (Sedan, Coupe, SUV, Motorcycle, Truck, Police)
// =========================================================================

export interface VehicleRig {
  root: THREE.Group;
  chassisGroup: THREE.Group;
  wheelMeshes: THREE.Object3D[];
  frontWheelPivots: THREE.Group[];
  brakeLightMat: THREE.MeshStandardMaterial;
  policeRedMat?: THREE.MeshStandardMaterial;
  policeBlueMat?: THREE.MeshStandardMaterial;
  bodyMat: THREE.MeshStandardMaterial;
}

export function buildVehicleRig(
  archetype: VehicleArchetype,
  paintColor: string,
  shadowTex: THREE.Texture
): VehicleRig {
  const root = new THREE.Group();
  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);

  const isMoto = archetype === 'motorcycle';
  const isTruck = archetype === 'truck';
  const isSuv = archetype === 'suv';
  const isCoupe = archetype === 'coupe';
  const isPolice = archetype === 'police';

  const length = isMoto ? 2.2 : isTruck ? 5.2 : isSuv ? 4.6 : isCoupe ? 4.35 : 4.55;
  const width = isMoto ? 0.75 : isTruck ? 2.15 : isSuv ? 2.05 : 1.92;
  const wheelRadius = isMoto ? 0.34 : isTruck ? 0.44 : isSuv ? 0.42 : 0.36;

  // Contact Shadow Disc
  const shGeo = new THREE.PlaneGeometry(width * 1.48, length * 1.24);
  shGeo.rotateX(-Math.PI / 2);
  const shMesh = new THREE.Mesh(
    shGeo,
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    })
  );
  shMesh.position.y = 0.03;
  root.add(shMesh);

  // Materials (clearcoat-like metallic paint contrast against matte trim & glossy cabin glass)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: isPolice ? '#f8fafc' : paintColor,
    roughness: 0.2,
    metalness: 0.65,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: isPolice ? '#0f172a' : '#1a202c',
    roughness: 0.78,
    metalness: 0.2,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#0a1626',
    roughness: 0.06,
    metalness: 0.9,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#dbe4ef',
    roughness: 0.16,
    metalness: 0.92,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#fefce8',
    emissive: '#fef08a',
    emissiveIntensity: 1.15,
    roughness: 0.18,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#dc2626',
    emissiveIntensity: 0.7,
    roughness: 0.22,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: '#16181d',
    roughness: 0.92,
    metalness: 0.04,
  });

  const wheelMeshes: THREE.Object3D[] = [];
  const frontWheelPivots: THREE.Group[] = [];
  let policeRedMat: THREE.MeshStandardMaterial | undefined;
  let policeBlueMat: THREE.MeshStandardMaterial | undefined;

  if (isMoto) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 1.45), bodyMat);
    frame.position.set(0, 0.62, 0);
    frame.castShadow = true;
    chassisGroup.add(frame);

    const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.58), bodyMat);
    fairing.position.set(0, 0.85, -0.52);
    fairing.rotation.x = 0.28;
    chassisGroup.add(fairing);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.22), glassMat);
    windshield.position.set(0, 1.06, -0.62);
    windshield.rotation.x = -0.45;
    chassisGroup.add(windshield);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.72), trimMat);
    seat.position.set(0, 0.82, 0.22);
    chassisGroup.add(seat);

    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8), chromeMat);
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0, 0.98, -0.55);
    chassisGroup.add(handlebar);

    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.08), headlightMat);
    hl.position.set(0, 0.82, -0.82);
    chassisGroup.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.08), brakeLightMat);
    tl.position.set(0, 0.78, 0.74);
    chassisGroup.add(tl);

    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.18, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, 0.2, 10);
    rimGeo.rotateZ(Math.PI / 2);

    const fPivot = new THREE.Group();
    fPivot.position.set(0, wheelRadius, -0.78);
    const fWheel = new THREE.Group();
    fWheel.add(new THREE.Mesh(wheelGeo, tireMat), new THREE.Mesh(rimGeo, chromeMat));
    fPivot.add(fWheel);
    root.add(fPivot);
    frontWheelPivots.push(fPivot);
    wheelMeshes.push(fWheel);

    const rWheel = new THREE.Group();
    rWheel.position.set(0, wheelRadius, 0.76);
    rWheel.add(new THREE.Mesh(wheelGeo, tireMat), new THREE.Mesh(rimGeo, chromeMat));
    root.add(rWheel);
    wheelMeshes.push(rWheel);
  } else {
    const bodyH = isTruck ? 0.76 : isSuv ? 0.66 : isCoupe ? 0.5 : 0.56;
    const baseY = wheelRadius + bodyH * 0.45;

    // 1. Sculpted lower splitter, side skirts & rear diffuser
    const lowerSkirt = new THREE.Mesh(new THREE.BoxGeometry(width + 0.05, 0.22, length + 0.12), trimMat);
    lowerSkirt.position.set(0, wheelRadius + 0.06, 0);
    chassisGroup.add(lowerSkirt);

    // 2. Primary sculpted main hull + hood power bulge ridge
    const hull = new THREE.Mesh(new THREE.BoxGeometry(width, bodyH, length), bodyMat);
    hull.position.set(0, baseY, 0);
    hull.castShadow = true;
    hull.receiveShadow = true;
    chassisGroup.add(hull);

    const hoodRidge = new THREE.Mesh(new THREE.BoxGeometry(width * 0.56, 0.07, length * 0.34), bodyMat);
    hoodRidge.position.set(0, baseY + bodyH * 0.5 + 0.02, -length * 0.28);
    chassisGroup.add(hoodRidge);

    // Wheel-arch fender flares for crisp automotive stance
    const frontZ = -length * 0.32;
    const rearZ = length * 0.32;
    for (const side of [-1, 1]) {
      for (const wz of [frontZ, rearZ]) {
        const fender = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, wheelRadius * 2.25), trimMat);
        fender.position.set(side * (width * 0.5 + 0.015), wheelRadius + 0.22, wz);
        chassisGroup.add(fender);
      }
    }

    if (isPolice) {
      const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(width + 0.03, 0.24, length * 0.56), trimMat);
      sideStripe.position.set(0, baseY, 0.06);
      chassisGroup.add(sideStripe);
    }

    // 3. Sleek Tapered Cabin / Greenhouse with sloped windshield & rear glass
    const cabinLen = isTruck ? length * 0.36 : isSuv ? length * 0.62 : isCoupe ? length * 0.46 : length * 0.52;
    const cabinH = isSuv ? 0.62 : isTruck ? 0.68 : isCoupe ? 0.44 : 0.52;
    const cabinZ = isTruck ? -length * 0.16 : isCoupe ? 0.22 : 0.12;
    const cabinBaseY = baseY + bodyH * 0.5;

    const glassWrap = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.82, cabinH * 0.82, cabinLen * 0.88),
      glassMat
    );
    glassWrap.position.set(0, cabinBaseY + cabinH * 0.41, cabinZ);
    glassWrap.castShadow = true;
    chassisGroup.add(glassWrap);

    // Angled front windshield visor for streamlined profile
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.80, cabinH * 0.94, 0.12),
      glassMat
    );
    windshield.position.set(0, cabinBaseY + cabinH * 0.41, cabinZ - cabinLen * 0.46);
    windshield.rotation.x = 0.46;
    chassisGroup.add(windshield);

    // Angled rear fastback window (non-truck/non-suv)
    if (!isTruck && !isSuv) {
      const rearGlass = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.78, cabinH * 0.92, 0.12),
        glassMat
      );
      rearGlass.position.set(0, cabinBaseY + cabinH * 0.41, cabinZ + cabinLen * 0.45);
      rearGlass.rotation.x = -0.44;
      chassisGroup.add(rearGlass);
    }

    // Sleek painted roof cap
    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.8, 0.1, cabinLen * 0.76),
      bodyMat
    );
    roofCap.position.set(0, cabinBaseY + cabinH * 0.85, cabinZ + 0.02);
    roofCap.castShadow = true;
    chassisGroup.add(roofCap);

    // SUV metallic roof rails
    if (isSuv) {
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, cabinLen * 0.72), chromeMat);
        rail.position.set(side * (width * 0.34), cabinBaseY + cabinH * 0.94, cabinZ + 0.02);
        chassisGroup.add(rail);
      }
    }

    // Dual chrome exhaust pipes
    for (const side of [-1, 1]) {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 8), chromeMat);
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(side * (width * 0.28), wheelRadius + 0.06, length * 0.5 + 0.07);
      chassisGroup.add(exhaust);
    }

    if (isTruck) {
      const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.12, length * 0.44), trimMat);
      bedFloor.position.set(0, baseY + bodyH * 0.38, length * 0.26);
      chassisGroup.add(bedFloor);
      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, length * 0.46), bodyMat);
      railL.position.set(-width * 0.43, baseY + bodyH * 0.56, length * 0.26);
      const railR = railL.clone();
      railR.position.x = width * 0.43;
      chassisGroup.add(railL, railR);
    }

    if (isCoupe) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.075, 0.28), trimMat);
      wing.position.set(0, baseY + bodyH * 0.7, length * 0.45);
      chassisGroup.add(wing);
    }

    // Front grille with chrome surround bar + crisp LED headlights & taillights
    const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.56, 0.24, 0.08), trimMat);
    grille.position.set(0, baseY - 0.04, -length * 0.5 - 0.02);
    const grilleTrim = new THREE.Mesh(new THREE.BoxGeometry(width * 0.6, 0.035, 0.095), chromeMat);
    grilleTrim.position.set(0, baseY + 0.08, -length * 0.5 - 0.02);
    chassisGroup.add(grille, grilleTrim);

    // Full-width subtle rear tailbar accent
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.055, 0.08), brakeLightMat);
    tailBar.position.set(0, baseY + 0.09, length * 0.5 + 0.015);
    chassisGroup.add(tailBar);

    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.1), headlightMat);
      hl.position.set(side * (width * 0.35), baseY + 0.07, -length * 0.5 - 0.01);
      chassisGroup.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.15, 0.1), brakeLightMat);
      tl.position.set(side * (width * 0.33), baseY + 0.09, length * 0.5 + 0.01);
      chassisGroup.add(tl);

      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), bodyMat);
      mirror.position.set(side * (width * 0.53), baseY + bodyH * 0.55, cabinZ - cabinLen * 0.34);
      chassisGroup.add(mirror);
    }

    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.04), chromeMat);
    plate.position.set(0, baseY - 0.08, length * 0.5 + 0.03);
    chassisGroup.add(plate);

    if (isPolice) {
      policeRedMat = new THREE.MeshStandardMaterial({
        color: '#ef4444',
        emissive: '#ef4444',
        emissiveIntensity: 2.0,
        roughness: 0.2,
      });
      policeBlueMat = new THREE.MeshStandardMaterial({
        color: '#3b82f6',
        emissive: '#3b82f6',
        emissiveIntensity: 2.0,
        roughness: 0.2,
      });
      const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.24), trimMat);
      barBase.position.set(0, baseY + bodyH * 0.5 + cabinH + 0.02, cabinZ);
      const redPod = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.2), policeRedMat);
      redPod.position.set(-0.28, baseY + bodyH * 0.5 + cabinH + 0.1, cabinZ);
      const bluePod = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.2), policeBlueMat);
      bluePod.position.set(0.28, baseY + bodyH * 0.5 + cabinH + 0.1, cabinZ);
      chassisGroup.add(barBase, redPod, bluePod);
    }

    // 4 Rotating Alloy Wheels
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.28, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.64, wheelRadius * 0.64, 0.3, 12);
    rimGeo.rotateZ(Math.PI / 2);
    const spokeGeo = new THREE.BoxGeometry(0.32, wheelRadius * 1.12, 0.055);
    const spokeGeo2 = new THREE.BoxGeometry(0.32, 0.055, wheelRadius * 1.12);

    const wheelX = width * 0.5 - 0.07;

    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * wheelX, wheelRadius, frontZ);
      const spinGroup = new THREE.Group();
      spinGroup.add(
        new THREE.Mesh(wheelGeo, tireMat),
        new THREE.Mesh(rimGeo, chromeMat),
        new THREE.Mesh(spokeGeo, trimMat),
        new THREE.Mesh(spokeGeo2, trimMat)
      );
      pivot.add(spinGroup);
      root.add(pivot);
      frontWheelPivots.push(pivot);
      wheelMeshes.push(spinGroup);

      const rearSpin = new THREE.Group();
      rearSpin.position.set(side * wheelX, wheelRadius, rearZ);
      rearSpin.add(
        new THREE.Mesh(wheelGeo, tireMat),
        new THREE.Mesh(rimGeo, chromeMat),
        new THREE.Mesh(spokeGeo, trimMat),
        new THREE.Mesh(spokeGeo2, trimMat)
      );
      root.add(rearSpin);
      wheelMeshes.push(rearSpin);
    }
  }

  return {
    root,
    chassisGroup,
    wheelMeshes,
    frontWheelPivots,
    brakeLightMat,
    policeRedMat,
    policeBlueMat,
    bodyMat,
  };
}
