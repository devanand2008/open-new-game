import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSignalPuzzleGrid,
  evaluateSignalPuzzle,
  rotatePuzzleTile,
  startMissionState,
  tickMissionState,
} from './MissionEngine';

test('M01 progresses from entering car to parking at Downtown Garage and rewards cash', () => {
  let state = startMissionState('M01');
  assert.equal(state.phase, 'active');
  assert.equal(state.stepIndex, 0);

  // Enter vehicle
  let out = tickMissionState(state, {
    playerX: -28,
    playerZ: 24,
    inVehicle: true,
    vehicleSpeed: 0,
    wantedLevel: 0,
    dt: 0.05,
  });
  state = out.state;
  assert.equal(state.stepIndex, 1);
  assert.equal(out.playChime, true);

  // Park inside Downtown Garage (84, -44)
  out = tickMissionState(state, {
    playerX: 84,
    playerZ: -44,
    inVehicle: true,
    vehicleSpeed: 0.5,
    wantedLevel: 0,
    dt: 0.05,
  });
  assert.equal(out.state.phase, 'completed');
  assert.equal(out.justCompleted?.missionId, 'M01');
  assert.equal(out.justCompleted?.reward, 500);
});

test('M02 fails cleanly if countdown timer expires before delivery', () => {
  let state = startMissionState('M02');
  // Meet Sofia
  let out = tickMissionState(state, {
    playerX: 96,
    playerZ: 204,
    inVehicle: false,
    vehicleSpeed: 0,
    wantedLevel: 0,
    dt: 0.05,
  });
  state = out.state;
  assert.equal(state.stepIndex, 1);
  assert.ok(state.timeRemaining !== null && state.timeRemaining > 0);

  // Expire timer
  out = tickMissionState(state, {
    playerX: 0,
    playerZ: 0,
    inVehicle: true,
    vehicleSpeed: 10,
    wantedLevel: 0,
    dt: 120,
  });
  assert.equal(out.state.phase, 'failed');
  assert.equal(out.justFailed?.missionId, 'M02');
});

test('M04 Signal Break 4x4 network puzzle solves cleanly with valid tile rotations', () => {
  let grid = createSignalPuzzleGrid();
  assert.equal(evaluateSignalPuzzle(grid).solved, false);

  // Rotate solution path tiles:
  // (0,0) straight 0 -> 1 (1 click)
  grid = rotatePuzzleTile(grid, 0, 0);
  // (0,1) corner 0 -> 2 (2 clicks)
  grid = rotatePuzzleTile(grid, 0, 1);
  grid = rotatePuzzleTile(grid, 0, 1);
  // (1,1) corner 1 -> 0 (3 clicks)
  grid = rotatePuzzleTile(grid, 1, 1);
  grid = rotatePuzzleTile(grid, 1, 1);
  grid = rotatePuzzleTile(grid, 1, 1);
  // (1,2) corner 0 -> 2 (2 clicks)
  grid = rotatePuzzleTile(grid, 1, 2);
  grid = rotatePuzzleTile(grid, 1, 2);
  // (2,2) corner 2 -> 0 (2 clicks)
  grid = rotatePuzzleTile(grid, 2, 2);
  grid = rotatePuzzleTile(grid, 2, 2);
  // (2,3) corner 3 -> 2 (3 clicks)
  grid = rotatePuzzleTile(grid, 2, 3);
  grid = rotatePuzzleTile(grid, 2, 3);
  grid = rotatePuzzleTile(grid, 2, 3);
  // (3,3) corner 2 -> 0 (2 clicks)
  grid = rotatePuzzleTile(grid, 3, 3);
  grid = rotatePuzzleTile(grid, 3, 3);

  const res = evaluateSignalPuzzle(grid);
  assert.equal(res.solved, true, 'expected rotated conduit path from (0,0) West to (3,3) East to solve puzzle');
});

test('M05 Harbor Exchange triggers 2-star pursuit on crate pickup and completes on evasion', () => {
  let state = startMissionState('M05');
  // Meet Jalen
  state = tickMissionState(state, {
    playerX: 234,
    playerZ: 56,
    inVehicle: false,
    vehicleSpeed: 0,
    wantedLevel: 0,
    dt: 0.05,
  }).state;
  assert.equal(state.stepIndex, 1);

  // Pick up manifest crate
  let out = tickMissionState(state, {
    playerX: 258,
    playerZ: 30,
    inVehicle: false,
    vehicleSpeed: 0,
    wantedLevel: 0,
    dt: 0.05,
  });
  state = out.state;
  assert.equal(state.stepIndex, 2);
  assert.equal(out.setWantedLevel, 2);

  // Evade police (wantedLevel reaches 0)
  out = tickMissionState(state, {
    playerX: 0,
    playerZ: 0,
    inVehicle: true,
    vehicleSpeed: 15,
    wantedLevel: 0,
    dt: 0.05,
  });
  assert.equal(out.state.phase, 'completed');
  assert.equal(out.justCompleted?.reward, 1800);
});
