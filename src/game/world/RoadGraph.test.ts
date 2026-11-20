import test from 'node:test';
import assert from 'node:assert/strict';
import { RoadGraph } from './RoadGraph';

test('RoadGraph builds connected grid with canal bridge crossings', () => {
  const graph = new RoadGraph();
  assert.ok(graph.nodes.size >= 36, 'expected 6x6 major road intersections');
  const edges = graph.getAllEdges();
  assert.ok(edges.length > 40, 'expected connected avenues and streets');
});

test('RoadGraph A* finds valid route from Safehouse to Downtown Garage', () => {
  const graph = new RoadGraph();
  const route = graph.findRoute(-36, 36, 84, -44);
  assert.ok(route.nodes.length >= 3, 'route should traverse road nodes');
  assert.ok(route.totalDistance > 120 && route.totalDistance < 450);
  assert.deepEqual(route.nodes[0], { x: -36, z: 36 });
  assert.deepEqual(route.nodes[route.nodes.length - 1], { x: 84, z: -44 });
});

test('RoadGraph A* routes across canal bridge to Ironport Docks', () => {
  const graph = new RoadGraph();
  const route = graph.findRoute(-40, 80, 234, 56);
  assert.ok(route.nodes.length >= 4);
  // Ensure crossing from x=120 to x=210 only happens at valid bridge Z (-80, 0, or 160)
  for (let i = 1; i < route.nodes.length - 1; i++) {
    const a = route.nodes[i - 1];
    const b = route.nodes[i];
    if ((a.x === 120 && b.x === 210) || (a.x === 210 && b.x === 120)) {
      assert.ok([-80, 0, 160].includes(a.z), `bridge crossing must occur at valid bridge z, got ${a.z}`);
    }
  }
});
