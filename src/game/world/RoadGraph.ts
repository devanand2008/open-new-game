import { MAJOR_X_ROADS, MAJOR_Z_ROADS } from './WorldConfig';

export interface RoadNode {
  id: string;
  x: number;
  z: number;
  neighbors: string[];
}

export interface RouteResult {
  nodes: Array<{ x: number; z: number }>;
  totalDistance: number;
}

export class RoadGraph {
  public readonly nodes: Map<string, RoadNode> = new Map();

  constructor() {
    this.buildGrid();
  }

  private buildGrid(): void {
    const xs = MAJOR_X_ROADS;
    const zs = MAJOR_Z_ROADS;

    for (let xi = 0; xi < xs.length; xi++) {
      for (let zi = 0; zi < zs.length; zi++) {
        const id = `n_${xi}_${zi}`;
        this.nodes.set(id, {
          id,
          x: xs[xi],
          z: zs[zi],
          neighbors: [],
        });
      }
    }

    for (let xi = 0; xi < xs.length; xi++) {
      for (let zi = 0; zi < zs.length; zi++) {
        const id = `n_${xi}_${zi}`;
        const node = this.nodes.get(id)!;

        // Connect north/south
        if (zi > 0) node.neighbors.push(`n_${xi}_${zi - 1}`);
        if (zi < zs.length - 1) node.neighbors.push(`n_${xi}_${zi + 1}`);

        // Connect east/west — across the canal (between x=120 [xi=4] and x=210 [xi=5]),
        // bridges exist at z=-160 (zi=0, Airport Bridge), z=-80 (zi=1), z=0 (zi=2), and z=160 (zi=4)
        const crossesCanalEast = xi === 4;
        const crossesCanalWest = xi === 5;
        const isBridgeZ = zi === 0 || zi === 1 || zi === 2 || zi === 4;

        if (xi < xs.length - 1 && (!crossesCanalEast || isBridgeZ)) {
          node.neighbors.push(`n_${xi + 1}_${zi}`);
        }
        if (xi > 0 && (!crossesCanalWest || isBridgeZ)) {
          node.neighbors.push(`n_${xi - 1}_${zi}`);
        }
      }
    }

    // Airport Concourse & Ironport Shipment Port spur nodes
    const airportNode: RoadNode = { id: 'n_airport', x: 290, z: -140, neighbors: ['n_5_0', 'n_5_1'] };
    const wharfNode: RoadNode = { id: 'n_wharf', x: 325, z: 0, neighbors: ['n_5_2'] };
    this.nodes.set(airportNode.id, airportNode);
    this.nodes.set(wharfNode.id, wharfNode);
    this.nodes.get('n_5_0')?.neighbors.push('n_airport');
    this.nodes.get('n_5_1')?.neighbors.push('n_airport');
    this.nodes.get('n_5_2')?.neighbors.push('n_wharf');
  }

  public findNearestNode(x: number, z: number): RoadNode {
    let best: RoadNode | null = null;
    let bestDistSq = Infinity;
    for (const node of this.nodes.values()) {
      const dx = node.x - x;
      const dz = node.z - z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = node;
      }
    }
    return best!;
  }

  public findRoute(startX: number, startZ: number, goalX: number, goalZ: number): RouteResult {
    const startNode = this.findNearestNode(startX, startZ);
    const goalNode = this.findNearestNode(goalX, goalZ);

    if (startNode.id === goalNode.id) {
      const d = Math.hypot(goalX - startX, goalZ - startZ);
      return {
        nodes: [
          { x: startX, z: startZ },
          { x: goalX, z: goalZ },
        ],
        totalDistance: d,
      };
    }

    const openSet = new Set<string>([startNode.id]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    gScore.set(startNode.id, 0);
    fScore.set(startNode.id, Math.hypot(goalNode.x - startNode.x, goalNode.z - startNode.z));

    while (openSet.size > 0) {
      let currentId = '';
      let lowestF = Infinity;
      for (const id of openSet) {
        const f = fScore.get(id) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          currentId = id;
        }
      }

      if (currentId === goalNode.id) {
        const path: Array<{ x: number; z: number }> = [];
        let curr: string | undefined = currentId;
        while (curr) {
          const n = this.nodes.get(curr)!;
          path.push({ x: n.x, z: n.z });
          curr = cameFrom.get(curr);
        }
        path.reverse();
        const fullPath = [{ x: startX, z: startZ }, ...path, { x: goalX, z: goalZ }];
        let totalDistance = 0;
        for (let i = 1; i < fullPath.length; i++) {
          totalDistance += Math.hypot(
            fullPath[i].x - fullPath[i - 1].x,
            fullPath[i].z - fullPath[i - 1].z
          );
        }
        return { nodes: fullPath, totalDistance };
      }

      openSet.delete(currentId);
      const currentNode = this.nodes.get(currentId)!;
      const currentG = gScore.get(currentId) ?? Infinity;

      for (const neighborId of currentNode.neighbors) {
        const neighbor = this.nodes.get(neighborId)!;
        const stepCost = Math.hypot(neighbor.x - currentNode.x, neighbor.z - currentNode.z);
        const tentativeG = currentG + stepCost;
        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeG);
          const h = Math.hypot(goalNode.x - neighbor.x, goalNode.z - neighbor.z);
          fScore.set(neighborId, tentativeG + h);
          openSet.add(neighborId);
        }
      }
    }

    // Direct fallback if disconnected
    return {
      nodes: [
        { x: startX, z: startZ },
        { x: goalX, z: goalZ },
      ],
      totalDistance: Math.hypot(goalX - startX, goalZ - startZ),
    };
  }

  public getAllEdges(): Array<[RoadNode, RoadNode]> {
    const edges: Array<[RoadNode, RoadNode]> = [];
    const seen = new Set<string>();
    for (const node of this.nodes.values()) {
      for (const nId of node.neighbors) {
        const key = node.id < nId ? `${node.id}|${nId}` : `${nId}|${node.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          const other = this.nodes.get(nId);
          if (other) edges.push([node, other]);
        }
      }
    }
    return edges;
  }
}

export const SOLARA_ROAD_GRAPH = new RoadGraph();
