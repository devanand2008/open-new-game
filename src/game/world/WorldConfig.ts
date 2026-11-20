export type VehicleArchetype = 'sedan' | 'coupe' | 'suv' | 'motorcycle' | 'truck' | 'police';

export interface StaticBuildingDef {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  style:
    | 'glass_tower'
    | 'city_hall'
    | 'art_deco'
    | 'residential'
    | 'warehouse'
    | 'nightclub'
    | 'garage'
    | 'boutique'
    | 'container'
    | 'airport_terminal'
    | 'airport_hangar';
  color: string;
  accent?: string;
  district: string;
  hasBackyard?: boolean;
  hasPool?: boolean;
}

export interface InteractableDef {
  id: string;
  type: 'safehouse' | 'garage' | 'boutique' | 'repair' | 'vending' | 'npc' | 'terminal' | 'race_start' | 'social_spot';
  label: string;
  sublabel: string;
  x: number;
  z: number;
  radius: number;
  color: string;
  npcId?: 'sofia' | 'jalen' | 'elliot';
}

export interface ParkedVehicleSpawn {
  id: string;
  archetype: VehicleArchetype;
  x: number;
  z: number;
  yaw: number;
  color: string;
  plate: string;
}

export interface OutfitPreset {
  id: string;
  name: string;
  jacketColor: string;
  shirtColor: string;
  pantsColor: string;
  accentColor: string;
  price: number;
}

export const MARCO_OUTFITS: OutfitPreset[] = [
  {
    id: 'operator',
    name: 'Street Operator',
    jacketColor: '#2c2f36',
    shirtColor: '#9ca3af',
    pantsColor: '#3f453b',
    accentColor: '#f59e0b',
    price: 0,
  },
  {
    id: 'sunset_cruiser',
    name: 'Solara Sunset',
    jacketColor: '#7c2d12',
    shirtColor: '#fef3c7',
    pantsColor: '#1e293b',
    accentColor: '#fb923c',
    price: 150,
  },
  {
    id: 'midnight_driver',
    name: 'Midnight Apex',
    jacketColor: '#111827',
    shirtColor: '#22d3ee',
    pantsColor: '#0f172a',
    accentColor: '#22d3ee',
    price: 300,
  },
];

export const LENA_OUTFITS: OutfitPreset[] = [
  {
    id: 'street_tech',
    name: 'Violet Tech',
    jacketColor: '#18181b',
    shirtColor: '#312e81',
    pantsColor: '#1f2937',
    accentColor: '#a855f7',
    price: 0,
  },
  {
    id: 'cyber_coast',
    name: 'Cyan Relay',
    jacketColor: '#0f172a',
    shirtColor: '#0e7490',
    pantsColor: '#1e293b',
    accentColor: '#22d3ee',
    price: 150,
  },
  {
    id: 'crimson_wire',
    name: 'Marina Night',
    jacketColor: '#3b0764',
    shirtColor: '#f43f5e',
    pantsColor: '#18181b',
    accentColor: '#e879f9',
    price: 300,
  },
];

// Player initial spawn: open boulevard sidewalk overlooking Solara Downtown & parked crimson sedan
export const PLAYER_SPAWN = {
  x: -39.5,
  y: 0,
  z: 29.2,
  yaw: -0.62, // facing north-east directly toward parked Solara GT Sedan & Solara Spire
};

// Primary road grid coordinates (major north-south X avenues and east-west Z streets)
export const MAJOR_X_ROADS = [-210, -120, -40, 40, 120, 210];
export const MAJOR_Z_ROADS = [-160, -80, 0, 80, 160, 240];
export const ROAD_WIDTH = 14;
export const SIDEWALK_WIDTH = 4;

// Central canal runs along X = 152 from Z = -180 south to the Marina ocean
export const CANAL_X = 152;
export const CANAL_HALF_WIDTH = 12;

