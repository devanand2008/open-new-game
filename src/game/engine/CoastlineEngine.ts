import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { InputManager } from '../input/InputManager';
import { audioManager } from '../audio/AudioManager';
import {
  groundHeightAt,
  resolveCircleWorldCollision,
  STATIC_COLLIDERS,
  stepVehicleKinematics,
  stepWantedState,
  VEHICLE_SPECS,
  type WantedState,
} from '../physics/CollisionPhysics';
import { getDistrictAt } from '../world/Districts';
import {
  INTERACTABLES,
  LENA_OUTFITS,
  MARCO_OUTFITS,
  PARKED_VEHICLES,
  PLAYER_SPAWN,
  type VehicleArchetype,
} from '../world/WorldConfig';
import { SOLARA_ROAD_GRAPH, type RoadNode } from '../world/RoadGraph';
import { tickMissionState } from '../missions/MissionEngine';
import { useGameStore } from '../state/useGameStore';
import {
  createDefaultSaveData,
  type GameSettings,
  type PlayableCharacterId,
  type SaveDataV1,
} from '../save/SaveManager';
import { createSolaraTextures, type SolaraTextureSet } from '../rendering/ProceduralTextures';
import {
  animateCharacterRig,
  applyOutfitToRig,
  buildCharacterRig,
  buildVehicleRig,
  type CharacterRig,
  type VehicleRig,
} from '../rendering/ProceduralModels';
import { buildSolaraWorld, type DynamicCityProps } from '../rendering/CityWorldBuilder';
import { WeatherManager, type WeatherRenderParams } from '../weather/WeatherManager';
import { PostProcessingPipeline } from '../rendering/PostProcessingPipeline';

export interface LiveWorldSnapshot {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  cameraYaw: number;
  inVehicle: boolean;
  vehicles: Array<{ id: string; x: number; z: number; yaw: number; archetype: VehicleArchetype }>;
  traffic: Array<{ x: number; z: number; yaw: number }>;
  police: Array<{ x: number; z: number; yaw: number; active: boolean }>;
  missionTarget: { x: number; z: number; label: string } | null;
  customWaypoint: { x: number; z: number; label: string } | null;
  routeNodes: Array<{ x: number; z: number }>;
  routeDistance: number;
}

export const LIVE_WORLD_SNAPSHOT: LiveWorldSnapshot = {
  playerX: PLAYER_SPAWN.x,
  playerZ: PLAYER_SPAWN.z,
  playerYaw: PLAYER_SPAWN.yaw,
  cameraYaw: PLAYER_SPAWN.yaw,
  inVehicle: false,
  vehicles: [],
  traffic: [],
  police: [],
  missionTarget: null,
  customWaypoint: null,
  routeNodes: [],
  routeDistance: 0,
};

interface DriveableVehicleEntity {
  id: string;
  archetype: VehicleArchetype;
  rig: VehicleRig;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  steerAngle: number;
  wheelSpin: number;
  gear: string;
  drifting: boolean;
  health: number;
  maxHealth: number;
  pitchTilt: number;
  rollTilt: number;
}

interface TrafficAgent {
  rig: VehicleRig;
  fromNode: RoadNode;
  toNode: RoadNode;
  t: number;
  speed: number;
  maxSpeed: number;
  x: number;
  z: number;
  yaw: number;
  active: boolean;
}

interface PedestrianAgent {
  rig: CharacterRig;
  homeX: number;
  homeZ: number;
  targetX: number;
  targetZ: number;
  x: number;
  z: number;
  yaw: number;
  gait: number;
  state: 'walk' | 'idle' | 'flee';
  stateTimer: number;
  speed: number;
  active: boolean;
}

interface PoliceAgent {
  rig: VehicleRig;
  fromNode: RoadNode;
  toNode: RoadNode;
  t: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  active: boolean;
}

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
}

const CAMERA_MODES = [
  { name: 'Standard', dist: 7.4, height: 2.6, driveDist: 9.2, driveHeight: 3.4, isPortrait: false },
  { name: 'Close', dist: 4.8, height: 1.95, driveDist: 6.8, driveHeight: 2.6, isPortrait: false },
  { name: 'Portrait', dist: 2.35, height: 1.44, driveDist: 7.2, driveHeight: 2.8, isPortrait: true },
  { name: 'Cinematic', dist: 10.6, height: 3.8, driveDist: 12.8, driveHeight: 4.5, isPortrait: false },
];

