import * as THREE from 'three';
import type { StaticBuildingDef } from '../world/WorldConfig';

export interface ArchitecturalMaterialPalette {
  glassBuildingMat: THREE.MeshStandardMaterial;
  artDecoMap?: THREE.Texture;
  socialBillboardMap?: THREE.Texture;
  /** Emissive interior lamp / monitor / room glow materials modulated by Time of Day & Building Brightness */
  interiorLightMats: THREE.MeshStandardMaterial[];
  /** Exterior architectural facade accent & trim materials modulated by Building Brightness */
  buildingSurfaceMats: THREE.MeshStandardMaterial[];
  /** Transparent glazing materials for storefronts & office floors */
  windowGlassMat: THREE.MeshStandardMaterial;
  neonNightMat: THREE.MeshStandardMaterial;
}

export function createArchitecturalPalette(
  glassBuildingMat: THREE.MeshStandardMaterial,
  neonNightMat: THREE.MeshStandardMaterial,
  artDecoMap?: THREE.Texture,
  socialBillboardMap?: THREE.Texture
): ArchitecturalMaterialPalette {
  const warmCeilingMat = new THREE.MeshStandardMaterial({
    color: '#fff4d6',
    emissive: '#ffcf7d',
    emissiveIntensity: 0.95,
    roughness: 0.35,
  });
  const coolOfficeLightMat = new THREE.MeshStandardMaterial({
    color: '#e0f2fe',
    emissive: '#7dd3fc',
    emissiveIntensity: 0.9,
    roughness: 0.3,
  });
  const screenGlowMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0ea5e9',
    emissiveIntensity: 1.15,
    roughness: 0.2,
  });
  const windowGlassMat = new THREE.MeshStandardMaterial({
    color: '#93c5fd',
    roughness: 0.14,
    metalness: 0.55,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });

  return {
    glassBuildingMat,
    artDecoMap,
    socialBillboardMap,
    interiorLightMats: [warmCeilingMat, coolOfficeLightMat, screenGlowMat],
    buildingSurfaceMats: [],
    windowGlassMat,
    neonNightMat,
  };
}

function tagRole(obj: THREE.Object3D, role: 'exterior' | 'interior'): THREE.Object3D {
  obj.userData.role = role;
  return obj;
}

function makeSurfaceMat(
  palette: ArchitecturalMaterialPalette,
  params: THREE.MeshStandardMaterialParameters
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial(params);
  mat.userData.baseColor = mat.color.clone();
  palette.buildingSurfaceMats.push(mat);
  return mat;
}

// Reusable material helpers inside a building build pass
function createFurnitureMaterials(palette: ArchitecturalMaterialPalette) {
  const [warmLight, coolLight, screenGlow] = palette.interiorLightMats;
  return {
    warmLight,
    coolLight,
    screenGlow,
    floorTile: new THREE.MeshStandardMaterial({ color: '#d8d2c5', roughness: 0.58 }),
    woodDesk: new THREE.MeshStandardMaterial({ color: '#8b5e3c', roughness: 0.68 }),
    darkDesk: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.55, metalness: 0.25 }),
    chairFabric: new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85 }),
    sofaFabric: new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.88 }),
    accentSofa: new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.82 }),
    partitionWall: new THREE.MeshStandardMaterial({ color: '#e5e0d8', roughness: 0.78 }),
    steel: new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.35, metalness: 0.72 }),
    plantLeaf: new THREE.MeshStandardMaterial({ color: '#228b4e', roughness: 0.78 }),
    redTool: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.45, metalness: 0.45 }),
    yellowLift: new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.48, metalness: 0.42 }),
    crateWood: new THREE.MeshStandardMaterial({ color: '#b08968', roughness: 0.86 }),
  };
}

/**
 * Adds a furnished office workstation cluster (desk + ergonomic chair + glowing dual monitors)
 */
function addOfficeDeskCluster(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  rotY: number,
  fm: ReturnType<typeof createFurnitureMaterials>
): void {
  const cluster = new THREE.Group();
  cluster.position.set(x, y, z);
  cluster.rotation.y = rotY;
  tagRole(cluster, 'interior');

  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 1.0), fm.woodDesk);
  deskTop.position.y = 0.76;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.74, 0.9), fm.darkDesk);
  legL.position.set(-0.95, 0.37, 0);
  const legR = legL.clone();
  legR.position.x = 0.95;

  const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.46, 0.08), fm.screenGlow);
  monitor.position.set(0, 1.12, -0.22);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.14), fm.darkDesk);
  stand.position.set(0, 0.9, -0.22);

  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.56), fm.chairFabric);
  chairSeat.position.set(0, 0.48, 0.65);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.1), fm.chairFabric);
  chairBack.position.set(0, 0.82, 0.9);

  cluster.add(deskTop, legL, legR, monitor, stand, chairSeat, chairBack);
  parent.add(cluster);
}

/**
 * Adds an interior room living-lounge set (rug + sofa + coffee table + potted plant)
 */
function addLoungeRoomSet(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  fm: ReturnType<typeof createFurnitureMaterials>,
  warmAccent = false
): void {
  const lounge = new THREE.Group();
  lounge.position.set(x, y, z);
  tagRole(lounge, 'interior');

  const sofaBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.52, 1.05),
    warmAccent ? fm.accentSofa : fm.sofaFabric
  );
  sofaBase.position.set(0, 0.32, -0.9);
  const sofaBack = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.68, 0.24),
    warmAccent ? fm.accentSofa : fm.sofaFabric
  );
  sofaBack.position.set(0, 0.72, -1.32);

  const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.42, 0.85), fm.woodDesk);
  table.position.set(0, 0.24, 0.25);

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.48, 8), fm.darkDesk);
  pot.position.set(1.9, 0.24, -0.9);
  const plant = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 0), fm.plantLeaf);
  plant.position.set(1.9, 0.85, -0.9);

  lounge.add(sofaBase, sofaBack, table, pot, plant);
  parent.add(lounge);
}

/**
 * Builds a complete, architecturally detailed 3D building with BOTH exterior architectural details
 * (columns, cornices, awnings, balconies, rooftop HVAC/solar/spires) AND real 3D interior rooms,
 * offices, partitions, and furniture visible through clear architectural window glazing.
 */
