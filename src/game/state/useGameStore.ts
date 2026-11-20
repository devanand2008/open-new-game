import { create } from 'zustand';
import {
  createDefaultSaveData,
  DEFAULT_SETTINGS,
  saveManager,
  type GameSettings,
  type PlayableCharacterId,
  type SaveDataV1,
} from '../save/SaveManager';
import {
  createIdleMissionState,
  startMissionState,
  type ActiveMissionState,
} from '../missions/MissionEngine';
import type { MissionDef } from '../missions/MissionData';
import type { InteractableDef, VehicleArchetype } from '../world/WorldConfig';
import { nextWeatherCondition, type WeatherCondition } from '../weather/WeatherManager';
import {
  addPostComment,
  createUserSocialPost,
  INITIAL_SOCIAL_POSTS,
  togglePostLike,
  togglePostRepost,
  type SocialPost,
} from '../social/SocialFeed';

export type PhoneTab = 'missions' | 'social' | 'crew' | 'messages';

export type ScreenMode = 'title' | 'playing' | 'paused' | 'gameover';
export type ActiveOverlay =
  | null
  | 'map'
  | 'phone'
  | 'settings'
  | 'controls'
  | 'puzzle'
  | 'interact'
  | 'outcome';

export interface HudTelemetry {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  districtName: string;
  inVehicle: boolean;
  vehicleName: string;
  vehicleArchetype: VehicleArchetype;
  speedKmh: number;
  gear: string;
  vehicleHealth: number;
  health: number;
  stamina: number;
  wantedLevel: 0 | 1 | 2 | 3;
  wantedEvading: boolean;
  timeOfDayHours: number;
  cameraModeName: string;
  nearbyPrompt: {
    kind: 'vehicle' | 'interactable';
    id: string;
    label: string;
    sublabel: string;
  } | null;
}

export interface OutcomeSnapshot {
  kind: 'mission_complete' | 'mission_failed' | 'busted';
  title: string;
  subtitle: string;
  reward: number;
  missionId?: MissionDef['id'];
}

export interface ToastNotice {
  id: number;
  text: string;
  accent: 'amber' | 'cyan' | 'emerald' | 'magenta';
}

export interface EngineCallbacks {
  startNewGame?: () => void;
  loadFromSave?: (save: SaveDataV1) => void;
  spawnGarageVehicle?: (archetype: VehicleArchetype) => void;
  repairActiveVehicle?: () => void;
  applyOutfit?: (charId: PlayableCharacterId, outfitId: string) => void;
  switchCharacter?: (charId: PlayableCharacterId) => void;
  clearWanted?: () => void;
  advanceTimeHours?: (deltaHours: number) => void;
  setTimeOfDayHours?: (hours: number) => void;
  cycleCamera?: () => void;
  triggerInteract?: () => void;
  triggerJump?: () => void;
  applySettings?: (settings: GameSettings) => void;
  setWeather?: (condition: WeatherCondition, immediate?: boolean) => void;
  solvePuzzleSuccess?: () => void;
  getLiveSaveData?: () => SaveDataV1;
  capturePhotoSnapshot?: () => string | null;
  fastTravel?: (x: number, z: number, yaw?: number) => void;
}

interface GameStoreState {
  screen: ScreenMode;
  overlay: ActiveOverlay;
  loadingStage: string | null;
  loadingPercent: number;
  hasSaveFile: boolean;

  // Player persistent progression
  character: PlayableCharacterId;
  marcoOutfitId: string;
  lenaOutfitId: string;
  unlockedOutfits: string[];
  ownedVehicle: VehicleArchetype;
  money: number;
  completedMissions: string[];
  mission: ActiveMissionState;
  customWaypoint: { x: number; z: number; label: string } | null;
  weather: WeatherCondition;

  // Active interactable modal context
  activeInteractable: InteractableDef | null;
  outcome: OutcomeSnapshot | null;
  toast: ToastNotice | null;

  // SolaraPulse Social Media & Phone Tab
  phoneTab: PhoneTab;
  socialPosts: SocialPost[];
  followers: number;

  // Settings
  settings: GameSettings;

  // Throttled live HUD telemetry (<= 10Hz)
  telemetry: HudTelemetry;

  // Imperative bridge to Three.js engine
  engine: EngineCallbacks;

