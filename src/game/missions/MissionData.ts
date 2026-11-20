export interface MissionCheckpoint {
  x: number;
  z: number;
  radius: number;
  label: string;
}

export interface MissionDef {
  id: 'M01' | 'M02' | 'M03' | 'M04' | 'M05';
  title: string;
  giver: string;
  district: string;
  reward: number;
  summary: string;
  timeLimitSec?: number;
  requiresVehicle?: boolean;
  recommendedCharacter?: 'marco' | 'lena';
}

export interface PhoneMessage {
  id: string;
  sender: string;
  role: string;
  accent: string;
  body: string;
  unlockMission?: string;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'M01',
    title: 'First Day in Solara',
    giver: 'Marco Vega',
    district: 'Solara Downtown',
    reward: 500,
    summary: 'Step into your Solara GT Sedan outside the safehouse, follow the cyan GPS route across Downtown, and park inside the Downtown Garage bay.',
  },
  {
    id: 'M02',
    title: 'City Courier',
    giver: 'Sofia Ramirez',
    district: 'Marina Crescent',
    reward: 750,
    timeLimitSec: 95,
    summary: 'Meet Sofia Ramirez at Club Solara in Marina Crescent, pick up the priority dispatch case, and deliver it to the Palm Beach Promenade before time expires.',
  },
  {
    id: 'M03',
    title: 'Midnight Circuit',
    giver: 'Solara Underground',
    district: 'Palm Beach',
    reward: 1200,
    timeLimitSec: 160,
    requiresVehicle: true,
    summary: 'Complete a 3-lap coastal street circuit along Palm Beach and Solara Downtown. Hit every golden checkpoint ring before the clock runs down.',
  },
  {
    id: 'M04',
    title: 'Signal Break',
    giver: 'Lena Park',
    district: 'Solara Downtown',
    reward: 1000,
    recommendedCharacter: 'lena',
    summary: 'Switch to Lena Park (or approach solo), reach the Downtown Tech Plaza Relay Terminal, and solve the 4x4 network routing lock to open Ironport access.',
  },
  {
    id: 'M05',
    title: 'Harbor Exchange',
    giver: 'Jalen Carter',
    district: 'Ironport Docks',
    reward: 1800,
    summary: 'Drive across the canal bridge to Ironport Docks, meet Jalen Carter, secure the shipping manifest, and lose the 2-star SBPD pursuit back to the Safehouse.',
  },
];

// 8-checkpoint coastal racing loop (3 laps = 24 checkpoints total)
export const MIDNIGHT_CIRCUIT_LOOP: MissionCheckpoint[] = [
  { x: -210, z: -20, radius: 13, label: 'Palm Blvd North' },
  { x: -210, z: -140, radius: 13, label: 'North Beach Turn' },
  { x: -120, z: -160, radius: 13, label: 'Civic Ring West' },
  { x: 40, z: -160, radius: 13, label: 'Skyline Straight' },
  { x: 120, z: -80, radius: 13, label: 'Canal Avenue' },
  { x: 120, z: 80, radius: 13, label: 'Downtown East' },
  { x: -40, z: 80, radius: 13, label: 'Central Park South' },
  { x: -210, z: 80, radius: 13, label: 'Boardwalk Hairpin' },
];

export const PHONE_MESSAGES: PhoneMessage[] = [
  {
    id: 'msg_1',
    sender: 'Sofia Ramirez',
    role: 'Club Solara · Marina',
    accent: '#e879f9',
    body: 'Welcome to Solara Bay, Marco. Get your wheels parked at Downtown Garage first, then swing by Club Solara in Marina Crescent — I have an urgent courier run.',
  },
  {
    id: 'msg_2',
    sender: 'Lena Park',
    role: 'Tech Specialist',
    accent: '#a855f7',
    body: 'I mapped the city relay grid around Tech Plaza. Anytime you want to switch over to me (press Q or use the Crew tab), I can slice right through the Ironport security gate.',
  },
  {
    id: 'msg_3',
    sender: 'Jalen Carter',
    role: 'Ironport Docks',
    accent: '#f97316',
    body: 'Port patrol has been tight near the eastern cranes. Once Lena clears the relay, meet me at Pier 4 across the canal bridge. Bring a fast car for the exit.',
  },
  {
    id: 'msg_4',
    sender: 'Elliot Rhodes',
    role: 'North Ridge Trailhead',
    accent: '#84cc16',
    body: 'If you head north past Downtown, you can see the foothills of North Ridge. The upper mountain roads and airport corridor open in the next city expansion.',
  },
];