export function buildArchitecturalBuilding(
  def: StaticBuildingDef,
  palette: ArchitecturalMaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  group.name = def.id;
  group.position.set(def.x, 0, def.z);
  group.userData = { buildingId: def.id, style: def.style, district: def.district };

  const fm = createFurnitureMaterials(palette);
  const metalTrimMat = makeSurfaceMat(palette, { color: '#475569', roughness: 0.38, metalness: 0.62 });
  const hvacMat = makeSurfaceMat(palette, { color: '#94a3b8', roughness: 0.56, metalness: 0.42 });
  const graniteMat = makeSurfaceMat(palette, { color: '#cbd5e1', roughness: 0.64, metalness: 0.08 });

  if (def.style === 'glass_tower') {
    // --- OUTER ARCHITECTURAL PLINTH & OPEN GLAZED EXECUTIVE LOBBY (Y = 0..6.4) ---
    const lobbyH = 6.2;
    const lobbyFloor = new THREE.Mesh(new THREE.BoxGeometry(def.w, 0.24, def.d), fm.floorTile);
    lobbyFloor.position.y = 0.12;
    lobbyFloor.receiveShadow = true;
    tagRole(lobbyFloor, 'interior');
    group.add(lobbyFloor);

    // Interior elevator core & room partition wall inside lobby
    const core = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.34, lobbyH - 0.3, def.d * 0.34), fm.partitionWall);
    core.position.set(0, lobbyH * 0.5, -def.d * 0.1);
    tagRole(core, 'interior');
    group.add(core);

    // Executive reception desk + dual monitors + lounge seating inside visible glass lobby
    addOfficeDeskCluster(group, 0, 0.24, def.d * 0.24, 0, fm);
    addLoungeRoomSet(group, -def.w * 0.26, 0.24, def.d * 0.12, fm, true);
    addLoungeRoomSet(group, def.w * 0.26, 0.24, def.d * 0.12, fm, false);

    // Warm lobby ceiling light panels
    const lobbyLight = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.78, 0.16, def.d * 0.78), fm.warmLight);
    lobbyLight.position.y = lobbyH - 0.32;
    tagRole(lobbyLight, 'interior');
    group.add(lobbyLight);

    // Exterior corner structural granite columns + slab ceiling + transparent glass storefront walls
    const colGeo = new THREE.BoxGeometry(1.5, lobbyH, 1.5);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const col = new THREE.Mesh(colGeo, graniteMat);
        col.position.set(sx * (def.w * 0.5 - 0.75), lobbyH * 0.5, sz * (def.d * 0.5 - 0.75));
        col.castShadow = true;
        tagRole(col, 'exterior');
        group.add(col);
      }
    }
    const lobbyGlass = new THREE.Mesh(
      new THREE.BoxGeometry(def.w - 0.4, lobbyH - 0.4, def.d - 0.4),
      palette.windowGlassMat
    );
    lobbyGlass.position.y = lobbyH * 0.5;
    tagRole(lobbyGlass, 'exterior');
    group.add(lobbyGlass);

    const podiumSlab = new THREE.Mesh(new THREE.BoxGeometry(def.w + 0.6, 0.7, def.d + 0.6), metalTrimMat);
    podiumSlab.position.y = lobbyH + 0.15;
    tagRole(podiumSlab, 'exterior');
    group.add(podiumSlab);

    // Cantilevered glass entry canopy
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.56, 0.42, def.d + 2.8), metalTrimMat);
    canopy.position.y = 4.2;
    tagRole(canopy, 'exterior');
    group.add(canopy);

    // --- VISIBLE MID-LEVEL EXECUTIVE OFFICE FLOOR (Y = 6.5..11.2) ---
    const officeBaseY = 6.5;
    const officeH = 4.6;
    const officeSlab = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.88, 0.3, def.d * 0.88), fm.floorTile);
    officeSlab.position.y = officeBaseY;
    tagRole(officeSlab, 'interior');
    group.add(officeSlab);

    // Partition walls creating distinct office suites + workstations + boardroom table
    const divWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, officeH - 0.4, def.d * 0.72), fm.partitionWall);
    divWall.position.set(0, officeBaseY + officeH * 0.5, 0);
    tagRole(divWall, 'interior');
    group.add(divWall);

    addOfficeDeskCluster(group, -def.w * 0.22, officeBaseY + 0.15, def.d * 0.16, 0, fm);
    addOfficeDeskCluster(group, -def.w * 0.22, officeBaseY + 0.15, -def.d * 0.16, Math.PI, fm);
    // Boardroom conference table in right office room
    const confTable = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.26, 0.78, def.d * 0.42), fm.woodDesk);
    confTable.position.set(def.w * 0.22, officeBaseY + 0.52, 0);
    tagRole(confTable, 'interior');
    group.add(confTable);

    const officeCeilingGlow = new THREE.Mesh(
      new THREE.BoxGeometry(def.w * 0.74, 0.16, def.d * 0.74),
      fm.coolLight
    );
    officeCeilingGlow.position.y = officeBaseY + officeH - 0.25;
    tagRole(officeCeilingGlow, 'interior');
    group.add(officeCeilingGlow);

    const officeGlass = new THREE.Mesh(
      new THREE.BoxGeometry(def.w * 0.88, officeH, def.d * 0.88),
      palette.windowGlassMat
    );
    officeGlass.position.y = officeBaseY + officeH * 0.5;
    tagRole(officeGlass, 'exterior');
    group.add(officeGlass);

    // --- UPPER CURTAIN-WALL TOWER SHAFT + ARCHITECTURAL CROWN & ROOFTOP EQUIPMENT ---
    const upperStart = officeBaseY + officeH;
    const upperH = Math.max(8, def.h - upperStart);
    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(def.w * 0.88, upperH, def.d * 0.88),
      palette.glassBuildingMat
    );
    shaft.position.y = upperStart + upperH * 0.5;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    tagRole(shaft, 'exterior');
    group.add(shaft);

    // Structural horizontal floor spandrel bands for crisp architectural rhythm
    for (let fy = upperStart; fy < def.h; fy += 9.5) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.9, 0.45, def.d * 0.9), metalTrimMat);
      band.position.y = fy;
      tagRole(band, 'exterior');
      group.add(band);
    }

    // Stepped crown penthouse + rooftop HVAC units
    const crownMat = makeSurfaceMat(palette, { color: def.color, roughness: 0.38, metalness: 0.55 });
    const crown = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.64, 5.4, def.d * 0.64), crownMat);
    crown.position.y = def.h + 2.7;
    tagRole(crown, 'exterior');
    group.add(crown);

    const hvac = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.24, 1.6, def.d * 0.24), hvacMat);
    hvac.position.set(def.w * 0.22, def.h + 0.8, -def.d * 0.2);
    tagRole(hvac, 'exterior');
    group.add(hvac);

    const accentBandMat = new THREE.MeshStandardMaterial({
      color: def.accent ?? '#38bdf8',
      emissive: def.accent ?? '#38bdf8',
      emissiveIntensity: 1.05,
    });
    const accentBand = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.91, 0.78, def.d * 0.91), accentBandMat);
    accentBand.position.y = def.h - 0.45;
    tagRole(accentBand, 'exterior');
    group.add(accentBand);

    if (def.h >= 42) {
      for (const sx of [-1, 1]) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.48, def.h * 0.72, 0.48), accentBandMat);
        fin.position.set(sx * def.w * 0.45, 6 + def.h * 0.36, def.d * 0.45);
        tagRole(fin, 'exterior');
        group.add(fin);
      }
    }

    if (def.h >= 55) {
      const heliRing = new THREE.Mesh(
        new THREE.RingGeometry(2.6, 3.3, 20),
        new THREE.MeshBasicMaterial({ color: '#fbbf24', side: THREE.DoubleSide })
      );
      heliRing.rotation.x = -Math.PI / 2;
      heliRing.position.y = def.h + 5.45;
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.75, 18, 8), metalTrimMat);
      spire.position.y = def.h + 14.2;
      tagRole(heliRing, 'exterior');
      tagRole(spire, 'exterior');
      group.add(heliRing, spire);
    }
  } else if (def.style === 'city_hall') {
    const marbleMat = makeSurfaceMat(palette, { color: '#ece9e1', roughness: 0.58, metalness: 0.05 });

    // Grand civic stone entry steps
    const steps = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.72, 0.9, 3.2), marbleMat);
    steps.position.set(0, 0.45, def.d * 0.5 + 1.4);
    tagRole(steps, 'exterior');
    group.add(steps);

    // Visible ground-floor Civic Rotunda Foyer with marble reception desk & benches
    const foyerH = 5.4;
    const foyerFloor = new THREE.Mesh(new THREE.BoxGeometry(def.w - 0.8, 0.25, def.d - 0.8), fm.floorTile);
    foyerFloor.position.y = 0.14;
    tagRole(foyerFloor, 'interior');
    group.add(foyerFloor);

    addOfficeDeskCluster(group, 0, 0.26, 0, 0, fm);
    addLoungeRoomSet(group, -def.w * 0.24, 0.26, def.d * 0.14, fm, false);
    addLoungeRoomSet(group, def.w * 0.24, 0.26, def.d * 0.14, fm, false);

    const chandelier = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.4, 0.45, 12), fm.warmLight);
    chandelier.position.set(0, foyerH - 0.55, 0);
    tagRole(chandelier, 'interior');
    group.add(chandelier);

    const foyerGlass = new THREE.Mesh(
      new THREE.BoxGeometry(def.w - 0.6, foyerH - 0.2, def.d - 0.6),
      palette.windowGlassMat
    );
    foyerGlass.position.y = foyerH * 0.5;
    tagRole(foyerGlass, 'exterior');
    group.add(foyerGlass);

    // Upper civic hall council chamber massing
    const upperH = Math.max(5, def.h * 0.65 - foyerH);
    const upperBase = new THREE.Mesh(new THREE.BoxGeometry(def.w, upperH, def.d), marbleMat);
    upperBase.position.y = foyerH + upperH * 0.5;
    upperBase.castShadow = true;
    upperBase.receiveShadow = true;
    tagRole(upperBase, 'exterior');
    group.add(upperBase);

    // Classical portico columns + triangular cornice pediment
    for (let cx = -def.w * 0.36; cx <= def.w * 0.37; cx += def.w * 0.18) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, def.h * 0.62, 10), marbleMat);
      col.position.set(cx, def.h * 0.31, def.d * 0.5 + 0.55);
      tagRole(col, 'exterior');
      group.add(col);
    }

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(def.w * 0.28, def.w * 0.3, 6.2, 18), marbleMat);
    drum.position.y = def.h * 0.65 + 3.1;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(def.w * 0.28, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      makeSurfaceMat(palette, { color: '#d97706', roughness: 0.3, metalness: 0.72 })
    );
    dome.position.y = def.h * 0.65 + 6.2;
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 2.2, 10), fm.warmLight);
    lantern.position.y = def.h * 0.65 + 6.2 + def.w * 0.28;
    tagRole(drum, 'exterior');
    tagRole(dome, 'exterior');
    tagRole(lantern, 'exterior');
    group.add(drum, dome, lantern);
  } else if (def.style === 'residential' || def.style === 'art_deco' || def.style === 'boutique') {
    const wallMat = makeSurfaceMat(palette, {
      ...(palette.artDecoMap ? { map: palette.artDecoMap } : {}),
      color: def.color,
      roughness: 0.72,
      metalness: 0.04,
    });

    // Ground floor architectural open room interior (Y = 0..4.2) visible through glazed bay windows
    const gfH = 4.2;
    const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(def.w - 0.6, 0.22, def.d - 0.6), fm.floorTile);
    floorMesh.position.y = 0.11;
    tagRole(floorMesh, 'interior');
    group.add(floorMesh);

    // Interior partition dividing rooms (living room + study/office or boutique shop + counter)
    const roomDivider = new THREE.Mesh(new THREE.BoxGeometry(0.22, gfH - 0.3, def.d * 0.68), fm.partitionWall);
    roomDivider.position.set(0, gfH * 0.5, -0.4);
    tagRole(roomDivider, 'interior');
    group.add(roomDivider);

    // Room 1: Living Lounge or Boutique Display
    addLoungeRoomSet(group, -def.w * 0.23, 0.22, 0.2, fm, def.style === 'boutique');
    // Room 2: Home Office / Café Counter / Hotel Reception
    addOfficeDeskCluster(group, def.w * 0.23, 0.22, 0.2, -Math.PI * 0.15, fm);

    // Warm interior room ceiling lamps
    const roomLamp = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.72, 0.14, def.d * 0.58), fm.warmLight);
    roomLamp.position.y = gfH - 0.24;
    tagRole(roomLamp, 'interior');
    group.add(roomLamp);

    // Structural ground-floor exterior corner piers + glazed storefront/living windows
    const pierGeo = new THREE.BoxGeometry(1.4, gfH, 1.4);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const pier = new THREE.Mesh(pierGeo, wallMat);
        pier.position.set(sx * (def.w * 0.5 - 0.7), gfH * 0.5, sz * (def.d * 0.5 - 0.7));
        tagRole(pier, 'exterior');
        group.add(pier);
      }
    }
    const gfGlass = new THREE.Mesh(
      new THREE.BoxGeometry(def.w - 0.45, gfH - 0.3, def.d - 0.45),
      palette.windowGlassMat
    );
    gfGlass.position.y = gfH * 0.5;
    tagRole(gfGlass, 'exterior');
    group.add(gfGlass);

    // Upper stories facade block
    const upperH = Math.max(4.2, def.h - gfH);
    const upperBody = new THREE.Mesh(new THREE.BoxGeometry(def.w, upperH, def.d), wallMat);
    upperBody.position.y = gfH + upperH * 0.5;
    upperBody.castShadow = true;
    upperBody.receiveShadow = true;
    tagRole(upperBody, 'exterior');
    group.add(upperBody);

    // Projecting 3D balconies with railings on upper residential & hotel floors
    const balconyMat = makeSurfaceMat(palette, { color: '#e2dcd0', roughness: 0.65 });
    for (let by = gfH + 3.2; by < def.h - 1.5; by += 4.2) {
      for (const bx of [-def.w * 0.24, def.w * 0.24]) {
        const deck = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.34, 0.24, 1.35), balconyMat);
        deck.position.set(bx, by, def.d * 0.5 + 0.6);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.34, 0.85, 0.12), metalTrimMat);
        rail.position.set(bx, by + 0.52, def.d * 0.5 + 1.22);
        tagRole(deck, 'exterior');
        tagRole(rail, 'exterior');
        group.add(deck, rail);
      }
    }

    // Stepped cornice, rooftop parapet & rooftop HVAC/terrace unit
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(def.w + 0.9, 0.85, def.d + 0.9), balconyMat);
    cornice.position.y = def.h + 0.4;
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.72, 0.65, def.d * 0.72), hvacMat);
    parapet.position.y = def.h + 0.95;
    tagRole(cornice, 'exterior');
    tagRole(parapet, 'exterior');
    group.add(cornice, parapet);

    // Accent storefront awning / canopy
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(def.w * 0.92, 0.58, def.d + 1.6),
      new THREE.MeshStandardMaterial({
        color: def.accent ?? '#f59e0b',
        emissive: def.accent ?? '#f59e0b',
        emissiveIntensity: def.style === 'boutique' ? 0.85 : 0.24,
        roughness: 0.42,
      })
    );
    awning.position.y = gfH + 0.1;
    tagRole(awning, 'exterior');
    group.add(awning);
  } else if (def.style === 'nightclub') {
    const darkMat = makeSurfaceMat(palette, { color: def.color, roughness: 0.44, metalness: 0.35 });
    const gfH = 5.0;

    // Visible illuminated club interior (dance floor + DJ booth + bar counter + neon lights)
    const danceFloor = new THREE.Mesh(
      new THREE.BoxGeometry(def.w * 0.62, 0.22, def.d * 0.52),
      palette.neonNightMat
    );
    danceFloor.position.set(0, 0.12, 0.8);
    tagRole(danceFloor, 'interior');
    group.add(danceFloor);

    const djBooth = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.3, 1.6), fm.darkDesk);
    djBooth.position.set(0, 0.75, -def.d * 0.26);
    const djScreen = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.9, 0.15), fm.screenGlow);
    djScreen.position.set(0, 1.9, -def.d * 0.28);
    tagRole(djBooth, 'interior');
    tagRole(djScreen, 'interior');
    group.add(djBooth, djScreen);

    addLoungeRoomSet(group, -def.w * 0.28, 0.22, 0, fm, true);
    addLoungeRoomSet(group, def.w * 0.28, 0.22, 0, fm, true);

    const clubGlass = new THREE.Mesh(
      new THREE.BoxGeometry(def.w - 0.5, gfH - 0.3, def.d - 0.5),
      palette.windowGlassMat
    );
    clubGlass.position.y = gfH * 0.5;
    tagRole(clubGlass, 'exterior');
    group.add(clubGlass);

    const upperH = Math.max(5, def.h - gfH);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(def.w, upperH, def.d), darkMat);
    hull.position.y = gfH + upperH * 0.5;
    hull.castShadow = true;
    tagRole(hull, 'exterior');
    group.add(hull);

    const neonTop = new THREE.Mesh(new THREE.BoxGeometry(def.w + 0.55, 0.82, def.d + 0.55), palette.neonNightMat);
    neonTop.position.y = def.h - 0.55;
    const neonMid = new THREE.Mesh(
      new THREE.BoxGeometry(def.w + 0.6, 0.55, def.d + 0.6),
      new THREE.MeshStandardMaterial({
        color: def.accent ?? '#22d3ee',
        emissive: def.accent ?? '#22d3ee',
        emissiveIntensity: 1.45,
      })
    );
    neonMid.position.y = gfH;
    tagRole(neonTop, 'exterior');
    tagRole(neonMid, 'exterior');
    group.add(neonTop, neonMid);
  } else if (def.style === 'garage' || def.style === 'warehouse') {
    const indMat = makeSurfaceMat(palette, { color: def.color, roughness: 0.66, metalness: 0.32 });
    const bayH = 5.0;

    // Interior workshop floor & equipment (car lift / tool chests for garage, pallet racks & forklift for warehouse)
    const shopFloor = new THREE.Mesh(new THREE.BoxGeometry(def.w - 0.6, 0.2, def.d - 0.6), fm.floorTile);
    shopFloor.position.y = 0.1;
    tagRole(shopFloor, 'interior');
    group.add(shopFloor);

    if (def.style === 'garage') {
      // Two-post hydraulic car lift + red tool chest + diagnostic workbench
      for (const lx of [-2.2, 2.2]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.8, 0.45), fm.yellowLift);
        post.position.set(lx, 2.0, 0.5);
        tagRole(post, 'interior');
        group.add(post);
      }
      const toolChest = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.35, 0.9), fm.redTool);
      toolChest.position.set(-def.w * 0.28, 0.78, -def.d * 0.22);
      tagRole(toolChest, 'interior');
      group.add(toolChest);
      addOfficeDeskCluster(group, def.w * 0.25, 0.2, -def.d * 0.18, 0, fm);
    } else {
      // Warehouse shelving racks + stacked wooden cargo crates + yellow forklift
      for (const rx of [-def.w * 0.26, def.w * 0.26]) {
        for (let tier = 0; tier < 2; tier++) {
          const crate = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 3.2), fm.crateWood);
          crate.position.set(rx, 0.95 + tier * 1.9, -1.5);
          tagRole(crate, 'interior');
          group.add(crate);
        }
      }
      // Yellow indoor forklift
      const forkBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 2.4), fm.yellowLift);
      forkBody.position.set(0, 0.85, 2.2);
      const forkMast = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.8, 0.25), fm.darkDesk);
      forkMast.position.set(0, 1.6, 3.5);
      tagRole(forkBody, 'interior');
      tagRole(forkMast, 'interior');
      group.add(forkBody, forkMast);
    }

    const shopLamp = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.7, 0.18, 1.2), fm.coolLight);
    shopLamp.position.set(0, bayH - 0.3, 0);
    tagRole(shopLamp, 'interior');
    group.add(shopLamp);

    // Side & back walls leaving open glazed/framed front service bay
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.h, 0.7), indMat);
    backWall.position.set(0, def.h * 0.5, -def.d * 0.5 + 0.35);
    const sideWallL = new THREE.Mesh(new THREE.BoxGeometry(0.7, def.h, def.d), indMat);
    sideWallL.position.set(-def.w * 0.5 + 0.35, def.h * 0.5, 0);
    const sideWallR = sideWallL.clone();
    sideWallR.position.x = def.w * 0.5 - 0.35;
    const upperFront = new THREE.Mesh(new THREE.BoxGeometry(def.w, Math.max(2, def.h - bayH), 0.7), indMat);
    upperFront.position.set(0, bayH + Math.max(2, def.h - bayH) * 0.5, def.d * 0.5 - 0.35);
    const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(def.w + 0.4, 0.65, def.d + 0.4), indMat);
    roofSlab.position.y = def.h;
    roofSlab.castShadow = true;
    for (const part of [backWall, sideWallL, sideWallR, upperFront, roofSlab]) {
      tagRole(part, 'exterior');
      group.add(part);
    }

    // Corrugated roof ribs + accent fascia stripe
    for (let rz = -def.d * 0.35; rz <= def.d * 0.36; rz += def.d * 0.35) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(def.w + 0.3, 0.55, 1.4), metalTrimMat);
      rib.position.set(0, def.h + 0.55, rz);
      tagRole(rib, 'exterior');
      group.add(rib);
    }
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(def.w + 0.32, 1.1, def.d + 0.32),
      new THREE.MeshStandardMaterial({
        color: def.accent ?? '#f59e0b',
        emissive: def.accent ?? '#f59e0b',
        emissiveIntensity: 0.65,
      })
    );
    stripe.position.y = def.h - 1.3;
    tagRole(stripe, 'exterior');
    group.add(stripe);
  } else if (def.style === 'airport_terminal') {
    // --- COASTLINE INTERNATIONAL AIRPORT CONCOURSE ---
    const concourseFloor = new THREE.Mesh(new THREE.BoxGeometry(def.w, 0.3, def.d), fm.floorTile);
    concourseFloor.position.y = 0.15;
    concourseFloor.receiveShadow = true;
    tagRole(concourseFloor, 'interior');
    group.add(concourseFloor);

    // Interior check-in counters, glowing flight departure boards & gate waiting benches
    for (let cx = -def.w * 0.32; cx <= def.w * 0.33; cx += def.w * 0.32) {
      addOfficeDeskCluster(group, cx, 0.3, -def.d * 0.2, 0, fm);
      addLoungeRoomSet(group, cx, 0.3, def.d * 0.18, fm, false);
    }
    const depBoard = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.2, 0.28), fm.screenGlow);
    depBoard.position.set(0, 6.2, -def.d * 0.35);
    const termLights = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.82, 0.22, def.d * 0.55), fm.coolLight);
    termLights.position.y = def.h - 2.4;
    tagRole(depBoard, 'interior');
    tagRole(termLights, 'interior');
    group.add(depBoard, termLights);

    // Full panoramic glass curtain walls
    const termGlass = new THREE.Mesh(
      new THREE.BoxGeometry(def.w - 0.6, def.h - 2.2, def.d - 0.6),
      palette.windowGlassMat
    );
    termGlass.position.y = (def.h - 2.2) * 0.5 + 0.3;
    tagRole(termGlass, 'exterior');
    group.add(termGlass);

    // Steel structural columns along concourse front & rear
    for (let sx = -def.w * 0.45; sx <= def.w * 0.46; sx += def.w * 0.225) {
      for (const sz of [-def.d * 0.48, def.d * 0.48]) {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, def.h - 1.5, 8), graniteMat);
        strut.position.set(sx, (def.h - 1.5) * 0.5, sz);
        tagRole(strut, 'exterior');
        group.add(strut);
      }
    }

    // Sweeping cantilevered wing-shaped terminal roof + glowing cyan airport signage strip
    const roofMat = makeSurfaceMat(palette, { color: '#e2e8f0', roughness: 0.42, metalness: 0.35 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(def.w + 4.5, 1.35, def.d + 4.5), roofMat);
    roof.position.y = def.h - 1.1;
    roof.castShadow = true;
    const roofCrown = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.78, 1.6, def.d * 0.68), metalTrimMat);
    roofCrown.position.y = def.h + 0.3;
    const signBar = new THREE.Mesh(
      new THREE.BoxGeometry(def.w + 4.6, 0.55, def.d + 4.6),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#38bdf8', emissiveIntensity: 1.3 })
    );
    signBar.position.y = def.h - 1.6;
    tagRole(roof, 'exterior');
    tagRole(roofCrown, 'exterior');
    tagRole(signBar, 'exterior');
    group.add(roof, roofCrown, signBar);

    // Two Boarding Jetway Bridges extending north toward the runway apron (-Z)
    for (const jx of [-10, 10]) {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.0, 14), roofMat);
      bridge.position.set(jx, 4.5, -def.d * 0.5 - 7);
      const support = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 4.2, 8), metalTrimMat);
      support.position.set(jx, 2.1, -def.d * 0.5 - 12);
      tagRole(bridge, 'exterior');
      tagRole(support, 'exterior');
      group.add(bridge, support);
    }
  } else if (def.style === 'airport_hangar') {
    const hangarMat = makeSurfaceMat(palette, { color: def.color, roughness: 0.58, metalness: 0.42 });

    // Epoxy hangar floor + interior maintenance bay + parked private business jet
    const floor = new THREE.Mesh(new THREE.BoxGeometry(def.w - 0.6, 0.2, def.d - 0.6), fm.floorTile);
    floor.position.y = 0.1;
    tagRole(floor, 'interior');
    group.add(floor);

    // Parked small private jet inside hangar
    const miniJet = buildPassengerAirliner('#f59e0b', 0.42);
    miniJet.position.set(0, 0.2, 0);
    miniJet.rotation.y = Math.PI;
    tagRole(miniJet, 'interior');
    group.add(miniJet);

    // Tool chests & high-bay overhead lights inside hangar
    const toolBank = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 1.0), fm.redTool);
    toolBank.position.set(-def.w * 0.36, 0.8, 4.0);
    const hangarLamp = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.72, 0.25, 1.6), fm.coolLight);
    hangarLamp.position.set(0, def.h - 2.6, 0);
    tagRole(toolBank, 'interior');
    tagRole(hangarLamp, 'interior');
    group.add(toolBank, hangarLamp);

    // Hangar side/back walls & arched curved barrel roof (open north bay toward runway apron)
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.9, def.h * 0.65, def.d), hangarMat);
    sideL.position.set(-def.w * 0.5 + 0.45, def.h * 0.325, 0);
    const sideR = sideL.clone();
    sideR.position.x = def.w * 0.5 - 0.45;
    const back = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.h * 0.65, 0.9), hangarMat);
    back.position.set(0, def.h * 0.325, def.d * 0.5 - 0.45);
    const archRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(def.w * 0.5, def.w * 0.5, def.d + 0.6, 16, 1, false, 0, Math.PI),
      hangarMat
    );
    archRoof.rotation.z = Math.PI / 2;
    archRoof.rotation.y = Math.PI / 2;
    archRoof.scale.set(1, 0.36, 1);
    archRoof.position.y = def.h * 0.65;
    archRoof.castShadow = true;
    const amberStrip = new THREE.Mesh(
      new THREE.BoxGeometry(def.w + 0.4, 0.7, 0.8),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 0.95 })
    );
    amberStrip.position.set(0, def.h * 0.65, -def.d * 0.5);
    for (const part of [sideL, sideR, back, archRoof, amberStrip]) {
      tagRole(part, 'exterior');
      group.add(part);
    }
  } else if (def.style === 'container') {
    const cMat = makeSurfaceMat(palette, { color: def.color, roughness: 0.56, metalness: 0.48 });
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(def.w, 2.7, def.d), cMat);
    bottom.position.y = 1.35;
    bottom.castShadow = true;
    const top = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.96, 2.7, def.d * 0.96), cMat);
    top.position.set(0.3, 4.05, 0);
    top.castShadow = true;
    // Interior pallet cargo crate visible at container door frame
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.3, def.d * 0.82), fm.crateWood);
    doorFrame.position.set(def.w * 0.5 + 0.05, 1.35, 0);
    tagRole(bottom, 'exterior');
    tagRole(top, 'exterior');
    tagRole(doorFrame, 'interior');
    group.add(bottom, top, doorFrame);
  }

  return group;
}

