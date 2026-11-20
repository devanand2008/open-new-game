import { MIDNIGHT_CIRCUIT_LOOP, MISSIONS, type MissionDef } from './MissionData';

export type MissionPhase =
  | 'idle'
  | 'active'
  | 'puzzle'
  | 'completed'
  | 'failed';

export interface ActiveMissionState {
  missionId: MissionDef['id'] | null;
  phase: MissionPhase;
  stepIndex: number;
  objectiveText: string;
  target: { x: number; z: number; radius: number; label: string } | null;
  timeRemaining: number | null;
  lap: number;
  totalLaps: number;
  checkpointIndex: number;
  totalCheckpoints: number;
  failReason: string | null;
  triggerWantedLevel?: 0 | 1 | 2 | 3;
}

export interface MissionTickContext {
  playerX: number;
  playerZ: number;
  inVehicle: boolean;
  vehicleSpeed: number;
  wantedLevel: number;
  dt: number;
  interactedId?: string | null;
  puzzleSolved?: boolean;
}

export interface MissionTickOutput {
  state: ActiveMissionState;
  justCompleted?: { missionId: MissionDef['id']; reward: number; title: string };
  justFailed?: { missionId: MissionDef['id']; reason: string };
  openPuzzle?: boolean;
  setWantedLevel?: 0 | 1 | 2 | 3;
  playChime?: boolean;
}

export function createIdleMissionState(): ActiveMissionState {
  return {
    missionId: null,
    phase: 'idle',
    stepIndex: 0,
    objectiveText: 'Free Roam Solara Bay — Open Phone [Tab] to start a mission',
    target: null,
    timeRemaining: null,
    lap: 0,
    totalLaps: 0,
    checkpointIndex: 0,
    totalCheckpoints: 0,
    failReason: null,
  };
}

export function startMissionState(missionId: MissionDef['id']): ActiveMissionState {
  switch (missionId) {
    case 'M01':
      return {
        missionId: 'M01',
        phase: 'active',
        stepIndex: 0,
        objectiveText: 'Walk to your parked Solara GT Sedan and press [E] to enter',
        target: { x: -36.5, z: 25.5, radius: 5.5, label: 'Solara GT Sedan' },
        timeRemaining: null,
        lap: 0,
        totalLaps: 0,
        checkpointIndex: 0,
        totalCheckpoints: 0,
        failReason: null,
      };
    case 'M02':
      return {
        missionId: 'M02',
        phase: 'active',
        stepIndex: 0,
        objectiveText: 'Meet Sofia Ramirez at Club Solara in Marina Crescent',
        target: { x: 96, z: 204, radius: 6.5, label: 'Sofia Ramirez' },
        timeRemaining: null,
        lap: 0,
        totalLaps: 0,
        checkpointIndex: 0,
        totalCheckpoints: 0,
        failReason: null,
      };
    case 'M03':
      return {
        missionId: 'M03',
        phase: 'active',
        stepIndex: 0,
        objectiveText: 'Drive to the Midnight Circuit starting grid on Palm Beach Blvd',
        target: { x: -204, z: 44, radius: 9.0, label: 'Race Start Grid' },
        timeRemaining: null,
        lap: 1,
        totalLaps: 3,
        checkpointIndex: 0,
        totalCheckpoints: MIDNIGHT_CIRCUIT_LOOP.length * 3,
        failReason: null,
      };
    case 'M04':
      return {
        missionId: 'M04',
        phase: 'active',
        stepIndex: 0,
        objectiveText: 'Reach the Solara Relay Terminal in Downtown Tech Plaza (Switch to Lena with [Q] optional)',
        target: { x: 24, z: -104, radius: 5.5, label: 'Relay Terminal' },
        timeRemaining: null,
        lap: 0,
        totalLaps: 0,
        checkpointIndex: 0,
        totalCheckpoints: 0,
        failReason: null,
      };
    case 'M05':
      return {
        missionId: 'M05',
        phase: 'active',
        stepIndex: 0,
        objectiveText: 'Cross the canal bridge to Ironport Docks and meet Jalen Carter',
        target: { x: 234, z: 56, radius: 7.5, label: 'Jalen Carter · Pier 4' },
        timeRemaining: null,
        lap: 0,
        totalLaps: 0,
        checkpointIndex: 0,
        totalCheckpoints: 0,
        failReason: null,
      };
  }
}

