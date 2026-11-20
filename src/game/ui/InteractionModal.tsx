import { X, Car, Shirt, Wrench, Save, Sun, ShieldCheck, Coffee } from 'lucide-react';
import { useGameStore } from '../state/useGameStore';
import { LENA_OUTFITS, MARCO_OUTFITS, type VehicleArchetype } from '../world/WorldConfig';
import { VEHICLE_SPECS } from '../physics/CollisionPhysics';

const GARAGE_OPTIONS: Array<{ archetype: VehicleArchetype; tag: string }> = [
  { archetype: 'sedan', tag: 'Balanced 4-Door' },
  { archetype: 'coupe', tag: 'High Top Speed' },
  { archetype: 'suv', tag: 'Heavy Coastal 4x4' },
  { archetype: 'motorcycle', tag: 'Agile Street Moto' },
  { archetype: 'truck', tag: 'Ironport Utility' },
];

export function InteractionModal() {
  const item = useGameStore((s) => s.activeInteractable);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const money = useGameStore((s) => s.money);
  const character = useGameStore((s) => s.character);
  const marcoOutfitId = useGameStore((s) => s.marcoOutfitId);
  const lenaOutfitId = useGameStore((s) => s.lenaOutfitId);
  const unlockedOutfits = useGameStore((s) => s.unlockedOutfits);
  const selectOutfit = useGameStore((s) => s.selectOutfit);
  const spendMoney = useGameStore((s) => s.spendMoney);
  const saveCurrentGame = useGameStore((s) => s.saveCurrentGame);
  const showToast = useGameStore((s) => s.showToast);
  const updateTelemetry = useGameStore((s) => s.updateTelemetry);
  const engine = useGameStore((s) => s.engine);

  if (!item) return null;

  const outfits = character === 'marco' ? MARCO_OUTFITS : LENA_OUTFITS;
  const activeOutfitId = character === 'marco' ? marcoOutfitId : lenaOutfitId;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040914]/78 p-4">
      <div className="hud-panel rounded-xl w-full max-w-md p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-amber-500/25 pb-3">
          <div>
            <div className="font-display text-xs uppercase tracking-widest text-amber-400">
              SOLARA BAY · LOCATION
            </div>
            <h2 className="font-display text-xl font-extrabold uppercase text-slate-50">
              {item.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOverlay(null)}
            aria-label="Close Location Menu"
            className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* SAFEHOUSE */}
        {item.type === 'safehouse' && (
          <div className="flex flex-col gap-2.5">
            <p className="text-xs text-slate-300">
              Rest at Marco & Lena’s Solara Downtown safehouse to save progress, advance the clock, or lay low from SBPD patrols.
            </p>
            <button
              type="button"
              onClick={() => {
                saveCurrentGame(false);
                setOverlay(null);
              }}
              className="py-2.5 px-4 rounded bg-emerald-500 hover:bg-emerald-400 text-[#070e1a] font-display text-sm uppercase font-extrabold flex items-center justify-between cursor-pointer"
            >
              <span>Save Progress Now</span>
              <Save size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                engine.clearWanted?.();
                showToast('Laid low — SBPD Wanted Level cleared', 'cyan');
                setOverlay(null);
              }}
              className="py-2.5 px-4 rounded bg-slate-900 border border-cyan-500/45 hover:bg-cyan-950/60 text-cyan-200 font-display text-sm uppercase font-bold flex items-center justify-between cursor-pointer"
            >
              <span>Lay Low (Clear Wanted Level)</span>
              <ShieldCheck size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                engine.advanceTimeHours?.(6);
                showToast('Rested 6 hours — Time of day advanced', 'amber');
                setOverlay(null);
              }}
              className="py-2.5 px-4 rounded bg-slate-900 border border-amber-500/45 hover:bg-amber-950/60 text-amber-200 font-display text-sm uppercase font-bold flex items-center justify-between cursor-pointer"
            >
              <span>Rest & Advance Clock (+6 Hours)</span>
              <Sun size={16} />
            </button>
          </div>
        )}

        {/* DOWNTOWN GARAGE */}
        {item.type === 'garage' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-300 mb-1">
              Select any Solara Bay fleet vehicle to roll out immediately onto Downtown Avenue:
            </p>
            {GARAGE_OPTIONS.map((opt) => {
              const spec = VEHICLE_SPECS[opt.archetype];
              return (
                <button
                  key={opt.archetype}
                  type="button"
                  onClick={() => {
                    engine.spawnGarageVehicle?.(opt.archetype);
                    setOverlay(null);
                  }}
                  className="p-3 rounded bg-slate-900/90 border border-slate-700 hover:border-amber-400 flex items-center justify-between text-left cursor-pointer"
                >
                  <div>
                    <div className="font-display text-sm font-bold uppercase text-slate-100 flex items-center gap-2">
                      <Car size={15} className="text-amber-400" /> {spec.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {opt.tag} · Top {Math.round(spec.maxSpeed * 3.6)} km/h
                    </div>
                  </div>
                  <span className="font-display text-xs uppercase font-bold text-cyan-300">Drive</span>
                </button>
              );
            })}
          </div>
        )}

        {/* VERVE CLOTHING BOUTIQUE */}
        {item.type === 'boutique' && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Wardrobe for {character === 'marco' ? 'Marco Vega' : 'Lena Park'}</span>
              <span className="font-display font-bold text-amber-400">${money.toLocaleString()}</span>
            </div>
            {outfits.map((o) => {
              const owned = unlockedOutfits.includes(o.id);
              const equipped = activeOutfitId === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    if (selectOutfit(o.id, o.price)) {
                      setOverlay(null);
                    }
                  }}
                  className={`p-3 rounded border flex items-center justify-between text-left cursor-pointer ${
                    equipped
                      ? 'bg-fuchsia-950/40 border-fuchsia-400'
                      : 'bg-slate-900/90 border-slate-700 hover:border-fuchsia-400/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-4 h-7 rounded-sm border border-white/20" style={{ backgroundColor: o.jacketColor }} />
                      <span className="w-3 h-7 rounded-sm border border-white/20" style={{ backgroundColor: o.accentColor }} />
                    </div>
                    <div>
                      <div className="font-display text-sm font-bold uppercase text-slate-100 flex items-center gap-1.5">
                        <Shirt size={14} className="text-fuchsia-400" /> {o.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {equipped ? 'Currently Equipped' : owned ? 'Owned — Click to Wear' : `Unlock for $${o.price}`}
                      </div>
                    </div>
                  </div>
                  <span className="font-display text-xs uppercase font-bold text-amber-300">
                    {equipped ? 'Active' : owned ? 'Equip' : `$${o.price}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* REPAIR STATION */}
        {item.type === 'repair' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-300">
              Full chassis repair, tire re-alignment, and fresh tune at Solara Auto Works in Southern Borough.
            </p>
            <button
              type="button"
              onClick={() => {
                if (spendMoney(50)) {
                  engine.repairActiveVehicle?.();
                  showToast('Vehicle repaired to 100% hull integrity!', 'cyan');
                  setOverlay(null);
                }
              }}
              className="py-3 px-4 rounded bg-cyan-500 hover:bg-cyan-400 text-[#070e1a] font-display text-sm uppercase font-extrabold flex items-center justify-between cursor-pointer"
            >
              <span>Repair Nearby Vehicle</span>
              <span className="flex items-center gap-1.5">
                <Wrench size={15} /> $50
              </span>
            </button>
          </div>
        )}

        {/* VENDING KIOSK */}
        {item.type === 'vending' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-300">
              Grab a chilled Solara Citrus cold-brew to top up Health & Stamina immediately.
            </p>
            <button
              type="button"
              onClick={() => {
                if (spendMoney(15)) {
                  updateTelemetry({ health: 100, stamina: 100 });
                  showToast('Health & Stamina restored to 100%!', 'emerald');
                  setOverlay(null);
                }
              }}
              className="py-3 px-4 rounded bg-emerald-500 hover:bg-emerald-400 text-[#070e1a] font-display text-sm uppercase font-extrabold flex items-center justify-between cursor-pointer"
            >
              <span>Buy Solara Refresh</span>
              <span className="flex items-center gap-1.5">
                <Coffee size={15} /> $15
              </span>
            </button>
          </div>
        )}

        {/* AMBIENT NPC (Elliot Rhodes) */}
        {item.type === 'npc' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-200 leading-relaxed">
              “Good to see you up at the ridge, friend. From here you can spot Solara Downtown, the Ironport cranes, and the Coastline Airport runway across the eastern wetlands. Stay sharp on those coastal curves.”
            </p>
            <button
              type="button"
              onClick={() => setOverlay(null)}
              className="py-2.5 px-4 rounded bg-amber-500 text-[#070e1a] font-display text-sm uppercase font-extrabold cursor-pointer"
            >
              Back to Solara Bay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