/**
 * Builds a complete fenced residential Backyard attached behind a house/villa:
 * lawn, wooden privacy fence, tiled patio, patio umbrella + dining table, loungers, BBQ grill,
 * garden shrubs, and optional glowing turquoise backyard swimming pool.
 */
export function buildResidentialBackyard(def: StaticBuildingDef): THREE.Group {
  const yard = new THREE.Group();
  const yardW = def.w + 2;
  const yardD = 15;
  // Place backyard cleanly on the south (+Z) side of Southern/Downtown homes, or north (-Z) for ridge villas
  const dirZ = def.district === 'north_ridge' ? -1 : 1;
  yard.position.set(def.x, 0, def.z + dirZ * (def.d * 0.5 + yardD * 0.5 + 0.4));
  yard.name = `backyard_${def.id}`;

  const lawnMat = new THREE.MeshStandardMaterial({ color: '#338a4e', roughness: 0.9 });
  const fenceMat = new THREE.MeshStandardMaterial({ color: '#9c7149', roughness: 0.84 });
  const patioMat = new THREE.MeshStandardMaterial({ color: '#d5cdc0', roughness: 0.72 });
  const poolTileMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.45 });
  const poolWaterMat = new THREE.MeshStandardMaterial({
    color: '#22d3ee',
    emissive: '#0891b2',
    emissiveIntensity: 0.48,
    roughness: 0.1,
    metalness: 0.35,
  });
  const grillMat = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.45, metalness: 0.72 });
  const emberMat = new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#ea580c', emissiveIntensity: 1.2 });
  const umbrellaMat = new THREE.MeshStandardMaterial({
    color: def.accent ?? '#f59e0b',
    roughness: 0.55,
  });
  const bushMat = new THREE.MeshStandardMaterial({ color: '#1f6f3d', roughness: 0.86 });

  // Green backyard lawn
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(yardW, 0.12, yardD), lawnMat);
  lawn.position.y = 0.06;
  lawn.receiveShadow = true;
  yard.add(lawn);

  // Wooden perimeter privacy fence (3 outer sides)
  const fenceH = 1.65;
  const sideFenceGeo = new THREE.BoxGeometry(0.22, fenceH, yardD);
  const fLeft = new THREE.Mesh(sideFenceGeo, fenceMat);
  fLeft.position.set(-yardW * 0.5 + 0.12, fenceH * 0.5, 0);
  const fRight = fLeft.clone();
  fRight.position.x = yardW * 0.5 - 0.12;
  const fBack = new THREE.Mesh(new THREE.BoxGeometry(yardW, fenceH, 0.22), fenceMat);
  fBack.position.set(0, fenceH * 0.5, dirZ * (yardD * 0.5 - 0.12));
  yard.add(fLeft, fRight, fBack);

  // Stone patio deck + table + umbrella + BBQ grill
  const patio = new THREE.Mesh(new THREE.BoxGeometry(yardW * 0.44, 0.18, 6.2), patioMat);
  patio.position.set(-yardW * 0.22, 0.11, -dirZ * 3.0);
  yard.add(patio);

  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.12, 12), patioMat);
  table.position.set(-yardW * 0.22, 0.88, -dirZ * 3.0);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 8), grillMat);
  pole.position.set(-yardW * 0.22, 1.45, -dirZ * 3.0);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.1, 0.72, 8), umbrellaMat);
  canopy.position.set(-yardW * 0.22, 2.75, -dirZ * 3.0);
  yard.add(table, pole, canopy);

  // BBQ Grill station
  const grillBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.95, 0.75), grillMat);
  grillBase.position.set(-yardW * 0.4, 0.58, -dirZ * 4.5);
  const grillGlow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.45), emberMat);
  grillGlow.position.set(-yardW * 0.4, 1.1, -dirZ * 4.5);
  yard.add(grillBase, grillGlow);

  // Swimming pool OR garden gazebo on the right half
  if (def.hasPool) {
    const coping = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.24, 5.8), poolTileMat);
    coping.position.set(yardW * 0.22, 0.12, dirZ * 0.6);
    const water = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.28, 4.6), poolWaterMat);
    water.position.set(yardW * 0.22, 0.14, dirZ * 0.6);
    const lounger = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.82), poolTileMat);
    lounger.position.set(yardW * 0.22, 0.26, -dirZ * 3.8);
    yard.add(coping, water, lounger);
  } else {
    const planter = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.45, 3.2), patioMat);
    planter.position.set(yardW * 0.22, 0.24, dirZ * 1.0);
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 2.6), bushMat);
    hedge.position.set(yardW * 0.22, 0.85, dirZ * 1.0);
    yard.add(planter, hedge);
  }

  // Corner backyard shrubs
  for (const bx of [-yardW * 0.42, yardW * 0.42]) {
    const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 0), bushMat);
    shrub.position.set(bx, 0.9, dirZ * (yardD * 0.36));
    yard.add(shrub);
  }

  return yard;
}

