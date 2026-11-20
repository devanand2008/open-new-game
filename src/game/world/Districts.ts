export interface DistrictDef {
  id: string;
  name: string;
  shortName: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  center: { x: number; z: number };
  color: string;
  accentColor: string;
  playable: boolean;
  description: string;
}

export const WORLD_PLAYABLE_BOUNDS = {
  minX: -360,
  maxX: 430,
  minZ: -255,
  maxZ: 330,
};

export const WORLD_FULL_EXTENT = {
  minX: -480,
  maxX: 500,
  minZ: -440,
  maxZ: 410,
};

export const DISTRICTS: DistrictDef[] = [
  {
    id: 'downtown',
    name: 'Solara Downtown',
    shortName: 'DOWNTOWN',
    bounds: { minX: -155, maxX: 135, minZ: -155, maxZ: 105 },
    center: { x: -10, z: -25 },
    color: '#3b82f6',
    accentColor: '#f59e0b',
    playable: true,
    description: 'Glass office towers with lit interiors, City Hall, Central Park, garages, and SolaraPulse Plaza.',
  },
  {
    id: 'palm_beach',
    name: 'Palm Beach',
    shortName: 'PALM BEACH',
    bounds: { minX: -360, maxX: -155, minZ: -180, maxZ: 240 },
    center: { x: -245, z: 30 },
    color: '#f59e0b',
    accentColor: '#38bdf8',
    playable: true,
    description: 'Golden sands, pastel art-deco hotels, beach cabanas, palm promenade, and the Solara Wheel pier.',
  },
  {
    id: 'ironport_docks',
    name: 'Ironport Shipment Port',
    shortName: 'SHIPMENT PORT',
    bounds: { minX: 135, maxX: 430, minZ: -105, maxZ: 170 },
    center: { x: 270, z: 32 },
    color: '#f97316',
    accentColor: '#fb923c',
    playable: true,
    description: 'Panamax cargo container ship berth, red gantry cranes, customs office, and logistics warehouses.',
  },
  {
    id: 'marina_crescent',
    name: 'Marina Crescent',
    shortName: 'MARINA',
    bounds: { minX: 60, maxX: 310, minZ: 170, maxZ: 330 },
    center: { x: 165, z: 240 },
    color: '#e879f9',
    accentColor: '#22d3ee',
    playable: true,
    description: 'Yacht slips, canal bridge, neon nightlife clubs, and waterfront villas with private backyard pools.',
  },
  {
    id: 'southern_borough',
    name: 'Southern Borough',
    shortName: 'SOUTH BOROUGH',
    bounds: { minX: -155, maxX: 60, minZ: 105, maxZ: 320 },
    center: { x: -55, z: 205 },
    color: '#10b981',
    accentColor: '#fbbf24',
    playable: true,
    description: 'Coastal homes with fenced backyards, pools & BBQ patios, auto repair shop, and basketball court.',
  },
  {
    id: 'coastline_airport',
    name: 'Coastline Airport',
    shortName: 'AIRPORT',
    bounds: { minX: 165, maxX: 440, minZ: -245, maxZ: -105 },
    center: { x: 305, z: -172 },
    color: '#38bdf8',
    accentColor: '#fbbf24',
    playable: true,
    description: 'International Runway 09/27, glass terminal concourse, ATC radar tower, cargo hangar, and jetliners.',
  },
  {
    id: 'north_ridge',
    name: 'North Ridge',
    shortName: 'NORTH RIDGE',
    bounds: { minX: -340, maxX: 165, minZ: -420, maxZ: -155 },
    center: { x: -75, z: -265 },
    color: '#22c55e',
    accentColor: '#a3e635',
    playable: true,
    description: 'Scenic coastal foothills, telecom peak, trailhead lookout, and hillside backyard villas.',
  },
  {
    id: 'cypress_wetlands',
    name: 'Cypress Wetlands',
    shortName: 'WETLANDS',
    bounds: { minX: 165, maxX: 430, minZ: -420, maxZ: -245 },
    center: { x: 285, z: -318 },
    color: '#14b8a6',
    accentColor: '#2dd4bf',
    playable: true,
    description: 'Misty backwater marshes, wooden boardwalk causeway, cypress groves, and coastal lagoons.',
  },
];

export function getDistrictAt(x: number, z: number): DistrictDef {
  for (const d of DISTRICTS) {
    if (x >= d.bounds.minX && x <= d.bounds.maxX && z >= d.bounds.minZ && z <= d.bounds.maxZ) {
      return d;
    }
  }
  return DISTRICTS[0];
}