  // Actions
  registerEngine: (cb: EngineCallbacks) => void;
  setLoading: (stage: string | null, percent: number) => void;
  setScreen: (screen: ScreenMode) => void;
  setOverlay: (overlay: ActiveOverlay) => void;
  setPhoneTab: (tab: PhoneTab) => void;
  openSocialSpot: (spotLabel: string) => void;
  toggleLikePost: (postId: string) => void;
  toggleRepostPost: (postId: string) => void;
  addCommentToPost: (postId: string, text: string) => void;
  publishSocialPhotoPost: (caption: string, photoDataUrl?: string) => void;
  startNewGame: () => void;
  continueSavedGame: () => void;
  saveCurrentGame: (silent?: boolean) => boolean;
  updateTelemetry: (patch: Partial<HudTelemetry>) => void;
  setMission: (mission: ActiveMissionState) => void;
  launchMission: (missionId: MissionDef['id']) => void;
  completeMission: (missionId: MissionDef['id'], title: string, reward: number) => void;
  failMission: (missionId: MissionDef['id'], reason: string) => void;
  setCustomWaypoint: (wp: { x: number; z: number; label: string } | null) => void;
  openInteractable: (item: InteractableDef) => void;
  addMoney: (delta: number) => void;
  spendMoney: (amount: number) => boolean;
  selectOutfit: (outfitId: string, price: number) => boolean;
  switchCharacter: (charId: PlayableCharacterId) => void;
  setOwnedVehicle: (v: VehicleArchetype) => void;
  updateSettings: (patch: Partial<GameSettings>) => void;
  setWeather: (condition: WeatherCondition, silent?: boolean) => void;
  cycleWeather: () => void;
  toggleMute: () => void;
  showToast: (text: string, accent?: ToastNotice['accent']) => void;
  setOutcome: (outcome: OutcomeSnapshot | null) => void;
}

const initialTelemetry: HudTelemetry = {
  playerX: -36,
  playerZ: 36,
  playerYaw: -0.75,
  districtName: 'Solara Downtown',
  inVehicle: false,
  vehicleName: 'Solara GT Sedan',
  vehicleArchetype: 'sedan',
  speedKmh: 0,
  gear: '1',
  vehicleHealth: 100,
  health: 100,
  stamina: 100,
  wantedLevel: 0,
  wantedEvading: false,
  timeOfDayHours: 16.75,
  cameraModeName: 'Standard',
  nearbyPrompt: null,
};

let toastSeq = 1;

