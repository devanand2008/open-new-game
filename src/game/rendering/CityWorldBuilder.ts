import * as THREE from 'three';
import {
  CANAL_HALF_WIDTH,
  CANAL_X,
  CITY_BUILDINGS,
  INTERACTABLES,
  MAJOR_X_ROADS,
  MAJOR_Z_ROADS,
  ROAD_WIDTH,
} from '../world/WorldConfig';
import type { SolaraTextureSet } from './ProceduralTextures';
import {
  buildArchitecturalBuilding,
  buildAtcControlTower,
  buildPanamaxContainerShip,
  buildPassengerAirliner,
  buildResidentialBackyard,
  buildSocialMediaBillboard,
  createArchitecturalPalette,
} from './BuildingArchitect';

export interface SkyDomeUniforms {
  [uniform: string]: THREE.IUniform<unknown>;
  uZenithColor: THREE.IUniform<THREE.Color>;
  uHorizonColor: THREE.IUniform<THREE.Color>;
  uSunGlowColor: THREE.IUniform<THREE.Color>;
  uSunDir: THREE.IUniform<THREE.Vector3>;
  uCloudCover: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
}

export interface WeatherSurfaceEntry {
  mat: THREE.MeshStandardMaterial;
  baseColor: THREE.Color;
  wetRoughnessMap?: THREE.Texture;
}

export interface DynamicCityProps {
  skyDomeMesh: THREE.Mesh;
  skyUniforms: SkyDomeUniforms;
  ferrisWheelGroup: THREE.Group;
  oceanMesh: THREE.Mesh;
  oceanGeo: THREE.PlaneGeometry;
  oceanMaterial: THREE.MeshStandardMaterial;
  surfFoamMesh: THREE.Mesh;
  fountainWaterMesh: THREE.Mesh;
  streetLightBulbsMat: THREE.MeshStandardMaterial;
  neonNightMat: THREE.MeshStandardMaterial;
  glassBuildingMat: THREE.MeshStandardMaterial;
  interiorLightMats: THREE.MeshStandardMaterial[];
  buildingSurfaceMats: THREE.MeshStandardMaterial[];
  airportRadarDish: THREE.Group;
  roadMaterials: WeatherSurfaceEntry[];
  sidewalkMaterials: WeatherSurfaceEntry[];
  glassMaterials: THREE.MeshStandardMaterial[];
  trafficLightsNS: THREE.MeshStandardMaterial[];
  trafficLightsEW: THREE.MeshStandardMaterial[];
  beaconRings: Map<string, THREE.Group>;
  missionBeacon: THREE.Group;
}

const SKY_VERTEX_SHADER = `
varying vec3 vWorldDir;
void main() {
  vWorldDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAGMENT_SHADER = `
uniform vec3 uZenithColor;
uniform vec3 uHorizonColor;
uniform vec3 uSunGlowColor;
uniform vec3 uSunDir;
uniform float uCloudCover;
uniform float uTime;
varying vec3 vWorldDir;

float cloudWave(vec2 p) {
  float a = sin(p.x * 1.4 + uTime * 0.035) * cos(p.y * 1.2 - uTime * 0.024);
  float b = sin(p.x * 2.9 - p.y * 2.1 + uTime * 0.05) * 0.5;
  float c = cos(p.x * 5.2 + p.y * 4.4 - uTime * 0.065) * 0.25;
  return (a + b + c) * 0.5 + 0.5;
}