export const INTERACTABLES: InteractableDef[] = [
  {
    id: 'safehouse',
    type: 'safehouse',
    label: 'Solara Safehouse',
    sublabel: 'Save progress, rest, or clear heat',
    x: -54,
    z: 42,
    radius: 4.5,
    color: '#22c55e',
  },
  {
    id: 'garage',
    type: 'garage',
    label: 'Downtown Garage',
    sublabel: 'Swap vehicles & M01 drop-off',
    x: 84,
    z: -44,
    radius: 6.5,
    color: '#f59e0b',
  },
  {
    id: 'boutique',
    type: 'boutique',
    label: 'Verve Boutique',
    sublabel: 'Browse 3 original outfit presets',
    x: -98,
    z: -34,
    radius: 4.5,
    color: '#e879f9',
  },
  {
    id: 'repair',
    type: 'repair',
    label: 'Solara Auto Works',
    sublabel: 'Repair hull & tune vehicle ($50)',
    x: -92,
    z: 184,
    radius: 6.5,
    color: '#38bdf8',
  },
  {
    id: 'vending',
    type: 'vending',
    label: 'Solara Refresh Kiosk',
    sublabel: 'Restore Health & Stamina ($15)',
    x: -60,
    z: 18,
    radius: 3.5,
    color: '#22d3ee',
  },
  {
    id: 'npc_sofia',
    type: 'npc',
    label: 'Sofia Ramirez',
    sublabel: 'Marina Insider — M02 City Courier',
    x: 96,
    z: 204,
    radius: 4.5,
    color: '#e879f9',
    npcId: 'sofia',
  },
  {
    id: 'race_start',
    type: 'race_start',
    label: 'Midnight Circuit Grid',
    sublabel: 'Palm Beach Street Race — M03',
    x: -204,
    z: 44,
    radius: 6.5,
    color: '#f59e0b',
  },
  {
    id: 'tech_terminal',
    type: 'terminal',
    label: 'Solara Relay Terminal',
    sublabel: 'Network Routing Node — M04 Signal Break',
    x: 24,
    z: -104,
    radius: 4.5,
    color: '#a855f7',
  },
  {
    id: 'npc_jalen',
    type: 'npc',
    label: 'Jalen Carter',
    sublabel: 'Dockyard Contact — M05 Harbor Exchange',
    x: 234,
    z: 56,
    radius: 5.0,
    color: '#f97316',
    npcId: 'jalen',
  },
  {
    id: 'npc_elliot',
    type: 'npc',
    label: 'Elliot Rhodes',
    sublabel: 'North Ridge Trailhead Guide',
    x: -18,
    z: -186,
    radius: 4.5,
    color: '#84cc16',
    npcId: 'elliot',
  },
  {
    id: 'social_downtown',
    type: 'social_spot',
    label: 'SolaraPulse Photo Spot · Spire Plaza',
    sublabel: 'Snap & post to SolaraPulse (+$50 & Followers)',
    x: -24,
    z: -14,
    radius: 4.5,
    color: '#ec4899',
  },
  {
    id: 'social_airport',
    type: 'social_spot',
    label: 'Coastline Airport Concourse',
    sublabel: 'Snap Runway 09/27 & Airliner for SolaraPulse',
    x: 280,
    z: -142,
    radius: 5.5,
    color: '#38bdf8',
  },
  {
    id: 'social_shipment',
    type: 'social_spot',
    label: 'Ironport Cargo Ship Berth',
    sublabel: 'Snap Panamax Freighter & Cranes for SolaraPulse',
    x: 336,
    z: 40,
    radius: 5.5,
    color: '#f97316',
  },
  {
    id: 'social_pier',
    type: 'social_spot',
    label: 'Palm Beach Ferris Pier',
    sublabel: 'Snap Coastal Boardwalk & Wheel for SolaraPulse',
    x: -248,
    z: 20,
    radius: 5.0,
    color: '#fbbf24',
  },
  {
    id: 'social_backyard',
    type: 'social_spot',
    label: 'Southside Backyard Terrace',
    sublabel: 'Snap Solara Residential Backyard for SolaraPulse',
    x: -10,
    z: 144,
    radius: 4.5,
    color: '#10b981',
  },
];