/**
 * Multi-part composite 3D Commercial Passenger / Cargo Airliner for Coastline International Airport.
 */
export function buildPassengerAirliner(accentColor = '#0284c7', scale = 1.0): THREE.Group {
  const jet = new THREE.Group();
  jet.name = 'solara_airliner';

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.26, metalness: 0.35 });
  const liveryMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.32, metalness: 0.38 });
  const wingMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.34, metalness: 0.55 });
  const cockpitMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.12, metalness: 0.85 });
  const engineMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.38, metalness: 0.72 });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.9 });
  const navGlowMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#38bdf8',
    emissiveIntensity: 1.5,
  });

  // Main cylindrical fuselage
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 24, 14), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.set(0, 3.6, 0);
  fuselage.castShadow = true;

  // Tapered nose cone & tail cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.9, 5.2, 14), bodyMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 3.6, -14.6);

  const cockpitVisor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.78, 1.8), cockpitMat);
  cockpitVisor.position.set(0, 4.3, -12.6);

  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(1.9, 6.4, 14), liveryMat);
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.set(0, 3.6, 15.2);

  // Swept main wings + winglets
  const wings = new THREE.Mesh(new THREE.BoxGeometry(28, 0.45, 5.2), wingMat);
  wings.position.set(0, 3.1, -0.8);
  wings.castShadow = true;

  for (const side of [-1, 1]) {
    const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.2, 1.8), liveryMat);
    winglet.position.set(side * 14.0, 4.1, 0.2);
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.85, 3.6, 12), engineMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(side * 5.8, 2.1, -2.2);
    const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), navGlowMat);
    navLight.position.set(side * 14.1, 3.2, -1.8);
    jet.add(winglet, pod, navLight);
  }

  // Vertical & horizontal tail stabilizers
  const vTail = new THREE.Mesh(new THREE.BoxGeometry(0.55, 6.2, 4.4), liveryMat);
  vTail.position.set(0, 7.2, 12.8);
  const hTail = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.35, 2.6), wingMat);
  hTail.position.set(0, 4.2, 13.6);

  // Tricycle landing gear struts & wheels grounded at y = 0
  const gearCoords: Array<[number, number]> = [
    [0, -10.5],
    [-3.2, 1.0],
    [3.2, 1.0],
  ];
  for (const [gx, gz] of gearCoords) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 2.0, 8), engineMat);
    strut.position.set(gx, 1.4, gz);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.45, 10), tireMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(gx, 0.55, gz);
    jet.add(strut, wheel);
  }

  jet.add(fuselage, nose, cockpitVisor, tailCone, wings, vTail, hTail);
  jet.scale.setScalar(scale);
  return jet;
}

