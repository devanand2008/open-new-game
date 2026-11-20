import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultSaveData,
  parseSaveData,
  SaveManager,
  serializeSaveData,
  type StorageLike,
} from './SaveManager';

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
  };
}

test('SaveManager round-trips player position, cash, missions, and settings', () => {
  const mgr = new SaveManager(createMemoryStorage());
  assert.equal(mgr.hasSave(), false);

  const data = createDefaultSaveData();
  data.money = 1750;
  data.character = 'lena';
  data.completedMissions = ['M01', 'M02'];
  data.playerPos = { x: 82, y: 0, z: -40, yaw: 1.2 };
  data.settings.graphicsPreset = 'high';

  assert.equal(mgr.save(data), true);
  assert.equal(mgr.hasSave(), true);

  const loaded = mgr.load();
  assert.ok(loaded);
  assert.equal(loaded.money, 1750);
  assert.equal(loaded.character, 'lena');
  assert.deepEqual(loaded.completedMissions, ['M01', 'M02']);
  assert.equal(loaded.playerPos.x, 82);
  assert.equal(loaded.settings.graphicsPreset, 'high');
});

test('parseSaveData rejects corrupt JSON and clamps out-of-range values', () => {
  assert.equal(parseSaveData('{bad json'), null);
  assert.equal(parseSaveData('{}'), null);

  const valid = createDefaultSaveData();
  valid.money = -500;
  valid.health = 999;
  const parsed = parseSaveData(serializeSaveData(valid));
  assert.ok(parsed);
  assert.equal(parsed.money, 0);
  assert.equal(parsed.health, 100);
});