export const PARKED_VEHICLES: ParkedVehicleSpawn[] = [
  {
    id: 'veh_marco_sedan',
    archetype: 'sedan',
    x: -36.5,
    z: 25.5,
    yaw: 0,
    color: '#c82333',
    plate: 'SLR-401',
  },
  {
    id: 'veh_downtown_coupe',
    archetype: 'coupe',
    x: 52,
    z: -32,
    yaw: Math.PI / 2,
    color: '#f59e0b',
    plate: 'BAY-908',
  },
  {
    id: 'veh_beach_suv',
    archetype: 'suv',
    x: -196,
    z: -18,
    yaw: 0,
    color: '#0284c7',
    plate: 'PLM-212',
  },
  {
    id: 'veh_marina_moto',
    archetype: 'motorcycle',
    x: 108,
    z: 192,
    yaw: -Math.PI / 2,
    color: '#d946ef',
    plate: 'MNA-77',
  },
  {
    id: 'veh_ironport_truck',
    archetype: 'truck',
    x: 222,
    z: 24,
    yaw: Math.PI,
    color: '#ea580c',
    plate: 'DOC-515',
  },
  {
    id: 'veh_south_sedan',
    archetype: 'sedan',
    x: -76,
    z: 174,
    yaw: Math.PI / 2,
    color: '#10b981',
    plate: 'STH-304',
  },
];

/**
 * Generates the deterministic city block buildings for Solara Bay
 * carefully placed inside city blocks (never overlapping MAJOR_X_ROADS, MAJOR_Z_ROADS, or CANAL_X).
 */