/**
 * Multi-part Air Traffic Control Tower with glazed cab, interior radar consoles & rotating radar dish.
 */
export function buildAtcControlTower(palette: ArchitecturalMaterialPalette): {
  group: THREE.Group;
  radarDish: THREE.Group;
} {
  const tower = new THREE.Group();
  tower.name = 'airport_atc_tower';

  const concreteMat = makeSurfaceMat(palette, { color: '#dbe2ea', roughness: 0.62 });
  const accentMat = makeSurfaceMat(palette, { color: '#1e3a5f', roughness: 0.42, metalness: 0.45 });
  const consoleMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 });
  const radarScreenMat = palette.interiorLightMats[2];

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 10), concreteMat);
  plinth.position.y = 2.25;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 4.4, 24, 10), concreteMat);
  shaft.position.y = 14.5;
  shaft.castShadow = true;

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 4.2, 2.2, 10), accentMat);
  deck.position.y = 26.8;

  // Interior radar console ring visible inside 360-degree ATC cab
  const consoleRing = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.0, 1.3, 10), consoleMat);
  consoleRing.position.y = 28.6;
  tagRole(consoleRing, 'interior');
  const screenBand = new THREE.Mesh(new THREE.CylinderGeometry(4.05, 4.05, 0.6, 10), radarScreenMat);
  screenBand.position.y = 29.4;
  tagRole(screenBand, 'interior');

  // 360-degree sloped glass cab
  const cabGlass = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 5.2, 4.6, 10), palette.windowGlassMat);
  cabGlass.position.y = 30.1;

  const cabRoof = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 6.5, 1.4, 10), concreteMat);
  cabRoof.position.y = 33.0;

  // Rotating rooftop radar assembly
  const radarDish = new THREE.Group();
  radarDish.position.y = 35.2;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 3.0, 8), accentMat);
  mast.position.y = 0;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.72, 0.42), accentMat);
  bar.position.y = 1.6;
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 8, 8),
    new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 2.2 })
  );
  beacon.position.y = 2.6;
  radarDish.add(mast, bar, beacon);

  tower.add(plinth, shaft, deck, consoleRing, screenBand, cabGlass, cabRoof, radarDish);
  return { group: tower, radarDish };
}

