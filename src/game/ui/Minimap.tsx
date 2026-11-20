import { useEffect, useRef } from 'react';
import { LIVE_WORLD_SNAPSHOT } from '../engine/CoastlineEngine';
import { SOLARA_ROAD_GRAPH } from '../world/RoadGraph';
import { CANAL_HALF_WIDTH, CANAL_X, CITY_BUILDINGS, INTERACTABLES } from '../world/WorldConfig';
import { useGameStore } from '../state/useGameStore';

const ROAD_EDGES = SOLARA_ROAD_GRAPH.getAllEdges();

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRotate = useGameStore((s) => s.settings.minimapRotate);
  const districtName = useGameStore((s) => s.telemetry.districtName);

  useEffect(() => {
    let timer = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const half = size / 2;
      const scale = 0.56; // pixels per world meter (~140m radius visible)
      const snap = LIVE_WORLD_SNAPSHOT;

      ctx.clearRect(0, 0, size, size);
      ctx.save();

      // Circular clip
      ctx.beginPath();
      ctx.arc(half, half, half - 3, 0, Math.PI * 2);
      ctx.clip();

      // Deep ocean water base
      ctx.fillStyle = '#0c2740';
      ctx.fillRect(0, 0, size, size);

      // Transform into world-relative map coordinates
      ctx.translate(half, half);
      if (minimapRotate) {
        // Rotate so forward direction points UP on the minimap
        ctx.rotate(snap.cameraYaw);
      }
      ctx.scale(scale, scale);
      ctx.translate(-snap.playerX, -snap.playerZ);

      // Beach sand strip (x: -295 to -230)
      ctx.fillStyle = '#a89060';
      ctx.fillRect(-295, -220, 68, 530);

      // Main urban land west of canal
      ctx.fillStyle = '#1b283b';
      ctx.fillRect(-232, -220, 372, 530);

      // East of canal (Airport + Ironport Shipment Port + Northeast Wetlands)
      ctx.fillStyle = '#1b283b';
      ctx.fillRect(164, -245, 255, 415);
      ctx.fillStyle = '#13403c';
      ctx.fillRect(168, -395, 252, 150);

      // Coastline Airport Runway 09/27
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(202, -220, 220, 28);

      // Ironport Panamax Ship
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(396, -8, 24, 96);

      // Canal water
      ctx.fillStyle = '#0e4a6b';
      ctx.fillRect(CANAL_X - CANAL_HALF_WIDTH, -235, CANAL_HALF_WIDTH * 2, 515);

      // Central Park green
      ctx.fillStyle = '#1f5b38';
      ctx.fillRect(-29, 11, 58, 58);

      // Residential Backyards & Pools
      for (let i = 0; i < CITY_BUILDINGS.length; i++) {
        const b = CITY_BUILDINGS[i];
        if (!b.hasBackyard) continue;
        const yardZ = b.z + b.d * 0.5 + 6;
        ctx.fillStyle = '#1f6a40';
        ctx.fillRect(b.x - b.w * 0.5, yardZ - 6, b.w, 12);
        if (b.hasPool) {
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(b.x - 4, yardZ - 2.5, 8, 5);
        }
      }

      // Static buildings footprints
      ctx.fillStyle = '#2d3f59';
      for (let i = 0; i < CITY_BUILDINGS.length; i++) {
        const b = CITY_BUILDINGS[i];
        ctx.fillRect(b.x - b.w * 0.5, b.z - b.d * 0.5, b.w, b.d);
      }

      // Roads from RoadGraph
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < ROAD_EDGES.length; i++) {
        const [a, b] = ROAD_EDGES[i];
        ctx.moveTo(a.x, a.z);
        ctx.lineTo(b.x, b.z);
      }
      ctx.stroke();

      // Cyan A* GPS route line
      if (snap.routeNodes.length >= 2) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 5.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(snap.routeNodes[0].x, snap.routeNodes[0].z);
        for (let i = 1; i < snap.routeNodes.length; i++) {
          ctx.lineTo(snap.routeNodes[i].x, snap.routeNodes[i].z);
        }
        ctx.stroke();
      }

      // Interactables (Safehouse, Garage, Shop, NPCs)
      for (const item of INTERACTABLES) {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.x, item.z, 5.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Parked driveable vehicles
      ctx.fillStyle = '#e2e8f0';
      for (const v of snap.vehicles) {
        ctx.fillRect(v.x - 2.6, v.z - 2.6, 5.2, 5.2);
      }

      // Police blips
      for (const cop of snap.police) {
        ctx.fillStyle = cop.active ? '#ef4444' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(cop.x, cop.z, cop.active ? 6.2 : 4.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Active Mission Target beacon
      if (snap.missionTarget) {
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#070e1a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(snap.missionTarget.x, snap.missionTarget.z, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Custom Waypoint
      if (snap.customWaypoint) {
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(snap.customWaypoint.x, snap.customWaypoint.z, 7.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Player heading arrow in center
      ctx.save();
      ctx.translate(half, half);
      const arrowRot = minimapRotate ? snap.cameraYaw - snap.playerYaw : -snap.playerYaw;
      ctx.rotate(arrowRot);
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#070e1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(6.5, 7);
      ctx.lineTo(0, 3.5);
      ctx.lineTo(-6.5, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // North indicator tick on rim
      ctx.save();
      ctx.translate(half, half);
      const northAngle = minimapRotate ? snap.cameraYaw : 0;
      const nx = Math.sin(northAngle) * (half - 11);
      const ny = -Math.cos(northAngle) * (half - 11);
      ctx.fillStyle = '#070e1a';
      ctx.beginPath();
      ctx.arc(nx, ny, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', nx, ny + 0.5);
      ctx.restore();

      // Crisp metallic outer bezel
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.72)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(half, half, half - 2, 0, Math.PI * 2);
      ctx.stroke();
    };

    draw();
    timer = window.setInterval(draw, 80); // ~12.5 Hz smooth radar update without React renders
    return () => window.clearInterval(timer);
  }, [minimapRotate]);

  return (
    <div className="flex flex-col items-center gap-1 select-none shrink-0">
      <div className="relative rounded-full shadow-2xl w-[116px] h-[116px] sm:w-[156px] sm:h-[156px]">
        <canvas
          ref={canvasRef}
          width={156}
          height={156}
          data-testid="minimap-canvas"
          className="block rounded-full w-full h-full"
        />
      </div>
      <div className="px-2 py-0.5 rounded bg-[#08101e]/90 border border-amber-500/35 text-[10px] sm:text-[11px] font-display uppercase tracking-wider text-amber-300 whitespace-nowrap">
        {districtName}
      </div>
    </div>
  );
}