export function tickMissionState(
  state: ActiveMissionState,
  ctx: MissionTickContext
): MissionTickOutput {
  if (state.phase !== 'active' && state.phase !== 'puzzle') {
    return { state };
  }
  if (!state.missionId) return { state };

  const def = MISSIONS.find((m) => m.id === state.missionId)!;
  let next: ActiveMissionState = { ...state };
  let playChime = false;
  let openPuzzle = false;
  let setWantedLevel: 0 | 1 | 2 | 3 | undefined;

  // Timer countdown check
  if (next.timeRemaining !== null && state.phase === 'active') {
    next.timeRemaining = Math.max(0, next.timeRemaining - ctx.dt);
    if (next.timeRemaining <= 0) {
      next.phase = 'failed';
      next.failReason = 'Time expired before reaching the objective.';
      return {
        state: next,
        justFailed: { missionId: def.id, reason: next.failReason },
      };
    }
  }

  const distToTarget = next.target
    ? Math.hypot(ctx.playerX - next.target.x, ctx.playerZ - next.target.z)
    : Infinity;

  // --- M01: FIRST DAY IN SOLARA ---
  if (def.id === 'M01') {
    if (next.stepIndex === 0) {
      if (ctx.inVehicle) {
        next.stepIndex = 1;
        next.objectiveText = 'Drive to Downtown Garage and park inside the golden bay';
        next.target = { x: 84, z: -44, radius: 8.5, label: 'Downtown Garage' };
        playChime = true;
      }
    } else if (next.stepIndex === 1) {
      if (ctx.inVehicle && distToTarget <= (next.target?.radius ?? 8) && Math.abs(ctx.vehicleSpeed) < 6) {
        next.phase = 'completed';
        next.objectiveText = 'Mission Complete — Solara Downtown Garage unlocked!';
        next.target = null;
        return {
          state: next,
          playChime: true,
          justCompleted: { missionId: def.id, reward: def.reward, title: def.title },
        };
      }
    }
  }

  // --- M02: CITY COURIER ---
  if (def.id === 'M02') {
    if (next.stepIndex === 0) {
      if (distToTarget <= (next.target?.radius ?? 6.5) || ctx.interactedId === 'npc_sofia') {
        next.stepIndex = 1;
        next.timeRemaining = def.timeLimitSec ?? 95;
        next.objectiveText = 'Deliver Sofia’s encrypted case to the Palm Beach Promenade before time runs out!';
        next.target = { x: -214, z: -42, radius: 9.0, label: 'Palm Beach Drop-Off' };
        playChime = true;
      }
    } else if (next.stepIndex === 1) {
      if (distToTarget <= (next.target?.radius ?? 9.0)) {
        next.phase = 'completed';
        next.objectiveText = 'Package delivered on time!';
        next.target = null;
        return {
          state: next,
          playChime: true,
          justCompleted: { missionId: def.id, reward: def.reward, title: def.title },
        };
      }
    }
  }

  // --- M03: MIDNIGHT CIRCUIT (3-Lap Street Race) ---
  if (def.id === 'M03') {
    if (next.stepIndex === 0) {
      if (ctx.inVehicle && distToTarget <= (next.target?.radius ?? 9.0)) {
        next.stepIndex = 1;
        next.lap = 1;
        next.checkpointIndex = 0;
        next.timeRemaining = def.timeLimitSec ?? 160;
        const cp = MIDNIGHT_CIRCUIT_LOOP[0];
        next.target = { ...cp };
        next.objectiveText = `Lap 1/3 — Checkpoint 1/${MIDNIGHT_CIRCUIT_LOOP.length}: ${cp.label}`;
        playChime = true;
      }
    } else if (next.stepIndex === 1) {
      if (ctx.inVehicle && distToTarget <= (next.target?.radius ?? 13)) {
        const nextCpTotal = next.checkpointIndex + 1;
        const totalAll = MIDNIGHT_CIRCUIT_LOOP.length * next.totalLaps;
        playChime = true;
        if (nextCpTotal >= totalAll) {
          next.phase = 'completed';
          next.checkpointIndex = totalAll;
          next.objectiveText = 'Midnight Circuit Champion! 3 Laps Completed!';
          next.target = null;
          return {
            state: next,
            playChime: true,
            justCompleted: { missionId: def.id, reward: def.reward, title: def.title },
          };
        } else {
          next.checkpointIndex = nextCpTotal;
          next.lap = Math.floor(nextCpTotal / MIDNIGHT_CIRCUIT_LOOP.length) + 1;
          const lapCpIdx = nextCpTotal % MIDNIGHT_CIRCUIT_LOOP.length;
          const cp = MIDNIGHT_CIRCUIT_LOOP[lapCpIdx];
          next.target = { ...cp };
          next.objectiveText = `Lap ${next.lap}/${next.totalLaps} — Checkpoint ${lapCpIdx + 1}/${MIDNIGHT_CIRCUIT_LOOP.length}: ${cp.label}`;
        }
      }
    }
  }

  // --- M04: SIGNAL BREAK (Network Routing Mini-Puzzle) ---
  if (def.id === 'M04') {
    if (next.stepIndex === 0) {
      if (distToTarget <= (next.target?.radius ?? 5.5) || ctx.interactedId === 'tech_terminal') {
        next.stepIndex = 1;
        next.phase = 'puzzle';
        next.objectiveText = 'Route the cyan signal from IN to OUT on the Solara Relay Grid';
        openPuzzle = true;
        playChime = true;
      }
    } else if (next.stepIndex === 1 && ctx.puzzleSolved) {
      next.phase = 'completed';
      next.objectiveText = 'Relay Decrypted — Ironport Security Gate Unlocked!';
      next.target = null;
      return {
        state: next,
        playChime: true,
        justCompleted: { missionId: def.id, reward: def.reward, title: def.title },
      };
    }
  }

  // --- M05: HARBOR EXCHANGE (Docks Pickup + Police Evasion) ---
  if (def.id === 'M05') {
    if (next.stepIndex === 0) {
      if (distToTarget <= (next.target?.radius ?? 7.5) || ctx.interactedId === 'npc_jalen') {
        next.stepIndex = 1;
        next.objectiveText = 'Collect the Shipping Manifest Crate near the red Ironport containers';
        next.target = { x: 258, z: 30, radius: 6.5, label: 'Manifest Crate' };
        playChime = true;
      }
    } else if (next.stepIndex === 1) {
      if (distToTarget <= (next.target?.radius ?? 6.5)) {
        next.stepIndex = 2;
        next.objectiveText = 'SBPD Patrol alerted! Lose the 2-star pursuit or return to the Safehouse';
        next.target = { x: -54, z: 42, radius: 10, label: 'Solara Safehouse' };
        setWantedLevel = 2;
        playChime = true;
      }
    } else if (next.stepIndex === 2) {
      if (ctx.wantedLevel === 0 || distToTarget <= (next.target?.radius ?? 10)) {
        next.phase = 'completed';
        next.objectiveText = 'Pursuit evaded! Harbor Exchange complete!';
        next.target = null;
        setWantedLevel = 0;
        return {
          state: next,
          playChime: true,
          setWantedLevel: 0,
          justCompleted: { missionId: def.id, reward: def.reward, title: def.title },
        };
      }
    }
  }

  return { state: next, playChime, openPuzzle, setWantedLevel };
}