export function buildCityBuildings(): StaticBuildingDef[] {
  const b: StaticBuildingDef[] = [];

  // --- SOLARA DOWNTOWN (Glass towers, City Hall, Boutique, Garage, Safehouse) ---
  // Safehouse Block (x: -105..-55, z: 16..64)
  b.push({
    id: 'b_safehouse',
    x: -74,
    z: 44,
    w: 24,
    d: 20,
    h: 14,
    style: 'residential',
    color: '#f0e6d6',
    accent: '#22c55e',
    district: 'downtown',
    hasBackyard: true,
    hasPool: false,
  });
  b.push({
    id: 'b_dt_cafe',
    x: -78,
    z: 20,
    w: 18,
    d: 12,
    h: 9,
    style: 'art_deco',
    color: '#f5d0a9',
    accent: '#f59e0b',
    district: 'downtown',
  });

  // Iconic Solara Spire & Financial Center (Block x: -24..24, z: -64..-16)
  b.push({
    id: 'b_solara_spire',
    x: 0,
    z: -42,
    w: 24,
    d: 24,
    h: 72,
    style: 'glass_tower',
    color: '#1e3a5f',
    accent: '#38bdf8',
    district: 'downtown',
  });
  // Secondary Financial Towers (Block x: -24..24, z: -144..-96)
  b.push({
    id: 'b_apex_tower',
    x: -8,
    z: -124,
    w: 22,
    d: 20,
    h: 58,
    style: 'glass_tower',
    color: '#172554',
    accent: '#f59e0b',
    district: 'downtown',
  });
  b.push({
    id: 'b_tech_plaza',
    x: 16,
    z: -128,
    w: 16,
    d: 18,
    h: 34,
    style: 'glass_tower',
    color: '#1e293b',
    accent: '#a855f7',
    district: 'downtown',
  });

  // City Hall & Civic Center (Block x: -104..-56, z: -64..-16)
  b.push({
    id: 'b_city_hall',
    x: -74,
    z: -44,
    w: 24,
    d: 24,
    h: 22,
    style: 'city_hall',
    color: '#e5e7eb',
    accent: '#f59e0b',
    district: 'downtown',
  });
  b.push({
    id: 'b_verve_boutique',
    x: -98,
    z: -24,
    w: 14,
    d: 14,
    h: 11,
    style: 'boutique',
    color: '#fdf2f8',
    accent: '#e879f9',
    district: 'downtown',
  });

  // Downtown North-West Offices (Block x: -104..-56, z: -144..-96)
  b.push({
    id: 'b_nw_tower_1',
    x: -86,
    z: -122,
    w: 22,
    d: 22,
    h: 46,
    style: 'glass_tower',
    color: '#1e3a5f',
    accent: '#22d3ee',
    district: 'downtown',
  });
  b.push({
    id: 'b_nw_tower_2',
    x: -60,
    z: -116,
    w: 16,
    d: 26,
    h: 36,
    style: 'glass_tower',
    color: '#334155',
    accent: '#fbbf24',
    district: 'downtown',
  });

  // Downtown Garage & East Towers (Block x: 56..104, z: -64..-16)
  b.push({
    id: 'b_downtown_garage',
    x: 84,
    z: -26,
    w: 26,
    d: 18,
    h: 12,
    style: 'garage',
    color: '#475569',
    accent: '#f59e0b',
    district: 'downtown',
  });
  b.push({
    id: 'b_east_tower_1',
    x: 80,
    z: -122,
    w: 24,
    d: 24,
    h: 52,
    style: 'glass_tower',
    color: '#164e63',
    accent: '#22d3ee',
    district: 'downtown',
  });

  // Downtown South-East Offices (Block x: 56..104, z: 16..64)
  b.push({
    id: 'b_se_tower_1',
    x: 78,
    z: 40,
    w: 26,
    d: 26,
    h: 40,
    style: 'glass_tower',
    color: '#1e293b',
    accent: '#38bdf8',
    district: 'downtown',
  });

  // Note: Block (x: -24..24, z: 16..64) is CENTRAL PARK (open green lawn + fountain, no tall building)

  // --- PALM BEACH (Pastel Art-Deco Hotels, Surf Shops along x: -194..-136) ---
  const beachHotels = [
    { id: 'b_palm_hotel_1', z: -120, h: 22, color: '#fbcfe8', accent: '#22d3ee' },
    { id: 'b_palm_hotel_2', z: -42, h: 28, color: '#fde68a', accent: '#f97316' },
    { id: 'b_palm_hotel_3', z: 36, h: 18, color: '#a7f3d0', accent: '#e879f9' },
    { id: 'b_palm_hotel_4', z: 120, h: 24, color: '#fed7aa', accent: '#38bdf8' },
  ];
  for (const h of beachHotels) {
    b.push({
      id: h.id,
      x: -166,
      z: h.z,
      w: 28,
      d: 24,
      h: h.h,
      style: 'art_deco',
      color: h.color,
      accent: h.accent,
      district: 'palm_beach',
    });
  }

  // --- SOUTHERN BOROUGH (Residential, Auto Works, Corner Stores) ---
  b.push({
    id: 'b_auto_works',
    x: -76,
    z: 196,
    w: 24,
    d: 18,
    h: 9,
    style: 'garage',
    color: '#334155',
    accent: '#38bdf8',
    district: 'southern_borough',
  });
  const southBlocks: Array<[string, number, number, number, number, number, string, boolean]> = [
    ['b_south_apt_1', -82, 114, 24, 18, 13, '#f3e5d0', true],
    ['b_south_apt_2', -10, 114, 24, 18, 15, '#e2eefc', true],
    ['b_south_apt_3', -12, 198, 24, 18, 12, '#fef0c3', false],
    ['b_south_apt_4', -164, 198, 24, 18, 13, '#ffe0e6', true],
    ['b_south_apt_5', -82, 276, 26, 18, 11, '#dcfce7', true],
  ];
  for (const [id, x, z, w, d, h, color, hasPool] of southBlocks) {
    b.push({
      id,
      x,
      z,
      w,
      d,
      h,
      style: 'residential',
      color,
      accent: '#f59e0b',
      district: 'southern_borough',
      hasBackyard: true,
      hasPool,
    });
  }

  // --- MARINA CRESCENT (Nightlife Club Solara + Waterfront Villas) ---
  b.push({
    id: 'b_club_solara',
    x: 82,
    z: 196,
    w: 26,
    d: 22,
    h: 16,
    style: 'nightclub',
    color: '#1e1b4b',
    accent: '#e879f9',
    district: 'marina_crescent',
  });
  b.push({
    id: 'b_marina_lounge',
    x: 82,
    z: 120,
    w: 24,
    d: 22,
    h: 19,
    style: 'nightclub',
    color: '#312e81',
    accent: '#22d3ee',
    district: 'marina_crescent',
  });
  b.push({
    id: 'b_marina_villa_1',
    x: 192,
    z: 196,
    w: 20,
    d: 16,
    h: 10,
    style: 'art_deco',
    color: '#f8fafc',
    accent: '#38bdf8',
    district: 'marina_crescent',
    hasBackyard: true,
    hasPool: true,
  });

  // --- NORTH RIDGE HILLSIDE VILLAS (with scenic backyards) ---
  b.push({
    id: 'b_ridge_villa_1',
    x: -78,
    z: -196,
    w: 22,
    d: 16,
    h: 9.5,
    style: 'residential',
    color: '#f5efe6',
    accent: '#22c55e',
    district: 'north_ridge',
    hasBackyard: true,
    hasPool: true,
  });
  b.push({
    id: 'b_ridge_villa_2',
    x: 56,
    z: -196,
    w: 22,
    d: 16,
    h: 10,
    style: 'residential',
    color: '#eef6ff',
    accent: '#38bdf8',
    district: 'north_ridge',
    hasBackyard: true,
    hasPool: true,
  });

  // --- COASTLINE INTERNATIONAL AIRPORT (Terminal Concourse & Cargo Aviation Hangar) ---
  b.push({
    id: 'b_airport_terminal',
    x: 248,
    z: -116,
    w: 44,
    d: 20,
    h: 13.5,
    style: 'airport_terminal',
    color: '#e2e8f0',
    accent: '#38bdf8',
    district: 'coastline_airport',
  });
  b.push({
    id: 'b_airport_hangar',
    x: 334,
    z: -116,
    w: 32,
    d: 22,
    h: 14,
    style: 'airport_hangar',
    color: '#cbd5e1',
    accent: '#f59e0b',
    district: 'coastline_airport',
  });

  // --- IRONPORT SHIPMENT PORT (Warehouses, Customs HQ & Shipping Containers) ---
  b.push({
    id: 'b_dock_customs',
    x: 248,
    z: -56,
    w: 18,
    d: 14,
    h: 10,
    style: 'art_deco',
    color: '#e2e8f0',
    accent: '#f97316',
    district: 'ironport_docks',
  });
  b.push({
    id: 'b_dock_wh_1',
    x: 282,
    z: -36,
    w: 32,
    d: 22,
    h: 13,
    style: 'warehouse',
    color: '#64748b',
    accent: '#f97316',
    district: 'ironport_docks',
  });
  b.push({
    id: 'b_dock_wh_2',
    x: 258,
    z: 118,
    w: 34,
    d: 22,
    h: 14,
    style: 'warehouse',
    color: '#52525b',
    accent: '#eab308',
    district: 'ironport_docks',
  });
  const containers: Array<[string, number, number, string]> = [
    ['c_1', 250, 22, '#dc2626'],
    ['c_2', 268, 22, '#0284c7'],
    ['c_3', 250, 38, '#d97706'],
    ['c_4', 268, 38, '#059669'],
    ['c_5', 258, 56, '#1d4ed8'],
    ['c_6', 292, 22, '#0ea5e9'],
    ['c_7', 292, 38, '#ea580c'],
  ];
  for (const [id, x, z, color] of containers) {
    b.push({
      id,
      x,
      z,
      w: 12,
      d: 5,
      h: 5.5,
      style: 'container',
      color,
      district: 'ironport_docks',
    });
  }

  return b;
}

export const CITY_BUILDINGS: StaticBuildingDef[] = buildCityBuildings();
