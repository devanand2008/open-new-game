import { CANAL_HALF_WIDTH, CANAL_X, CITY_BUILDINGS, type StaticBuildingDef, type VehicleArchetype } from '../world/WorldConfig';
import { WORLD_PLAYABLE_BOUNDS } from '../world/Districts';

export interface AABBCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

export interface VehicleHandlingSpec {
  name: string;
  maxSpeed: number; // m/s (~28 m/s = 100 km/h)
  reverseSpeed: number;
  accel: number;
  brakeDecel: number;
  drag: number;
  turnRate: number; // rad/s
  radius: number;
  maxHealth: number;
}

export const VEHICLE_SPECS: Record<VehicleArchetype, VehicleHandlingSpec> = {
  sedan: {
    name: 'Solara GT Sedan',
    maxSpeed: 34,
    reverseSpeed: 10,
    accel: 19,
    brakeDecel: 32,
    drag: 0.72,
    turnRate: 2.35,
    radius: 1.95,
    maxHealth: 100,
  },
  coupe: {
    name: 'Veloce RS Coupe',
    maxSpeed: 42,
    reverseSpeed: 11,
    accel: 25,
    brakeDecel: 38,
    drag: 0.66,
    turnRate: 2.65,
    radius: 1.85,
    maxHealth: 95,
  },
  suv: {
    name: 'Coastal Terrain SUV',
    maxSpeed: 29,
    reverseSpeed: 9,
    accel: 16,
    brakeDecel: 28,
    drag: 0.85,
    turnRate: 2.0,
    radius: 2.25,
    maxHealth: 140,
  },
  motorcycle: {
    name: 'Apex Street Moto',
    maxSpeed: 44,
    reverseSpeed: 5,
    accel: 29,
    brakeDecel: 36,
    drag: 0.58,
    turnRate: 3.1,
    radius: 1.1,
    maxHealth: 65,
  },
  truck: {
    name: 'Ironport Utility Truck',
    maxSpeed: 24,
    reverseSpeed: 8,
    accel: 12,
    brakeDecel: 24,
    drag: 0.95,
    turnRate: 1.7,
    radius: 2.55,
    maxHealth: 180,
  },
  police: {
    name: 'SBPD Interceptor',
    maxSpeed: 37,
    reverseSpeed: 11,
    accel: 22,
    brakeDecel: 35,
    drag: 0.68,
    turnRate: 2.5,
    radius: 2.0,
    maxHealth: 130,
  },
};

export function createStaticColliders(buildings: StaticBuildingDef[] = CITY_BUILDINGS): AABBCollider[] {
  return buildings.map((b) => ({
    id: b.id,
    minX: b.x - b.w * 0.5,
    maxX: b.x + b.w * 0.5,
    minZ: b.z - b.d * 0.5,
    maxZ: b.z + b.d * 0.5,
    height: b.h,
  }));
}

export const STATIC_COLLIDERS: AABBCollider[] = createStaticColliders();

/**
 * Checks whether (x, z) is on one of the four canal bridges (z = -160, -80, 0, 160).
 */
export function isOnCanalBridge(x: number, z: number): boolean {
  if (Math.abs(x - CANAL_X) > CANAL_HALF_WIDTH + 8) return false;
  const bridgeZs = [-160, -80, 0, 160];
  for (const bz of bridgeZs) {
    if (Math.abs(z - bz) <= 10) return true;
  }
  return false;
}

/**
 * Checks whether (x, z) is inside open canal water (not on a bridge).
 */
export function isInCanalWater(x: number, z: number): boolean {
  if (z < -175 || z > 270) return false;
  if (Math.abs(x - CANAL_X) < CANAL_HALF_WIDTH - 1.2 && !isOnCanalBridge(x, z)) {
    return true;
  }
  return false;
}

/**
 * Continuous ground height query across Solara Bay:
 * - City core: y = 0
 * - Canal bridges: gentle arch up to +1.8m
 * - Palm Beach western shoreline (x < -230): slopes smoothly down toward ocean (-1.2m)
 * - North Ridge hills (z < -185): rises smoothly into coastal foothills
 */
