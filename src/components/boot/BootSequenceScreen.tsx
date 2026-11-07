import React, { useEffect, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  BookOpen,
  CloudCheck,
  Compass,
  FileCode2,
  FolderOpen,
  Globe2,
  LogIn,
  LogOut,
  Play,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  activePresetAtom,
  commanderAuthUserAtom,
  isBlueprintModalOpenAtom,
  isBootScreenOpenAtom,
  isCatalogModalOpenAtom,
  isGameConfigModalOpenAtom,
  isSaveModalOpenAtom,
  reliefScaleAtom,
  worldNameAtom,
  worldSeedAtom,
  worldViewModeAtom,
} from '../../stores/worldStore';
import { runWorldBootPrecomputation } from '../../services/assetPreloader';
import { listAllSaveSlots } from '../../services/saveService';
import {
  fetchCloudWorldSaves,
  signInWithGoogleCommander,
  signOutCommander,
  subscribeToAuthChanges,
} from '../../services/firebaseService';
import { view_MODE_PLANET_3D, view_MODE_PLATEAU } from '../../config/constants';

/**
 * 3-Stage Cinematic 3D Boot Sequence around the live 3D Planet & Approaching Flagship:
 * 1. Real-time 3D Orbital Flagship Arrival + Background Pre-computation
 * 2. Mandatory Google Firebase Authentication Gate (with Cloud Firestore Sync)
 * 3. Imperial Main Menu (Plateau, 3D Globe, New Game Wizard, RPG Catalogs, Cloud Saves, Blueprint)
 */
