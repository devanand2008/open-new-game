import { PLAYER_SPAWN, type VehicleArchetype } from '../world/WorldConfig';
import type { WeatherCondition } from '../weather/WeatherManager';

export const SAVE_VERSION = 1;
export const SAVE_STORAGE_KEY = 'project_coastline_solara_save_v1';

export type GraphicsPreset = 'low' | 'medium' | 'high';
export type PlayableCharacterId = 'marco' | 'lena';

export interface GameSettings {
  graphicsPreset: GraphicsPreset;
  resolutionScale: number; // 0.6 to 1.0
  masterVolume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
  ambientVolume: number; // 0 to 1
  muted: boolean;
  mouseSensitivity: number; // 0.3 to 2.0
  touchControls: 'auto' | 'on' | 'off';
  minimapRotate: boolean;
  reducedCameraShake: boolean;
  fontScale: 'normal' | 'large';
  daySpeedMultiplier: number; // 1 = 12 min/day
  autoWeatherCycle: boolean;
  postProcessing: boolean;
  buildingBrightness: number; // 0.75 to 1.45
}

export interface SaveDataV1 {
  version: number;
  savedAt: number;
  playerPos: { x: number; y: number; z: number; yaw: number };
  character: PlayableCharacterId;
  marcoOutfitId: string;
  lenaOutfitId: string;
  unlockedOutfits: string[];
  ownedVehicle: VehicleArchetype;
  money: number;
  health: number;
  stamina: number;
  completedMissions: string[];
  activeMissionId: string | null;
  timeOfDayHours: number; // 0..24
  weather: WeatherCondition;
  settings: GameSettings;
}

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsPreset: 'medium',
  resolutionScale: 1.0,
  masterVolume: 0.7,
  sfxVolume: 0.8,
  ambientVolume: 0.55,
  muted: false,
  mouseSensitivity: 1.0,
  touchControls: 'auto',
  minimapRotate: true,
  reducedCameraShake: false,
  fontScale: 'normal',
  daySpeedMultiplier: 1.0,
  autoWeatherCycle: false,
  postProcessing: true,
  buildingBrightness: 1.04,
};

export function createDefaultSaveData(): SaveDataV1 {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    playerPos: { ...PLAYER_SPAWN },
    character: 'marco',
    marcoOutfitId: 'operator',
    lenaOutfitId: 'street_tech',
    unlockedOutfits: ['operator', 'street_tech'],
    ownedVehicle: 'sedan',
    money: 250,
    health: 100,
    stamina: 100,
    completedMissions: [],
    activeMissionId: 'M01',
    timeOfDayHours: 16.75, // Iconic Solara Bay golden-hour late afternoon
    weather: 'clear',
    settings: { ...DEFAULT_SETTINGS },
  };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function serializeSaveData(data: SaveDataV1): string {
  return JSON.stringify({
    ...data,
    version: SAVE_VERSION,
    savedAt: Date.now(),
  });
}

export function parseSaveData(raw: string | null): SaveDataV1 | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SaveDataV1>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.version !== 'number') {
      return null;
    }
    const base = createDefaultSaveData();
    const pos =
      parsed.playerPos &&
      typeof parsed.playerPos.x === 'number' &&
      typeof parsed.playerPos.z === 'number'
        ? {
            x: parsed.playerPos.x,
            y: typeof parsed.playerPos.y === 'number' ? parsed.playerPos.y : 0,
            z: parsed.playerPos.z,
            yaw: typeof parsed.playerPos.yaw === 'number' ? parsed.playerPos.yaw : 0,
          }
        : base.playerPos;

    return {
      version: SAVE_VERSION,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      playerPos: pos,
      character: parsed.character === 'lena' ? 'lena' : 'marco',
      marcoOutfitId: typeof parsed.marcoOutfitId === 'string' ? parsed.marcoOutfitId : base.marcoOutfitId,
      lenaOutfitId: typeof parsed.lenaOutfitId === 'string' ? parsed.lenaOutfitId : base.lenaOutfitId,
      unlockedOutfits: Array.isArray(parsed.unlockedOutfits)
        ? parsed.unlockedOutfits.filter((x): x is string => typeof x === 'string')
        : base.unlockedOutfits,
      ownedVehicle:
        parsed.ownedVehicle && ['sedan', 'coupe', 'suv', 'motorcycle', 'truck'].includes(parsed.ownedVehicle)
          ? parsed.ownedVehicle
          : 'sedan',
      money: typeof parsed.money === 'number' && Number.isFinite(parsed.money) ? Math.max(0, Math.round(parsed.money)) : base.money,
      health: typeof parsed.health === 'number' ? Math.max(10, Math.min(100, parsed.health)) : 100,
      stamina: typeof parsed.stamina === 'number' ? Math.max(0, Math.min(100, parsed.stamina)) : 100,
      completedMissions: Array.isArray(parsed.completedMissions)
        ? parsed.completedMissions.filter((x): x is string => typeof x === 'string')
        : [],
      activeMissionId:
        typeof parsed.activeMissionId === 'string' || parsed.activeMissionId === null
          ? parsed.activeMissionId
          : 'M01',
      timeOfDayHours:
        typeof parsed.timeOfDayHours === 'number' && Number.isFinite(parsed.timeOfDayHours)
          ? ((parsed.timeOfDayHours % 24) + 24) % 24
          : base.timeOfDayHours,
      weather:
        parsed.weather === 'hazy' || parsed.weather === 'rain' || parsed.weather === 'clear'
          ? parsed.weather
          : 'clear',
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}),
      },
    };
  } catch {
    return null;
  }
}

export class SaveManager {
  private storage: StorageLike | null;

  constructor(storage?: StorageLike) {
    if (storage) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = null;
    }
  }

  public hasSave(): boolean {
    if (!this.storage) return false;
    return parseSaveData(this.storage.getItem(SAVE_STORAGE_KEY)) !== null;
  }

  public save(data: SaveDataV1): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(SAVE_STORAGE_KEY, serializeSaveData(data));
      return true;
    } catch {
      return false;
    }
  }

  public load(): SaveDataV1 | null {
    if (!this.storage) return null;
    return parseSaveData(this.storage.getItem(SAVE_STORAGE_KEY));
  }

  public clear(): void {
    this.storage?.removeItem(SAVE_STORAGE_KEY);
  }
}

export const saveManager = new SaveManager();