function syncBodyState(screen: ScreenMode) {
  if (typeof document !== 'undefined') {
    document.body.dataset.state = screen;
  }
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  screen: 'title',
  overlay: null,
  loadingStage: 'Initializing Solara Bay WebGL engine…',
  loadingPercent: 10,
  hasSaveFile: saveManager.hasSave(),

  character: 'marco',
  marcoOutfitId: 'operator',
  lenaOutfitId: 'street_tech',
  unlockedOutfits: ['operator', 'street_tech'],
  ownedVehicle: 'sedan',
  money: 250,
  completedMissions: [],
  mission: startMissionState('M01'),
  customWaypoint: null,
  weather: saveManager.load()?.weather ?? 'clear',

  activeInteractable: null,
  outcome: null,
  toast: null,

  phoneTab: 'missions',
  socialPosts: INITIAL_SOCIAL_POSTS,
  followers: 1240,

  settings: saveManager.load()?.settings ?? { ...DEFAULT_SETTINGS },
  telemetry: initialTelemetry,
  engine: {},

  registerEngine: (cb) => set({ engine: cb }),

  setLoading: (stage, percent) => set({ loadingStage: stage, loadingPercent: percent }),

  setScreen: (screen) => {
    syncBodyState(screen);
    set({ screen, overlay: screen === 'playing' ? null : get().overlay });
  },

  setOverlay: (overlay) => set({ overlay }),

  setPhoneTab: (phoneTab) => set({ phoneTab }),

  openSocialSpot: (spotLabel) => {
    set({ phoneTab: 'social', overlay: 'phone' });
    get().showToast(`SolaraPulse Check-in: ${spotLabel}`, 'magenta');
  },

  toggleLikePost: (postId) =>
    set((s) => ({ socialPosts: togglePostLike(s.socialPosts, postId) })),

  toggleRepostPost: (postId) =>
    set((s) => ({ socialPosts: togglePostRepost(s.socialPosts, postId) })),

  addCommentToPost: (postId, text) =>
    set((s) => {
      const author = s.character === 'lena' ? 'Lena Park' : 'Marco Vega';
      const handle = s.character === 'lena' ? '@LenaPark_Tech' : '@MarcoVega';
      return { socialPosts: addPostComment(s.socialPosts, postId, author, handle, text) };
    }),

  publishSocialPhotoPost: (caption, photoDataUrl) => {
    const s = get();
    const author = s.character === 'lena' ? 'Lena Park' : 'Marco Vega';
    const handle = s.character === 'lena' ? '@LenaPark_Tech' : '@MarcoVega';
    const avatarColor = s.character === 'lena' ? '#d946ef' : '#f59e0b';
    const newPost = createUserSocialPost({
      author,
      handle,
      avatarColor,
      district: s.telemetry.districtName,
      worldX: s.telemetry.playerX,
      worldZ: s.telemetry.playerZ,
      caption,
      weather: s.weather,
      photoDataUrl,
    });
    set({
      socialPosts: [newPost, ...s.socialPosts],
      followers: s.followers + 85,
      money: s.money + 50,
    });
    s.showToast('Posted to @SolaraPulse (+85 Followers · +$50 Creator Bonus)', 'magenta');
  },

  startNewGame: () => {
    const fresh = createDefaultSaveData();
    const currentSettings = get().settings;
    syncBodyState('playing');
    set({
      screen: 'playing',
      overlay: null,
      character: fresh.character,
      marcoOutfitId: fresh.marcoOutfitId,
      lenaOutfitId: fresh.lenaOutfitId,
      unlockedOutfits: fresh.unlockedOutfits,
      ownedVehicle: fresh.ownedVehicle,
      money: fresh.money,
      completedMissions: [],
      mission: startMissionState('M01'),
      customWaypoint: null,
      outcome: null,
      activeInteractable: null,
      weather: 'clear',
      settings: currentSettings,
    });
    get().engine.startNewGame?.();
    get().showToast('Welcome to Solara Bay — Mission M01 Active', 'amber');
  },

  continueSavedGame: () => {
    const loaded = saveManager.load();
    if (!loaded) {
      get().startNewGame();
      return;
    }
    syncBodyState('playing');
    const nextMission =
      loaded.activeMissionId && ['M01', 'M02', 'M03', 'M04', 'M05'].includes(loaded.activeMissionId)
        ? startMissionState(loaded.activeMissionId as MissionDef['id'])
        : createIdleMissionState();

    set({
      screen: 'playing',
      overlay: null,
      character: loaded.character,
      marcoOutfitId: loaded.marcoOutfitId,
      lenaOutfitId: loaded.lenaOutfitId,
      unlockedOutfits: loaded.unlockedOutfits,
      ownedVehicle: loaded.ownedVehicle,
      money: loaded.money,
      completedMissions: loaded.completedMissions,
      mission: nextMission,
      customWaypoint: null,
      outcome: null,
      settings: loaded.settings,
      weather: loaded.weather,
      hasSaveFile: true,
    });
    get().engine.loadFromSave?.(loaded);
    get().showToast('Saved Solara Bay session restored', 'cyan');
  },

  saveCurrentGame: (silent = false) => {
    const s = get();
    const liveData = s.engine.getLiveSaveData?.();
    const payload: SaveDataV1 = liveData ?? {
      ...createDefaultSaveData(),
      playerPos: {
        x: s.telemetry.playerX,
        y: 0,
        z: s.telemetry.playerZ,
        yaw: s.telemetry.playerYaw,
      },
      character: s.character,
      marcoOutfitId: s.marcoOutfitId,
      lenaOutfitId: s.lenaOutfitId,
      unlockedOutfits: s.unlockedOutfits,
      ownedVehicle: s.ownedVehicle,
      money: s.money,
      health: s.telemetry.health,
      stamina: s.telemetry.stamina,
      completedMissions: s.completedMissions,
      activeMissionId: s.mission.missionId,
      timeOfDayHours: s.telemetry.timeOfDayHours,
      weather: s.weather,
      settings: s.settings,
    };
    const ok = saveManager.save(payload);
    if (ok) {
      set({ hasSaveFile: true });
      if (!silent) s.showToast('Progress saved to Solara Bay profile', 'emerald');
    }
    return ok;
  },

  updateTelemetry: (patch) =>
    set((state) => ({
      telemetry: { ...state.telemetry, ...patch },
    })),

  setMission: (mission) => set({ mission }),

  launchMission: (missionId) => {
    const m = startMissionState(missionId);
    set({
      mission: m,
      overlay: null,
      outcome: null,
      screen: 'playing',
    });
    syncBodyState('playing');
    get().showToast(`Mission Started: ${missionId}`, 'amber');
  },

  completeMission: (missionId, title, reward) => {
    const s = get();
    const alreadyDone = s.completedMissions.includes(missionId);
    const updatedCompleted = alreadyDone
      ? s.completedMissions
      : [...s.completedMissions, missionId];
    const earned = alreadyDone ? Math.round(reward * 0.5) : reward;
    set({
      money: s.money + earned,
      completedMissions: updatedCompleted,
      mission: createIdleMissionState(),
      overlay: 'outcome',
      outcome: {
        kind: 'mission_complete',
        title: `${missionId} COMPLETE`,
        subtitle: title,
        reward: earned,
        missionId,
      },
    });
    // Auto-save after mission completion
    setTimeout(() => get().saveCurrentGame(true), 50);
  },

  failMission: (missionId, reason) => {
    set({
      overlay: 'outcome',
      outcome: {
        kind: 'mission_failed',
        title: `${missionId} FAILED`,
        subtitle: reason,
        reward: 0,
        missionId,
      },
    });
  },

  setCustomWaypoint: (wp) => set({ customWaypoint: wp }),

  openInteractable: (item) => {
    set({ activeInteractable: item, overlay: 'interact' });
  },

  addMoney: (delta) => set((s) => ({ money: Math.max(0, Math.round(s.money + delta)) })),

  spendMoney: (amount) => {
    const s = get();
    if (s.money < amount) {
      s.showToast(`Insufficient funds ($${amount} required)`, 'magenta');
      return false;
    }
    set({ money: s.money - amount });
    return true;
  },

  selectOutfit: (outfitId, price) => {
    const s = get();
    const unlocked = s.unlockedOutfits.includes(outfitId);
    if (!unlocked) {
      if (s.money < price) {
        s.showToast(`Need $${price} to unlock outfit`, 'magenta');
        return false;
      }
      set({
        money: s.money - price,
        unlockedOutfits: [...s.unlockedOutfits, outfitId],
      });
    }
    if (s.character === 'marco') {
      set({ marcoOutfitId: outfitId });
    } else {
      set({ lenaOutfitId: outfitId });
    }
    s.engine.applyOutfit?.(s.character, outfitId);
    s.showToast('Outfit equipped!', 'cyan');
    return true;
  },

  switchCharacter: (charId) => {
    const s = get();
    if (s.character === charId) return;
    set({ character: charId });
    s.engine.switchCharacter?.(charId);
    s.showToast(
      charId === 'marco' ? 'Switched to Marco Vega · Street Operator' : 'Switched to Lena Park · Tech Specialist',
      'cyan'
    );
  },

  setOwnedVehicle: (v) => set({ ownedVehicle: v }),

  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    get().engine.applySettings?.(next);
  },

  setWeather: (condition, silent = false) => {
    set({ weather: condition });
    get().engine.setWeather?.(condition, false);
    if (!silent) {
      const label =
        condition === 'clear'
          ? 'Clear Tropical Skies'
          : condition === 'hazy'
            ? 'Coastal Golden Haze'
            : 'Solara Storm Rain';
      const accent = condition === 'rain' ? 'cyan' : condition === 'hazy' ? 'amber' : 'emerald';
      get().showToast(`Weather: ${label}`, accent);
    }
  },

  cycleWeather: () => {
    const next = nextWeatherCondition(get().weather);
    get().setWeather(next, false);
  },

  toggleMute: () => {
    const nextMuted = !get().settings.muted;
    get().updateSettings({ muted: nextMuted });
  },

  showToast: (text, accent = 'amber') => {
    const id = ++toastSeq;
    set({ toast: { id, text, accent } });
    setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null });
      }
    }, 3400);
  },

  setOutcome: (outcome) => set({ outcome, overlay: outcome ? 'outcome' : null }),
}));
