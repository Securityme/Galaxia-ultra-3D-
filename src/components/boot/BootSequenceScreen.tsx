import React, { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  CloudCheck,
  Compass,
  Crown,
  Eye,
  EyeOff,
  FileCode2,
  FolderOpen,
  Globe2,
  Layers,
  LogIn,
  LogOut,
  MapPin,
  Maximize2,
  Minimize2,
  Move,
  Play,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  UserCheck,
  Zap,
} from 'lucide-react';
import {
  activePresetAtom,
  activePresetIdAtom,
  activeZoneDefAtom,
  activeZoneIdAtom,
  cameraModeAtom,
  commanderAuthUserAtom,
  globeZoneClickSignalAtom,
  isArrivalZoneSelectedAtom,
  isBlueprintModalOpenAtom,
  isBootScreenOpenAtom,
  isCatalogModalOpenAtom,
  isGameConfigModalOpenAtom,
  isSaveModalOpenAtom,
  reliefScaleAtom,
  selectedBuildingIdAtom,
  selectedGlobeZoneIdAtom,
  selectedNpcIdAtom,
  worldNameAtom,
  worldSeedAtom,
  worldViewModeAtom,
  zonesRuntimeMapAtom,
} from '../../stores/worldStore';
import {
  PLANETARY_ZONES,
  PlanetaryZoneDefinition,
  getPlanetaryZoneById,
} from '../../config/planetaryZones';
import { getPresetById } from '../../config/presets';
import { runWorldBootPrecomputation } from '../../services/assetPreloader';
import { listAllSaveSlots } from '../../services/saveService';
import {
  fetchCloudWorldSaves,
  signInWithGoogleCommander,
  signOutCommander,
  subscribeToAuthChanges,
} from '../../services/firebaseService';
import {
  cam_MODE_ORBIT,
  view_MODE_PLANET_3D,
  view_MODE_PLATEAU,
} from '../../config/constants';
import { GlassPanel } from '../ui/GlassPanel';

/**
 * GALAXIA ULTRA • Bio-Dôme de Poche
 * Mobile-Ergonomic 3D Boot & Imperial Main Menu Console:
 * - Can be closed/minimized or reopened at any time to inspect the live 3D Planet & Flagship
 * - Direct click on any 3D Plateau on the Globe targets or immediately resumes the game on that Plateau
 * - Built on GlassPanel: supports tactile move, corner/pinch resize, and long-press auto-save
 */