export function groundHeightAt(x: number, z: number): number {
  // Canal bridge arch
  if (Math.abs(x - CANAL_X) <= CANAL_HALF_WIDTH + 8) {
    const bridgeZs = [-160, -80, 0, 160];
    for (const bz of bridgeZs) {
      if (Math.abs(z - bz) <= 10) {
        const t = Math.max(0, 1 - Math.abs(x - CANAL_X) / (CANAL_HALF_WIDTH + 8));
        return Math.sin(t * Math.PI * 0.5) * 1.8;
      }
    }
  }

  // Solara Pier deck over western ocean (z in [12, 28], x in [-340, -235])
  if (x <= -232 && x >= -345 && z >= 12 && z <= 28) {
    return 1.25;
  }

  // Western beach gentle sand slope
  if (x < -232) {
    const t = Math.min(1, (-232 - x) / 68);
    return -t * 1.4;
  }

  // Northern foothills slope (North Ridge backdrop)
  if (z < -185) {
    const t = Math.min(1, (-185 - z) / 140);
    const wave = Math.sin(x * 0.025) * 2.5 + Math.cos(x * 0.013) * 3.0;
    return t * t * 24 + Math.max(0, wave * t);
  }

  return 0;
}

export interface CollisionResolveResult {
  x: number;
  z: number;
  hit: boolean;
  hitNormalX: number;
  hitNormalZ: number;
}

/**
 * Resolves a circular actor/vehicle against static AABB buildings, canal water barriers,
 * and outer playable island bounds so nothing walks/drives through walls or sinks into the ocean.
 */
export function resolveCircleWorldCollision(
  x: number,
  z: number,
  radius: number,
  colliders: AABBCollider[] = STATIC_COLLIDERS
): CollisionResolveResult {
  let rx = x;
  let rz = z;
  let hit = false;
  let hitNormalX = 0;
  let hitNormalZ = 0;

  // 1. Static AABB buildings
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    const closestX = Math.max(c.minX, Math.min(rx, c.maxX));
    const closestZ = Math.max(c.minZ, Math.min(rz, c.maxZ));
    const dx = rx - closestX;
    const dz = rz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      hit = true;
      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        const nx = dx / dist;
        const nz = dz / dist;
        rx += nx * push;
        rz += nz * push;
        hitNormalX = nx;
        hitNormalZ = nz;
      } else {
        // Center is inside AABB — push out along shallowest axis
        const penLeft = Math.abs(rx - c.minX);
        const penRight = Math.abs(c.maxX - rx);
        const penTop = Math.abs(rz - c.minZ);
        const penBottom = Math.abs(c.maxZ - rz);
        const minPen = Math.min(penLeft, penRight, penTop, penBottom);
        if (minPen === penLeft) {
          rx = c.minX - radius;
          hitNormalX = -1;
        } else if (minPen === penRight) {
          rx = c.maxX + radius;
          hitNormalX = 1;
        } else if (minPen === penTop) {
          rz = c.minZ - radius;
          hitNormalZ = -1;
        } else {
          rz = c.maxZ + radius;
          hitNormalZ = 1;
        }
      }
    }
  }

  // 2. Canal water embankment guard (keep cars/peds out of deep canal unless on a bridge)
  if (isInCanalWater(rx, rz)) {
    hit = true;
    if (rx < CANAL_X) {
      rx = CANAL_X - CANAL_HALF_WIDTH - radius * 0.2;
      hitNormalX = -1;
    } else {
      rx = CANAL_X + CANAL_HALF_WIDTH + radius * 0.2;
      hitNormalX = 1;
    }
  }

  // 3. Playable district boundary soft-clamping (with pier allowance on Palm Beach)
  const onPier = rz >= 13.5 && rz <= 26.5 && rx < -230;
  const minAllowedX = onPier ? -338 : -278; // Stop at water's edge on Palm Beach
  if (rx < minAllowedX) {
    rx = minAllowedX;
    hit = true;
    hitNormalX = 1;
  } else if (rx > WORLD_PLAYABLE_BOUNDS.maxX - 18) {
    rx = WORLD_PLAYABLE_BOUNDS.maxX - 18;
    hit = true;
    hitNormalX = -1;
  }
  if (rz < -210) {
    rz = -210;
    hit = true;
    hitNormalZ = 1;
  } else if (rz > 282) {
    rz = 282;
    hit = true;
    hitNormalZ = -1;
  }

  return { x: rx, z: rz, hit, hitNormalX, hitNormalZ };
}

export interface VehicleKinematicsState {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  steerAngle: number;
  gear: string;
  drifting: boolean;
}

export interface VehicleControlInput {
  throttle: number; // -1..1
  steer: number; // -1 (left) .. 1 (right)
  handbrake: boolean;
}

/**
 * Pure deterministic arcade vehicle step (unit-testable & used by live 3D simulation).
 */