/**
 * Multi-part 3D Panamax Cargo Container Ship berthed at Ironport Shipment Port.
 */
export function buildPanamaxContainerShip(): THREE.Group {
  const ship = new THREE.Group();
  ship.name = 'mv_solara_star_cargo_ship';

  const hullLowerMat = new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.68, metalness: 0.28 });
  const hullUpperMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.55, metalness: 0.38 });
  const bridgeMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.42 });
  const winMat = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    emissive: '#fbbf24',
    emissiveIntensity: 1.1,
    roughness: 0.25,
  });

  // Tapered multi-tier vessel hull
  const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(20, 4.2, 82), hullLowerMat);
  lowerHull.position.y = 2.1;
  const upperHull = new THREE.Mesh(new THREE.BoxGeometry(21, 5.2, 80), hullUpperMat);
  upperHull.position.y = 6.8;
  upperHull.castShadow = true;

  // Tapered bow prow (+Z)
  const bow = new THREE.Mesh(new THREE.ConeGeometry(14.5, 16, 4), hullUpperMat);
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.scale.set(1, 1, 0.45);
  bow.position.set(0, 6.2, -47);

  // Rear 5-tier white bridge superstructure + illuminated bridge windows + funnel stack
  const bridgeBase = new THREE.Mesh(new THREE.BoxGeometry(17.5, 13.5, 14), bridgeMat);
  bridgeBase.position.set(0, 16.0, 29);
  bridgeBase.castShadow = true;
  const bridgeWing = new THREE.Mesh(new THREE.BoxGeometry(23, 2.8, 5.2), bridgeMat);
  bridgeWing.position.set(0, 21.5, 25);
  const bridgeWin = new THREE.Mesh(new THREE.BoxGeometry(19, 1.4, 5.4), winMat);
  bridgeWin.position.set(0, 21.5, 25);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.6, 7.5, 10), hullLowerMat);
  funnel.position.set(0, 25.0, 33);

  ship.add(lowerHull, upperHull, bow, bridgeBase, bridgeWing, bridgeWin, funnel);

  // Colorful stacked shipping containers on main cargo deck
  const containerColors = ['#dc2626', '#0284c7', '#d97706', '#059669', '#2563eb', '#ea580c'];
  const cGeo = new THREE.BoxGeometry(4.4, 2.7, 11.2);
  let idx = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = -1; col <= 1; col++) {
      const stackH = 2 + ((row + Math.abs(col)) % 2);
      for (let tier = 0; tier < stackH; tier++) {
        const cMesh = new THREE.Mesh(
          cGeo,
          new THREE.MeshStandardMaterial({
            color: containerColors[idx % containerColors.length],
            roughness: 0.58,
            metalness: 0.42,
          })
        );
        cMesh.position.set(col * 5.2, 10.75 + tier * 2.75, -28 + row * 13);
        ship.add(cMesh);
        idx++;
      }
    }
  }

  return ship;
}