// =========================================================================
// M04: SIGNAL BREAK — 4x4 Network Conduit Routing Puzzle (Pure Logic)
// =========================================================================
// Pipe types: 'straight' (connects N-S at rot 0), 'corner' (connects N-E at rot 0),
// 'tee' (connects N-E-S at rot 0), 'cross' (connects all 4).
// Directions: 0=North, 1=East, 2=South, 3=West.

export type PipeType = 'straight' | 'corner' | 'tee' | 'cross';

export interface CircuitTile {
  type: PipeType;
  rotation: 0 | 1 | 2 | 3; // clockwise 90deg steps
  locked?: boolean;
}

const BASE_CONNECTIONS: Record<PipeType, number[]> = {
  straight: [0, 2],
  corner: [0, 1],
  tee: [0, 1, 2],
  cross: [0, 1, 2, 3],
};

export function getTileOpenSides(tile: CircuitTile): number[] {
  return BASE_CONNECTIONS[tile.type].map((dir) => (dir + tile.rotation) % 4);
}

/**
 * Creates a deterministic, always-solvable 4x4 Signal Break board
 * Source enters West side of (row=0, col=0); Target exits East side of (row=3, col=3).
 */
export function createSignalPuzzleGrid(): CircuitTile[][] {
  // Guaranteed solution path: (0,0)->(0,1)->(1,1)->(1,2)->(2,2)->(2,3)->(3,3)
  return [
    [
      { type: 'straight', rotation: 0 }, // needs rot 1 (W-E)
      { type: 'corner', rotation: 0 }, // needs rot 2 (S-W)
      { type: 'corner', rotation: 1 },
      { type: 'straight', rotation: 0 },
    ],
    [
      { type: 'tee', rotation: 2 },
      { type: 'corner', rotation: 1 }, // needs rot 0 (N-E)
      { type: 'corner', rotation: 0 }, // needs rot 2 (S-W)
      { type: 'straight', rotation: 1 },
    ],
    [
      { type: 'corner', rotation: 0 },
      { type: 'straight', rotation: 1 },
      { type: 'corner', rotation: 2 }, // needs rot 0 (N-E)
      { type: 'corner', rotation: 3 }, // needs rot 2 (S-W)
    ],
    [
      { type: 'straight', rotation: 0 },
      { type: 'tee', rotation: 0 },
      { type: 'corner', rotation: 1 },
      { type: 'corner', rotation: 2 }, // needs rot 0 (N-E) -> exits East!
    ],
  ];
}

