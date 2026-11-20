import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groundHeightAt,
  isInCanalWater,
  isOnCanalBridge,
  resolveCircleWorldCollision,
  stepVehicleKinematics,
  stepWantedState,
  type AABBCollider,
} from './CollisionPhysics';

test('resolveCircleWorldCollision pushes actor out of static building AABB', () => {
  const box: AABBCollider[] = [{ id: 'test_b', minX: -10, maxX: 10, minZ: -10, maxZ: 10, height: 20 }];
  const res = resolveCircleWorldCollision(9.5, 0, 1.0, box);
  assert.equal(res.hit, true);
  assert.ok(res.x >= 10.99, `expected x pushed outside box + radius, got ${res.x}`);
});

test('canal bridges elevate smoothly and are not treated as canal water', () => {
  assert.equal(isOnCanalBridge(152, 0), true);
  assert.equal(isInCanalWater(152, 0), false);
  assert.ok(groundHeightAt(152, 0) > 1.2, 'bridge deck should arch above water');

  assert.equal(isOnCanalBridge(152, 40), false);
  assert.equal(isInCanalWater(152, 40), true);
});

test('stepVehicleKinematics accelerates, shifts gears, steers, and stops on handbrake', () => {
  let state = {
    x: -40,
    z: 80,
    yaw: 0,
    speed: 0,
    steerAngle: 0,
    gear: '1',
    drifting: false,
  };

  for (let i = 0; i < 60; i++) {
    state = stepVehicleKinematics(state, { throttle: 1, steer: 0.25, handbrake: false }, 'sedan', 0.05, []).next;
  }

  assert.ok(state.speed > 15, `expected sedan to accelerate > 15 m/s, got ${state.speed}`);
  assert.notEqual(state.yaw, 0, 'expected steering to change heading');
  assert.notEqual(state.gear, 'R');

  // Apply handbrake
  for (let i = 0; i < 40; i++) {
    state = stepVehicleKinematics(state, { throttle: 0, steer: 0, handbrake: true }, 'sedan', 0.05, []).next;
  }
  assert.ok(state.speed < 0.5, `expected handbrake to stop car, got ${state.speed}`);
});

test('wanted level decays when player evades outside police sight distance', () => {
  let wanted = { level: 2 as 0 | 1 | 2 | 3, heat: 50, cooldown: 5, evading: false };
  // Police close -> stays level 2, not evading
  wanted = stepWantedState(wanted, 30, 1.0);
  assert.equal(wanted.level, 2);
  assert.equal(wanted.evading, false);

  // Police far away -> evading ticks down and drops star
  for (let i = 0; i < 30; i++) {
    wanted = stepWantedState(wanted, 220, 1.0);
  }
  assert.ok(wanted.level < 2, `expected wanted level to decay when far from police, got ${wanted.level}`);
});