/**
 * 3D Digital Social Media Billboard ("@SolaraPulse") placed in key Solara Bay plazas.
 */
export function buildSocialMediaBillboard(
  palette: ArchitecturalMaterialPalette,
  accentHex = '#ec4899'
): THREE.Group {
  const board = new THREE.Group();
  board.name = 'solarapulse_social_billboard';

  const steelMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.42, metalness: 0.68 });
  const frameMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.15,
    roughness: 0.3,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    ...(palette.socialBillboardMap
      ? { map: palette.socialBillboardMap, emissiveMap: palette.socialBillboardMap }
      : {}),
    color: palette.socialBillboardMap ? '#ffffff' : '#1e1b4b',
    emissive: palette.socialBillboardMap ? '#f8fafc' : accentHex,
    emissiveIntensity: palette.socialBillboardMap ? 0.95 : 0.85,
    roughness: 0.22,
  });

  const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 2.6), steelMat);
  basePlinth.position.y = 0.6;
  const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 10.5, 10), steelMat);
  pylon.position.y = 5.6;
  const casing = new THREE.Mesh(new THREE.BoxGeometry(11.6, 5.8, 1.1), steelMat);
  casing.position.y = 12.2;
  const neonTrim = new THREE.Mesh(new THREE.BoxGeometry(12.0, 6.2, 0.75), frameMat);
  neonTrim.position.y = 12.2;
  const screenFront = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 5.0), screenMat);
  screenFront.position.set(0, 12.2, 0.58);
  const screenBack = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 5.0), screenMat);
  screenBack.rotation.y = Math.PI;
  screenBack.position.set(0, 12.2, -0.58);

  board.add(basePlinth, pylon, casing, neonTrim, screenFront, screenBack);
  return board;
}