export function rotatePuzzleTile(grid: CircuitTile[][], r: number, c: number): CircuitTile[][] {
  return grid.map((row, ri) =>
    row.map((tile, ci) =>
      ri === r && ci === c
        ? { ...tile, rotation: ((tile.rotation + 1) % 4) as 0 | 1 | 2 | 3 }
        : tile
    )
  );
}

export function evaluateSignalPuzzle(grid: CircuitTile[][]): {
  powered: boolean[][];
  solved: boolean;
} {
  const rows = grid.length;
  const cols = grid[0].length;
  const powered = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));

  // Source enters West side (dir 3) of (0,0)
  const startSides = getTileOpenSides(grid[0][0]);
  if (!startSides.includes(3)) {
    return { powered, solved: false };
  }

  const queue: Array<[number, number]> = [[0, 0]];
  powered[0][0] = true;

  const dr = [-1, 0, 1, 0];
  const dc = [0, 1, 0, -1];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const open = getTileOpenSides(grid[r][c]);
    for (const dir of open) {
      const nr = r + dr[dir];
      const nc = c + dc[dir];
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (powered[nr][nc]) continue;
      const opposite = (dir + 2) % 4;
      const neighborOpen = getTileOpenSides(grid[nr][nc]);
      if (neighborOpen.includes(opposite)) {
        powered[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }

  const endSides = getTileOpenSides(grid[rows - 1][cols - 1]);
  const solved = powered[rows - 1][cols - 1] && endSides.includes(1); // Exits East side of (3,3)
  return { powered, solved };
}