void main() {
  vec3 dir = normalize(vWorldDir);
  float h = clamp(dir.y, 0.0, 1.0);

  // Smooth Rayleigh-inspired zenith-to-horizon tropical sky gradient
  float gradT = pow(h, 0.52);
  vec3 col = mix(uHorizonColor, uZenithColor, gradT);

  // Warm solar atmospheric glow & soft sun disc
  float sunAmt = max(dot(dir, normalize(uSunDir)), 0.0);
  float sunHalo = pow(sunAmt, 6.0) * (0.48 * (1.0 - uCloudCover * 0.55));
  float sunDisc = smoothstep(0.9965, 0.9992, sunAmt) * (1.0 - uCloudCover * 0.82);
  col += uSunGlowColor * (sunHalo + sunDisc * 1.35);

  // Drifting procedural cloud deck projected onto upper hemisphere
  if (dir.y > 0.025) {
    vec2 cloudUV = dir.xz / (dir.y + 0.22);
    float n = cloudWave(cloudUV * 1.35);
    float threshold = mix(0.74, 0.28, uCloudCover);
    float cloudMask = smoothstep(threshold, threshold + 0.24, n);
    float horizonFade = smoothstep(0.025, 0.22, dir.y);
    vec3 cloudLit = mix(uHorizonColor * 1.12, uSunGlowColor * 1.08, pow(sunAmt, 2.0) * 0.45);
    vec3 cloudDark = mix(uZenithColor * 0.82, uHorizonColor * 0.86, 0.5);
    vec3 cloudCol = mix(cloudLit, cloudDark, uCloudCover * 0.62);
    col = mix(col, cloudCol, cloudMask * horizonFade * (0.28 + uCloudCover * 0.62));
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Builds the upgraded Solara Bay 3D tropical coastal metropolis:
 * - Procedural atmospheric shader SkyDome with drifting clouds & solar halo
 * - Weather-reactive PBR asphalt (with puddle roughness map), limestone sidewalks, curtain-wall glass & ocean
 * - Detailed Central Park (3-tier marble fountain, benches, wrought-iron lamps, tropical flower beds)
 * - Palm Beach (boardwalk edge, striped beach umbrellas, lounge cabanas, coastal lifeguard tower, surf foam)
 * - Marina Crescent (Art-Deco neon arches, luxury yachts), Ironport Docks (gantry cranes, floodlight towers, hazard stripes)
 */
export function buildSolaraWorld(
  scene: THREE.Scene,
  textures: SolaraTextureSet
): DynamicCityProps {
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const roadMaterials: WeatherSurfaceEntry[] = [];
  const sidewalkMaterials: WeatherSurfaceEntry[] = [];
  const glassMaterials: THREE.MeshStandardMaterial[] = [];

  // =========================================================================
  // 0. PROCEDURAL ATMOSPHERIC SKY DOME
  // =========================================================================
  const skyUniforms: SkyDomeUniforms = {
    uZenithColor: { value: new THREE.Color('#24437a') },
    uHorizonColor: { value: new THREE.Color('#e58c5a') },
    uSunGlowColor: { value: new THREE.Color('#ffd280') },
    uSunDir: { value: new THREE.Vector3(-0.65, 0.35, 0.55).normalize() },
    uCloudCover: { value: 0.24 },
    uTime: { value: 0 },
  };
  const skyGeo = new THREE.SphereGeometry(920, 28, 16);
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyDomeMesh = new THREE.Mesh(skyGeo, skyMat);
  skyDomeMesh.frustumCulled = false;
  scene.add(skyDomeMesh);

  // =========================================================================
  // 1. OCEAN, SURF FOAM, CANAL, BEACH SAND & URBAN GROUND (strict Y >= 0.025)
  // =========================================================================
  const oceanGeo = new THREE.PlaneGeometry(2800, 2800, 28, 28);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMaterial = new THREE.MeshStandardMaterial({
    color: '#0e7490',
    roughness: 0.18,
    metalness: 0.68,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMaterial);
  oceanMesh.position.y = -1.35;
  oceanMesh.receiveShadow = true;
  worldGroup.add(oceanMesh);

  // Shoreline translucent white surf foam strip along Palm Beach
  const surfMat = new THREE.MeshBasicMaterial({
    color: '#e0f7ff',
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const surfGeo = new THREE.PlaneGeometry(7.5, 540);
  surfGeo.rotateX(-Math.PI / 2);
  const surfFoamMesh = new THREE.Mesh(surfGeo, surfMat);
  surfFoamMesh.position.set(-294, -1.16, 48);
  worldGroup.add(surfFoamMesh);

  // Main urban coastal limestone ground slabs (split around Central Canal at x = 152)
  const concreteMat = new THREE.MeshStandardMaterial({
    map: textures.sidewalk,
    color: '#d8d3c8',
    roughness: 0.88,
    metalness: 0.02,
  });
  sidewalkMaterials.push({ mat: concreteMat, baseColor: concreteMat.color.clone() });

  const westGround = new THREE.Mesh(new THREE.BoxGeometry(372, 1.5, 540), concreteMat);
  westGround.position.set(-46, -0.75, 48);
  westGround.receiveShadow = true;
  worldGroup.add(westGround);

  const eastGround = new THREE.Mesh(new THREE.BoxGeometry(274, 1.5, 560), concreteMat);
  eastGround.position.set(301, -0.75, 16);
  eastGround.receiveShadow = true;
  worldGroup.add(eastGround);

  // Canal seawall embankments + safety bollards
  const seawallMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.82 });
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 480), seawallMat);
    wall.position.set(CANAL_X + side * CANAL_HALF_WIDTH, -0.8, 45);
    worldGroup.add(wall);
  }

  // Ironport Shipment Port Yellow/Black Wharf Hazard Curb Strip (east deep-water berth edge)
  const hazardMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.65 });
  const dockTrim = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 340), hazardMat);
  dockTrim.position.set(392, 0.12, 35);
  worldGroup.add(dockTrim);

  // Cypress Wetlands Marsh Islands & Wooden Boardwalk Causeway (north-east eco zone)
  const wetlandGrassMat = new THREE.MeshStandardMaterial({ color: '#1f6454', roughness: 0.92 });
  const wetlandPad = new THREE.Mesh(new THREE.BoxGeometry(240, 0.5, 130), wetlandGrassMat);
  wetlandPad.position.set(295, -0.55, -318);
  worldGroup.add(wetlandPad);
  const causewayWoodMat = new THREE.MeshStandardMaterial({ color: '#8a6544', roughness: 0.86 });
  const causeway = new THREE.Mesh(new THREE.BoxGeometry(190, 0.28, 6.5), causewayWoodMat);
  causeway.position.set(290, 0.14, -310);
  worldGroup.add(causeway);

  // Palm Beach Golden Sand Slope + Wooden Boardwalk Promenade Edge
  const sandMat = new THREE.MeshStandardMaterial({
    map: textures.sand,
    color: '#ffffff',
    roughness: 0.94,
    metalness: 0.0,
  });
  const beachGeo = new THREE.PlaneGeometry(78, 560, 8, 2);
  beachGeo.rotateX(-Math.PI / 2);
  const posAttr = beachGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const localX = posAttr.getX(i);
    const t = Math.max(0, Math.min(1, (39 - localX) / 78));
    posAttr.setY(i, -t * 1.65);
  }
  beachGeo.computeVertexNormals();
  const beachMesh = new THREE.Mesh(beachGeo, sandMat);
  beachMesh.position.set(-270, 0.01, 48);
  beachMesh.receiveShadow = true;
  worldGroup.add(beachMesh);

  // Palm Beach Wooden Boardwalk Rim along x = -233
  const boardwalkMat = new THREE.MeshStandardMaterial({ color: '#a87d56', roughness: 0.84 });
  const boardwalk = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.16, 460), boardwalkMat);
  boardwalk.position.set(-233.5, 0.08, 42);
  boardwalk.receiveShadow = true;
  worldGroup.add(boardwalk);

  // Palm Beach Lifeguard Tower on Stilts + Striped Umbrellas & Lounge Cabanas
  const whiteStuccoMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.55 });
  const coralMat = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.5 });
  const tealUmbrellaMat = new THREE.MeshStandardMaterial({ color: '#06b6d4', roughness: 0.55 });
  const pinkUmbrellaMat = new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.55 });
  const amberUmbrellaMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.55 });
  const poleMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.65, roughness: 0.35 });

  // Lifeguard Tower (-264, -36)
  const lgTower = new THREE.Group();
  lgTower.position.set(-264, -0.58, -36);
  for (const sx of [-1.4, 1.4]) {
    for (const sz of [-1.4, 1.4]) {
      const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 3.6, 8), boardwalkMat);
      stilt.position.set(sx, 1.6, sz);
      lgTower.add(stilt);
    }
  }
  const lgDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.28, 4.2), boardwalkMat);
  lgDeck.position.y = 3.3;
  const lgCab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.3, 3.0), whiteStuccoMat);
  lgCab.position.y = 4.6;
  lgCab.castShadow = true;
  const lgRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.3, 4), coralMat);
  lgRoof.rotation.y = Math.PI / 4;
  lgRoof.position.y = 6.35;
  lgTower.add(lgDeck, lgCab, lgRoof);
  worldGroup.add(lgTower);

  // Colorful Beach Umbrellas & Lounge Chairs along Palm Beach
  const umbrellaMats = [tealUmbrellaMat, coralMat, pinkUmbrellaMat, amberUmbrellaMat];
  const umbrellaCoords: Array<[number, number]> = [
    [-254, -90], [-258, -64], [-256, -8], [-255, 52], [-257, 86], [-254, 124], [-258, 162],
  ];
  umbrellaCoords.forEach(([ux, uz], idx) => {
    const uGroup = new THREE.Group();
    uGroup.position.set(ux, -0.42, uz);
    const uPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), poleMat);
    uPole.position.y = 1.4;
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.3, 0.85, 8), umbrellaMats[idx % umbrellaMats.length]);
    canopy.position.y = 2.75;
    canopy.castShadow = true;
    const lounger = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.22, 0.85), whiteStuccoMat);
    lounger.position.set(0.6, 0.25, 1.35);
    uGroup.add(uPole, canopy, lounger);
    worldGroup.add(uGroup);
  });

  // -------------------------------------------------------------------------
  // CENTRAL PARK: Lush Lawn, Walkways, 3-Tier Sculpted Fountain, Benches, Flower Beds & Lamps
  // -------------------------------------------------------------------------
  const grassMat = new THREE.MeshStandardMaterial({ color: '#2b7a47', roughness: 0.9 });
  const parkLawn = new THREE.Mesh(new THREE.BoxGeometry(50, 0.14, 50), grassMat);
  parkLawn.position.set(0, 0.07, 40);
  parkLawn.receiveShadow = true;
  worldGroup.add(parkLawn);

  const pathMat = new THREE.MeshStandardMaterial({ color: '#b5ab99', roughness: 0.86 });
  sidewalkMaterials.push({ mat: pathMat, baseColor: pathMat.color.clone() });
  const pathNS = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.17, 50), pathMat);
  pathNS.position.set(0, 0.085, 40);
  const pathEW = new THREE.Mesh(new THREE.BoxGeometry(50, 0.17, 4.8), pathMat);
  pathEW.position.set(0, 0.085, 40);
  worldGroup.add(pathNS, pathEW);

  // Streetlight & emissive bulb materials (created early so park lamps share dynamic night/storm glow)
  const streetLightBulbsMat = new THREE.MeshStandardMaterial({
    color: '#fef3c7',
    emissive: '#f59e0b',
    emissiveIntensity: 0.45,
  });

  // 3-Tier Sculpted Marble Central Park Fountain
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#c4beb2', roughness: 0.68 });
  const waterPoolMat = new THREE.MeshStandardMaterial({
    color: '#22d3ee',
    emissive: '#0891b2',
    emissiveIntensity: 0.28,
    roughness: 0.08,
    metalness: 0.48,
  });
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0, 0.17, 40);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 7.2, 0.92, 24), stoneMat);
  basin.position.y = 0.46;
  const basinRim = new THREE.Mesh(new THREE.TorusGeometry(6.6, 0.24, 8, 24), stoneMat);
  basinRim.rotation.x = Math.PI / 2;
  basinRim.position.y = 0.92;
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(6.1, 6.1, 0.78, 24), waterPoolMat);
  pool.position.y = 0.5;
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.45, 4.4, 14), stoneMat);
  spire.position.y = 2.2;
  const bowlLower = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 0.9, 0.55, 18), stoneMat);
  bowlLower.position.y = 2.55;
  const bowlUpper = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.45, 0.45, 16), stoneMat);
  bowlUpper.position.y = 3.9;
  const fountainWaterMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 2.2, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: '#a5f3fc',
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  fountainWaterMesh.position.y = 4.65;
  fountainGroup.add(basin, basinRim, pool, spire, bowlLower, bowlUpper, fountainWaterMesh);
  worldGroup.add(fountainGroup);

  // Central Park Benches, Vintage Wrought-Iron Lamps & Tropical Bougainvillea Flower Beds
  const benchWoodMat = new THREE.MeshStandardMaterial({ color: '#7c4d2b', roughness: 0.82 });
  const flowerBeds: Array<[number, number, string]> = [
    [-11, 29, '#ec4899'],
    [11, 29, '#f59e0b'],
    [-11, 51, '#a855f7'],
    [11, 51, '#f43f5e'],
  ];
  for (const [fx, fz, fCol] of flowerBeds) {
    const planter = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.42, 3.2), stoneMat);
    planter.position.set(fx, 0.34, fz);
    const blooms = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.36, 2.6),
      new THREE.MeshStandardMaterial({ color: fCol, roughness: 0.85 })
    );
    blooms.position.set(fx, 0.62, fz);
    worldGroup.add(planter, blooms);

    // Park bench facing fountain
    const bench = new THREE.Group();
    bench.position.set(fx * 0.85, 0.18, fz > 40 ? 48.2 : 31.8);
    bench.rotation.y = fz > 40 ? Math.PI : 0;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.68), benchWoodMat);
    seat.position.y = 0.48;
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.52, 0.12), benchWoodMat);
    back.position.set(0, 0.78, -0.28);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.62), poleMat);
    legL.position.set(-1.0, 0.24, 0);
    const legR = legL.clone();
    legR.position.x = 1.0;
    bench.add(seat, back, legL, legR);
    worldGroup.add(bench);

    // Vintage park globe lamp post
    const lampPost = new THREE.Group();
    lampPost.position.set(fx * 1.45, 0.14, fz);
    const lPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.9, 8), poleMat);
    lPole.position.y = 1.95;
    const lGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), streetLightBulbsMat);
    lGlobe.position.y = 4.05;
    lampPost.add(lPole, lGlobe);
    worldGroup.add(lampPost);
  }

  // Southern Borough Basketball Court
  const courtMat = new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.82 });
  const court = new THREE.Mesh(new THREE.BoxGeometry(24, 0.12, 16), courtMat);
  court.position.set(4, 0.07, 250);
  worldGroup.add(court);
  const hoopPostMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.6, roughness: 0.4 });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.8, 8), hoopPostMat);
    post.position.set(4 + side * 11, 1.9, 250);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 1.8), hoopPostMat);
    board.position.set(4 + side * 10.4, 3.4, 250);
    worldGroup.add(post, board);
  }

  // =========================================================================
  // 2. LAYERED NORTH RIDGE MOUNTAINS & AIRPORT HORIZON SILHOUETTES
  // =========================================================================
  const mountainMat = new THREE.MeshStandardMaterial({ color: '#2b5e3f', roughness: 0.94 });
  const ridgeFarMat = new THREE.MeshStandardMaterial({ color: '#395b64', roughness: 0.92 });
  const rockMat = new THREE.MeshStandardMaterial({ color: '#58677a', roughness: 0.88 });
  const ridges: Array<[number, number, number, number, boolean]> = [
    [-220, -320, 125, 82, false],
    [-90, -345, 152, 104, false],
    [40, -335, 134, 88, false],
    [160, -355, 130, 68, false],
    [-310, -295, 102, 58, false],
    // Secondary distant alpine peaks for dramatic depth
    [-160, -420, 180, 132, true],
    [15, -430, 195, 145, true],
    [185, -430, 170, 112, true],
  ];
  for (const [mx, mz, rad, h, isFar] of ridges) {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 8), isFar ? ridgeFarMat : mountainMat);
    peak.position.set(mx, h * 0.45 - 2, mz);
    peak.rotation.y = (mx * 0.03) % Math.PI;
    worldGroup.add(peak);
  }
  // North Ridge Telecom Tower landmark on central peak
  const telecomMast = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 2.2, 46, 8), rockMat);
  telecomMast.position.set(-90, 68, -345);
  const telecomBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 8, 8),
    new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 2.0 })
  );
  telecomBeacon.position.set(-90, 91, -345);
  worldGroup.add(telecomMast, telecomBeacon);

  // =========================================================================
  // 2B. COASTLINE INTERNATIONAL AIRPORT (Runway 09/27, Taxiways, Lights, Airliners)
  // =========================================================================
  const apronMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.84, metalness: 0.06 });
  const apron = new THREE.Mesh(new THREE.BoxGeometry(235, 0.18, 128), apronMat);
  apron.position.set(308, 0.04, -172);
  apron.receiveShadow = true;
  worldGroup.add(apron);

  const runwayMat = new THREE.MeshStandardMaterial({
    map: textures.runway,
    color: '#ffffff',
    roughness: 0.82,
    metalness: 0.06,
  });
  roadMaterials.push({ mat: runwayMat, baseColor: runwayMat.color.clone() });
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(220, 28), runwayMat);
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(312, 0.16, -206);
  runway.receiveShadow = true;
  worldGroup.add(runway);

  // Runway edge approach lights (glowing amber/cyan beacons)
  const rwEdgeLightMat = new THREE.MeshStandardMaterial({
    color: '#bae6fd',
    emissive: '#38bdf8',
    emissiveIntensity: 1.5,
  });
  for (let lx = 208; lx <= 416; lx += 26) {
    for (const lz of [-221, -191]) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), rwEdgeLightMat);
      bulb.position.set(lx, 0.42, lz);
      worldGroup.add(bulb);
    }
  }

  // Commercial Solara Air Passenger Jetliner parked at Terminal Gate 1 & Cargo Freighter at Cargo Apron
  const passengerJet = buildPassengerAirliner('#0284c7', 1.0);
  passengerJet.position.set(248, 0.14, -158);
  passengerJet.rotation.y = Math.PI * 0.5;
  worldGroup.add(passengerJet);

  const cargoJet = buildPassengerAirliner('#f97316', 0.88);
  cargoJet.position.set(336, 0.14, -158);
  cargoJet.rotation.y = Math.PI * 0.5;
  worldGroup.add(cargoJet);

  // =========================================================================
  // 3. WEATHER-REACTIVE ROAD NETWORK, BRIDGES & TRAFFIC SIGNALS
  // =========================================================================
  const roadMatNS = new THREE.MeshStandardMaterial({
    map: textures.asphalt,
    bumpMap: textures.asphaltBump,
    bumpScale: 0.035,
    color: '#ffffff',
    roughness: 0.86,
    metalness: 0.05,
  });
  roadMaterials.push({
    mat: roadMatNS,
    baseColor: roadMatNS.color.clone(),
    wetRoughnessMap: textures.roadRoughness,
  });

  for (const rx of MAJOR_X_ROADS) {
    const roadLen = rx === 210 ? 350 : 440;
    const roadCenterZ = rx === 210 ? 25 : 40;
    const texClone = textures.asphalt.clone();
    texClone.needsUpdate = true;
    texClone.repeat.set(1, roadLen / 18);
    const roughClone = textures.roadRoughness.clone();
    roughClone.needsUpdate = true;
    roughClone.repeat.set(1, roadLen / 22);

    const mat = new THREE.MeshStandardMaterial({
      map: texClone,
      bumpMap: textures.asphaltBump,
      bumpScale: 0.03,
      color: '#ffffff',
      roughness: 0.86,
      metalness: 0.05,
    });
    roadMaterials.push({
      mat,
      baseColor: mat.color.clone(),
      wetRoughnessMap: roughClone,
    });

    const strip = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, roadLen), mat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(rx, 0.035, roadCenterZ);
    strip.receiveShadow = true;
    worldGroup.add(strip);
  }

  const bridgeZs = new Set([-160, -80, 0, 160]);
  for (const rz of MAJOR_Z_ROADS) {
    const westLen = 356;
    const texW = textures.asphalt.clone();
    texW.needsUpdate = true;
    texW.repeat.set(1, westLen / 18);
    const roughW = textures.roadRoughness.clone();
    roughW.needsUpdate = true;
    roughW.repeat.set(1, westLen / 22);

    const matW = new THREE.MeshStandardMaterial({
      map: texW,
      color: '#ffffff',
      roughness: 0.86,
      metalness: 0.05,
    });
    roadMaterials.push({
      mat: matW,
      baseColor: matW.color.clone(),
      wetRoughnessMap: roughW,
    });

    const stripW = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, westLen), matW);
    stripW.rotation.x = -Math.PI / 2;
    stripW.rotation.z = Math.PI / 2;
    stripW.position.set(-40, 0.05, rz);
    stripW.receiveShadow = true;
    worldGroup.add(stripW);

    if (rz >= -160 && rz <= 160) {
      const eastLen = rz === -160 ? 150 : 148;
      const stripE = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, eastLen), roadMatNS);
      stripE.rotation.x = -Math.PI / 2;
      stripE.rotation.z = Math.PI / 2;
      stripE.position.set(240, 0.05, rz);
      stripE.receiveShadow = true;
      worldGroup.add(stripE);
    }

    if (bridgeZs.has(rz)) {
      const bridgeGroup = new THREE.Group();
      bridgeGroup.position.set(CANAL_X, 0, rz);

      const deckGeo = new THREE.BoxGeometry(38, 0.8, ROAD_WIDTH + 2, 16, 1, 1);
      const dPos = deckGeo.attributes.position;
      for (let i = 0; i < dPos.count; i++) {
        const bx = dPos.getX(i);
        const t = Math.max(0, 1 - Math.abs(bx) / 20);
        dPos.setY(i, dPos.getY(i) + Math.sin(t * Math.PI * 0.5) * 1.8);
      }
      deckGeo.computeVertexNormals();
      const deckMat = new THREE.MeshStandardMaterial({
        color: '#2e3848',
        roughness: 0.82,
        metalness: 0.08,
      });
      roadMaterials.push({
        mat: deckMat,
        baseColor: deckMat.color.clone(),
        wetRoughnessMap: textures.roadRoughness,
      });

      const deck = new THREE.Mesh(deckGeo, deckMat);
      deck.position.y = -0.32;
      deck.receiveShadow = true;
      bridgeGroup.add(deck);

      const archMat = new THREE.MeshStandardMaterial({ color: '#d8dee9', roughness: 0.48, metalness: 0.42 });
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(36, 1.15, 0.45), archMat);
        rail.position.set(0, 1.45, side * (ROAD_WIDTH * 0.5 + 0.6));
        bridgeGroup.add(rail);
      }
      worldGroup.add(bridgeGroup);
    }
  }

  // Intersection dark asphalt squares (strictly separated Y = 0.072, preserving dark charcoal color)
  const interMat = new THREE.MeshStandardMaterial({
    color: '#252b35',
    roughness: 0.86,
    metalness: 0.05,
  });
  roadMaterials.push({
    mat: interMat,
    baseColor: interMat.color.clone(),
    wetRoughnessMap: textures.roadRoughness,
  });
  const interGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 0.4, ROAD_WIDTH + 0.4);
  interGeo.rotateX(-Math.PI / 2);

  const trafficLightsNS: THREE.MeshStandardMaterial[] = [];
  const trafficLightsEW: THREE.MeshStandardMaterial[] = [];

  const nsSigMat = new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 1.5 });
  const ewSigMat = new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 1.5 });
  trafficLightsNS.push(nsSigMat);
  trafficLightsEW.push(ewSigMat);

  for (const rx of MAJOR_X_ROADS) {
    for (const rz of MAJOR_Z_ROADS) {
      if (rx === 210 && (rz < -80 || rz > 160)) continue;
      const patch = new THREE.Mesh(interGeo, interMat);
      patch.position.set(rx, 0.072, rz);
      patch.receiveShadow = true;
      worldGroup.add(patch);

      if (Math.abs(rx) <= 130 && Math.abs(rz) <= 165) {
        const postGroup = new THREE.Group();
        postGroup.position.set(rx + 8.5, 0, rz + 8.5);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6.2, 8), poleMat);
        mast.position.y = 3.1;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 0.14), poleMat);
        arm.position.set(-1.3, 6.0, 0);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.32), streetLightBulbsMat);
        lamp.position.set(-2.3, 5.88, 0);
        const sigBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.95, 0.42), poleMat);
        sigBox.position.set(-0.9, 4.8, 0);
        const sigNS = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), nsSigMat);
        sigNS.position.set(-0.9, 4.8, 0.22);
        const sigEW = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), ewSigMat);
        sigEW.position.set(-1.12, 4.8, 0);
        postGroup.add(mast, arm, lamp, sigBox, sigNS, sigEW);
        worldGroup.add(postGroup);
      }
    }
  }

  // =========================================================================
  // 4. ARCHITECTURALLY UPGRADED CITY BUILDINGS (Interiors, Offices, Rooms & Backyards)
  // =========================================================================
  const glassBuildingMat = new THREE.MeshStandardMaterial({
    map: textures.glassFacade,
    emissiveMap: textures.glassEmissive,
    emissive: new THREE.Color('#ffeed2'),
    emissiveIntensity: 0.42,
    color: '#e2effc',
    roughness: 0.16,
    metalness: 0.72,
  });
  glassMaterials.push(glassBuildingMat);

  const neonNightMat = new THREE.MeshStandardMaterial({
    color: '#e879f9',
    emissive: '#d946ef',
    emissiveIntensity: 1.55,
    roughness: 0.24,
  });

  const archPalette = createArchitecturalPalette(
    glassBuildingMat,
    neonNightMat,
    textures.artDecoFacade,
    textures.socialBillboard
  );

  // Full Air Traffic Control Tower with interior radar console & rotating dish
  const { group: atcTowerGroup, radarDish: airportRadarDish } = buildAtcControlTower(archPalette);
  atcTowerGroup.position.set(292, 0, -118);
  worldGroup.add(atcTowerGroup);

  for (const def of CITY_BUILDINGS) {
    const structure = buildArchitecturalBuilding(def, archPalette);
    worldGroup.add(structure);

    if (def.hasBackyard) {
      const backyard = buildResidentialBackyard(def);
      worldGroup.add(backyard);
    }
  }

  // 3D Digital Social Media Billboards (@SolaraPulse) across major districts
  const billboardCoords: Array<[number, number, number, string]> = [
    [-26, -12, 0.35, '#ec4899'],
    [-224, 42, Math.PI * 0.5, '#f59e0b'],
    [104, 178, -0.45, '#d946ef'],
    [224, -142, 0.25, '#38bdf8'],
  ];
  for (const [bx, bz, rotY, accent] of billboardCoords) {
    const bb = buildSocialMediaBillboard(archPalette, accent);
    bb.position.set(bx, 0, bz);
    bb.rotation.y = rotY;
    worldGroup.add(bb);
  }

  // =========================================================================
  // 5. SIGNATURE LANDMARKS: PIER, FERRIS WHEEL, CRANES, MARINA ARCHES & YACHTS
  // =========================================================================
  const woodMat = new THREE.MeshStandardMaterial({ color: '#9a714c', roughness: 0.86 });
  const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(114, 0.65, 16), woodMat);
  pierDeck.position.set(-289, 1.0, 20);
  pierDeck.receiveShadow = true;
  worldGroup.add(pierDeck);
  for (let px = -245; px >= -335; px -= 18) {
    for (const pz of [13.2, 26.8]) {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 4.8, 8), woodMat);
      piling.position.set(px, -0.9, pz);
      worldGroup.add(piling);
    }
  }

  // Rotating Solara Ferris Wheel at end of Pier (-326, 20)
  const wheelBaseGroup = new THREE.Group();
  wheelBaseGroup.position.set(-326, 1.3, 20);
  const wheelFrameMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35, metalness: 0.6 });
  for (const side of [-1, 1]) {
    const legA = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 22, 8), wheelFrameMat);
    legA.position.set(0, 10.5, side * 3.8);
    legA.rotation.x = side * 0.14;
    wheelBaseGroup.add(legA);
  }
  const ferrisWheelGroup = new THREE.Group();
  ferrisWheelGroup.position.set(0, 20.5, 0);
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    emissive: '#f59e0b',
    emissiveIntensity: 0.9,
    roughness: 0.28,
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(14, 0.45, 10, 28), rimMat);
  rim.rotation.y = Math.PI / 2;
  ferrisWheelGroup.add(rim);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 28, 6), wheelFrameMat);
    spoke.rotation.x = a;
    ferrisWheelGroup.add(spoke);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.6, 1.6),
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? '#22d3ee' : '#e879f9',
        emissive: i % 2 === 0 ? '#0891b2' : '#c026d3',
        emissiveIntensity: 0.55,
      })
    );
    cabin.position.set(0, Math.cos(a) * 14, Math.sin(a) * 14);
    ferrisWheelGroup.add(cabin);
  }
  wheelBaseGroup.add(ferrisWheelGroup);
  worldGroup.add(wheelBaseGroup);

  // Ironport Shipment Port: 3 Red Gantry Cranes + Panamax Container Ship MV Solara Star
  const craneMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.48, metalness: 0.48 });
  for (const cz of [-6, 40, 86]) {
    const crane = new THREE.Group();
    crane.position.set(364, 0, cz);
    for (const dx of [-5, 5]) {
      for (const dz of [-4, 4]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(1.1, 24, 1.1), craneMat);
        leg.position.set(dx, 12, dz);
        crane.add(leg);
      }
    }
    const boom = new THREE.Mesh(new THREE.BoxGeometry(42, 2.2, 2.8), craneMat);
    boom.position.set(10, 24, 0);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 3.6), stoneMat);
    cab.position.set(2, 20.5, 0);
    crane.add(boom, cab);
    worldGroup.add(crane);
  }

  // Panamax Container Freighter moored beside the east deep-water wharf
  const cargoShip = buildPanamaxContainerShip();
  cargoShip.position.set(408, -1.3, 40);
  worldGroup.add(cargoShip);

  // Harbor Floodlight Towers
  for (const fz of [-52, 132]) {
    const fTower = new THREE.Group();
    fTower.position.set(298, 0, fz);
    const fPole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.55, 22, 8), poleMat);
    fPole.position.y = 11;
    const fHead = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 0.8), streetLightBulbsMat);
    fHead.position.y = 22.2;
    fTower.add(fPole, fHead);
    worldGroup.add(fTower);
  }

  // Marina Crescent Neon Art-Deco Promenade Arches
  for (const az of [185, 218]) {
    const archGroup = new THREE.Group();
    archGroup.position.set(118, 0, az);
    const archRing = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.36, 8, 22, Math.PI), neonNightMat);
    archRing.position.y = 0.2;
    archGroup.add(archRing);
    worldGroup.add(archGroup);
  }

  // Marina Crescent Upgraded Moored Luxury Yachts (hull + bow taper + cabin + radar mast)
  const yachtHullMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.22, metalness: 0.25 });
  const yachtDeckMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.35 });
  const yachtPositions: Array<[number, number, number]> = [
    [152, 244, 0.1],
    [138, 294, 0.4],
    [176, 296, -0.2],
    [224, 286, -0.3],
  ];
  for (const [yx, yz, yaw] of yachtPositions) {
    const yGroup = new THREE.Group();
    yGroup.position.set(yx, -0.85, yz);
    yGroup.rotation.y = yaw;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 11.5), yachtHullMat);
    hull.position.y = 0.6;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(2.8, 3.8, 4), yachtHullMat);
    bow.rotation.x = -Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.6, -7.2);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.45, 6.2), yachtDeckMat);
    cabin.position.set(0, 2.0, 0.8);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 3.8, 6), whiteStuccoMat);
    mast.position.set(0, 4.1, 0.4);
    yGroup.add(hull, bow, cabin, mast);
    worldGroup.add(yGroup);
  }

  // =========================================================================
  // 6. INSTANCED TROPICAL PALM TREES
  // =========================================================================
  const palmPositions: Array<[number, number]> = [];
  for (let z = -150; z <= 220; z += 22) {
    palmPositions.push([-226, z]);
    palmPositions.push([-196, z + 10]);
  }
  for (let z = -140; z <= 140; z += 36) {
    palmPositions.push([-52, z]);
    palmPositions.push([52, z]);
  }
  palmPositions.push([-20, 24], [20, 24], [-20, 56], [20, 56]);
  for (let x = -130; x <= 120; x += 34) {
    palmPositions.push([x, 148]);
    palmPositions.push([x, 226]);
  }

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.36, 7.6, 7);
  trunkGeo.translate(0, 3.8, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#7c5c3e', roughness: 0.92 });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palmPositions.length);
  trunkInst.castShadow = true;

  const FRONDS_PER_PALM = 7;
  const frondGeo = new THREE.ConeGeometry(0.92, 4.8, 4);
  frondGeo.scale(1, 1, 0.22);
  frondGeo.rotateX(Math.PI * 0.44);
  frondGeo.translate(0, -0.1, 2.0);
  const frondMat = new THREE.MeshStandardMaterial({ color: '#2f8545', roughness: 0.76 });
  const frondInst = new THREE.InstancedMesh(frondGeo, frondMat, palmPositions.length * FRONDS_PER_PALM);

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  let fIdx = 0;

  palmPositions.forEach(([px, pz], i) => {
    const scale = 0.88 + ((i * 37) % 30) * 0.01;
    const leanX = (((i * 19) % 10) - 5) * 0.025;
    const leanZ = (((i * 29) % 10) - 5) * 0.025;

    dummy.position.set(px, 0, pz);
    dummy.rotation.set(leanX, (i * 1.1) % (Math.PI * 2), leanZ);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    const topY = 7.4 * scale;
    for (let f = 0; f < FRONDS_PER_PALM; f++) {
      dummy.position.set(px + leanZ * 4, topY, pz + leanX * 4);
      dummy.rotation.set(0.24 + (f % 2) * 0.12, (f / FRONDS_PER_PALM) * Math.PI * 2 + i * 0.5, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      frondInst.setMatrixAt(fIdx, dummy.matrix);
      tint.setHSL(0.34 + ((i + f) % 5) * 0.012, 0.56, 0.34 + (f % 3) * 0.03);
      frondInst.setColorAt(fIdx, tint);
      fIdx++;
    }
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  frondInst.instanceMatrix.needsUpdate = true;
  if (frondInst.instanceColor) frondInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  frondInst.computeBoundingSphere();
  worldGroup.add(trunkInst, frondInst);

  // =========================================================================
  // 7. WORLD INTERACTABLE MARKER RINGS & DYNAMIC MISSION BEACON
  // =========================================================================
  const beaconRings = new Map<string, THREE.Group>();
  for (const inter of INTERACTABLES) {
    const ringGroup = new THREE.Group();
    ringGroup.position.set(inter.x, 0.095, inter.z);
    const ringMat = new THREE.MeshBasicMaterial({
      color: inter.color,
      transparent: true,
      opacity: 0.74,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.85, 24), ringMat);
    ring.rotation.x = -Math.PI / 2;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.65, 2.2, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: inter.color,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beam.position.y = 1.1;
    ringGroup.add(ring, beam);
    worldGroup.add(ringGroup);
    beaconRings.set(inter.id, ringGroup);
  }

  const missionBeacon = new THREE.Group();
  const mRing = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 4.2, 32),
    new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    })
  );
  mRing.rotation.x = -Math.PI / 2;
  mRing.position.y = 0.125;

  const mPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 2.6, 52, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  mPillar.position.y = 26;
  missionBeacon.add(mRing, mPillar);
  missionBeacon.visible = false;
  worldGroup.add(missionBeacon);

  return {
    skyDomeMesh,
    skyUniforms,
    ferrisWheelGroup,
    oceanMesh,
    oceanGeo,
    oceanMaterial,
    surfFoamMesh,
    fountainWaterMesh,
    streetLightBulbsMat,
    neonNightMat,
    glassBuildingMat,
    interiorLightMats: archPalette.interiorLightMats,
    buildingSurfaceMats: archPalette.buildingSurfaceMats,
    airportRadarDish,
    roadMaterials,
    sidewalkMaterials,
    glassMaterials,
    trafficLightsNS,
    trafficLightsEW,
    beaconRings,
    missionBeacon,
  };
}