export function stepVehicleKinematics(
  state: VehicleKinematicsState,
  input: VehicleControlInput,
  archetype: VehicleArchetype,
  dt: number,
  colliders: AABBCollider[] = STATIC_COLLIDERS
): { next: VehicleKinematicsState; impactSpeed: number } {
  const spec = VEHICLE_SPECS[archetype];
  let speed = state.speed;
  let yaw = state.yaw;

  // Acceleration / braking / reverse
  if (input.handbrake) {
    const brakeMag = spec.brakeDecel * 1.15 * dt;
    if (Math.abs(speed) <= brakeMag) speed = 0;
    else speed -= Math.sign(speed) * brakeMag;
  } else if (input.throttle > 0.05) {
    if (speed < -0.5) {
      speed = Math.min(0, speed + spec.brakeDecel * dt);
    } else {
      const accelFactor = 1 - Math.max(0, speed / spec.maxSpeed) * 0.45;
      speed = Math.min(spec.maxSpeed, speed + spec.accel * accelFactor * input.throttle * dt);
    }
  } else if (input.throttle < -0.05) {
    if (speed > 0.5) {
      speed = Math.max(0, speed - spec.brakeDecel * dt);
    } else {
      speed = Math.max(-spec.reverseSpeed, speed + spec.accel * 0.65 * input.throttle * dt);
    }
  } else {
    // Natural rolling drag
    const dragFactor = Math.exp(-spec.drag * dt);
    speed *= dragFactor;
    if (Math.abs(speed) < 0.08) speed = 0;
  }

  // Speed-sensitive steering
  const absSpeed = Math.abs(speed);
  const steerResponse = Math.min(1, absSpeed / 4.2) * (1 - Math.min(0.45, (absSpeed / spec.maxSpeed) * 0.38));
  const driftBoost = input.handbrake && absSpeed > 8 ? 1.38 : 1.0;
  const reverseSign = speed >= 0 ? 1 : -1;
  const targetSteerAngle = -input.steer * 0.52;
  const steerAngle = state.steerAngle + (targetSteerAngle - state.steerAngle) * Math.min(1, dt * 10);

  if (absSpeed > 0.15) {
    yaw -= input.steer * spec.turnRate * steerResponse * driftBoost * reverseSign * dt;
  }

  // Forward heading: yaw = 0 points toward -Z (North), yaw += turns left (CCW)
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const nextX = state.x + fx * speed * dt;
  const nextZ = state.z + fz * speed * dt;

  const col = resolveCircleWorldCollision(nextX, nextZ, spec.radius, colliders);
  let impactSpeed = 0;
  if (col.hit) {
    // Project velocity against collision normal
    const intoWall = -(fx * col.hitNormalX + fz * col.hitNormalZ) * speed;
    if (intoWall > 4) {
      impactSpeed = intoWall;
    }
    speed *= 0.42;
  }

  const kmh = Math.abs(speed) * 3.6;
  let gear = 'N';
  if (speed < -0.4) gear = 'R';
  else if (kmh < 2) gear = '1';
  else if (kmh < 25) gear = '1';
  else if (kmh < 50) gear = '2';
  else if (kmh < 78) gear = '3';
  else if (kmh < 105) gear = '4';
  else if (kmh < 132) gear = '5';
  else gear = '6';

  return {
    next: {
      x: col.x,
      z: col.z,
      yaw,
      speed,
      steerAngle,
      gear,
      drifting: input.handbrake && absSpeed > 9 && Math.abs(input.steer) > 0.2,
    },
    impactSpeed,
  };
}

export interface WantedState {
  level: 0 | 1 | 2 | 3;
  heat: number; // 0..100
  cooldown: number; // seconds hidden from police before dropping a star
  evading: boolean;
}

export function stepWantedState(
  state: WantedState,
  nearestPoliceDist: number,
  dt: number
): WantedState {
  if (state.level === 0) {
    return { level: 0, heat: 0, cooldown: 0, evading: false };
  }
  const safeDist = 72 + state.level * 14;
  const seen = nearestPoliceDist < safeDist;
  if (seen) {
    return {
      level: state.level,
      heat: Math.min(100, state.heat + dt * 4),
      cooldown: 14 + state.level * 4,
      evading: false,
    };
  }
  const nextCooldown = Math.max(0, state.cooldown - dt);
  if (nextCooldown <= 0) {
    const nextLevel = Math.max(0, state.level - 1) as 0 | 1 | 2 | 3;
    return {
      level: nextLevel,
      heat: nextLevel === 0 ? 0 : nextLevel * 28,
      cooldown: nextLevel > 0 ? 12 : 0,
      evading: nextLevel > 0,
    };
  }
  return {
    level: state.level,
    heat: Math.max(0, state.heat - dt * 2),
    cooldown: nextCooldown,
    evading: true,
  };
}