// Reusable zero-GC scratch objects outside animation loop
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vCamTarget = new THREE.Vector3();
const _vCamDesired = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _skyCol = new THREE.Color();
const _fogCol = new THREE.Color();
const _sunCol = new THREE.Color();
const _hemiSky = new THREE.Color();
const _hemiGround = new THREE.Color();
const _rimCol = new THREE.Color();
const _sunDir = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class CoastlineEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private textures!: SolaraTextureSet;
  private cityProps!: DynamicCityProps;
  private postPipeline!: PostProcessingPipeline;
  private isSoftwareGl: boolean;

  public readonly input = new InputManager();

  // Lights
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private rimLight!: THREE.DirectionalLight;

  // Player rigs & state
  private marcoRig!: CharacterRig;
  private lenaRig!: CharacterRig;
  private activeCharId: PlayableCharacterId = 'marco';
  private npcRigs: Array<{ rig: CharacterRig; x: number; z: number; yaw: number }> = [];

  private playerX = PLAYER_SPAWN.x;
  private playerY = PLAYER_SPAWN.y;
  private playerZ = PLAYER_SPAWN.z;
  private playerVy = 0;
  private playerYaw = PLAYER_SPAWN.yaw;
  private playerSpeed = 0;
  private playerGait = 0;
  private grounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private squashY = 1;
  private health = 100;
  private stamina = 100;
  private footstepAccum = 0;

  // Vehicles
  private vehicles: DriveableVehicleEntity[] = [];
  private activeVehicle: DriveableVehicleEntity | null = null;

  // Dynamic city agents
  private traffic: TrafficAgent[] = [];
  private pedestrians: PedestrianAgent[] = [];
  private police: PoliceAgent[] = [];
  private trafficLightTimer = 0;
  private trafficNSGreen = true;

  // Wanted system
  private wanted: WantedState = { level: 0, heat: 0, cooldown: 0, evading: false };

  // Camera
  private camYaw = PLAYER_SPAWN.yaw;
  private camPitch = 0.24;
  private camZoom = 1.0;
  private camModeIdx = 0;
  private camShakeTrauma = 0;
  private titleFlyAngle = 0.45;

  // Pooled particles & 3D rain streaks
  private particleMesh!: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private particleCursor = 0;

  private weatherManager = new WeatherManager(useGameStore.getState().weather);
  private lastWeatherParams: WeatherRenderParams = this.weatherManager.computeRenderParams(16.75);
  private rainMesh!: THREE.InstancedMesh;
  private rainMat!: THREE.MeshBasicMaterial;
  private rainOffsets!: Float32Array;
  private rainSpeeds!: Float32Array;
  private readonly rainCount = 460;
  private wetMapsActive = false;

  // Simulation timing
  private frameId = 0;
  private disposed = false;
  private lastTimeMs = 0;
  private elapsedSec = 0;
  private hitstopTimer = 0;
  private timeOfDayHours = 16.75; // Golden hour 4:45 PM
  private hudSyncAccum = 0;
  private routeSyncAccum = 0;

  private boundResize: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.boundResize = this.onResize.bind(this);
    this.init();
  }

  private init(): void {
    const store = useGameStore.getState();
    store.setLoading('Creating WebGL renderer & studio PBR environment…', 20);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#d98d66');
    this.scene.fog = new THREE.Fog('#d98d66', 145, 580);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(58, w / h, 0.3, 1200);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && store.settings.graphicsPreset !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.applyResolutionScale(store.settings);

    this.container.appendChild(this.renderer.domElement);

    // Mandatory studio environment reflection (RoomEnvironment + PMREMGenerator)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Lighting rig (warm sun key + cool hemisphere fill + subtle rim light)
    this.hemiLight = new THREE.HemisphereLight('#87c5f5', '#6b5b4a', 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#ffcf96', 2.2);
    this.sunLight.position.set(-140, 110, 90);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 340;
    const d = 95;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight('#7dd3fc', 0.45);
    this.rimLight.position.set(120, 65, -140);
    this.scene.add(this.rimLight);

    // Procedural Textures
    store.setLoading('Generating Solara Bay procedural materials…', 45);
    this.textures = createSolaraTextures(this.renderer);

    // Build City World
    store.setLoading('Constructing Solara Bay districts, pier & skyline…', 70);
    this.cityProps = buildSolaraWorld(this.scene, this.textures);

    // Build Protagonists, Story NPCs, Vehicles, Traffic, Pedestrians, Police & Particles
    store.setLoading('Spawning characters, vehicles & city traffic…', 90);
    this.buildActorsAndVehicles();
    this.buildParticles();
    this.buildRainSystem();

    // Build Dynamic Post-Processing Shader Pipeline (Bloom + Dynamic Contrast + Color Grading)
    this.postPipeline = new PostProcessingPipeline(
      this.renderer,
      this.scene,
      this.camera,
      this.isSoftwareGl,
      this.timeOfDayHours,
      this.lastWeatherParams
    );

    // Register callbacks with Zustand store
    store.registerEngine({
      startNewGame: () => this.resetForNewGame(),
      loadFromSave: (save) => this.loadFromSave(save),
      spawnGarageVehicle: (arch) => this.spawnGarageVehicle(arch),
      repairActiveVehicle: () => this.repairActiveVehicle(),
      applyOutfit: (charId, outfitId) => this.applyOutfit(charId, outfitId),
      switchCharacter: (charId) => this.setActiveCharacter(charId),
      clearWanted: () => {
        this.wanted = { level: 0, heat: 0, cooldown: 0, evading: false };
      },
      advanceTimeHours: (dh) => {
        this.timeOfDayHours = ((this.timeOfDayHours + dh) % 24 + 24) % 24;
        this.updateWeatherAndAtmosphere(0);
      },
      setTimeOfDayHours: (hours) => {
        this.timeOfDayHours = ((hours % 24) + 24) % 24;
        this.updateWeatherAndAtmosphere(0);
        this.postPipeline.update(0, this.timeOfDayHours, this.lastWeatherParams, true);
      },
      cycleCamera: () => this.cycleCameraMode(),
      triggerInteract: () => this.input.triggerAction('KeyE'),
      triggerJump: () => this.input.triggerAction('Space'),
      applySettings: (settings) => this.applySettings(settings),
      setWeather: (condition, immediate) => this.weatherManager.setCondition(condition, immediate),
      solvePuzzleSuccess: () => this.handlePuzzleSolved(),
      getLiveSaveData: () => this.captureSaveData(),
      capturePhotoSnapshot: () => this.capturePhotoSnapshot(),
      fastTravel: (x, z, yaw) => this.fastTravelTo(x, z, yaw),
    });

    this.applySettings(store.settings);
    this.input.attach(this.container);
    window.addEventListener('resize', this.boundResize);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.updateWeatherAndAtmosphere(0);
    this.postPipeline.update(0, this.timeOfDayHours, this.lastWeatherParams, true);
    this.syncLiveSnapshot(true);

    store.setLoading(null, 100);

    // Support ?autostart=1 for automated testing / direct entry
    if (typeof window !== 'undefined' && window.location.search.includes('autostart=1')) {
      store.startNewGame();
    }

    this.lastTimeMs = performance.now();
    this.tick();
  }

  private buildActorsAndVehicles(): void {
    // 1. Protagonist 1: Marco Vega (Street Operator — realistic athletic male, leather jacket, stubble, gold chain & watch)
    this.marcoRig = buildCharacterRig(
      {
        skinColor: '#d9a484',
        hairColor: '#231c18',
        eyeColor: '#5c4028',
        jacketColor: MARCO_OUTFITS[0].jacketColor,
        shirtColor: MARCO_OUTFITS[0].shirtColor,
        pantsColor: MARCO_OUTFITS[0].pantsColor,
        bootsColor: '#1f1b18',
        accentColor: MARCO_OUTFITS[0].accentColor,
        heightScale: 1.02,
        bodyType: 'athletic_male',
        hairStyle: 'swept_rugged',
        facialHair: 'stubble',
        hasGoldChain: true,
        hasWatch: true,
        isLeatherJacket: true,
        skinBump: this.textures.skinBump,
        fabricBump: this.textures.fabricBump,
      },
      this.textures.contactShadow
    );
    this.marcoRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.scene.add(this.marcoRig.root);

    // 2. Protagonist 2: Lena Park (Tech Specialist — athletic female, dark bangs & sleek ponytail, glasses, purple headphones & backpack)
    this.lenaRig = buildCharacterRig(
      {
        skinColor: '#e6be9e',
        hairColor: '#16161d',
        eyeColor: '#2c1e18',
        lipColor: '#b86e68',
        jacketColor: LENA_OUTFITS[0].jacketColor,
        shirtColor: LENA_OUTFITS[0].shirtColor,
        pantsColor: LENA_OUTFITS[0].pantsColor,
        bootsColor: '#18181b',
        accentColor: LENA_OUTFITS[0].accentColor,
        heightScale: 0.96,
        bodyType: 'athletic_female',
        hairStyle: 'sleek_ponytail',
        facialHair: 'none',
        hasGlasses: true,
        hasHeadphones: true,
        hasBackpack: true,
        skinBump: this.textures.skinBump,
        fabricBump: this.textures.fabricBump,
      },
      this.textures.contactShadow
    );
    this.lenaRig.root.visible = false;
    this.scene.add(this.lenaRig.root);

    // 3. Supporting Story NPCs (Sofia Ramirez, Jalen Carter, Elliot Rhodes)
    const storyNpcs: Array<{
      x: number;
      z: number;
      yaw: number;
      cfg: Parameters<typeof buildCharacterRig>[0];
    }> = [
      {
        // Sofia Ramirez (Marina Crescent — burgundy tailored blazer, wavy long dark hair, gold pendant & earrings)
        x: 96,
        z: 204,
        yaw: -0.6,
        cfg: {
          skinColor: '#d8a282',
          hairColor: '#1f1715',
          eyeColor: '#3b2416',
          lipColor: '#b91c1c',
          jacketColor: '#7f1d1d',
          shirtColor: '#f8fafc',
          pantsColor: '#58111a',
          bootsColor: '#1c1917',
          accentColor: '#fbbf24',
          heightScale: 0.98,
          bodyType: 'athletic_female',
          hairStyle: 'wavy_long',
          facialHair: 'none',
          isSuit: true,
          skinBump: this.textures.skinBump,
          fabricBump: this.textures.fabricBump,
        },
      },
      {
        // Jalen Carter (Ironport Docks — muscular build, short fade, tactical rig & gold chain)
        x: 234,
        z: 56,
        yaw: -1.4,
        cfg: {
          skinColor: '#7c4d34',
          hairColor: '#141414',
          eyeColor: '#261a12',
          jacketColor: '#27272a',
          shirtColor: '#3f3f46',
          pantsColor: '#1f2937',
          bootsColor: '#18181b',
          accentColor: '#f59e0b',
          heightScale: 1.06,
          bodyType: 'muscular_male',
          hairStyle: 'short_fade',
          facialHair: 'trimmed_beard',
          hasGoldChain: true,
          hasWatch: true,
          isMuscular: true,
          skinBump: this.textures.skinBump,
          fabricBump: this.textures.fabricBump,
        },
      },
      {
        // Elliot Rhodes (North Ridge trailhead — rugged outdoor explorer, trimmed beard, field cap & pack)
        x: -18,
        z: -186,
        yaw: 0.1,
        cfg: {
          skinColor: '#dfb091',
          hairColor: '#5b4636',
          eyeColor: '#3f6212',
          jacketColor: '#6b705c',
          shirtColor: '#a5a58d',
          pantsColor: '#4a4e3d',
          bootsColor: '#3d2c1e',
          accentColor: '#556b2f',
          heightScale: 1.03,
          bodyType: 'rugged_male',
          hairStyle: 'cap_outdoor',
          facialHair: 'trimmed_beard',
          hasCap: true,
          hasBackpack: true,
          skinBump: this.textures.skinBump,
          fabricBump: this.textures.fabricBump,
        },
      },
    ];
    for (const n of storyNpcs) {
      const rig = buildCharacterRig(n.cfg, this.textures.contactShadow);
      rig.root.position.set(n.x, groundHeightAt(n.x, n.z), n.z);
      rig.root.rotation.y = n.yaw;
      this.scene.add(rig.root);
      this.npcRigs.push({ rig, x: n.x, z: n.z, yaw: n.yaw });
    }

    // 4. Driveable Parked Vehicles
    for (const sp of PARKED_VEHICLES) {
      const rig = buildVehicleRig(sp.archetype, sp.color, this.textures.contactShadow);
      const y = groundHeightAt(sp.x, sp.z);
      rig.root.position.set(sp.x, y, sp.z);
      rig.root.rotation.y = sp.yaw;
      this.scene.add(rig.root);
      const spec = VEHICLE_SPECS[sp.archetype];
      this.vehicles.push({
        id: sp.id,
        archetype: sp.archetype,
        rig,
        x: sp.x,
        y,
        z: sp.z,
        yaw: sp.yaw,
        speed: 0,
        steerAngle: 0,
        wheelSpin: 0,
        gear: '1',
        drifting: false,
        health: spec.maxHealth,
        maxHealth: spec.maxHealth,
        pitchTilt: 0,
        rollTilt: 0,
      });
    }

    // 5. NPC Road Traffic (14 vehicles patrolling RoadGraph lanes)
    const trafficPalette = ['#e2e8f0', '#38bdf8', '#f59e0b', '#10b981', '#6366f1', '#f43f5e', '#94a3b8'];
    const trafficTypes: VehicleArchetype[] = ['sedan', 'coupe', 'suv', 'sedan', 'truck'];
    const allNodes = Array.from(SOLARA_ROAD_GRAPH.nodes.values());

    for (let i = 0; i < 14; i++) {
      const fromNode = allNodes[(i * 3) % allNodes.length];
      const neighborId = fromNode.neighbors[i % fromNode.neighbors.length];
      const toNode = SOLARA_ROAD_GRAPH.nodes.get(neighborId) ?? fromNode;
      const arch = trafficTypes[i % trafficTypes.length];
      const rig = buildVehicleRig(arch, trafficPalette[i % trafficPalette.length], this.textures.contactShadow);
      this.scene.add(rig.root);
      this.traffic.push({
        rig,
        fromNode,
        toNode,
        t: (i * 0.17) % 0.85,
        speed: 10 + (i % 5) * 1.8,
        maxSpeed: 10 + (i % 5) * 1.8,
        x: fromNode.x,
        z: fromNode.z,
        yaw: 0,
        active: true,
      });
    }

    // 6. Sidewalk Pedestrians (20 realistic human citizens with diverse body builds, hairstyles & wardrobe)
    const pedJackets = ['#2563eb', '#be185d', '#d97706', '#059669', '#e2e8f0', '#4f46e5', '#0f766e', '#b91c1c'];
    const pedSkins = ['#f1c7a7', '#d8a282', '#a86f4c', '#7c4d34', '#e8be9e', '#c68d67'];
    const pedHairColors = ['#18181b', '#4a3728', '#2a1f1b', '#6b4c35', '#1c1917'];
    const pedEyes = ['#3b271a', '#2b4c6f', '#3d5a3b', '#261a14'];
    const pedHubs: Array<[number, number]> = [
      [-50, 12], [-28, 14], [14, 14], [48, -12], [-52, -32],
      [-108, -10], [-196, 12], [-196, -42], [-196, 66], [70, 14],
      [-52, 92], [12, 92], [86, 174], [-96, 152], [-28, 174],
      [108, -68], [-110, -70], [-200, 118], [52, 68], [220, 16],
    ];
    for (let i = 0; i < pedHubs.length; i++) {
      const [hx, hz] = pedHubs[i];
      const isFemalePed = i % 2 === 1;
      const bodyType = isFemalePed
        ? 'athletic_female'
        : i % 6 === 0
          ? 'rugged_male'
          : 'athletic_male';
      const hairStyle = isFemalePed
        ? i % 4 === 1
          ? 'wavy_long'
          : 'sleek_ponytail'
        : i % 6 === 0
          ? 'swept_rugged'
          : i % 6 === 2
            ? 'short_fade'
            : 'short_crop';
      const rig = buildCharacterRig(
        {
          skinColor: pedSkins[i % pedSkins.length],
          hairColor: pedHairColors[i % pedHairColors.length],
          eyeColor: pedEyes[i % pedEyes.length],
          jacketColor: pedJackets[i % pedJackets.length],
          shirtColor: i % 3 === 0 ? '#f8fafc' : '#cbd5e1',
          pantsColor: i % 2 === 0 ? '#1e293b' : '#334155',
          bootsColor: '#1c1917',
          accentColor: '#94a3b8',
          heightScale: isFemalePed ? 0.92 + (i % 3) * 0.025 : 0.97 + (i % 3) * 0.03,
          bodyType,
          hairStyle,
          facialHair: !isFemalePed && i % 4 === 0 ? 'stubble' : 'none',
          hasWatch: i % 3 === 0,
          skinBump: this.textures.skinBump,
          fabricBump: this.textures.fabricBump,
        },
        this.textures.contactShadow
      );
      rig.root.position.set(hx, 0, hz);
      this.scene.add(rig.root);
      this.pedestrians.push({
        rig,
        homeX: hx,
        homeZ: hz,
        targetX: hx + ((i % 2 === 0 ? 1 : -1) * 18),
        targetZ: hz + ((i % 3 === 0 ? 1 : -1) * 14),
        x: hx,
        z: hz,
        yaw: 0,
        gait: i * 0.9,
        state: 'walk',
        stateTimer: 4 + (i % 4),
        speed: 1.8 + (i % 3) * 0.35,
        active: true,
      });
    }

    // 7. SBPD Police Patrol / Pursuit Cruisers (3 units)
    const policeStarts = ['n_3_1', 'n_4_3', 'n_2_4'];
    for (let i = 0; i < policeStarts.length; i++) {
      const startNode = SOLARA_ROAD_GRAPH.nodes.get(policeStarts[i]) ?? allNodes[0];
      const nextNode = SOLARA_ROAD_GRAPH.nodes.get(startNode.neighbors[0]) ?? startNode;
      const rig = buildVehicleRig('police', '#f8fafc', this.textures.contactShadow);
      rig.root.position.set(startNode.x, 0, startNode.z);
      this.scene.add(rig.root);
      this.police.push({
        rig,
        fromNode: startNode,
        toNode: nextNode,
        t: 0.25 * i,
        x: startNode.x,
        z: startNode.z,
        yaw: 0,
        speed: 12,
        active: true,
      });
    }
  }

  private buildParticles(): void {
    const capacity = 72;
    const geo = new THREE.SphereGeometry(0.28, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: '#e2e8f0',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.particleMesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);

    for (let i = 0; i < capacity; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 0,
      });
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
  }

  private buildRainSystem(): void {
    const geo = new THREE.BoxGeometry(0.022, 1.55, 0.022);
    this.rainMat = new THREE.MeshBasicMaterial({
      color: '#cbe8f8',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainMesh = new THREE.InstancedMesh(geo, this.rainMat, this.rainCount);
    this.rainMesh.frustumCulled = false;
    this.rainMesh.visible = false;
    this.scene.add(this.rainMesh);

    this.rainOffsets = new Float32Array(this.rainCount * 3);
    this.rainSpeeds = new Float32Array(this.rainCount);
    for (let i = 0; i < this.rainCount; i++) {
      this.rainOffsets[i * 3] = (((i * 73.13) % 100) / 100 - 0.5) * 54;
      this.rainOffsets[i * 3 + 1] = (((i * 41.77) % 100) / 100) * 26;
      this.rainOffsets[i * 3 + 2] = (((i * 97.31) % 100) / 100 - 0.5) * 54;
      this.rainSpeeds[i] = 28 + (i % 11) * 1.6;
    }
  }

  private emitParticles(x: number, y: number, z: number, count: number, spread = 2.5, up = 2.0): void {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.particles.length;
      slot.active = true;
      slot.x = x + (Math.random() - 0.5) * 0.6;
      slot.y = y + 0.15;
      slot.z = z + (Math.random() - 0.5) * 0.6;
      slot.vx = (Math.random() - 0.5) * spread;
      slot.vy = Math.random() * up + 0.5;
      slot.vz = (Math.random() - 0.5) * spread;
      slot.life = 0;
      slot.maxLife = 0.45 + Math.random() * 0.4;
      slot.scale = 0.7 + Math.random() * 0.6;
    }
  }

  private getActiveCharRig(): CharacterRig {
    return this.activeCharId === 'lena' ? this.lenaRig : this.marcoRig;
  }

  private setActiveCharacter(charId: PlayableCharacterId): void {
    this.activeCharId = charId;
    const isDriving = this.activeVehicle !== null;
    this.marcoRig.root.visible = !isDriving && charId === 'marco';
    this.lenaRig.root.visible = !isDriving && charId === 'lena';
    const rig = this.getActiveCharRig();
    rig.root.position.set(this.playerX, this.playerY, this.playerZ);
    rig.root.rotation.y = this.playerYaw;
  }

  private applyOutfit(charId: PlayableCharacterId, outfitId: string): void {
    const list = charId === 'marco' ? MARCO_OUTFITS : LENA_OUTFITS;
    const found = list.find((o) => o.id === outfitId) ?? list[0];
    applyOutfitToRig(charId === 'marco' ? this.marcoRig : this.lenaRig, found);
  }

  private spawnGarageVehicle(archetype: VehicleArchetype): void {
    // Exit current car if driving
    if (this.activeVehicle) {
      this.exitVehicle(true);
    }
    const colors: Record<VehicleArchetype, string> = {
      sedan: '#c82333',
      coupe: '#f59e0b',
      suv: '#0284c7',
      motorcycle: '#d946ef',
      truck: '#ea580c',
      police: '#f8fafc',
    };
    // Place or replace a player garage vehicle right outside Downtown Garage
    const spawnX = 84;
    const spawnZ = -52;
    const existing = this.vehicles.find((v) => v.id === 'veh_garage_custom');
    if (existing) {
      this.scene.remove(existing.rig.root);
      const idx = this.vehicles.indexOf(existing);
      if (idx >= 0) this.vehicles.splice(idx, 1);
    }
    const rig = buildVehicleRig(archetype, colors[archetype], this.textures.contactShadow);
    const y = groundHeightAt(spawnX, spawnZ);
    rig.root.position.set(spawnX, y, spawnZ);
    rig.root.rotation.y = Math.PI / 2;
    this.scene.add(rig.root);
    const spec = VEHICLE_SPECS[archetype];
    const entity: DriveableVehicleEntity = {
      id: 'veh_garage_custom',
      archetype,
      rig,
      x: spawnX,
      y,
      z: spawnZ,
      yaw: Math.PI / 2,
      speed: 0,
      steerAngle: 0,
      wheelSpin: 0,
      gear: '1',
      drifting: false,
      health: spec.maxHealth,
      maxHealth: spec.maxHealth,
      pitchTilt: 0,
      rollTilt: 0,
    };
    this.vehicles.push(entity);
    this.enterVehicle(entity);
    useGameStore.getState().setOwnedVehicle(archetype);
    audioManager.playChime();
  }

  private repairActiveVehicle(): void {
    const target = this.activeVehicle ?? this.findNearestVehicle(14);
    if (!target) return;
    target.health = target.maxHealth;
    this.emitParticles(target.x, target.y + 1, target.z, 12, 3.2, 2.2);
    audioManager.playChime();
  }

  private resetForNewGame(): void {
    this.input.clearAll();
    if (this.activeVehicle) this.exitVehicle(true);

    this.playerX = PLAYER_SPAWN.x;
    this.playerY = PLAYER_SPAWN.y;
    this.playerZ = PLAYER_SPAWN.z;
    this.playerVy = 0;
    this.playerYaw = PLAYER_SPAWN.yaw;
    this.camYaw = PLAYER_SPAWN.yaw;
    this.camPitch = 0.24;
    this.health = 100;
    this.stamina = 100;
    this.timeOfDayHours = 16.75;
    this.weatherManager.setCondition('clear', true);
    this.wanted = { level: 0, heat: 0, cooldown: 0, evading: false };

    this.setActiveCharacter('marco');
    this.applyOutfit('marco', MARCO_OUTFITS[0].id);
    this.applyOutfit('lena', LENA_OUTFITS[0].id);

    // Reset parked Marco sedan
    const marcoCar = this.vehicles.find((v) => v.id === 'veh_marco_sedan');
    if (marcoCar) {
      const sp = PARKED_VEHICLES[0];
      marcoCar.x = sp.x;
      marcoCar.z = sp.z;
      marcoCar.y = groundHeightAt(sp.x, sp.z);
      marcoCar.yaw = sp.yaw;
      marcoCar.speed = 0;
      marcoCar.health = marcoCar.maxHealth;
      marcoCar.rig.root.position.set(marcoCar.x, marcoCar.y, marcoCar.z);
      marcoCar.rig.root.rotation.y = marcoCar.yaw;
    }

    this.syncLiveSnapshot(true);
    this.snapCameraToGameplay();
  }

  private snapCameraToGameplay(): void {
    const mode = CAMERA_MODES[this.camModeIdx];
    const inVeh = this.activeVehicle !== null;
    if (!inVeh && mode.isPortrait) {
      const portraitAngle = this.playerYaw + Math.PI - 0.34;
      const pDist = mode.dist * this.camZoom;
      const targetY = this.playerY + 1.32;
      this.camera.position.set(
        this.playerX + Math.sin(portraitAngle) * pDist,
        this.playerY + mode.height,
        this.playerZ + Math.cos(portraitAngle) * pDist
      );
      this.camera.fov = 44;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(this.playerX, targetY, this.playerZ);
      return;
    }
    const baseDist = (inVeh ? mode.driveDist : mode.dist) * this.camZoom;
    const baseH = inVeh ? mode.driveHeight : mode.height;
    const targetY = this.playerY + (inVeh ? 1.45 : 1.55);
    const horizDist = Math.cos(this.camPitch) * baseDist;
    const vertDist = Math.sin(this.camPitch) * baseDist + baseH * 0.45;
    this.camera.position.set(
      this.playerX + Math.sin(this.camYaw) * horizDist,
      targetY + vertDist,
      this.playerZ + Math.cos(this.camYaw) * horizDist
    );
    this.camera.lookAt(this.playerX, targetY, this.playerZ);
  }

  private loadFromSave(save: SaveDataV1): void {
    this.input.clearAll();
    if (this.activeVehicle) this.exitVehicle(true);

    this.playerX = save.playerPos.x;
    this.playerY = groundHeightAt(save.playerPos.x, save.playerPos.z);
    this.playerZ = save.playerPos.z;
    this.playerYaw = save.playerPos.yaw;
    this.camYaw = save.playerPos.yaw;
    this.health = save.health;
    this.stamina = save.stamina;
    this.timeOfDayHours = save.timeOfDayHours;
    this.weatherManager.setCondition(save.weather ?? 'clear', true);
    this.wanted = { level: 0, heat: 0, cooldown: 0, evading: false };

    this.setActiveCharacter(save.character);
    this.applyOutfit('marco', save.marcoOutfitId);
    this.applyOutfit('lena', save.lenaOutfitId);
    this.applySettings(save.settings);
    this.syncLiveSnapshot(true);
    this.snapCameraToGameplay();
  }

  private capturePhotoSnapshot(): string | null {
    try {
      if (this.postPipeline) {
        this.postPipeline.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
      return this.renderer.domElement.toDataURL('image/jpeg', 0.78);
    } catch {
      return null;
    }
  }

  private fastTravelTo(x: number, z: number, yaw = 0): void {
    const col = resolveCircleWorldCollision(x, z, 0.7);
    if (this.activeVehicle) {
      this.activeVehicle.x = col.x;
      this.activeVehicle.z = col.z;
      this.activeVehicle.y = groundHeightAt(col.x, col.z);
      this.activeVehicle.yaw = yaw;
      this.activeVehicle.speed = 0;
      this.activeVehicle.rig.root.position.set(col.x, this.activeVehicle.y, col.z);
      this.activeVehicle.rig.root.rotation.y = yaw;
    }
    this.playerX = col.x;
    this.playerZ = col.z;
    this.playerY = groundHeightAt(col.x, col.z);
    this.playerYaw = yaw;
    this.camYaw = yaw;
    this.camPitch = 0.16;
    this.playerVy = 0;
    this.grounded = true;
    const rig = this.getActiveCharRig();
    rig.root.position.set(this.playerX, this.playerY, this.playerZ);
    rig.root.rotation.y = this.playerYaw;
    this.syncLiveSnapshot(true);
    this.snapCameraToGameplay();
    this.pushHudTelemetry();
  }

  private captureSaveData(): SaveDataV1 {
    const s = useGameStore.getState();
    return {
      ...createDefaultSaveData(),
      playerPos: {
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        yaw: this.playerYaw,
      },
      character: s.character,
      marcoOutfitId: s.marcoOutfitId,
      lenaOutfitId: s.lenaOutfitId,
      unlockedOutfits: s.unlockedOutfits,
      ownedVehicle: s.ownedVehicle,
      money: s.money,
      health: Math.round(this.health),
      stamina: Math.round(this.stamina),
      completedMissions: s.completedMissions,
      activeMissionId: s.mission.missionId,
      timeOfDayHours: this.timeOfDayHours,
      weather: this.weatherManager.getCondition(),
      settings: s.settings,
    };
  }

  private applyResolutionScale(settings: GameSettings): void {
    if (!this.renderer) return;
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      return;
    }
    const presetCap = settings.graphicsPreset === 'low' ? 1.0 : settings.graphicsPreset === 'medium' ? 1.5 : 2.0;
    const ratio = Math.min(window.devicePixelRatio || 1, presetCap) * settings.resolutionScale;
    this.renderer.setPixelRatio(Math.max(0.5, ratio));
  }

  private applySettings(settings: GameSettings): void {
    audioManager.applySettings(settings);
    this.weatherManager.setAutoCycle(settings.autoWeatherCycle);
    this.applyResolutionScale(settings);
    if (this.renderer) {
      this.renderer.shadowMap.enabled = !this.isSoftwareGl && settings.graphicsPreset !== 'low';
    }
    if (this.postPipeline) {
      this.postPipeline.configure(settings.postProcessing, settings.graphicsPreset);
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.postPipeline.setSize(w, h);
    }
    // Scale active traffic & pedestrian density according to graphics preset
    const maxTraffic = settings.graphicsPreset === 'low' ? 6 : settings.graphicsPreset === 'medium' ? 10 : 14;
    const maxPeds = settings.graphicsPreset === 'low' ? 8 : settings.graphicsPreset === 'medium' ? 14 : 20;
    this.traffic.forEach((t, idx) => {
      t.active = idx < maxTraffic;
      t.rig.root.visible = t.active;
    });
    this.pedestrians.forEach((p, idx) => {
      p.active = idx < maxPeds;
      p.rig.root.visible = p.active;
    });
  }

  private cycleCameraMode(): void {
    this.camModeIdx = (this.camModeIdx + 1) % CAMERA_MODES.length;
    const mode = CAMERA_MODES[this.camModeIdx];
    if (mode.isPortrait && !this.activeVehicle) {
      this.snapCameraToGameplay();
    }
    useGameStore.getState().showToast(`Camera: ${mode.name}`, 'cyan');
    audioManager.playClick();
  }

  private handlePuzzleSolved(): void {
    const store = useGameStore.getState();
    const out = tickMissionState(store.mission, {
      playerX: this.playerX,
      playerZ: this.playerZ,
      inVehicle: this.activeVehicle !== null,
      vehicleSpeed: this.activeVehicle?.speed ?? 0,
      wantedLevel: this.wanted.level,
      dt: 0.016,
      puzzleSolved: true,
    });
    store.setMission(out.state);
    if (out.justCompleted) {
      audioManager.playMissionComplete();
      store.completeMission(out.justCompleted.missionId, out.justCompleted.title, out.justCompleted.reward);
    }
  }

  private findNearestVehicle(maxDist: number): DriveableVehicleEntity | null {
    let best: DriveableVehicleEntity | null = null;
    let bestD = maxDist;
    for (const v of this.vehicles) {
      const d = Math.hypot(v.x - this.playerX, v.z - this.playerZ);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  private enterVehicle(veh: DriveableVehicleEntity): void {
    this.activeVehicle = veh;
    this.marcoRig.root.visible = false;
    this.lenaRig.root.visible = false;
    this.playerX = veh.x;
    this.playerZ = veh.z;
    this.playerY = veh.y;
    this.camYaw = veh.yaw;
    audioManager.unlock();
    audioManager.playCarDoor();
    useGameStore.getState().showToast(`Entered ${VEHICLE_SPECS[veh.archetype].name}`, 'cyan');
  }

  private exitVehicle(force = false): void {
    if (!this.activeVehicle) return;
    if (!force && Math.abs(this.activeVehicle.speed) > 9.5) {
      useGameStore.getState().showToast('Slow down before exiting vehicle!', 'amber');
      return;
    }
    const veh = this.activeVehicle;
    veh.speed *= 0.35;
    // Place player safely to the driver's left side
    const leftX = veh.x - Math.cos(veh.yaw) * 2.4;
    const leftZ = veh.z + Math.sin(veh.yaw) * 2.4;
    const resolved = resolveCircleWorldCollision(leftX, leftZ, 0.55);
    this.playerX = resolved.x;
    this.playerZ = resolved.z;
    this.playerY = groundHeightAt(this.playerX, this.playerZ);
    this.playerYaw = veh.yaw;
    this.playerVy = 0;
    this.grounded = true;
    this.activeVehicle = null;
    this.setActiveCharacter(this.activeCharId);
    audioManager.playCarDoor();
  }

  private handleGlobalShortcuts(): void {
    const store = useGameStore.getState();

    // Title screen Enter/Space start handshake
    if (store.screen === 'title' && store.overlay === null) {
      if (this.input.consumeJustPressed('Enter') || this.input.consumeJustPressed('Space')) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        store.startNewGame();
      }
      return;
    }

    // Pause / close modal toggle (Escape or P)
    if (this.input.consumeJustPressed('Escape') || this.input.consumeJustPressed('KeyP')) {
      if (store.overlay !== null) {
        if (store.overlay !== 'puzzle') {
          store.setOverlay(null);
        }
      } else if (store.screen === 'playing') {
        store.setScreen('paused');
        audioManager.setPaused(true);
      } else if (store.screen === 'paused') {
        store.setScreen('playing');
        audioManager.setPaused(false);
      }
      return;
    }

    if (store.screen !== 'playing') return;

    // Map toggle (M)
    if (this.input.consumeJustPressed('KeyM')) {
      store.setOverlay(store.overlay === 'map' ? null : 'map');
      audioManager.playClick();
      return;
    }

    // Phone / Mission Journal toggle (Tab)
    if (this.input.consumeJustPressed('Tab')) {
      store.setOverlay(store.overlay === 'phone' ? null : 'phone');
      audioManager.playClick();
      return;
    }

    if (store.overlay !== null) return;

    // Camera cycle (C)
    if (this.input.consumeJustPressed('KeyC')) {
      this.cycleCameraMode();
    }

    // Quick Character Switch (Q)
    if (this.input.consumeJustPressed('KeyQ')) {
      const nextChar: PlayableCharacterId = this.activeCharId === 'marco' ? 'lena' : 'marco';
      store.switchCharacter(nextChar);
    }

    // Global Weather Cycle (V: Clear -> Hazy -> Rain)
    if (this.input.consumeJustPressed('KeyV')) {
      store.cycleWeather();
      audioManager.playClick();
    }

    // Advance Time of Day (+4 Hours: Dawn -> Noon -> Golden Hour -> Night)
    if (this.input.consumeJustPressed('KeyT')) {
      this.timeOfDayHours = (this.timeOfDayHours + 4) % 24;
      const h = this.timeOfDayHours;
      const period =
        h >= 5.5 && h < 9
          ? 'Sunrise Dawn'
          : h >= 9 && h < 16
            ? 'Tropical Midday'
            : h >= 16 && h < 19.5
              ? 'Golden Hour'
              : 'Solara Nightlife';
      store.showToast(`Time of Day: ${period}`, h >= 19.5 || h < 5.5 ? 'magenta' : 'amber');
      audioManager.playClick();
    }
  }

  private stepPlayerOnFoot(dt: number): void {
    const axes = this.input.getMoveAxes();
    const moveMag = Math.hypot(axes.forward, axes.right);
    const wantsSprint = axes.sprint && moveMag > 0.1 && this.stamina > 4;

    if (wantsSprint) {
      this.stamina = Math.max(0, this.stamina - 22 * dt);
    } else {
      this.stamina = Math.min(100, this.stamina + 16 * dt);
    }

    const maxSpeed = wantsSprint ? 10.6 : 5.6;
    const targetSpeed = Math.min(1, moveMag) * maxSpeed;
    const accel = moveMag > 0.05 ? 24 : 18;
    this.playerSpeed += (targetSpeed - this.playerSpeed) * Math.min(1, accel * dt);

    if (moveMag > 0.05) {
      // Camera-relative movement direction
      const camForwardX = -Math.sin(this.camYaw);
      const camForwardZ = -Math.cos(this.camYaw);
      const camRightX = Math.cos(this.camYaw);
      const camRightZ = -Math.sin(this.camYaw);

      const dirX = camForwardX * axes.forward + camRightX * axes.right;
      const dirZ = camForwardZ * axes.forward + camRightZ * axes.right;
      const dirLen = Math.hypot(dirX, dirZ) || 1;
      const nx = dirX / dirLen;
      const nz = dirZ / dirLen;

      const targetYaw = Math.atan2(-nx, -nz);
      // Shortest angular interpolation
      let deltaYaw = targetYaw - this.playerYaw;
      while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
      while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
      this.playerYaw += deltaYaw * Math.min(1, 13 * dt);

      const nextX = this.playerX + nx * this.playerSpeed * dt;
      const nextZ = this.playerZ + nz * this.playerSpeed * dt;
      const col = resolveCircleWorldCollision(nextX, nextZ, 0.52);
      this.playerX = col.x;
      this.playerZ = col.z;

      this.playerGait += this.playerSpeed * dt * 2.15;
      this.footstepAccum += this.playerSpeed * dt;
      if (this.grounded && this.footstepAccum > 2.2) {
        this.footstepAccum = 0;
        audioManager.playFootstep();
      }
    }

    // Grounded Jump with Coyote Time & Input Buffering
    if (this.input.consumeJustPressed('Space')) {
      this.jumpBufferTimer = 0.12;
    }
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (this.grounded) {
      this.coyoteTimer = 0.1;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.playerVy = 7.4;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.squashY = 1.18;
      audioManager.unlock();
      audioManager.playJump();
      this.emitParticles(this.playerX, this.playerY, this.playerZ, 4, 1.5, 1.2);
    }

    // Gravity & landing
    const groundY = groundHeightAt(this.playerX, this.playerZ);
    if (!this.grounded || this.playerY > groundY + 0.02) {
      this.playerVy -= 21 * dt;
      this.playerY += this.playerVy * dt;
      if (this.playerY <= groundY) {
        this.playerY = groundY;
        if (this.playerVy < -3) {
          this.squashY = 0.8;
          this.emitParticles(this.playerX, groundY, this.playerZ, 5, 2.0, 0.9);
        }
        this.playerVy = 0;
        this.grounded = true;
      }
    } else {
      this.playerY = groundY;
    }

    // Squash recovery
    this.squashY += (1 - this.squashY) * (1 - Math.exp(-12 * dt));

    // Update character rig transform & limb animation
    const rig = this.getActiveCharRig();
    rig.root.position.set(this.playerX, this.playerY, this.playerZ);
    rig.root.rotation.y = this.playerYaw;
    animateCharacterRig(rig, this.playerSpeed, this.playerGait, this.grounded, this.elapsedSec, this.squashY);
  }

  private stepDriving(dt: number): void {
    const veh = this.activeVehicle!;
    const axes = this.input.getMoveAxes();
    const prevSpeed = veh.speed;

    const { next, impactSpeed } = stepVehicleKinematics(
      {
        x: veh.x,
        z: veh.z,
        yaw: veh.yaw,
        speed: veh.speed,
        steerAngle: veh.steerAngle,
        gear: veh.gear,
        drifting: veh.drifting,
      },
      {
        throttle: axes.forward,
        steer: axes.right,
        handbrake: axes.handbrake,
      },
      veh.archetype,
      dt,
      STATIC_COLLIDERS
    );

    veh.x = next.x;
    veh.z = next.z;
    veh.y = groundHeightAt(veh.x, veh.z);
    veh.yaw = next.yaw;
    veh.speed = next.speed;
    veh.steerAngle = next.steerAngle;
    veh.gear = next.gear;
    veh.drifting = next.drifting;

    // Collide with parked vehicles & NPC traffic
    for (const other of this.vehicles) {
      if (other === veh) continue;
      const dx = veh.x - other.x;
      const dz = veh.z - other.z;
      const minD = VEHICLE_SPECS[veh.archetype].radius + VEHICLE_SPECS[other.archetype].radius;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.01 && dist < minD) {
        const push = (minD - dist) * 0.6;
        veh.x += (dx / dist) * push;
        veh.z += (dz / dist) * push;
        veh.speed *= 0.6;
        this.triggerImpactJuice(Math.abs(prevSpeed) * 0.5, veh.x, veh.y, veh.z);
      }
    }

    for (const t of this.traffic) {
      if (!t.active) continue;
      const dx = veh.x - t.x;
      const dz = veh.z - t.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.01 && dist < 3.6) {
        const push = (3.6 - dist) * 0.7;
        veh.x += (dx / dist) * push;
        veh.z += (dz / dist) * push;
        t.speed = 0;
        if (Math.abs(prevSpeed) > 10) {
          this.triggerImpactJuice(Math.abs(prevSpeed) * 0.65, veh.x, veh.y, veh.z);
          this.addHeatFromCollision(1);
        }
        veh.speed *= 0.55;
      }
    }

    if (impactSpeed > 6) {
      veh.health = Math.max(15, veh.health - impactSpeed * 0.9);
      this.triggerImpactJuice(impactSpeed, veh.x, veh.y, veh.z);
    }

    // Wet-road reduced tire grip & water spray mist during Rain
    const wetness = this.lastWeatherParams.wetness;
    if (wetness > 0.35 && Math.abs(veh.speed) > 9) {
      if (Math.abs(axes.right) > 0.35) {
        veh.drifting = true;
      }
      if (Math.random() < wetness * 0.4) {
        this.emitParticles(veh.x, veh.y + 0.14, veh.z, 1, 1.1, 0.9);
      }
    }

    // Tire smoke on drift
    if (veh.drifting && Math.random() < 0.45) {
      this.emitParticles(veh.x, veh.y + 0.15, veh.z, 2, 1.4, 0.8);
    }

    // Suspension pitch/roll approximation
    const accelEst = (veh.speed - prevSpeed) / Math.max(dt, 0.008);
    const targetPitch = THREE.MathUtils.clamp(-accelEst * 0.004, -0.055, 0.055);
    const targetRoll = THREE.MathUtils.clamp(axes.right * (veh.speed / 30) * 0.075, -0.08, 0.08);
    veh.pitchTilt += (targetPitch - veh.pitchTilt) * (1 - Math.exp(-9 * dt));
    veh.rollTilt += (targetRoll - veh.rollTilt) * (1 - Math.exp(-9 * dt));

    // Update vehicle 3D rig
    veh.rig.root.position.set(veh.x, veh.y, veh.z);
    veh.rig.root.rotation.y = veh.yaw;
    veh.rig.chassisGroup.rotation.x = veh.pitchTilt;
    veh.rig.chassisGroup.rotation.z = veh.rollTilt;

    // Animated steering + rolling wheels
    veh.wheelSpin -= veh.speed * dt * 2.5;
    for (const p of veh.rig.frontWheelPivots) {
      p.rotation.y = veh.steerAngle;
    }
    for (const w of veh.rig.wheelMeshes) {
      w.rotation.x = veh.wheelSpin;
    }

    // Brake light glow
    const braking = axes.handbrake || (axes.forward < -0.1 && veh.speed > 0.5);
    veh.rig.brakeLightMat.emissiveIntensity = braking ? 2.6 : 0.65;

    // Sync player coordinates to vehicle
    this.playerX = veh.x;
    this.playerY = veh.y;
    this.playerZ = veh.z;
    this.playerYaw = veh.yaw;

    // Gentle auto-align chase camera behind vehicle while moving
    if (Math.abs(veh.speed) > 2.5) {
      let dYaw = veh.yaw - this.camYaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      this.camYaw += dYaw * (1 - Math.exp(-2.8 * dt));
    }
  }

  private triggerImpactJuice(strength: number, x: number, y: number, z: number): void {
    const settings = useGameStore.getState().settings;
    if (!settings.reducedCameraShake) {
      this.camShakeTrauma = Math.min(1, this.camShakeTrauma + Math.min(0.6, strength * 0.035));
    }
    if (strength > 14) {
      this.hitstopTimer = 0.04; // brief 40ms simulation hitstop on heavy crash
    }
    this.emitParticles(x, y + 0.7, z, 8, 4.5, 2.5);
    audioManager.playImpact(strength * 0.08);
  }

  private addHeatFromCollision(stars: 1 | 2): void {
    if (this.wanted.level < stars) {
      this.wanted = {
        level: stars,
        heat: stars * 35,
        cooldown: 16,
        evading: false,
      };
      useGameStore.getState().showToast(`SBPD Alert: ${stars}-Star Wanted Level!`, 'magenta');
    }
  }

  private stepInteractAction(): string | null {
    if (!this.input.consumeJustPressed('KeyE')) return null;
    audioManager.unlock();

    // 1. If currently driving, exit car
    if (this.activeVehicle) {
      this.exitVehicle(false);
      return null;
    }

    // 2. Check nearby interactables first if very close, or nearby vehicle
    const nearestVeh = this.findNearestVehicle(5.2);
    let nearestInter = null as (typeof INTERACTABLES)[number] | null;
    let bestInterDist = Infinity;
    for (const item of INTERACTABLES) {
      const d = Math.hypot(item.x - this.playerX, item.z - this.playerZ);
      if (d <= item.radius && d < bestInterDist) {
        bestInterDist = d;
        nearestInter = item;
      }
    }

    if (nearestVeh && (!nearestInter || Math.hypot(nearestVeh.x - this.playerX, nearestVeh.z - this.playerZ) <= bestInterDist)) {
      this.enterVehicle(nearestVeh);
      return null;
    }

    if (nearestInter) {
      const store = useGameStore.getState();
      // Direct mission triggers for NPC / Race Start / Relay Terminal
      if (nearestInter.id === 'npc_sofia' && store.mission.missionId !== 'M02') {
        store.launchMission('M02');
        return nearestInter.id;
      }
      if (nearestInter.id === 'race_start' && store.mission.missionId !== 'M03') {
        store.launchMission('M03');
        return nearestInter.id;
      }
      if (nearestInter.id === 'tech_terminal') {
        if (store.mission.missionId !== 'M04') {
          store.launchMission('M04');
        }
        store.setOverlay('puzzle');
        return nearestInter.id;
      }
      if (nearestInter.id === 'npc_jalen' && store.mission.missionId !== 'M05') {
        store.launchMission('M05');
        return nearestInter.id;
      }
      if (nearestInter.type === 'social_spot') {
        store.openSocialSpot(nearestInter.label);
        return nearestInter.id;
      }
      store.openInteractable(nearestInter);
      return nearestInter.id;
    }

    return null;
  }

  private stepTrafficAndCityLife(dt: number): void {
    // 1. Traffic signal phase cycle (every 8 seconds)
    this.trafficLightTimer += dt;
    if (this.trafficLightTimer > 8) {
      this.trafficLightTimer = 0;
      this.trafficNSGreen = !this.trafficNSGreen;
      const greenHex = 0x22c55e;
      const redHex = 0xef4444;
      for (const m of this.cityProps.trafficLightsNS) {
        m.color.setHex(this.trafficNSGreen ? greenHex : redHex);
        m.emissive.setHex(this.trafficNSGreen ? greenHex : redHex);
      }
      for (const m of this.cityProps.trafficLightsEW) {
        m.color.setHex(this.trafficNSGreen ? redHex : greenHex);
        m.emissive.setHex(this.trafficNSGreen ? redHex : greenHex);
      }
    }

    // 2. NPC Traffic along RoadGraph lanes
    for (const t of this.traffic) {
      if (!t.active) continue;
      const dx = t.toNode.x - t.fromNode.x;
      const dz = t.toNode.z - t.fromNode.z;
      const segLen = Math.hypot(dx, dz) || 1;
      const isNS = Math.abs(dz) > Math.abs(dx);

      // Pause near red intersection lights
      const nearEnd = t.t > 0.78 && t.t < 0.94;
      const redLight = nearEnd && (isNS ? !this.trafficNSGreen : this.trafficNSGreen);
      const nearPlayer = Math.hypot(t.x - this.playerX, t.z - this.playerZ) < 7.5;

      const targetSpd = redLight || nearPlayer ? 0 : t.maxSpeed;
      t.speed += (targetSpd - t.speed) * Math.min(1, 5 * dt);
      t.t += (t.speed * dt) / segLen;

      if (t.t >= 1) {
        t.t = 0;
        const prevId = t.fromNode.id;
        t.fromNode = t.toNode;
        const candidates = t.fromNode.neighbors.filter((id) => id !== prevId);
        const pickId =
          candidates.length > 0
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : t.fromNode.neighbors[0];
        t.toNode = SOLARA_ROAD_GRAPH.nodes.get(pickId) ?? t.fromNode;
      }

      // Offset into right-hand driving lane (3.4m to right of road centerline)
      const dirX = dx / segLen;
      const dirZ = dz / segLen;
      const rightX = -dirZ;
      const rightZ = dirX;
      t.x = t.fromNode.x + dx * t.t + rightX * 3.4;
      t.z = t.fromNode.z + dz * t.t + rightZ * 3.4;
      t.yaw = Math.atan2(-dirX, -dirZ);

      const y = groundHeightAt(t.x, t.z);
      t.rig.root.position.set(t.x, y, t.z);
      t.rig.root.rotation.y = t.yaw;
      for (const w of t.rig.wheelMeshes) {
        w.rotation.x -= t.speed * dt * 2.3;
      }
    }

    // 3. Pedestrians (walk / idle / flee from fast nearby car)
    const carSpeed = this.activeVehicle ? Math.abs(this.activeVehicle.speed) : 0;
    for (const p of this.pedestrians) {
      if (!p.active) continue;
      const distPlayer = Math.hypot(p.x - this.playerX, p.z - this.playerZ);
      if (this.activeVehicle && carSpeed > 7 && distPlayer < 9.5) {
        p.state = 'flee';
        p.stateTimer = 2.8;
      }

      p.stateTimer -= dt;
      let moveSpd = 0;
      if (p.state === 'flee') {
        const awayX = p.x - this.playerX;
        const awayZ = p.z - this.playerZ;
        const len = Math.hypot(awayX, awayZ) || 1;
        moveSpd = 5.0;
        const col = resolveCircleWorldCollision(
          p.x + (awayX / len) * moveSpd * dt,
          p.z + (awayZ / len) * moveSpd * dt,
          0.45
        );
        p.x = col.x;
        p.z = col.z;
        p.yaw = Math.atan2(-awayX, -awayZ);
        if (p.stateTimer <= 0) p.state = 'walk';
      } else if (p.state === 'walk') {
        const dx = p.targetX - p.x;
        const dz = p.targetZ - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 1.2 || p.stateTimer <= 0) {
          p.state = 'idle';
          p.stateTimer = 1.8 + Math.random() * 2.5;
          p.targetX = p.homeX + (Math.random() - 0.5) * 32;
          p.targetZ = p.homeZ + (Math.random() - 0.5) * 32;
        } else {
          moveSpd = p.speed;
          const col = resolveCircleWorldCollision(
            p.x + (dx / dist) * moveSpd * dt,
            p.z + (dz / dist) * moveSpd * dt,
            0.45
          );
          p.x = col.x;
          p.z = col.z;
          p.yaw = Math.atan2(-dx, -dz);
        }
      } else {
        if (p.stateTimer <= 0) {
          p.state = 'walk';
          p.stateTimer = 6 + Math.random() * 4;
        }
      }

      p.gait += moveSpd * dt * 2.4;
      p.rig.root.position.set(p.x, groundHeightAt(p.x, p.z), p.z);
      p.rig.root.rotation.y = p.yaw;
      animateCharacterRig(p.rig, moveSpd, p.gait, true, this.elapsedSec, 1);
    }

    // 4. Story NPC idle breathing
    for (const n of this.npcRigs) {
      animateCharacterRig(n.rig, 0, 0, true, this.elapsedSec, 1);
    }

    // 5. Police Patrol & Wanted Pursuit
    let nearestPoliceDist = Infinity;
    const strobeOn = Math.floor(this.elapsedSec * 7) % 2 === 0;

    for (const cop of this.police) {
      if (cop.rig.policeRedMat && cop.rig.policeBlueMat) {
        const chase = this.wanted.level > 0;
        cop.rig.policeRedMat.emissiveIntensity = chase ? (strobeOn ? 3.2 : 0.2) : 0.25;
        cop.rig.policeBlueMat.emissiveIntensity = chase ? (strobeOn ? 0.2 : 3.2) : 0.25;
      }

      if (this.wanted.level >= 2) {
        // Active pursuit toward player
        const dx = this.playerX - cop.x;
        const dz = this.playerZ - cop.z;
        const dist = Math.hypot(dx, dz) || 1;
        nearestPoliceDist = Math.min(nearestPoliceDist, dist);

        const targetSpd = dist > 10 ? 22 + this.wanted.level * 2.5 : 8;
        cop.speed += (targetSpd - cop.speed) * Math.min(1, 4 * dt);
        const col = resolveCircleWorldCollision(
          cop.x + (dx / dist) * cop.speed * dt,
          cop.z + (dz / dist) * cop.speed * dt,
          1.95
        );
        cop.x = col.x;
        cop.z = col.z;
        cop.yaw = Math.atan2(-dx, -dz);
      } else {
        // Calm road patrol
        const dx = cop.toNode.x - cop.fromNode.x;
        const dz = cop.toNode.z - cop.fromNode.z;
        const segLen = Math.hypot(dx, dz) || 1;
        cop.speed = 11;
        cop.t += (cop.speed * dt) / segLen;
        if (cop.t >= 1) {
          cop.t = 0;
          const prev = cop.fromNode.id;
          cop.fromNode = cop.toNode;
          const opts = cop.fromNode.neighbors.filter((id) => id !== prev);
          const pick = opts[Math.floor(Math.random() * opts.length)] ?? cop.fromNode.neighbors[0];
          cop.toNode = SOLARA_ROAD_GRAPH.nodes.get(pick) ?? cop.fromNode;
        }
        cop.x = cop.fromNode.x + dx * cop.t;
        cop.z = cop.fromNode.z + dz * cop.t;
        cop.yaw = Math.atan2(-dx, -dz);
        nearestPoliceDist = Math.min(nearestPoliceDist, Math.hypot(this.playerX - cop.x, this.playerZ - cop.z));
      }

      const y = groundHeightAt(cop.x, cop.z);
      cop.rig.root.position.set(cop.x, y, cop.z);
      cop.rig.root.rotation.y = cop.yaw;
      for (const w of cop.rig.wheelMeshes) {
        w.rotation.x -= cop.speed * dt * 2.3;
      }
    }

    if (this.wanted.level > 0) {
      const prevLevel = this.wanted.level;
      this.wanted = stepWantedState(this.wanted, nearestPoliceDist, dt);
      if (prevLevel > 0 && this.wanted.level === 0) {
        useGameStore.getState().showToast('Pursuit Evaded — Wanted Level Cleared', 'emerald');
        audioManager.playChime();
      }
    }
  }

  private stepParticlesAndWorldFX(dt: number): void {
    // Rotate Solara Ferris Wheel on Palm Beach Pier & Coastline Airport ATC radar dish
    this.cityProps.ferrisWheelGroup.rotation.x += dt * 0.24;
    this.cityProps.airportRadarDish.rotation.y += dt * 1.15;

    // Weather-driven ocean wave animation (calm turquoise -> choppy rain swells)
    const waveAmp = this.lastWeatherParams.waveAmplitude;
    const pos = this.cityProps.oceanGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const ox = pos.getX(i);
      const oz = pos.getZ(i);
      pos.setY(
        i,
        (Math.sin(ox * 0.02 + this.elapsedSec * (1.4 + waveAmp * 0.3)) * 0.22 +
          Math.cos(oz * 0.025 + this.elapsedSec * 1.1) * 0.18) *
          waveAmp
      );
    }
    pos.needsUpdate = true;

    // Subtle Palm Beach surf foam wash & Central Park fountain plume pulse
    this.cityProps.surfFoamMesh.position.x = -294 + Math.sin(this.elapsedSec * 1.3) * 1.6;
    const fScale = 0.92 + Math.sin(this.elapsedSec * 6.0) * 0.1;
    this.cityProps.fountainWaterMesh.scale.set(fScale, 0.94 + Math.cos(this.elapsedSec * 5.2) * 0.12, fScale);

    // Mission beacon spin
    if (this.cityProps.missionBeacon.visible) {
      this.cityProps.missionBeacon.rotation.y += dt * 1.1;
    }

    // Pooled 3D Falling Rain Streaks centered around camera/player (excluding camera lens near-zone)
    const rainInt = this.lastWeatherParams.rainIntensity;
    if (rainInt > 0.025) {
      this.rainMesh.visible = true;
      this.rainMat.opacity = Math.min(0.48, rainInt * 0.48);
      const centerX = this.camera.position.x * 0.35 + this.playerX * 0.65;
      const centerZ = this.camera.position.z * 0.35 + this.playerZ * 0.65;
      const camX = this.camera.position.x;
      const camZ = this.camera.position.z;
      const baseY = Math.max(0, this.playerY);
      const windX = -4.2 * rainInt;

      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 3;
        let rx = this.rainOffsets[idx] + windX * dt;
        let ry = this.rainOffsets[idx + 1] - this.rainSpeeds[i] * dt;
        const rz = this.rainOffsets[idx + 2];

        if (ry < 0) ry += 26;
        if (rx < -27) rx += 54;
        else if (rx > 27) rx -= 54;

        this.rainOffsets[idx] = rx;
        this.rainOffsets[idx + 1] = ry;

        const wx = centerX + rx;
        const wz = centerZ + rz;
        const dxCam = wx - camX;
        const dzCam = wz - camZ;

        // Hide drops inside 5.2m of the camera lens so no oversized streaks block the viewport
        if (dxCam * dxCam + dzCam * dzCam < 27.0) {
          _dummy.position.set(wx, -100, wz);
          _dummy.scale.setScalar(0.001);
        } else {
          _dummy.position.set(wx, baseY + ry, wz);
          _dummy.rotation.set(0, 0, -0.15);
          _dummy.scale.set(1, 0.8 + rainInt * 0.45, 1);
        }
        _dummy.updateMatrix();
        this.rainMesh.setMatrixAt(i, _dummy.matrix);
      }
      this.rainMesh.instanceMatrix.needsUpdate = true;
    } else if (this.rainMesh.visible) {
      this.rainMesh.visible = false;
    }

    // Update pooled impact/drift particles
    let dirty = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _dummy.position.set(0, -100, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 2.2 * dt;
      const frac = 1 - p.life / p.maxLife;
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.setScalar(p.scale * frac);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
    }
    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateWeatherAndAtmosphere(dt: number): void {
    const wp = this.weatherManager.update(dt, this.timeOfDayHours);
    this.lastWeatherParams = wp;

    // If auto-weather cycled, keep Zustand store UI in sync
    const store = useGameStore.getState();
    if (store.weather !== wp.condition) {
      store.setWeather(wp.condition, true);
    }

    // Compute Sun direction vector from simulated time-of-day
    const sunAngle = ((this.timeOfDayHours - 6) / 24) * Math.PI * 2;
    const sunElev = Math.sin(sunAngle);
    const sunDist = 140;
    const sunY = Math.max(26, Math.abs(sunElev) * 120 + 24);
    const sunOffX = Math.cos(sunAngle) * sunDist;
    const sunOffZ = 65;

    this.sunLight.position.set(this.playerX + sunOffX, sunY, this.playerZ + sunOffZ);
    this.sunLight.target.position.set(this.playerX, 0, this.playerZ);

    // Update procedural SkyDome shader uniforms (convert sRGB hex tuples into linear working space)
    this.cityProps.skyDomeMesh.position.copy(this.camera.position);
    const u = this.cityProps.skyUniforms;
    u.uZenithColor.value.setRGB(wp.zenithColor.r, wp.zenithColor.g, wp.zenithColor.b, THREE.SRGBColorSpace);
    u.uHorizonColor.value.setRGB(wp.horizonColor.r, wp.horizonColor.g, wp.horizonColor.b, THREE.SRGBColorSpace);
    u.uSunGlowColor.value.setRGB(wp.sunGlowColor.r, wp.sunGlowColor.g, wp.sunGlowColor.b, THREE.SRGBColorSpace);
    _sunDir.set(sunOffX, Math.max(12, sunElev * 115 + 16), sunOffZ).normalize();
    u.uSunDir.value.copy(_sunDir);
    u.uCloudCover.value = wp.cloudCover;
    u.uTime.value = this.elapsedSec;

    // Update Scene Background & Atmospheric Fog distances/color (in linear working space)
    _skyCol.setRGB(wp.horizonColor.r, wp.horizonColor.g, wp.horizonColor.b, THREE.SRGBColorSpace);
    _fogCol.setRGB(wp.fogColor.r, wp.fogColor.g, wp.fogColor.b, THREE.SRGBColorSpace);
    (this.scene.background as THREE.Color).copy(_skyCol);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(_fogCol);
      this.scene.fog.near = wp.fogNear;
      this.scene.fog.far = wp.fogFar;
    }

    // Update Directional Sun, Hemisphere Fill, Rim Light, Environment IBL & ACES Exposure
    _sunCol.setRGB(wp.sunColor.r, wp.sunColor.g, wp.sunColor.b, THREE.SRGBColorSpace);
    _hemiSky.setRGB(wp.hemiSkyColor.r, wp.hemiSkyColor.g, wp.hemiSkyColor.b, THREE.SRGBColorSpace);
    _hemiGround.setRGB(wp.hemiGroundColor.r, wp.hemiGroundColor.g, wp.hemiGroundColor.b, THREE.SRGBColorSpace);
    _rimCol.setRGB(wp.rimColor.r, wp.rimColor.g, wp.rimColor.b, THREE.SRGBColorSpace);

    this.sunLight.color.copy(_sunCol);
    this.sunLight.intensity = wp.sunIntensity;
    this.hemiLight.color.copy(_hemiSky);
    this.hemiLight.groundColor.copy(_hemiGround);
    this.hemiLight.intensity = wp.hemiIntensity;
    this.rimLight.color.copy(_rimCol);
    this.rimLight.intensity = wp.rimIntensity;
    this.scene.environmentIntensity = wp.envIntensity;
    this.renderer.toneMappingExposure = wp.exposure;

    // Live-update Surface PBR Material Properties (preserving baseColor on dark intersections & binding wet sheen maps only when wet)
    const shouldUseWetMaps = wp.wetness > 0.18;
    const toggleWetMaps = shouldUseWetMaps !== this.wetMapsActive;
    if (toggleWetMaps) {
      this.wetMapsActive = shouldUseWetMaps;
    }

    for (const entry of this.cityProps.roadMaterials) {
      entry.mat.roughness = wp.roadRoughness;
      entry.mat.metalness = wp.roadMetalness;
      entry.mat.color.copy(entry.baseColor).multiplyScalar(wp.roadTint);
      if (toggleWetMaps && entry.wetRoughnessMap) {
        entry.mat.roughnessMap = shouldUseWetMaps ? entry.wetRoughnessMap : null;
        entry.mat.needsUpdate = true;
      }
    }
    for (const entry of this.cityProps.sidewalkMaterials) {
      entry.mat.roughness = wp.sidewalkRoughness;
      entry.mat.metalness = wp.sidewalkMetalness;
      entry.mat.color.copy(entry.baseColor).multiplyScalar(wp.sidewalkTint);
    }
    const buildingBrightness = THREE.MathUtils.clamp(store.settings.buildingBrightness ?? 1.12, 0.75, 1.45);
    for (const mat of this.cityProps.buildingSurfaceMats) {
      const base = mat.userData.baseColor as THREE.Color | undefined;
      if (base) {
        mat.color.copy(base).multiplyScalar(buildingBrightness);
      }
    }
    for (const mat of this.cityProps.interiorLightMats) {
      mat.emissiveIntensity = (0.62 + wp.emissiveBoost * 0.62) * buildingBrightness;
    }
    for (const mat of this.cityProps.glassMaterials) {
      mat.roughness = wp.glassRoughness;
      mat.emissiveIntensity = (0.22 + wp.emissiveBoost * 0.78) * buildingBrightness;
    }
    this.cityProps.oceanMaterial.roughness = wp.oceanRoughness;

    // Streetlights & Club Solara neon brighten automatically during dusk, night, haze, and rainstorms
    this.cityProps.streetLightBulbsMat.emissiveIntensity = 0.24 + wp.emissiveBoost * 2.2;
    this.cityProps.neonNightMat.emissiveIntensity = 0.82 + wp.emissiveBoost * 1.55;

    // Update dynamic post-processing shader pipeline (bloom, contrast, split-tone color grading)
    if (this.postPipeline) {
      this.postPipeline.update(dt, this.timeOfDayHours, wp);
    }
  }

  private updateCamera(dt: number, screen: string): void {
    if (screen === 'title') {
      // Atmospheric Live World Camera Tour panning smoothly over Palm Beach & Solara Bay skyline
      this.titleFlyAngle += dt * 0.08;
      const cx = -175 + Math.cos(this.titleFlyAngle) * 65;
      const cz = 115 + Math.sin(this.titleFlyAngle) * 55;
      const cy = 58 + Math.sin(this.titleFlyAngle * 1.4) * 6;
      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(-12, 16, -34);
      return;
    }

    const settings = useGameStore.getState().settings;
    const sens = 0.0048 * settings.mouseSensitivity;
    this.camYaw -= (this.input.lookDeltaX + this.input.touch.lookDeltaX) * sens;
    this.camPitch = THREE.MathUtils.clamp(
      this.camPitch + (this.input.lookDeltaY + this.input.touch.lookDeltaY) * sens * 0.8,
      -0.12,
      0.85
    );
    if (this.input.wheelDelta !== 0) {
      this.camZoom = THREE.MathUtils.clamp(this.camZoom + this.input.wheelDelta * 0.08, 0.72, 1.45);
    }

    const mode = CAMERA_MODES[this.camModeIdx];
    const inVeh = this.activeVehicle !== null;
    const isPortraitMode = !inVeh && mode.isPortrait;
    const baseDist = (inVeh ? mode.driveDist : mode.dist) * this.camZoom;
    const baseH = inVeh ? mode.driveHeight : mode.height;

    // Look target (character chest/head in portrait mode, shoulder in chase, or car roof)
    _vCamTarget.set(
      this.playerX,
      this.playerY + (inVeh ? 1.45 : isPortraitMode ? 1.32 : 1.55),
      this.playerZ
    );

    let desX: number;
    let desY: number;
    let desZ: number;
    if (isPortraitMode) {
      // Front-3/4 character portrait inspection view (allows smooth orbit with mouse)
      const portraitAngle = this.playerYaw + Math.PI - 0.34 + (this.camYaw - this.playerYaw);
      desX = _vCamTarget.x + Math.sin(portraitAngle) * baseDist;
      desZ = _vCamTarget.z + Math.cos(portraitAngle) * baseDist;
      desY = Math.max(groundHeightAt(desX, desZ) + 0.8, this.playerY + baseH + this.camPitch * 0.45);
    } else {
      // Desired spherical chase offset behind player
      const horizDist = Math.cos(this.camPitch) * baseDist;
      const vertDist = Math.sin(this.camPitch) * baseDist + baseH * 0.45;
      desX = _vCamTarget.x + Math.sin(this.camYaw) * horizDist;
      desZ = _vCamTarget.z + Math.cos(this.camYaw) * horizDist;
      desY = Math.max(groundHeightAt(desX, desZ) + 0.85, _vCamTarget.y + vertDist);
    }

    // Simple camera wall pull-in check against static building AABBs
    const col = resolveCircleWorldCollision(desX, desZ, 0.9, STATIC_COLLIDERS);
    if (col.hit) {
      desX = THREE.MathUtils.lerp(_vCamTarget.x, col.x, 0.65);
      desZ = THREE.MathUtils.lerp(_vCamTarget.z, col.z, 0.65);
    }

    _vCamDesired.set(desX, desY, desZ);

    // Exponential damping (smooth chase & orbit)
    const dampAlpha = 1 - Math.exp(-9.5 * dt);
    this.camera.position.lerp(_vCamDesired, dampAlpha);

    // Decaying trauma shake
    if (this.camShakeTrauma > 0.001) {
      this.camShakeTrauma = Math.max(0, this.camShakeTrauma - dt * 1.9);
      const mag = this.camShakeTrauma * this.camShakeTrauma * 0.45;
      this.camera.position.x += (Math.random() - 0.5) * mag;
      this.camera.position.y += (Math.random() - 0.5) * mag;
    }

    // Subtle speed FOV kick while driving fast, or telephoto 44deg framing in Portrait mode
    const targetFov = inVeh
      ? 58 + Math.min(12, Math.abs(this.activeVehicle!.speed) * 0.3)
      : isPortraitMode
        ? 44
        : 58;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-6 * dt));
      this.camera.updateProjectionMatrix();
    }

    this.camera.lookAt(_vCamTarget);
  }

  private syncLiveSnapshot(forceRoute = false): void {
    const store = useGameStore.getState();

    LIVE_WORLD_SNAPSHOT.playerX = this.playerX;
    LIVE_WORLD_SNAPSHOT.playerZ = this.playerZ;
    LIVE_WORLD_SNAPSHOT.playerYaw = this.playerYaw;
    LIVE_WORLD_SNAPSHOT.cameraYaw = this.camYaw;
    LIVE_WORLD_SNAPSHOT.inVehicle = this.activeVehicle !== null;

    LIVE_WORLD_SNAPSHOT.vehicles = this.vehicles.map((v) => ({
      id: v.id,
      x: v.x,
      z: v.z,
      yaw: v.yaw,
      archetype: v.archetype,
    }));
    LIVE_WORLD_SNAPSHOT.traffic = this.traffic
      .filter((t) => t.active)
      .map((t) => ({ x: t.x, z: t.z, yaw: t.yaw }));
    LIVE_WORLD_SNAPSHOT.police = this.police.map((c) => ({
      x: c.x,
      z: c.z,
      yaw: c.yaw,
      active: this.wanted.level > 0,
    }));

    const mTarget = store.mission.target;
    LIVE_WORLD_SNAPSHOT.missionTarget = mTarget ? { x: mTarget.x, z: mTarget.z, label: mTarget.label } : null;
    LIVE_WORLD_SNAPSHOT.customWaypoint = store.customWaypoint;

    // Position the 3D golden mission sky pillar
    if (mTarget) {
      this.cityProps.missionBeacon.visible = true;
      this.cityProps.missionBeacon.position.set(mTarget.x, groundHeightAt(mTarget.x, mTarget.z), mTarget.z);
    } else if (store.customWaypoint) {
      this.cityProps.missionBeacon.visible = true;
      this.cityProps.missionBeacon.position.set(
        store.customWaypoint.x,
        groundHeightAt(store.customWaypoint.x, store.customWaypoint.z),
        store.customWaypoint.z
      );
    } else {
      this.cityProps.missionBeacon.visible = false;
    }

    // Recompute A* cyan GPS route every ~0.35s (or on demand)
    const gpsDest = store.customWaypoint ?? mTarget;
    if (forceRoute || this.routeSyncAccum >= 0.35) {
      this.routeSyncAccum = 0;
      if (gpsDest) {
        const res = SOLARA_ROAD_GRAPH.findRoute(this.playerX, this.playerZ, gpsDest.x, gpsDest.z);
        LIVE_WORLD_SNAPSHOT.routeNodes = res.nodes;
        LIVE_WORLD_SNAPSHOT.routeDistance = res.totalDistance;
      } else {
        LIVE_WORLD_SNAPSHOT.routeNodes = [];
        LIVE_WORLD_SNAPSHOT.routeDistance = 0;
      }
    }
  }

  private pushHudTelemetry(): void {
    const district = getDistrictAt(this.playerX, this.playerZ);
    const inVeh = this.activeVehicle !== null;

    // Contextual prompt check (only when on foot, or exit prompt when slow in vehicle)
    let nearbyPrompt: {
      kind: 'vehicle' | 'interactable';
      id: string;
      label: string;
      sublabel: string;
    } | null = null;

    if (!inVeh) {
      const nearestVeh = this.findNearestVehicle(5.2);
      let nearestInter = null as (typeof INTERACTABLES)[number] | null;
      let bestInterDist = Infinity;
      for (const item of INTERACTABLES) {
        const d = Math.hypot(item.x - this.playerX, item.z - this.playerZ);
        if (d <= item.radius && d < bestInterDist) {
          bestInterDist = d;
          nearestInter = item;
        }
      }

      if (
        nearestVeh &&
        (!nearestInter || Math.hypot(nearestVeh.x - this.playerX, nearestVeh.z - this.playerZ) <= bestInterDist)
      ) {
        nearbyPrompt = {
          kind: 'vehicle',
          id: nearestVeh.id,
          label: `Enter ${VEHICLE_SPECS[nearestVeh.archetype].name}`,
          sublabel: 'Press [E] to drive',
        };
      } else if (nearestInter) {
        nearbyPrompt = {
          kind: 'interactable',
          id: nearestInter.id,
          label: nearestInter.label,
          sublabel: nearestInter.sublabel,
        };
      }
    }

    useGameStore.getState().updateTelemetry({
      playerX: Math.round(this.playerX),
      playerZ: Math.round(this.playerZ),
      playerYaw: this.playerYaw,
      districtName: district.name,
      inVehicle: inVeh,
      vehicleName: inVeh ? VEHICLE_SPECS[this.activeVehicle!.archetype].name : '',
      vehicleArchetype: inVeh ? this.activeVehicle!.archetype : 'sedan',
      speedKmh: inVeh ? Math.round(Math.abs(this.activeVehicle!.speed) * 3.6) : 0,
      gear: inVeh ? this.activeVehicle!.gear : '1',
      vehicleHealth: inVeh ? Math.round((this.activeVehicle!.health / this.activeVehicle!.maxHealth) * 100) : 100,
      health: Math.round(this.health),
      stamina: Math.round(this.stamina),
      wantedLevel: this.wanted.level,
      wantedEvading: this.wanted.evading,
      timeOfDayHours: this.timeOfDayHours,
      cameraModeName: CAMERA_MODES[this.camModeIdx].name,
      nearbyPrompt,
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTimeMs) / 1000;
    this.lastTimeMs = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05); // Clamped dt <= 0.05s
    this.elapsedSec += dt;

    this.handleGlobalShortcuts();
    const store = useGameStore.getState();

    const isActivelyPlaying = store.screen === 'playing' && store.overlay === null;

    // Advance day/night cycle & weather state (12 real minutes = 24 game hours at 1x speed)
    if (store.screen === 'playing' || store.screen === 'title') {
      const simMultiplier = store.screen === 'title' ? 0.15 : store.settings.daySpeedMultiplier;
      this.timeOfDayHours = (this.timeOfDayHours + (24 / 720) * simMultiplier * dt) % 24;
      this.updateWeatherAndAtmosphere(dt);
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
    } else if (isActivelyPlaying) {
      const interactedId = this.stepInteractAction();

      if (this.activeVehicle) {
        this.stepDriving(dt);
      } else {
        this.stepPlayerOnFoot(dt);
      }

      this.stepTrafficAndCityLife(dt);

      // Tick mission state machine
      if (store.mission.phase === 'active') {
        const out = tickMissionState(store.mission, {
          playerX: this.playerX,
          playerZ: this.playerZ,
          inVehicle: this.activeVehicle !== null,
          vehicleSpeed: this.activeVehicle?.speed ?? 0,
          wantedLevel: this.wanted.level,
          dt,
          interactedId,
        });
        if (out.state !== store.mission) {
          store.setMission(out.state);
        }
        if (out.playChime) audioManager.playChime();
        if (out.openPuzzle) store.setOverlay('puzzle');
        if (out.setWantedLevel !== undefined) {
          this.wanted = {
            level: out.setWantedLevel,
            heat: out.setWantedLevel * 40,
            cooldown: out.setWantedLevel > 0 ? 18 : 0,
            evading: false,
          };
        }
        if (out.justCompleted) {
          audioManager.playMissionComplete();
          store.completeMission(
            out.justCompleted.missionId,
            out.justCompleted.title,
            out.justCompleted.reward
          );
        } else if (out.justFailed) {
          store.failMission(out.justFailed.missionId, out.justFailed.reason);
        }
      }

      // Clear custom waypoint when player arrives within 12m
      if (store.customWaypoint) {
        const dWp = Math.hypot(store.customWaypoint.x - this.playerX, store.customWaypoint.z - this.playerZ);
        if (dWp < 12) {
          store.setCustomWaypoint(null);
          store.showToast('Arrived at Waypoint', 'cyan');
          audioManager.playChime();
        }
      }

      audioManager.updateContinuous(
        this.activeVehicle !== null,
        this.activeVehicle?.speed ?? 0,
        this.wanted.level,
        this.playerX < -165,
        dt,
        this.lastWeatherParams.rainIntensity
      );
    } else if (store.screen === 'title') {
      // Keep traffic & ocean alive during Title Screen panorama
      this.stepTrafficAndCityLife(dt * 0.75);
    }

    this.stepParticlesAndWorldFX(dt);
    this.updateCamera(dt, store.screen);
    this.cityProps.skyDomeMesh.position.copy(this.camera.position);

    // Sync minimap snapshot & throttled React HUD (<= 10Hz)
    this.routeSyncAccum += dt;
    this.syncLiveSnapshot(false);

    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.1) {
      this.hudSyncAccum = 0;
      this.pushHudTelemetry();
    }

    this.input.clearFrameDeltas();
    if (this.postPipeline) {
      this.postPipeline.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // Software WebGL fenceSync pacing vs GPU requestAnimationFrame
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private onResize(): void {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.postPipeline) {
      this.postPipeline.setSize(w, h);
      this.postPipeline.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.boundResize);
    this.input.detach();
    this.postPipeline?.dispose();
    this.textures.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
