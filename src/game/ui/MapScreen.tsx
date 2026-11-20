import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, Navigation, Trash2 } from 'lucide-react';
import { DISTRICTS, WORLD_FULL_EXTENT } from '../world/Districts';
import { CANAL_HALF_WIDTH, CANAL_X, CITY_BUILDINGS, INTERACTABLES } from '../world/WorldConfig';
import { SOLARA_ROAD_GRAPH } from '../world/RoadGraph';
import { LIVE_WORLD_SNAPSHOT } from '../engine/CoastlineEngine';
import { useGameStore } from '../state/useGameStore';

const EDGES = SOLARA_ROAD_GRAPH.getAllEdges();

export function MapScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const customWaypoint = useGameStore((s) => s.customWaypoint);
  const setCustomWaypoint = useGameStore((s) => s.setCustomWaypoint);
  const showToast = useGameStore((s) => s.showToast);
  const engine = useGameStore((s) => s.engine);

  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 35, z: -10 });
  const dragRef = useRef<{ active: boolean; sx: number; sy: number; px: number; pz: number; moved: boolean }>({
    active: false,
    sx: 0,
    sy: 0,
    px: 0,
    pz: 0,
    moved: false,
  });

  const worldW = WORLD_FULL_EXTENT.maxX - WORLD_FULL_EXTENT.minX;
  const worldH = WORLD_FULL_EXTENT.maxZ - WORLD_FULL_EXTENT.minZ;

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const baseScale = Math.min(w / worldW, h / worldH) * 0.94 * zoom;
    const snap = LIVE_WORLD_SNAPSHOT;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#071b2e';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(baseScale, baseScale);
    ctx.translate(-pan.x, -pan.z);

    // Subtle ocean latitude/longitude grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1.5 / baseScale;
    for (let gx = -460; gx <= 480; gx += 80) {
      ctx.beginPath();
      ctx.moveTo(gx, -360);
      ctx.lineTo(gx, 380);
      ctx.stroke();
    }
    for (let gz = -360; gz <= 380; gz += 80) {
      ctx.beginPath();
      ctx.moveTo(-460, gz);
      ctx.lineTo(480, gz);
      ctx.stroke();
    }

    // Palm Beach sandy coastline & Pier
    ctx.fillStyle = '#a89060';
    ctx.fillRect(-305, -230, 76, 540);
    ctx.fillStyle = '#7c5c3e';
    ctx.fillRect(-355, 11, 62, 18); // Solara Ferris Pier

    // Main urban island west of canal
    ctx.fillStyle = '#18263a';
    ctx.fillRect(-232, -220, 372, 535);

    // East peninsula (Coastline Airport + Ironport Shipment Port)
    ctx.fillStyle = '#1b293d';
    ctx.fillRect(164, -245, 255, 365);

    // North Ridge verdant foothills (northwest)
    ctx.fillStyle = '#1b4332';
    ctx.fillRect(-335, -395, 495, 225);

    // Cypress Wetlands marsh & boardwalk (northeast — exact match to cypress_wetlands bounds)
    ctx.fillStyle = '#13403c';
    ctx.fillRect(168, -395, 252, 150);
    ctx.fillStyle = '#0e4f5c';
    ctx.fillRect(212, -352, 128, 62); // Backwater lagoon
    ctx.strokeStyle = '#9a714c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(192, -252);
    ctx.lineTo(275, -310);
    ctx.lineTo(368, -338);
    ctx.stroke();

    // Coastline International Airport Tarmac & Runway 09/27
    ctx.fillStyle = '#243244';
    ctx.fillRect(184, -242, 240, 136);
    // Runway 09/27 asphalt strip (exact match to 3D runway at x=312, z=-206, len=220, w=28)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(202, -220, 220, 28);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([9, 7]);
    ctx.beginPath();
    ctx.moveTo(212, -206);
    ctx.lineTo(412, -206);
    ctx.stroke();
    ctx.setLineDash([]);
    // Runway threshold bars
    ctx.fillStyle = '#f8fafc';
    for (let k = -1; k <= 1; k++) {
      ctx.fillRect(205, -206 + k * 7 - 1.5, 7, 3);
      ctx.fillRect(410, -206 + k * 7 - 1.5, 7, 3);
    }
    // Taxiway connectors
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(256, -192);
    ctx.lineTo(256, -142);
    ctx.moveTo(336, -192);
    ctx.lineTo(336, -142);
    ctx.stroke();

    // Ironport Shipment Port Wharf & Panamax Cargo Ship MV Solara Star (exact match to 3D x=408, z=40)
    ctx.fillStyle = '#293548';
    ctx.fillRect(168, -104, 212, 268);
    // Ship hull moored east of wharf
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(396, -8, 24, 96);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(398, 66, 20, 14); // Bridge superstructure
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(400, 2, 16, 26);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(400, 32, 16, 28);
    // 3 Red Gantry Cranes (exact match to 3D x=364, z=-6, 40, 86)
    ctx.fillStyle = '#dc2626';
    for (const cz of [-6, 40, 86]) {
      ctx.fillRect(354, cz - 4, 34, 8);
    }

    // Solara Canal
    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(CANAL_X - CANAL_HALF_WIDTH, -235, CANAL_HALF_WIDTH * 2, 515);

    // Central Park
    ctx.fillStyle = '#1f643a';
    ctx.fillRect(-29, 11, 58, 58);

    // District borders
    for (const d of DISTRICTS) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
      ctx.lineWidth = 2 / baseScale;
      ctx.strokeRect(
        d.bounds.minX,
        d.bounds.minZ,
        d.bounds.maxX - d.bounds.minX,
        d.bounds.maxZ - d.bounds.minZ
      );
    }

    // Residential Backyards (green lawns + turquoise swimming pools)
    for (const b of CITY_BUILDINGS) {
      if (!b.hasBackyard) continue;
      const yardD = 12;
      const yardZ = b.z + b.d * 0.5 + yardD * 0.5;
      ctx.fillStyle = '#227044';
      ctx.fillRect(b.x - b.w * 0.52, yardZ - yardD * 0.5, b.w * 1.04, yardD);
      if (b.hasPool) {
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(b.x - 4.5, yardZ - 2.6, 9, 5.2);
      }
    }

    // Static Buildings footprints (color coded by role)
    for (const b of CITY_BUILDINGS) {
      if (b.style === 'airport_terminal' || b.style === 'airport_hangar') {
        ctx.fillStyle = '#475569';
      } else if (b.style === 'nightclub') {
        ctx.fillStyle = '#701a75';
      } else if (b.style === 'residential') {
        ctx.fillStyle = '#526580';
      } else {
        ctx.fillStyle = '#334866';
      }
      ctx.fillRect(b.x - b.w * 0.5, b.z - b.d * 0.5, b.w, b.d);
    }

    // Road Network (including northern Airport Bridge at z = -160)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [a, b] of EDGES) {
      ctx.moveTo(a.x, a.z);
      ctx.lineTo(b.x, b.z);
    }
    ctx.stroke();

    // Cyan A* Route Overlay
    const dest = customWaypoint ?? snap.missionTarget;
    if (dest) {
      const route = SOLARA_ROAD_GRAPH.findRoute(snap.playerX, snap.playerZ, dest.x, dest.z);
      if (route.nodes.length >= 2) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 6;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(route.nodes[0].x, route.nodes[0].z);
        for (let i = 1; i < route.nodes.length; i++) {
          ctx.lineTo(route.nodes[i].x, route.nodes[i].z);
        }
        ctx.stroke();
      }
    }

    // Interactable & Social Photo Spot Markers
    for (const item of INTERACTABLES) {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(item.x, item.z, item.type === 'social_spot' ? 6.8 : 7.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = item.type === 'social_spot' ? '#fdf4ff' : '#070e1a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Police Blips
    for (const cop of snap.police) {
      ctx.fillStyle = cop.active ? '#ef4444' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(cop.x, cop.z, 6.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mission Target
    if (snap.missionTarget) {
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#070e1a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(snap.missionTarget.x, snap.missionTarget.z, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Custom Waypoint
    if (customWaypoint) {
      ctx.fillStyle = '#22d3ee';
      ctx.strokeStyle = '#070e1a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(customWaypoint.x, customWaypoint.z, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Player Arrow
    ctx.save();
    ctx.translate(snap.playerX, snap.playerZ);
    ctx.rotate(-snap.playerYaw);
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#070e1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(10, 10);
    ctx.lineTo(0, 5);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // District Names (All 8 Well-Defined Playable Zones)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const d of DISTRICTS) {
      ctx.font = `700 ${Math.round(13.5 / Math.max(0.7, zoom * 0.72))}px Barlow Condensed, sans-serif`;
      ctx.fillStyle = 'rgba(248, 250, 252, 0.94)';
      ctx.fillText(d.shortName, d.center.x, d.center.z);
    }

    // Runway label
    ctx.font = `700 ${Math.round(10 / Math.max(0.7, zoom * 0.72))}px ui-monospace, monospace`;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
    ctx.fillText('RWY 09 / 27', 300, -224);

    ctx.restore();
  };

  useEffect(() => {
    drawMap();
    const id = window.setInterval(drawMap, 250);
    return () => window.clearInterval(id);
  });

  const screenToWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cx = ((clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((clientY - rect.top) / rect.height) * canvas.height;
    const baseScale = Math.min(canvas.width / worldW, canvas.height / worldH) * 0.94 * zoom;
    const wx = (cx - canvas.width / 2) / baseScale + pan.x;
    const wz = (cy - canvas.height / 2) / baseScale + pan.z;
    return { x: Math.round(wx), z: Math.round(wz) };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = {
      active: true,
      sx: e.clientX,
      sy: e.clientY,
      px: pan.x,
      pz: pan.z,
      moved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    if (Math.hypot(dx, dy) > 6) dragRef.current.moved = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const baseScale = Math.min(canvas.width / worldW, canvas.height / worldH) * 0.94 * zoom;
    setPan({
      x: dragRef.current.px - dx / baseScale,
      z: dragRef.current.pz - dy / baseScale,
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragRef.current.active && !dragRef.current.moved) {
      const pt = screenToWorld(e.clientX, e.clientY);
      setCustomWaypoint({ x: pt.x, z: pt.z, label: `Waypoint (${pt.x}, ${pt.z})` });
      showToast(`GPS Waypoint set (${pt.x}m, ${pt.z}m)`, 'cyan');
    }
    dragRef.current.active = false;
  };

  const activeDest = customWaypoint ?? LIVE_WORLD_SNAPSHOT.missionTarget;
  const routeDist = activeDest
    ? Math.round(
        SOLARA_ROAD_GRAPH.findRoute(
          LIVE_WORLD_SNAPSHOT.playerX,
          LIVE_WORLD_SNAPSHOT.playerZ,
          activeDest.x,
          activeDest.z
        ).totalDistance
      )
    : 0;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040914]/82 p-3 sm:p-6">
      <div className="hud-panel-cyan rounded-lg w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-cyan-500/25">
          <div>
            <div className="font-display text-xs uppercase tracking-widest text-cyan-400">
              SOLARA BAY · FULL 8-DISTRICT TACTICAL GPS (NORTH-UP)
            </div>
            <h2 className="font-display text-xl font-extrabold uppercase tracking-wider text-slate-50">
              World Map, Airport, Shipment Port &amp; Backyards
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {activeDest && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-cyan-950/80 border border-cyan-400/40 text-xs font-mono text-cyan-200 hud-num">
                <Navigation size={14} className="text-cyan-400" />
                <span>
                  {activeDest.label} · {routeDist}m
                </span>
              </div>
            )}
            {customWaypoint && (
              <button
                type="button"
                onClick={() => setCustomWaypoint(null)}
                className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-rose-400 text-xs text-rose-300 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Clear WP</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.4, z + 0.25))}
              aria-label="Zoom in map"
              className="w-8 h-8 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 flex items-center justify-center text-slate-200 cursor-pointer"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
              aria-label="Zoom out map"
              className="w-8 h-8 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 flex items-center justify-center text-slate-200 cursor-pointer"
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              onClick={() => setOverlay(null)}
              aria-label="Close World Map"
              className="w-8 h-8 rounded bg-amber-500 text-[#070e1a] flex items-center justify-center font-bold cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Map Body & Legend */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          <div className="flex-1 relative bg-[#071b2e] overflow-hidden">
            <canvas
              ref={canvasRef}
              width={920}
              height={680}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                dragRef.current.active = false;
              }}
              className="w-full h-full object-contain cursor-crosshair"
            />
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded bg-[#08101e]/90 border border-slate-700 text-[11px] font-mono text-slate-300 pointer-events-none">
              Click map to set Cyan A* Waypoint · Drag to pan · Use Quick Landmarks to GPS or Fast-Travel
            </div>
          </div>

          {/* Right Legend & Quick Locations */}
          <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-slate-800 bg-[#08101e] p-4 overflow-y-auto flex flex-col gap-4">
            <div>
              <h3 className="font-display text-xs uppercase tracking-widest text-amber-400 mb-2">
                Full Map Legend
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Mission / Player
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" /> A* GPS Route / Airport
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" /> Residential Backyards &amp; Pools
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-fuchsia-400 inline-block" /> @SolaraPulse Photo Spots
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Ironport Shipment Port
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> SBPD Patrol / Cargo Ship
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-xs uppercase tracking-widest text-cyan-400 mb-2">
                Landmarks, Airport &amp; Social Spots
              </h3>
              <div className="flex flex-col gap-1.5">
                {INTERACTABLES.map((item) => (
                  <div
                    key={item.id}
                    className="px-2.5 py-1.5 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCustomWaypoint({ x: item.x, z: item.z, label: item.label });
                        showToast(`GPS locked to ${item.label}`, 'cyan');
                      }}
                      className="text-left flex-1 min-w-0 cursor-pointer hover:text-cyan-300 transition-colors"
                    >
                      <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      data-testid={`visit-${item.id}`}
                      onClick={() => {
                        const presetYaw =
                          item.id === 'social_airport'
                            ? 0.55
                            : item.id === 'social_shipment'
                              ? -1.42
                              : item.id === 'social_pier'
                                ? 1.55
                                : item.id === 'social_backyard'
                                  ? 0
                                  : 0;
                        const offZ =
                          item.id === 'social_airport' ||
                          item.id === 'social_shipment' ||
                          item.id === 'social_backyard'
                            ? 0
                            : 4;
                        engine.fastTravel?.(item.x, item.z + offZ, presetYaw);
                        setOverlay(null);
                        showToast(`Fast-traveled to ${item.label}`, 'cyan');
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-500 hover:text-[#070e1a] text-[10px] font-display uppercase font-bold text-amber-300 shrink-0 cursor-pointer"
                    >
                      Visit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
