export interface SocialComment {
  id: string;
  author: string;
  handle: string;
  text: string;
  timeAgo: string;
}

export interface SocialPost {
  id: string;
  author: string;
  handle: string;
  avatarColor: string;
  district: string;
  locationLabel: string;
  worldX: number;
  worldZ: number;
  caption: string;
  hashtags: string[];
  likes: number;
  likedByUser: boolean;
  reposts: number;
  repostedByUser: boolean;
  timeLabel: string;
  weatherTag: 'clear' | 'hazy' | 'rain';
  photoDataUrl?: string;
  cardGradient: [string, string];
  comments: SocialComment[];
}

export const INITIAL_SOCIAL_POSTS: SocialPost[] = [
  {
    id: 'sp_01',
    author: 'Solara Air Control',
    handle: '@CoastlineAirport',
    avatarColor: '#38bdf8',
    district: 'Coastline Airport',
    locationLabel: 'Runway 09/27 & Concourse',
    worldX: 292,
    worldZ: -145,
    caption: 'Flight SL-404 just touched down on Runway 27 under golden coastal skies. Cargo hangar apron is wide open for evening logistics.',
    hashtags: ['#CoastlineAir', '#SolaraBay', '#Aviation'],
    likes: 342,
    likedByUser: false,
    reposts: 48,
    repostedByUser: false,
    timeLabel: '12m ago',
    weatherTag: 'clear',
    cardGradient: ['#0c4a6e', '#1e3a8a'],
    comments: [
      {
        id: 'c_1',
        author: 'Lena Park',
        handle: '@LenaPark_Tech',
        text: 'ATC radar sweep looks super clean from the downtown spire roof!',
        timeAgo: '8m',
      },
    ],
  },
  {
    id: 'sp_02',
    author: 'Jalen Carter',
    handle: '@IronportLogistics',
    avatarColor: '#f97316',
    district: 'Ironport Docks',
    locationLabel: 'MV Solara Star Berth',
    worldX: 332,
    worldZ: 40,
    caption: 'Panamax container ship MV Solara Star moored at Berth 3. All three red gantry cranes running hot tonight—watch the wet wharf lanes.',
    hashtags: ['#IronportDocks', '#ShipmentPort', '#CargoLife'],
    likes: 219,
    likedByUser: false,
    reposts: 31,
    repostedByUser: false,
    timeLabel: '28m ago',
    weatherTag: 'hazy',
    cardGradient: ['#7c2d12', '#1e293b'],
    comments: [],
  },
  {
    id: 'sp_03',
    author: 'Sofia Ramirez',
    handle: '@ClubSolaraVIP',
    avatarColor: '#e879f9',
    district: 'Marina Crescent',
    locationLabel: 'Club Solara Neon Promenade',
    worldX: 112,
    worldZ: 196,
    caption: 'Neon arches lit up over the yacht slips! Rooftop lounge doors open at sunset—pull up in your cleanest coupe.',
    hashtags: ['#MarinaNights', '#ClubSolara', '#SolaraPulse'],
    likes: 584,
    likedByUser: false,
    reposts: 92,
    repostedByUser: false,
    timeLabel: '45m ago',
    weatherTag: 'clear',
    cardGradient: ['#701a75', '#0f172a'],
    comments: [
      {
        id: 'c_2',
        author: 'Marco Vega',
        handle: '@MarcoVega',
        text: 'Finishing a downtown drop-off first, see you at the Marina.',
        timeAgo: '21m',
      },
    ],
  },
  {
    id: 'sp_04',
    author: 'Palm Beach Surf Co.',
    handle: '@PalmBeachBoardwalk',
    avatarColor: '#f59e0b',
    district: 'Palm Beach',
    locationLabel: 'Solara Ferris Pier',
    worldX: -278,
    worldZ: 20,
    caption: 'Warm swell rolling past the Ferris wheel pier and colorful cabanas. Best sunset view on the entire coast.',
    hashtags: ['#PalmBeach', '#SolaraSunset', '#BoardwalkVibes'],
    likes: 416,
    likedByUser: false,
    reposts: 64,
    repostedByUser: false,
    timeLabel: '1h ago',
    weatherTag: 'clear',
    cardGradient: ['#b45309', '#0e7490'],
    comments: [],
  },
  {
    id: 'sp_05',
    author: 'Southside Neighbors',
    handle: '@SouthernBoroughLive',
    avatarColor: '#10b981',
    district: 'Southern Borough',
    locationLabel: 'Backyard Patio Block',
    worldX: -48,
    worldZ: 145,
    caption: 'Backyard BBQ smoke & evening pickup games on the Southside court. Nothing beats Solara residential block nights.',
    hashtags: ['#SouthernBorough', '#BackyardBBQ', '#SolaraHomes'],
    likes: 187,
    likedByUser: false,
    reposts: 19,
    repostedByUser: false,
    timeLabel: '2h ago',
    weatherTag: 'clear',
    cardGradient: ['#065f46', '#1e293b'],
    comments: [],
  },
];