export const BootSequenceScreen: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isBootScreenOpenAtom);
  const [authUser, setAuthUser] = useAtom(commanderAuthUserAtom);

  const [progress, setProgress] = useState(10);
  const [stageLabel, setStageLabel] = useState('Approche Orbitale du Vaisseau Amiral 3D');
  const [stageDetail, setStageDetail] = useState('Initialisation de la télémétrie planétaire...');
  const [isBootReady, setIsBootReady] = useState(false);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedSlotsCount, setSavedSlotsCount] = useState(0);
  const [cloudSavesCount, setCloudSavesCount] = useState(0);

  const worldName = useAtomValue(worldNameAtom);
  const seed = useAtomValue(worldSeedAtom);
  const reliefScale = useAtomValue(reliefScaleAtom);
  const preset = useAtomValue(activePresetAtom);

  const setWorldViewMode = useSetAtom(worldViewModeAtom);
  const setIsSaveModalOpen = useSetAtom(isSaveModalOpenAtom);
  const setIsGameConfigModalOpen = useSetAtom(isGameConfigModalOpenAtom);
  const setIsCatalogModalOpen = useSetAtom(isCatalogModalOpenAtom);
  const setIsBlueprintModalOpen = useSetAtom(isBlueprintModalOpenAtom);

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
          : 'La fenêtre de connexion Google a été interrompue.';
      setAuthError(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmergencyOfflineCommander = () => {
    setAuthUser({
      uid: 'commander_local_session',
      displayName: 'Archonte Souverain (Session Locale)',
      email: null,
      photoURL: null,
      isLocalFallback: true,
    });
  };

  const handleSignOut = async () => {
    await signOutCommander();
    setAuthUser(null);
  };

  const handleEnterPlateau = () => {
    setWorldViewMode(view_MODE_PLATEAU);
    setIsOpen(false);
  };

  const handleEnterPlanetGlobe = () => {
    setWorldViewMode(view_MODE_PLANET_3D);
    setIsOpen(false);
  };

  const handleOpenConfig = () => {
    setIsOpen(false);
    setIsGameConfigModalOpen(true);
  };

  const handleOpenSaves = () => {
    setIsOpen(false);
    setIsSaveModalOpen(true);
  };

  const handleOpenCatalogs = () => {
    setIsOpen(false);
    setIsCatalogModalOpen(true);
  };

  const handleOpenBlueprint = () => {
    setIsOpen(false);
    setIsBlueprintModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-4 sm:p-7 bg-gradient-to-b from-[#040812]/80 via-transparent to-[#040812]/90">
      {/* Top Cinematic Telemetry Header (Leaves center clear to watch the 3D Planet & Approaching Flagship!) */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 max-w-6xl w-full mx-auto">
        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-amber-300/30 bg-[#070e1c]/80 backdrop-blur-xl px-4 py-2 text-xs font-mono text-amber-200 shadow-lg">
          <Rocket className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>ORBITE PLANÉTAIRE 3D EN DIRECT • VAISSEAU AMIRAL EN APPROCHE</span>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-[#070e1c]/80 backdrop-blur-xl px-3.5 py-2 text-[11px] font-mono text-slate-300">
          <Compass className="w-3.5 h-3.5 text-sky-300" />
          <span>STYLE : ASTRAL ANTIQUITY • CHRONO-BUILDER DYNASTIQUE 3D</span>
        </div>
      </div>

      {/* Bottom / Lower-Center Interactive Stage Card */}
      <div className="pointer-events-auto w-full max-w-3xl mx-auto mb-1 sm:mb-3 rounded-3xl border border-amber-300/30 bg-[#081020]/88 backdrop-blur-2xl p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.85)] text-slate-100">
        {/* Title Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-300 block">
              GALAXIA ULTRA • PAX HISTORIA 3D v4.0
            </span>
            <h1 className="font-serif text-2xl sm:text-4xl font-semibold tracking-tight text-amber-50 mt-0.5">
              {worldName}
            </h1>
          </div>

          {authUser && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5">
              {authUser.photoURL ? (
                <img
                  src={authUser.photoURL}
                  alt={authUser.displayName}
                  className="w-7 h-7 rounded-full border border-emerald-300/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserCheck className="w-4 h-4 text-emerald-300" />
              )}
              <div className="text-left">
                <span className="block text-xs font-semibold text-emerald-100 leading-tight">
                  {authUser.displayName}
                </span>
                <span className="block text-[10px] font-mono text-emerald-300/90">
                  {authUser.isLocalFallback ? 'Mode Session Locale' : 'Google Firebase Connecté'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Se déconnecter"
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* STAGE 1: 3D CINEMATIC BOOT & BACKGROUND ASSET PRELOADING */}
        {!isBootReady && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                {stageLabel}
              </span>
              <span className="text-amber-300 font-semibold">{progress}%</span>
            </div>
            <p className="text-xs text-slate-300">{stageDetail}</p>
            <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-300 to-sky-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Observez le vaisseau amiral impérial approcher l’orbite de {worldName} pendant la génération des reliefs, plages, montagnes et catalogues RPG...
            </p>
          </div>
        )}

        {/* STAGE 2: MANDATORY GOOGLE FIREBASE LOGIN SCREEN */}
        {isBootReady && !authUser && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-serif text-base sm:text-lg font-semibold text-amber-50">
                  Identification Impériale Requise • Google Firebase
                </h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Le vaisseau amiral est en orbite stationnaire. Connectez-vous avec votre compte{' '}
                  <span className="text-amber-200 font-medium">Google Firebase</span> pour déverrouiller le Pont de Commandement, synchroniser vos mondes sur{' '}
                  <span className="text-sky-300 font-medium">Cloud Firestore</span> et accéder aux Catalogues Dynastiques.
                </p>
              </div>
            </div>

            {authError && (
              <div className="rounded-xl border border-rose-400/35 bg-rose-500/15 p-3 text-xs text-rose-200 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleEmergencyOfflineCommander}
                  className="shrink-0 underline text-amber-200 hover:text-white font-medium cursor-pointer"
                >
                  Continuer en session locale
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                disabled={isSigningIn}
                onClick={handleGoogleSignIn}
                className="w-full sm:flex-1 flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-110 disabled:opacity-50 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {isSigningIn
                    ? 'Authentification Google Firebase en cours...'
                    : 'Se Connecter avec Google (Firebase Auth)'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleEmergencyOfflineCommander}
                className="w-full sm:w-auto rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
                title="Utiliser si votre navigateur bloque les popups tierces"
              >
                Accès Direct (Secours Local)
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: IMPERIAL MAIN MENU (UNLOCKED AFTER AUTH) */}
        {isBootReady && authUser && (
          <div className="mt-5 space-y-4">
            {/* Primary Play Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleEnterPlateau}
                className="flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Descendre sur le Plateau 3D</span>
              </button>

              <button
                type="button"
                onClick={handleEnterPlanetGlobe}
                className="flex items-center justify-center gap-2.5 rounded-xl border border-sky-400/40 bg-sky-500/15 px-5 py-3.5 text-sm font-semibold text-sky-100 hover:bg-sky-500/25 transition cursor-pointer"
              >
                <Globe2 className="w-4 h-4 text-sky-300" />
                <span>Carte Planétaire 3D (6 Zones & Routes)</span>
              </button>
            </div>

            {/* Secondary Menu Grid: New Game Wizard, RPG Catalogs, Cloud Saves, Blueprint */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={handleOpenConfig}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-amber-300/25 bg-amber-400/10 hover:bg-amber-400/20 p-3 text-center transition cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-medium text-amber-100">Nouvelle Partie</span>
                <span className="text-[10px] text-slate-400">Perso • Biome • Météo</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCatalogs}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-purple-300/25 bg-purple-400/10 hover:bg-purple-400/20 p-3 text-center transition cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-purple-300" />
                <span className="text-xs font-medium text-purple-100">Catalogues RPG</span>
                <span className="text-[10px] text-slate-400">Maisons • PNJ • Édifices</span>
              </button>

              <button
                type="button"
                onClick={handleOpenSaves}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-emerald-300/25 bg-emerald-400/10 hover:bg-emerald-400/20 p-3 text-center transition cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-emerald-300" />
                <span className="text-xs font-medium text-emerald-100">Sauvegardes</span>
                <span className="text-[10px] text-slate-400">
                  {savedSlotsCount} Loc. • {cloudSavesCount} Cloud
                </span>
              </button>

              <button
                type="button"
                onClick={handleOpenBlueprint}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-sky-300/25 bg-sky-400/10 hover:bg-sky-400/20 p-3 text-center transition cursor-pointer"
              >
                <FileCode2 className="w-4 h-4 text-sky-300" />
                <span className="text-xs font-medium text-sky-100">Blueprint v4.0</span>
                <span className="text-[10px] text-slate-400">Architecture & Specs</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <CloudCheck className="w-3.5 h-3.5" />
                Firestore Cloud Sync & Règles Zero-Trust Actives
              </span>
              <span>Biome : {preset.name} • Seed : {seed}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
