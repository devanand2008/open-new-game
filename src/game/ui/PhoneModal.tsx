import { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Compass,
  Heart,
  MapPin,
  MessageCircle,
  MessageSquare,
  Navigation,
  Play,
  Repeat2,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { MISSIONS, PHONE_MESSAGES } from '../missions/MissionData';
import { TRENDING_HASHTAGS } from '../social/SocialFeed';
import { useGameStore } from '../state/useGameStore';

export function PhoneModal() {
  const tab = useGameStore((s) => s.phoneTab);
  const setTab = useGameStore((s) => s.setPhoneTab);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const completedMissions = useGameStore((s) => s.completedMissions);
  const activeMission = useGameStore((s) => s.mission);
  const launchMission = useGameStore((s) => s.launchMission);
  const character = useGameStore((s) => s.character);
  const switchCharacter = useGameStore((s) => s.switchCharacter);
  const money = useGameStore((s) => s.money);
  const telemetry = useGameStore((s) => s.telemetry);
  const engine = useGameStore((s) => s.engine);
  const setCustomWaypoint = useGameStore((s) => s.setCustomWaypoint);
  const showToast = useGameStore((s) => s.showToast);

  // SolaraPulse social state
  const socialPosts = useGameStore((s) => s.socialPosts);
  const followers = useGameStore((s) => s.followers);
  const toggleLikePost = useGameStore((s) => s.toggleLikePost);
  const toggleRepostPost = useGameStore((s) => s.toggleRepostPost);
  const addCommentToPost = useGameStore((s) => s.addCommentToPost);
  const publishSocialPhotoPost = useGameStore((s) => s.publishSocialPhotoPost);

  const [caption, setCaption] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const activeHandle = character === 'lena' ? '@LenaPark_Tech' : '@MarcoVega';
  const activeName = character === 'lena' ? 'Lena Park' : 'Marco Vega';

  const handleSnapLivePhoto = () => {
    const dataUrl = engine.capturePhotoSnapshot?.() ?? null;
    if (dataUrl) {
      setCapturedPhoto(dataUrl);
      showToast('Live 3D snapshot captured from Solara Bay!', 'magenta');
    } else {
      showToast('Camera preview unavailable — you can still publish a text update', 'amber');
    }
  };

  const handlePublishPost = () => {
    publishSocialPhotoPost(caption, capturedPhoto ?? undefined);
    setCaption('');
    setCapturedPhoto(null);
  };

  const handleRouteToPost = (x: number, z: number, label: string) => {
    setCustomWaypoint({ x, z, label });
    setOverlay(null);
    showToast(`GPS locked to ${label}`, 'cyan');
  };

  const handleVisitPost = (x: number, z: number, label: string) => {
    engine.fastTravel?.(x, z);
    setOverlay(null);
    showToast(`Arrived at ${label}`, 'cyan');
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040914]/78 p-4">
      <div className="hud-panel rounded-xl w-full max-w-2xl max-h-[86vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-500/25">
          <div>
            <div className="font-display text-xs uppercase tracking-widest text-amber-400">
              SOLARA OS · PERSONAL TERMINAL
            </div>
            <h2 className="font-display text-xl font-extrabold uppercase tracking-wider text-slate-50">
              Missions, SolaraPulse Social &amp; Crew
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="hud-num font-display text-lg font-bold text-amber-400">
              ${money.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => setOverlay(null)}
              aria-label="Close Solara Phone"
              className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* 4 Tabs */}
        <div className="grid grid-cols-4 border-b border-slate-800 bg-[#060c17]">
          <button
            type="button"
            onClick={() => setTab('missions')}
            className={`py-2.5 font-display text-xs sm:text-sm uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'missions'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-900/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass size={14} /> Missions ({completedMissions.length}/5)
          </button>
          <button
            type="button"
            data-testid="phone-tab-social"
            onClick={() => setTab('social')}
            className={`py-2.5 font-display text-xs sm:text-sm uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'social'
                ? 'text-fuchsia-400 border-b-2 border-fuchsia-400 bg-slate-900/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={14} /> SolaraPulse
          </button>
          <button
            type="button"
            onClick={() => setTab('crew')}
            className={`py-2.5 font-display text-xs sm:text-sm uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'crew'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={14} /> Crew
          </button>
          <button
            type="button"
            onClick={() => setTab('messages')}
            className={`py-2.5 font-display text-xs sm:text-sm uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'messages'
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-900/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare size={14} /> Comms ({PHONE_MESSAGES.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3">
          {tab === 'missions' &&
            MISSIONS.map((m) => {
              const done = completedMissions.includes(m.id);
              const isCurrent = activeMission.missionId === m.id && activeMission.phase === 'active';
              return (
                <div
                  key={m.id}
                  className={`rounded-lg p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-amber-950/35 border-amber-400/70'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-400">
                        {m.id}
                      </span>
                      <h3 className="font-display text-base font-bold uppercase text-slate-100">
                        {m.title}
                      </h3>
                      {done && <CheckCircle2 size={15} className="text-emerald-400" />}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{m.summary}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-slate-400">
                      <span>Contact: {m.giver}</span>
                      <span>·</span>
                      <span>{m.district}</span>
                      <span>·</span>
                      <span className="text-amber-300 font-bold">+${m.reward}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => launchMission(m.id)}
                    className={`px-4 py-2 rounded font-display text-xs uppercase tracking-wider font-extrabold flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isCurrent
                        ? 'bg-cyan-500 text-[#070e1a] hover:bg-cyan-400'
                        : 'bg-amber-500 text-[#070e1a] hover:bg-amber-400'
                    }`}
                  >
                    <Play size={13} className="fill-current" />
                    <span>{isCurrent ? 'Restart' : done ? 'Replay' : 'Track'}</span>
                  </button>
                </div>
              );
            })}

          {tab === 'social' && (
            <div className="flex flex-col gap-3.5" data-testid="solarapulse-feed">
              {/* Profile & Trending Header */}
              <div className="rounded-lg p-3.5 bg-gradient-to-r from-fuchsia-950/60 via-slate-900/90 to-cyan-950/50 border border-fuchsia-500/35 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-display font-extrabold text-sm text-[#070e1a]"
                      style={{ backgroundColor: character === 'lena' ? '#d946ef' : '#f59e0b' }}
                    >
                      {activeName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-display text-sm font-bold text-slate-100 leading-tight">
                        {activeName}{' '}
                        <span className="font-mono text-xs text-fuchsia-300 font-normal">
                          {activeHandle}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <MapPin size={11} className="text-cyan-400" />
                        <span>{telemetry.districtName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="hud-num font-display text-lg font-extrabold text-fuchsia-300 leading-none">
                      {followers.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono uppercase text-slate-400">Followers</div>
                  </div>
                </div>

                {/* Trending Hashtags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] font-display uppercase tracking-wider text-slate-400 mr-1">
                    Trending:
                  </span>
                  {TRENDING_HASHTAGS.map((h) => (
                    <button
                      key={h.tag}
                      type="button"
                      onClick={() =>
                        setCaption((prev) => (prev.includes(h.tag) ? prev : `${prev} ${h.tag}`.trim()))
                      }
                      className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 hover:border-fuchsia-400 text-[11px] font-mono text-cyan-300 cursor-pointer"
                    >
                      {h.tag} <span className="text-slate-500">{h.posts}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live 3D Photo & Post Composer */}
              <div className="rounded-lg p-3.5 bg-slate-900/90 border border-slate-700/90 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs uppercase tracking-wider font-bold text-fuchsia-300">
                    Share Live 3D Moment (+$50 Creator Bonus)
                  </span>
                  <button
                    type="button"
                    data-testid="snap-3d-photo-btn"
                    onClick={handleSnapLivePhoto}
                    className="px-3 py-1.5 rounded bg-fuchsia-500 hover:bg-fuchsia-400 text-[#070e1a] font-display text-xs uppercase font-extrabold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera size={13} />
                    <span>Snap Live 3D Photo</span>
                  </button>
                </div>

                {capturedPhoto && (
                  <div className="relative rounded-md overflow-hidden border border-fuchsia-400/50 bg-slate-950">
                    <img
                      src={capturedPhoto}
                      alt="Captured Solara Bay live 3D snapshot"
                      className="w-full h-36 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCapturedPhoto(null)}
                      aria-label="Discard captured photo"
                      className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-slate-950/85 text-[10px] font-mono text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={`What's happening in ${telemetry.districtName}?`}
                    className="flex-1 px-3 py-2 rounded bg-slate-950 border border-slate-700 focus:border-fuchsia-400 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    data-testid="publish-social-post-btn"
                    onClick={handlePublishPost}
                    className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-[#070e1a] font-display text-xs uppercase font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send size={13} />
                    <span>Post</span>
                  </button>
                </div>
              </div>

              {/* Feed Stream */}
              {socialPosts.map((post) => {
                const draft = commentDrafts[post.id] ?? '';
                const showComments = expandedComments[post.id] ?? post.comments.length > 0;
                return (
                  <article
                    key={post.id}
                    className="rounded-lg bg-slate-900/85 border border-slate-800 overflow-hidden flex flex-col"
                  >
                    {/* Author Row */}
                    <div className="px-3.5 pt-3 pb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-display font-extrabold text-xs text-[#070e1a] shrink-0"
                          style={{ backgroundColor: post.avatarColor }}
                        >
                          {post.author.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-100 leading-tight">
                            {post.author}{' '}
                            <span className="font-mono text-[11px] font-normal text-slate-400">
                              {post.handle}
                            </span>
                          </div>
                          <div className="text-[11px] text-cyan-300/90 flex items-center gap-1">
                            <MapPin size={10} />
                            <span>
                              {post.district} · {post.locationLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {post.timeLabel}
                      </span>
                    </div>

                    {/* Captured Photo OR Stylized Location Banner */}
                    {post.photoDataUrl ? (
                      <div className="px-3.5 pb-2">
                        <img
                          src={post.photoDataUrl}
                          alt={post.locationLabel}
                          className="w-full h-44 object-cover rounded-md border border-slate-700"
                        />
                      </div>
                    ) : (
                      <div
                        className="mx-3.5 mb-2 rounded-md px-3.5 py-3 flex items-center justify-between border border-slate-700/60"
                        style={{
                          background: `linear-gradient(125deg, ${post.cardGradient[0]}, ${post.cardGradient[1]})`,
                        }}
                      >
                        <div>
                          <div className="font-display text-[10px] uppercase tracking-widest text-amber-300/95">
                            LIVE SOLARA BAY GEO-TAG · {post.weatherTag.toUpperCase()}
                          </div>
                          <div className="font-display text-base font-extrabold uppercase text-white">
                            {post.locationLabel}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRouteToPost(post.worldX, post.worldZ, post.locationLabel)}
                            className="px-2.5 py-1 rounded bg-slate-950/80 hover:bg-cyan-500 hover:text-[#070e1a] border border-cyan-400/50 text-[11px] font-display uppercase font-bold text-cyan-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Navigation size={11} /> GPS
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVisitPost(post.worldX, post.worldZ, post.locationLabel)}
                            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-[#070e1a] text-[11px] font-display uppercase font-extrabold cursor-pointer"
                          >
                            Visit
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Caption & Hashtags */}
                    <div className="px-3.5 pb-2.5">
                      <p className="text-xs text-slate-200 leading-relaxed">{post.caption}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {post.hashtags.map((tag) => (
                          <span key={tag} className="text-[11px] font-mono text-fuchsia-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="px-3.5 py-2 border-t border-slate-800/90 bg-slate-950/50 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleLikePost(post.id)}
                          className={`flex items-center gap-1 font-mono cursor-pointer ${
                            post.likedByUser
                              ? 'text-rose-400 font-bold'
                              : 'text-slate-400 hover:text-rose-300'
                          }`}
                        >
                          <Heart size={13} className={post.likedByUser ? 'fill-current' : ''} />
                          <span>{post.likes}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleRepostPost(post.id)}
                          className={`flex items-center gap-1 font-mono cursor-pointer ${
                            post.repostedByUser
                              ? 'text-emerald-400 font-bold'
                              : 'text-slate-400 hover:text-emerald-300'
                          }`}
                        >
                          <Repeat2 size={14} />
                          <span>{post.reposts}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedComments((prev) => ({
                              ...prev,
                              [post.id]: !showComments,
                            }))
                          }
                          className="flex items-center gap-1 font-mono text-slate-400 hover:text-cyan-300 cursor-pointer"
                        >
                          <MessageCircle size={13} />
                          <span>{post.comments.length}</span>
                        </button>
                      </div>

                      {post.photoDataUrl && (
                        <button
                          type="button"
                          onClick={() => handleRouteToPost(post.worldX, post.worldZ, post.locationLabel)}
                          className="text-[11px] font-display uppercase font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Navigation size={11} /> Set GPS
                        </button>
                      )}
                    </div>

                    {/* Comments Thread & Reply Input */}
                    {showComments && (
                      <div className="px-3.5 py-2.5 border-t border-slate-800/70 bg-slate-950/75 flex flex-col gap-1.5">
                        {post.comments.map((c) => (
                          <div key={c.id} className="text-[11px] text-slate-300 leading-snug">
                            <span className="font-semibold text-amber-300">{c.author}</span>{' '}
                            <span className="font-mono text-slate-500 text-[10px]">{c.handle}</span>:{' '}
                            <span>{c.text}</span>
                          </div>
                        ))}
                        <div className="flex gap-1.5 mt-1">
                          <input
                            type="text"
                            value={draft}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && draft.trim()) {
                                addCommentToPost(post.id, draft);
                                setCommentDrafts((prev) => ({ ...prev, [post.id]: '' }));
                              }
                            }}
                            placeholder="Write a reply…"
                            className="flex-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!draft.trim()) return;
                              addCommentToPost(post.id, draft);
                              setCommentDrafts((prev) => ({ ...prev, [post.id]: '' }));
                            }}
                            className="px-2.5 py-1 rounded bg-cyan-500 text-[#070e1a] font-display text-[11px] uppercase font-bold cursor-pointer"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {tab === 'crew' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div
                className={`rounded-lg p-4 border ${
                  character === 'marco'
                    ? 'bg-amber-950/35 border-amber-400'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="font-display text-xs uppercase text-amber-400">PROTAGONIST 01</div>
                <h3 className="font-display text-xl font-bold text-slate-50 mt-0.5">Marco Vega</h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Urban operator &amp; specialist driver. Excels at high-speed vehicle handling, stamina, and coastal street navigation.
                </p>
                <button
                  type="button"
                  disabled={character === 'marco'}
                  onClick={() => {
                    switchCharacter('marco');
                    setOverlay(null);
                  }}
                  className={`mt-3 w-full py-2 rounded font-display text-xs uppercase tracking-wider font-bold ${
                    character === 'marco'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 cursor-default'
                      : 'bg-amber-500 text-[#070e1a] hover:bg-amber-400 cursor-pointer'
                  }`}
                >
                  {character === 'marco' ? 'Active Protagonist' : 'Switch to Marco'}
                </button>
              </div>

              <div
                className={`rounded-lg p-4 border ${
                  character === 'lena'
                    ? 'bg-fuchsia-950/35 border-fuchsia-400'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="font-display text-xs uppercase text-fuchsia-400">PROTAGONIST 02</div>
                <h3 className="font-display text-xl font-bold text-slate-50 mt-0.5">Lena Park</h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Street-tech analyst &amp; relay specialist. Ideal for M04 Signal Break network routing and downtown reconnaissance.
                </p>
                <button
                  type="button"
                  disabled={character === 'lena'}
                  onClick={() => {
                    switchCharacter('lena');
                    setOverlay(null);
                  }}
                  className={`mt-3 w-full py-2 rounded font-display text-xs uppercase tracking-wider font-bold ${
                    character === 'lena'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 cursor-default'
                      : 'bg-fuchsia-500 text-[#070e1a] hover:bg-fuchsia-400 cursor-pointer'
                  }`}
                >
                  {character === 'lena' ? 'Active Protagonist' : 'Switch to Lena'}
                </button>
              </div>

              <div className="sm:col-span-2 rounded-lg p-3.5 bg-slate-900/70 border border-slate-800 text-xs text-slate-300">
                <div className="font-display text-xs uppercase text-cyan-400 mb-1.5">
                  Solara Bay Contacts
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <strong className="text-fuchsia-300">Sofia Ramirez:</strong> Marina Crescent Nightlife Insider
                  </div>
                  <div>
                    <strong className="text-orange-300">Jalen Carter:</strong> Ironport Shipment Port Ally
                  </div>
                  <div>
                    <strong className="text-lime-300">Elliot Rhodes:</strong> North Ridge Trailhead Guide
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'messages' &&
            PHONE_MESSAGES.map((msg) => (
              <div
                key={msg.id}
                className="rounded-lg p-4 bg-slate-900/85 border border-slate-800 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-display text-sm font-bold uppercase"
                    style={{ color: msg.accent }}
                  >
                    {msg.sender}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{msg.role}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{msg.body}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