export const TRENDING_HASHTAGS = [
  { tag: '#SolaraSunset', posts: '12.4K' },
  { tag: '#CoastlineAir', posts: '8.9K' },
  { tag: '#IronportCargo', posts: '6.2K' },
  { tag: '#MarinaNights', posts: '15.1K' },
  { tag: '#BackyardBBQ', posts: '4.7K' },
];

export function togglePostLike(posts: SocialPost[], postId: string): SocialPost[] {
  return posts.map((p) => {
    if (p.id !== postId) return p;
    const nextLiked = !p.likedByUser;
    return {
      ...p,
      likedByUser: nextLiked,
      likes: Math.max(0, p.likes + (nextLiked ? 1 : -1)),
    };
  });
}

export function togglePostRepost(posts: SocialPost[], postId: string): SocialPost[] {
  return posts.map((p) => {
    if (p.id !== postId) return p;
    const nextReposted = !p.repostedByUser;
    return {
      ...p,
      repostedByUser: nextReposted,
      reposts: Math.max(0, p.reposts + (nextReposted ? 1 : -1)),
    };
  });
}

export function addPostComment(
  posts: SocialPost[],
  postId: string,
  author: string,
  handle: string,
  text: string
): SocialPost[] {
  const clean = text.trim();
  if (!clean) return posts;
  return posts.map((p) => {
    if (p.id !== postId) return p;
    return {
      ...p,
      comments: [
        ...p.comments,
        {
          id: `c_${Date.now()}_${p.comments.length + 1}`,
          author,
          handle,
          text: clean.slice(0, 180),
          timeAgo: 'Just now',
        },
      ],
    };
  });
}

export interface CreatePhotoPostInput {
  author: string;
  handle: string;
  avatarColor: string;
  district: string;
  worldX: number;
  worldZ: number;
  caption: string;
  weather: 'clear' | 'hazy' | 'rain';
  photoDataUrl?: string;
}

export function createUserSocialPost(input: CreatePhotoPostInput): SocialPost {
  const cleanCaption =
    input.caption.trim() || `Live from ${input.district} in Solara Bay!`;
  const districtTag = `#${input.district.replace(/[^A-Za-z0-9]/g, '')}`;
  const weatherTagHash =
    input.weather === 'rain' ? '#SolaraStorm' : input.weather === 'hazy' ? '#GoldenHaze' : '#SolaraClear';

  return {
    id: `sp_user_${Date.now()}`,
    author: input.author,
    handle: input.handle,
    avatarColor: input.avatarColor,
    district: input.district,
    locationLabel: `${input.district} (${Math.round(input.worldX)}m, ${Math.round(input.worldZ)}m)`,
    worldX: Math.round(input.worldX),
    worldZ: Math.round(input.worldZ),
    caption: cleanCaption.slice(0, 220),
    hashtags: ['#SolaraPulse', districtTag, weatherTagHash],
    likes: 1,
    likedByUser: true,
    reposts: 0,
    repostedByUser: false,
    timeLabel: 'Just now',
    weatherTag: input.weather,
    photoDataUrl: input.photoDataUrl,
    cardGradient: input.weather === 'rain' ? ['#0f172a', '#164e63'] : ['#78350f', '#1e3a8a'],
    comments: [],
  };
}