export const BootSequenceScreen: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isBootScreenOpenAtom);
  const [authUser, setAuthUser] = useAtom(commanderAuthUserAtom);

  const [progress, setProgress] = useState(10);
  const [stageLabel, setStageLabel] = useState('Approche Orbitale du Vaisseau Amiral 3D');
  const [stageDetail, setStageDetail] = useState('Initialisation de la télémétrie planétaire...');
  const [isBootReady, setIsBootReady] = useState(false);

  // Mobile & 3D Globe Inspection state: allow closing/opening the main menu window to view the 3D planet
  const [isMenuWindowOpen, setIsMenuWindowOpen] = useState(true);
  // Instant 1-click resume when clicking a plateau on the 3D globe
  const [instantResumeOnGlobeClick, setInstantResumeOnGlobeClick] = useState(false);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedSlotsCount, setSavedSlotsCount] = useState(0);
  const [cloudSavesCount, setCloudSavesCount] = useState(0);

  const worldName = useAtomValue(worldNameAtom);
  const seed = useAtomValue(worldSeedAtom);
  const reliefScale = useAtomValue(reliefScaleAtom);
  const preset = useAtomValue(activePresetAtom);
  const activeZone = useAtomValue(activeZoneDefAtom);
  const [activeZoneId, setActiveZoneId] = useAtom(activeZoneIdAtom);
  const [selectedGlobeZoneId, setSelectedGlobeZoneId] = useAtom(selectedGlobeZoneIdAtom);
  const globeClickSignal = useAtomValue(globeZoneClickSignalAtom);
  const zonesRuntimeMap = useAtomValue(zonesRuntimeMapAtom);

  const setPresetId = useSetAtom(activePresetIdAtom);
  const setReliefScale = useSetAtom(reliefScaleAtom);
  const setWorldViewMode = useSetAtom(worldViewModeAtom);
  const setCameraMode = useSetAtom(cameraModeAtom);
  const setSelectedNpcId = useSetAtom(selectedNpcIdAtom);
  const setSelectedBuildingId = useSetAtom(selectedBuildingIdAtom);
  const setIsArrivalZoneSelected = useSetAtom(isArrivalZoneSelectedAtom);

  const setIsSaveModalOpen = useSetAtom(isSaveModalOpenAtom);
  const setIsGameConfigModalOpen = useSetAtom(isGameConfigModalOpenAtom);
  const setIsCatalogModalOpen = useSetAtom(isCatalogModalOpenAtom);
  const setIsBlueprintModalOpen = useSetAtom(isBlueprintModalOpenAtom);

  const lastHandledSignalSeqRef = useRef<number>(globeClickSignal.seq);
  const lastClickedZoneIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      setAuthUser((prev) => {
        if (user) return user;
        if (prev?.isLocalFallback) return prev;
        return null;
      });
    });
    return () => unsubscribe();
  }, [setAuthUser]);

  useEffect(() => {
    if (!isOpen) return;
    const slots = listAllSaveSlots().filter((s) => s.data !== null);
    setSavedSlotsCount(slots.length);

    if (authUser && !authUser.isLocalFallback) {
      fetchCloudWorldSaves()
        .then((cloudList) => setCloudSavesCount(cloudList.length))
        .catch(() => setCloudSavesCount(0));
    }
  }, [isOpen, authUser]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    setIsBootReady(false);
    runWorldBootPrecomputation(seed, reliefScale, preset, (step) => {
      if (cancelled) return;
      setProgress(step.percent);
      setStageLabel(step.stageTitle);
      setStageDetail(step.detail);
      if (step.percent >= 100) {
        setIsBootReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, seed, reliefScale, preset]);

  const ensureAuthenticatedCommander = () => {
    if (!authUser) {
      setAuthUser({
        uid: 'commander_local_session',
        displayName: 'Archonte Souverain (Session Locale)',
        email: null,
        photoURL: null,
        isLocalFallback: true,
      });
    }
  };

  const handleResumeOnPlateauZone = (zone: PlanetaryZoneDefinition) => {
    ensureAuthenticatedCommander();
    setActiveZoneId(zone.id);
    setSelectedGlobeZoneId(null);
    setPresetId(zone.presetId);
    setReliefScale(zone.reliefScale);
    setSelectedNpcId(null);
    setSelectedBuildingId(null);
    setIsArrivalZoneSelected(false);
    setWorldViewMode(view_MODE_PLATEAU);
    setCameraMode(cam_MODE_ORBIT);
    setIsOpen(false);
  };

  // Listen to direct 3D clicks on the Planet Globe plateau markers while on the Boot/Main Menu screen
  useEffect(() => {
    if (!isOpen) return;
    if (globeClickSignal.seq === lastHandledSignalSeqRef.current) return;
    lastHandledSignalSeqRef.current = globeClickSignal.seq;

    const clickedId = globeClickSignal.zoneId;
    if (!clickedId) return;

    const zone = getPlanetaryZoneById(clickedId);
    setIsBootReady(true);

    // If instant 1-click resume is enabled OR the user tapped the same 3D plateau marker a second time, resume immediately!
    if (instantResumeOnGlobeClick || lastClickedZoneIdRef.current === zone.id) {
      lastClickedZoneIdRef.current = null;
      handleResumeOnPlateauZone(zone);
      return;
    }

    lastClickedZoneIdRef.current = zone.id;
  }, [globeClickSignal, instantResumeOnGlobeClick, isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const user = await signInWithGoogleCommander(worldName);
      setAuthUser(user);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'La fenêtre de connexion Google a été interrompue ou fermée.';
      setAuthError(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmergencyOfflineCommander = () => {
    ensureAuthenticatedCommander();
  };

  const handleSignOut = async () => {
    await signOutCommander();
    setAuthUser(null);
  };

  const handleEnterPlateau = () => {
    handleResumeOnPlateauZone(activeZone);
  };

  const handleEnterPlanetGlobe = () => {
    ensureAuthenticatedCommander();
    setWorldViewMode(view_MODE_PLANET_3D);
    setIsOpen(false);
  };

  const handleOpenConfig = () => {
    ensureAuthenticatedCommander();
    setIsOpen(false);
    setIsGameConfigModalOpen(true);
  };

  const handleOpenSaves = () => {
    ensureAuthenticatedCommander();
    setIsOpen(false);
    setIsSaveModalOpen(true);
  };

  const handleOpenCatalogs = () => {
    ensureAuthenticatedCommander();
    setIsOpen(false);
    setIsCatalogModalOpen(true);
  };

  const handleOpenBlueprint = () => {
    ensureAuthenticatedCommander();
    setIsOpen(false);
    setIsBlueprintModalOpen(true);
  };

  const handleSelectZoneChip = (zone: PlanetaryZoneDefinition) => {
    setActiveZoneId(zone.id);
    setSelectedGlobeZoneId(zone.id);
    setPresetId(zone.presetId);
    setReliefScale(zone.reliefScale);
    if (instantResumeOnGlobeClick) {
      handleResumeOnPlateauZone(zone);
    }
  };

  const targetedZone = selectedGlobeZoneId
    ? getPlanetaryZoneById(selectedGlobeZoneId)
    : activeZone;
  const targetedPreset = getPresetById(targetedZone.presetId);
  const targetedRuntime = zonesRuntimeMap[targetedZone.id];
  const targetedBuildingsCount =
    targetedRuntime?.buildings.length ?? targetedZone.initialBuildings.length;
  const targetedNpcsCount = targetedRuntime?.npcs.length ?? 3;

  const precomputeSteps = [
    { label: 'Reliefs fractals & géomorphologie', threshold: 25 },
    { label: 'Grille hydrographique & biomes', threshold: 50 },
    { label: 'Textures PBR & normales de surface', threshold: 75 },
    { label: 'Corpus RPG & archives dynastiques', threshold: 100 },
  ];

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-2.5 sm:p-5 bg-gradient-to-b from-[#030712]/70 via-transparent to-[#02050e]/85 select-none overflow-hidden">
      {/* TOP MOBILE-FIRST BAR: Brand + Toggle Window Open/Close + 1-Click Globe Resume */}
      <header className="pointer-events-auto w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-300/25 bg-[#060e1d]/85 backdrop-blur-xl px-3 py-2 text-slate-200 shadow-lg">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-sm shrink-0">
            <Crown className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-serif font-semibold tracking-wider text-amber-100 uppercase">
              GALAXIA ULTRA
            </span>
            <span className="hidden md:inline text-slate-500">·</span>
            <span className="hidden md:inline text-[11px] font-mono text-amber-200/90">
              Bio-Dôme de Poche
            </span>
          </div>
        </div>

        {/* Ergonomic Controls: Close/Open Menu Window to View 3D Planet + Direct Click Mode */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setInstantResumeOnGlobeClick((v) => !v)}
            title="Activer pour reprendre la partie dès le 1er clic sur un plateau de la Planète 3D"
            className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-[11px] font-mono transition cursor-pointer shadow-lg backdrop-blur-xl ${
              instantResumeOnGlobeClick
                ? 'border-emerald-300/60 bg-emerald-500/25 text-emerald-100'
                : 'border-white/15 bg-[#060e1d]/85 text-slate-300 hover:text-white'
            }`}
          >
            <Zap
              className={`w-3.5 h-3.5 ${
                instantResumeOnGlobeClick ? 'text-emerald-300' : 'text-amber-300'
              }`}
            />
            <span>
              {instantResumeOnGlobeClick ? 'Clic Globe : Direct ON' : 'Clic Globe : Aperçu'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsMenuWindowOpen((prev) => !prev)}
            className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition cursor-pointer shadow-lg backdrop-blur-xl ${
              !isMenuWindowOpen
                ? 'border-amber-300/70 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950'
                : 'border-sky-300/40 bg-[#060e1d]/90 text-sky-100 hover:bg-sky-500/20'
            }`}
          >
            {isMenuWindowOpen ? (
              <>
                <Eye className="w-4 h-4 text-sky-300" />
                <span>Voir Planète 3D</span>
                <Minimize2 className="w-3.5 h-3.5 opacity-75 hidden sm:inline" />
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span>Ouvrir le Menu</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* WHEN MENU WINDOW IS CLOSED: Unobtrusive 3D Globe Inspector & Quick Resume Dock */}
      {!isMenuWindowOpen && (
        <div className="pointer-events-none flex-1 flex flex-col justify-end items-center pb-1 sm:pb-3">
          <div className="pointer-events-auto w-full max-w-xl mx-auto">
            <GlassPanel
              windowId="boot-globe-inspector-dock"
              className="p-3.5 sm:p-4 border-amber-300/40 shadow-[0_20px_60px_rgba(0,0,0,0.88)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: targetedZone.beaconColor }}
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300 uppercase">
                      <span>{targetedZone.regionCode}</span>
                      <span>·</span>
                      <span className="text-sky-300">{targetedPreset.name}</span>
                    </div>
                    <h2 className="font-serif text-base sm:text-lg font-bold text-amber-50 leading-tight">
                      {targetedZone.name}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs font-mono text-slate-300">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-amber-300" />
                    {targetedBuildingsCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-sky-300" />
                    {targetedNpcsCount}
                  </span>
                </div>
              </div>

              {/* Horizontal Mobile Pill Strip for the 6 Planetary Plateaux */}
              <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {PLANETARY_ZONES.map((z) => {
                  const isCurrent = z.id === targetedZone.id;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => handleSelectZoneChip(z)}
                      className={`shrink-0 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition cursor-pointer border ${
                        isCurrent
                          ? 'border-amber-300 bg-amber-400/20 text-amber-100 font-semibold'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: z.beaconColor }}
                      />
                      <span>{z.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResumeOnPlateauZone(targetedZone)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-4 py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-[0.99] transition cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Reprendre sur {targetedZone.name}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMenuWindowOpen(true)}
                  className="rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 px-3.5 py-3 text-xs font-medium text-slate-200 transition cursor-pointer"
                >
                  Menu Complet
                </button>
              </div>

              <p className="mt-2 text-[10px] font-mono text-slate-400 text-center">
                Touchez un plateau lumineux sur la Planète 3D (double-clic pour atterrir direct) ou glissez pour tourner le globe.
              </p>
            </GlassPanel>
          </div>
        </div>
      )}

      {/* MAIN CONSOLE WINDOW (Tactile Draggable & Resizable via GlassPanel + Long-Press Auto-Save) */}
      {isMenuWindowOpen && (
        <div className="pointer-events-none flex-1 flex items-center justify-center my-1 overflow-hidden">
          <GlassPanel
            windowId="imperial-main-menu-console"
            className="pointer-events-auto w-full max-w-2xl max-h-[82dvh] overflow-y-auto p-4 sm:p-6 border-amber-300/30 shadow-[0_25px_90px_rgba(0,0,0,0.92)]"
          >
            {/* Console Header */}
            <div className="flex flex-wrap items-start justify-between gap-2.5 border-b border-white/10 pb-3.5">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300 uppercase tracking-widest">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Console Impériale · Appui long pour déplacer/redimensionner</span>
                </div>
                <h1 className="font-serif text-xl sm:text-3xl font-semibold tracking-tight text-amber-50 mt-0.5">
                  {worldName}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                {authUser && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5">
                    {authUser.photoURL ? (
                      <img
                        src={authUser.photoURL}
                        alt={authUser.displayName}
                        className="w-6 h-6 rounded-full border border-emerald-300/50"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                    )}
                    <div className="text-left hidden sm:block">
                      <span className="block text-[11px] font-semibold text-emerald-100 leading-tight max-w-[140px] truncate">
                        {authUser.displayName}
                      </span>
                      <span className="block text-[9px] font-mono text-emerald-300/90">
                        {authUser.isLocalFallback ? 'Session Locale' : 'Cloud Connecté'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      title="Se déconnecter"
                      className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsMenuWindowOpen(false)}
                  title="Réduire la fenêtre pour manipuler la Planète 3D et cliquer sur un plateau"
                  className="flex items-center gap-1.5 rounded-xl border border-sky-300/35 bg-sky-400/15 hover:bg-sky-400/25 px-2.5 py-1.5 text-xs font-medium text-sky-100 transition cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5 text-sky-300" />
                  <span className="hidden sm:inline">Masquer</span>
                </button>
              </div>
            </div>

            {/* ACTIVE 3D PLATEAU DIRECT RESUME BANNER (Always visible & updated when clicking the 3D Globe!) */}
            <div className="mt-3.5 rounded-2xl border border-amber-300/35 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-sky-500/10 p-3 sm:p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/25 shrink-0"
                    style={{ backgroundColor: `${targetedZone.beaconColor}33` }}
                  >
                    <Globe2 className="w-4 h-4" style={{ color: targetedZone.beaconColor }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300">
                      <span>PLATEAU CIBLÉ ({targetedZone.regionCode})</span>
                      <span>·</span>
                      <span className="text-sky-300">{targetedPreset.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-sm sm:text-base font-bold text-white">
                        {targetedZone.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-300">
                        ({targetedBuildingsCount} édifices · {targetedNpcsCount} colons)
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleResumeOnPlateauZone(targetedZone)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-md hover:brightness-110 active:scale-[0.99] transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Reprendre sur ce Plateau</span>
                </button>
              </div>

              {/* Quick 6-Plateau Selector Chips for Mobile Ergonomics */}
              <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {PLANETARY_ZONES.map((z) => {
                  const isSelected = z.id === targetedZone.id;
                  const rt = zonesRuntimeMap[z.id];
                  const bCount = rt?.buildings.length ?? z.initialBuildings.length;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => handleSelectZoneChip(z)}
                      className={`shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-mono transition cursor-pointer border ${
                        isSelected
                          ? 'border-amber-300 bg-amber-400/25 text-amber-100 font-semibold'
                          : 'border-white/10 bg-black/25 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: z.beaconColor }}
                      />
                      <span>{z.name.split(' ')[0]}</span>
                      <span className="text-slate-400">({bCount})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STAGE 1: 3D CINEMATIC APPROACH & GEOMORPHOLOGICAL SYNTHESIS */}
            {!isBootReady && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-200 flex items-center gap-2 font-medium">
                    <Rocket className="w-4 h-4 text-amber-300 animate-bounce" />
                    {stageLabel}
                  </span>
                  <span className="text-amber-300 font-bold text-sm tabular-nums">{progress}%</span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-900/90 overflow-hidden border border-white/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-sky-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {precomputeSteps.map((s, idx) => {
                    const isDone = progress >= s.threshold;
                    const isCurrent =
                      !isDone && progress >= (precomputeSteps[idx - 1]?.threshold ?? 0);
                    return (
                      <div
                        key={s.label}
                        className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-lg border ${
                          isDone
                            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                            : isCurrent
                            ? 'border-amber-300/40 bg-amber-400/10 text-amber-100'
                            : 'border-white/5 bg-white/5 text-slate-400'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{s.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{stageDetail}</span>
                  <button
                    type="button"
                    onClick={() => setIsBootReady(true)}
                    className="text-xs text-amber-300 hover:text-white underline font-mono cursor-pointer"
                  >
                    Accès immédiat →
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 2: ARCHON SOVEREIGN CREDENTIAL & FIREBASE GATE */}
            {isBootReady && !authUser && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-amber-300/25 bg-amber-400/10 p-3 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-200 leading-relaxed">
                    Connectez-vous avec <span className="text-amber-200 font-semibold">Google Firebase</span> pour synchroniser vos mondes sur <span className="text-sky-300 font-semibold">Cloud Firestore</span>, ou lancez directement en session locale.
                  </p>
                </div>

                {authError && (
                  <div className="rounded-xl border border-rose-400/35 bg-rose-500/15 p-2.5 text-xs text-rose-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-300 shrink-0" />
                      <span>{authError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleEmergencyOfflineCommander}
                      className="shrink-0 underline text-amber-200 font-medium cursor-pointer"
                    >
                      Mode Local
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={isSigningIn}
                    onClick={handleGoogleSignIn}
                    className="flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-50 transition cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      {isSigningIn ? 'Connexion...' : 'Connexion Google (Cloud)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleEmergencyOfflineCommander}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-xs sm:text-sm font-medium text-slate-200 hover:bg-white/10 transition cursor-pointer"
                  >
                    <span>Session Locale Directe</span>
                    <ArrowRight className="w-4 h-4 text-amber-300" />
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 3: IMPERIAL MAIN MENU (UNLOCKED AFTER AUTH) */}
            {isBootReady && authUser && (
              <div className="mt-4 space-y-3">
                {/* Primary Views */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleEnterPlateau}
                    className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-3.5 text-slate-950 shadow-lg hover:brightness-105 active:scale-[0.99] transition cursor-pointer text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-950/20 flex items-center justify-center shrink-0">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold leading-tight">
                        Descendre sur le Plateau 3D
                      </h3>
                      <p className="text-[11px] text-slate-900/85 mt-0.5">
                        Jouer sur {targetedZone.name}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMenuWindowOpen(false)}
                    className="flex items-center gap-3 rounded-2xl border border-sky-400/40 bg-sky-500/15 p-3.5 text-sky-100 hover:bg-sky-500/25 active:scale-[0.99] transition cursor-pointer text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-sky-400/20 border border-sky-300/30 flex items-center justify-center text-sky-300 shrink-0">
                      <Globe2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold text-white leading-tight">
                        Explorer la Planète 3D
                      </h3>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Masquer la fenêtre & cliquer sur un plateau
                      </p>
                    </div>
                  </button>
                </div>

                {/* Secondary Modules (Ergonomic 2x2 on Mobile, 4 cols on Desktop) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={handleOpenConfig}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-amber-300/25 bg-amber-400/10 hover:bg-amber-400/20 p-3 text-center transition cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-amber-300" />
                    <span className="text-xs font-semibold text-amber-100">Nouvelle Partie</span>
                    <span className="text-[10px] text-slate-400">Archonte · Biome</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCatalogs}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-purple-300/25 bg-purple-400/10 hover:bg-purple-400/20 p-3 text-center transition cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-purple-300" />
                    <span className="text-xs font-semibold text-purple-100">Catalogues RPG</span>
                    <span className="text-[10px] text-slate-400">Maisons · PNJ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenSaves}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-emerald-300/25 bg-emerald-400/10 hover:bg-emerald-400/20 p-3 text-center transition cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-emerald-300" />
                    <span className="text-xs font-semibold text-emerald-100">Sauvegardes</span>
                    <span className="text-[10px] text-slate-400">
                      {savedSlotsCount} Loc. · {cloudSavesCount} Cloud
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenBlueprint}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-sky-300/25 bg-sky-400/10 hover:bg-sky-400/20 p-3 text-center transition cursor-pointer"
                  >
                    <FileCode2 className="w-4 h-4 text-sky-300" />
                    <span className="text-xs font-semibold text-sky-100">Blueprint v4.0</span>
                    <span className="text-[10px] text-slate-400">Specs & Moteur</span>
                  </button>
                </div>

                {/* Footer Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-300/90">
                    <CloudCheck className="w-3.5 h-3.5 text-emerald-300" />
                    {authUser.isLocalFallback
                      ? 'Sauvegarde Auto Locale Active'
                      : 'Cloud Firestore Synchronisé'}
                  </span>
                  <button
                    type="button"
                    onClick={handleEnterPlanetGlobe}
                    className="text-sky-300 hover:text-white underline cursor-pointer"
                  >
                    Ouvrir l'Atlas Orbital Complet →
                  </button>
                </div>
              </div>
            )}
          </GlassPanel>
        </div>
      )}

      {/* Discreet Bottom Gesture Hint */}
      <footer className="pointer-events-none w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400/80 px-2">
        <span>Appui long sur une fenêtre : déplacer & redimensionner (auto-sauvegardé)</span>
        <span className="hidden sm:inline">
          Touchez un plateau sur la Planète 3D pour reprendre votre partie dessus
        </span>
      </footer>
    </div>
  );
};
