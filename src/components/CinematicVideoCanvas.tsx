import React, { useMemo, useState, useEffect } from "react";
import { Sliders, Grid, Tv, Eye, Maximize2, Sparkles, Filter, Volume2, Film } from "lucide-react";
import { Clip, EditItem } from "../types";
import { timecodeToSeconds } from "../utils/timecode";

interface CinematicVideoCanvasProps {
  activeItem: EditItem | null;
  activeClip: Clip | null;
  currentTime: number;
  clipProgress: number; // 0 to 1 within this specific clip
  tone: string;
  bpm: number;
  bassSwells: string[];
  sfxImpacts: string[];
  isPlaying: boolean;
  uploadedVideoUrl?: string | null;
  videoGeneratedUrl?: string | null;
  storyboardImages?: Record<string, string> | null;
  onSeek?: (time: number) => void;
  totalDuration?: number;
  soundtrackUrl?: string | null;
}

export const CinematicVideoCanvas: React.FC<CinematicVideoCanvasProps> = ({
  activeItem,
  activeClip,
  currentTime,
  clipProgress,
  tone,
  bpm,
  bassSwells,
  sfxImpacts,
  isPlaying,
  uploadedVideoUrl = null,
  videoGeneratedUrl = null,
  storyboardImages = null,
  onSeek,
  totalDuration = 30,
  soundtrackUrl = null,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Post-Production interactive grading states
  const [selectedLut, setSelectedLut] = useState<string | null>(null);
  const [exposure, setExposure] = useState<number>(100); // %
  const [contrast, setContrast] = useState<number>(100); // %
  const [saturation, setSaturation] = useState<number>(100); // %
  const [vignette, setVignette] = useState<boolean>(true);

  // Display & diagnostic overlays
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "2.39" | "1.33" | "9:16">("2.39");
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showCRT, setShowCRT] = useState<boolean>(true);
  const [showSafeAreas, setShowSafeAreas] = useState<boolean>(false);

  // Audio level peak indicators (db meters)
  const [audioPeaks, setAudioPeaks] = useState<{ left: number; right: number }>({ left: 1, right: 1 });

  React.useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, uploadedVideoUrl]);

  React.useEffect(() => {
    if (videoRef.current && !isPlaying) {
      const duration = videoRef.current.duration || 10;
      videoRef.current.currentTime = currentTime % duration;
    }
  }, [currentTime, isPlaying]);

  // Convert swell/impact timestamps to seconds for real-time flashes
  const swellSeconds = useMemo(() => bassSwells.map(timecodeToSeconds), [bassSwells]);
  const impactSeconds = useMemo(() => sfxImpacts.map(timecodeToSeconds), [sfxImpacts]);

  // Check if current time is within a short window (0.25s) of an impact or swell for visual flashing
  const isImpactActive = useMemo(() => {
    return impactSeconds.some((sec) => Math.abs(currentTime - sec) < 0.25);
  }, [impactSeconds, currentTime]);

  const isSwellActive = useMemo(() => {
    return swellSeconds.some((sec) => Math.abs(currentTime - sec) < 0.4);
  }, [swellSeconds, currentTime]);

  // Synchronized background soundbed playback player
  const audioTrackRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioTrackRef.current) {
      audioTrackRef.current = new Audio();
    }
    const audio = audioTrackRef.current;
    if (soundtrackUrl) {
      audio.src = soundtrackUrl;
      audio.load();
    } else {
      audio.src = "";
    }
    return () => {
      audio.pause();
    };
  }, [soundtrackUrl]);

  useEffect(() => {
    const audio = audioTrackRef.current;
    if (!audio || !soundtrackUrl) return;

    if (isPlaying) {
      audio.play().catch((err) => console.warn("Audio play blocked/delayed:", err));
    } else {
      audio.pause();
    }
  }, [isPlaying, soundtrackUrl]);

  useEffect(() => {
    const audio = audioTrackRef.current;
    if (!audio || !soundtrackUrl) return;

    if (Math.abs(audio.currentTime - currentTime) > 0.15) {
      audio.currentTime = currentTime;
    }
  }, [currentTime, soundtrackUrl]);

  // LED peak meters reaction
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        const baseLevel = isImpactActive ? 8 : isSwellActive ? 6 : 2;
        const randomness = 4;
        setAudioPeaks({
          left: Math.min(10, Math.max(1, Math.floor(Math.random() * randomness) + baseLevel)),
          right: Math.min(10, Math.max(1, Math.floor(Math.random() * randomness) + baseLevel)),
        });
      }, 80);
    } else {
      setAudioPeaks({ left: 1, right: 1 });
    }
    return () => clearInterval(interval);
  }, [isPlaying, isImpactActive, isSwellActive]);

  // Dynamically resolve grading preset parameters
  const activeLutKey = selectedLut || (
    tone.toLowerCase().includes("cyberpunk") || tone.toLowerCase().includes("neon") || tone.toLowerCase().includes("sci-fi") ? "neo-noir" :
    tone.toLowerCase().includes("horror") || tone.toLowerCase().includes("gothic") || tone.toLowerCase().includes("ghost") ? "gothic-cold" :
    tone.toLowerCase().includes("action") || tone.toLowerCase().includes("thriller") ? "bleach-bypass" : "golden-hour"
  );

  const colorGradeClasses = useMemo(() => {
    switch (activeLutKey) {
      case "neo-noir":
        return {
          id: "neo-noir",
          filter: `hue-rotate(320deg) saturate(${saturation * 1.6}%) contrast(${contrast * 1.2}%) brightness(${exposure}%)`,
          overlay: "bg-gradient-to-t from-pink-900/35 via-cyan-900/15 to-purple-900/35",
          label: "LUT: Neo-Noir (Teal/Pink Split)",
        };
      case "gothic-cold":
        return {
          id: "gothic-cold",
          filter: `saturate(${saturation * 0.35}%) contrast(${contrast * 1.4}%) brightness(${exposure * 0.85}%) sepia(10%)`,
          overlay: "bg-gradient-to-tr from-emerald-950/35 via-black/55 to-zinc-900/25",
          label: "LUT: Gothic Cold (Low Saturation Cold)",
        };
      case "bleach-bypass":
        return {
          id: "bleach-bypass",
          filter: `contrast(${contrast * 1.3}%) saturate(${saturation * 1.1}%) brightness(${exposure * 0.95}%)`,
          overlay: "bg-gradient-to-b from-blue-950/15 via-amber-950/15 to-black/45",
          label: "LUT: Bleach Bypass (Industrial Silver/Amber)",
        };
      case "golden-hour":
        return {
          id: "golden-hour",
          filter: `sepia(25%) saturate(${saturation * 0.95}%) contrast(${contrast * 1.05}%) brightness(${exposure}%)`,
          overlay: "bg-gradient-to-tr from-amber-950/15 via-orange-900/10 to-yellow-900/15",
          label: "LUT: Golden Hour (Warm Analog Film)",
        };
      case "imax-mono":
        return {
          id: "imax-mono",
          filter: `contrast(${contrast * 1.55}%) brightness(${exposure * 0.9}%) grayscale(100%)`,
          overlay: "bg-gradient-to-b from-zinc-950/10 to-black/55",
          label: "LUT: IMAX Monochrome (High-Contrast Silver)",
        };
      default:
        return {
          id: "golden-hour",
          filter: `sepia(25%) saturate(${saturation * 0.95}%) contrast(${contrast * 1.05}%) brightness(${exposure}%)`,
          overlay: "bg-gradient-to-tr from-amber-950/15 via-orange-900/10 to-yellow-900/15",
          label: "LUT: Golden Hour (Warm Analog Film)",
        };
    }
  }, [activeLutKey, exposure, contrast, saturation]);

  // Handle scene visual components based on clip description
  const visualSceneElements = useMemo(() => {
    if (!activeClip) return null;
    const desc = activeClip.description.toLowerCase();

    const elements: React.ReactNode[] = [];

    // Rain effect
    if (desc.includes("rain") || desc.includes("water") || desc.includes("puddle")) {
      elements.push(
        <div key="rain" className="absolute inset-0 overflow-hidden pointer-events-none opacity-50 z-10">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3px_80px] animate-[slide-down_0.8s_linear_infinite]" />
        </div>
      );
    }

    // Laser / Cyber-grid or HUD
    if (desc.includes("hud") || desc.includes("laser") || desc.includes("bionic") || desc.includes("cyber")) {
      elements.push(
        <div key="hud" className="absolute inset-0 pointer-events-none border border-cyan-500/15 m-8 font-mono text-[9px] text-cyan-400/40 flex flex-col justify-between p-4 z-10">
          <div className="flex justify-between items-center">
            <span>[REC_LOCK]</span>
            <span className="animate-pulse text-red-500">● RAW SYNC</span>
          </div>
          <div className="flex justify-between items-center">
            <span>ZOOM: 1.25X (BIONIC)</span>
            <span>FREQ: 144.8 MHz</span>
          </div>
        </div>
      );
    }

    // Flashlight beam
    if (desc.includes("flashlight") || desc.includes("lantern") || desc.includes("torch")) {
      elements.push(
        <div
          key="flashlight"
          className="absolute inset-0 pointer-events-none bg-radial-flashlight animate-flashlight-drift z-10"
          style={{
            background: "radial-gradient(circle 120px at 45% 45%, rgba(255,253,235,0.35) 0%, rgba(0,0,0,0.85) 75%)"
          }}
        />
      );
    }

    // Floating dust particles (Horror / Drama)
    if (desc.includes("dust") || desc.includes("archives") || desc.includes("asylum") || desc.includes("old") || desc.includes("wood")) {
      elements.push(
        <div key="dust" className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          <div className="absolute inset-0 bg-radial-shimmer opacity-40 animate-[pulse_4s_ease-in-out_infinite]" />
        </div>
      );
    }

    // Sparks or fire bursts
    if (desc.includes("spark") || desc.includes("explosion") || desc.includes("bullet") || desc.includes("firing")) {
      elements.push(
        <div key="sparks" className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          <div className="absolute top-1/2 left-1/3 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_20px_10px_rgba(245,158,11,0.8)] animate-ping" />
          <div className="absolute top-1/4 right-1/4 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_30px_15px_rgba(239,68,68,0.7)] animate-ping delay-100" />
        </div>
      );
    }

    // Interactive time-bubble or temporal rift
    if (desc.includes("temporal") || desc.includes("vortex") || desc.includes("rift") || desc.includes("coil") || desc.includes("portal")) {
      elements.push(
        <div key="vortex" className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10">
          <div className="w-64 h-64 rounded-full border border-sky-400/40 shadow-[0_0_80px_40px_rgba(56,189,248,0.2)] animate-[spin_10s_linear_infinite]" />
          <div className="absolute w-48 h-48 rounded-full border-2 border-indigo-500/20 shadow-[0_0_50px_20px_rgba(99,102,241,0.2)] animate-[spin_5s_reverse_linear_infinite]" />
        </div>
      );
    }

    // Wave ripples / Water or nostalgic grain (Drama)
    if (desc.includes("beach") || desc.includes("water") || desc.includes("sibling") || desc.includes("vintage") || desc.includes("polaroid")) {
      elements.push(
        <div key="grain" className="absolute inset-0 pointer-events-none bg-[radial-gradient(rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4px_4px] opacity-60 z-10" />
      );
    }

    return elements;
  }, [activeClip]);

  // Dialogue parsing (extracting "text" inside quotes)
  const dialogueLine = useMemo(() => {
    if (!activeClip) return null;
    const match = activeClip.description.match(/"([^"]+)"/);
    return match ? match[0] : null;
  }, [activeClip]);

  // Dramatic cinematic title card overlays at strategic sequence shifts or major edit points
  const titleCardText = useMemo(() => {
    if (!activeItem) return null;
    const role = activeItem.pacing_role;

    if (activeClip?.description.toLowerCase().includes("title card") || activeClip?.description.toLowerCase().includes("black frame")) {
      const match = activeClip.description.match(/"([^"]+)"/);
      return match ? match[1].toUpperCase() : "COMING SOON";
    }

    // Show procedural epic titles based on sequence timings
    if (activeItem.sequence_order === 1 && clipProgress < 0.4) {
      return "IN THE DEPTHS OF CONFLICT";
    }
    if (role === "Escalation" && clipProgress < 0.15) {
      return "A CHOSEN FATE";
    }
    if (role === "Climax" && clipProgress < 0.1) {
      return "THE TIME IS NOW";
    }

    return null;
  }, [activeItem, activeClip, clipProgress]);

  // Generate dynamic background styling to match clip content
  const sceneBackgroundStyles = useMemo(() => {
    if (!activeClip) return {};
    const desc = activeClip.description.toLowerCase();

    // Dark city / Rain
    if (desc.includes("neon") || desc.includes("city") || desc.includes("skyline") || desc.includes("rain")) {
      return {
        backgroundImage: "radial-gradient(ellipse at center, #11131a 0%, #030406 100%)",
        borderColor: "rgba(244, 63, 94, 0.25)"
      };
    }
    // Horror asylum
    if (desc.includes("asylum") || desc.includes("institu") || desc.includes("cell") || desc.includes("well")) {
      return {
        backgroundImage: "radial-gradient(ellipse at center, #090e0c 0%, #020302 100%)",
        borderColor: "rgba(16, 185, 129, 0.2)"
      };
    }
    // High tech lab / rift
    if (desc.includes("lab") || desc.includes("reactor") || desc.includes("portal") || desc.includes("rift")) {
      return {
        backgroundImage: "radial-gradient(ellipse at center, #0e121e 0%, #030406 100%)",
        borderColor: "rgba(59, 130, 246, 0.3)"
      };
    }
    // Muted island / warm room
    return {
      backgroundImage: "radial-gradient(ellipse at center, #1b1612 0%, #080605 100%)",
      borderColor: "rgba(245, 158, 11, 0.2)"
    };
  }, [activeClip]);

  // Compute transition-based zoom scaling for the Cross Zoom effect
  const transitionScale = useMemo(() => {
    if (!activeItem || activeItem.transition !== "Cross Zoom") return 1;
    if (clipProgress < 0.15) {
      // Zoom in from 1.4 down to 1.0
      return 1.4 - (clipProgress / 0.15) * 0.4;
    }
    if (clipProgress > 0.85) {
      // Zoom out from 1.0 up to 1.4
      return 1.0 + ((clipProgress - 0.85) / 0.15) * 0.4;
    }
    return 1;
  }, [activeItem, clipProgress]);

  // Dynamic Transition Overlay Element on Monitor
  const transitionOverlay = useMemo(() => {
    if (!activeItem) return null;
    const transition = activeItem.transition;

    if (clipProgress < 0.15) {
      const incomingProgress = clipProgress / 0.15; // 0 to 1
      const alpha = 1 - incomingProgress;

      switch (transition) {
        case "Dissolve":
          return (
            <div 
              className="absolute inset-0 bg-black/60 pointer-events-none z-28 transition-opacity" 
              style={{ opacity: alpha }}
            />
          );
        case "Dip to Black":
        case "Fade to Black":
          return (
            <div 
              className="absolute inset-0 bg-[#000000] pointer-events-none z-28 transition-opacity" 
              style={{ opacity: alpha }}
            />
          );
        case "Fade to White":
          return (
            <div 
              className="absolute inset-0 bg-[#ffffff] pointer-events-none z-28 transition-opacity" 
              style={{ opacity: alpha }}
            />
          );
        case "Glitch Cut":
          if (alpha > 0.15) {
            return (
              <div 
                className="absolute inset-0 bg-red-950/40 border-4 border-red-500/30 pointer-events-none z-28 flex flex-col justify-around font-mono text-center text-red-400 font-extrabold animate-pulse text-[11px] tracking-widest select-none"
                style={{ opacity: alpha }}
              >
                <div>_SIGNAL ERROR: CHROMATIC DISPLACEMENT_</div>
                <div className="bg-cyan-500/20 h-2 w-full animate-bounce" />
                <div className="bg-red-500/25 h-1 w-full" />
              </div>
            );
          }
          return null;
        default:
          return null;
      }
    }

    if (clipProgress > 0.85) {
      const outgoingProgress = (clipProgress - 0.85) / 0.15; // 0 to 1

      switch (transition) {
        case "Dissolve":
          return (
            <div 
              className="absolute inset-0 bg-black/60 pointer-events-none z-28 transition-opacity" 
              style={{ opacity: outgoingProgress }}
            />
          );
        case "Dip to Black":
        case "Fade to Black":
          return (
            <div 
              className="absolute inset-0 bg-[#000000] pointer-events-none z-28 transition-opacity" 
              style={{ opacity: outgoingProgress }}
            />
          );
        case "Fade to White":
          return (
            <div 
              className="absolute inset-0 bg-[#ffffff] pointer-events-none z-28 transition-opacity" 
              style={{ opacity: outgoingProgress }}
            />
          );
        case "Glitch Cut":
          if (outgoingProgress > 0.15) {
            return (
              <div 
                className="absolute inset-0 bg-rose-950/40 border-2 border-rose-500/30 pointer-events-none z-28 flex flex-col justify-around font-mono text-center text-rose-500 font-extrabold text-[11px] tracking-widest select-none"
                style={{ opacity: outgoingProgress }}
              >
                <div>[TRANSITION INITIATED: RAW BURST]</div>
                <div className="bg-red-500/20 h-3 w-full" />
              </div>
            );
          }
          return null;
        default:
          return null;
      }
    }

    return null;
  }, [activeItem, clipProgress]);

  return (
    <div className="flex flex-col w-full shadow-2xl select-none" id="cinematic-video-canvas-wrapper">
      {/* 1. Main Interactive Monitor */}
      <div 
        className="relative w-full aspect-video bg-black overflow-hidden border border-white/20 flex flex-col justify-between transition-all duration-300"
        style={sceneBackgroundStyles}
        id="cinematic-monitor"
      >
        {/* Dynamic Vignette Mask Overlay */}
        {vignette && (
          <div className="absolute inset-0 pointer-events-none z-15 shadow-[inset_0_0_120px_rgba(0,0,0,0.95)] mix-blend-multiply" />
        )}

        {/* CRT Scanlines Texture */}
        {showCRT && (
          <div className="absolute inset-0 pointer-events-none z-15 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] opacity-35 mix-blend-overlay" />
        )}

        {/* Diagnostic Align Grid Overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none z-15 border border-white/5">
            <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/10 border-dashed" />
            <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/10 border-dashed" />
            <div className="absolute top-1/3 left-0 right-0 border-t border-white/10 border-dashed" />
            <div className="absolute top-2/3 left-0 right-0 border-t border-white/10 border-dashed" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center opacity-35">
              <div className="absolute w-4 h-[1px] bg-white" />
              <div className="absolute h-4 w-[1px] bg-white" />
              <div className="absolute w-2 h-2 rounded-full border border-white" />
            </div>
          </div>
        )}

        {/* Safe Area Guides */}
        {showSafeAreas && (
          <div className="absolute inset-0 pointer-events-none border border-dashed border-cyan-400/20 m-8 z-15">
            <div className="absolute inset-0 border border-dashed border-cyan-400/10 m-8" />
            <div className="absolute top-1 left-2 font-mono text-[7px] text-cyan-400/50 uppercase tracking-widest">[ACTION SAFE 90%]</div>
            <div className="absolute top-9 left-10 font-mono text-[7px] text-cyan-400/35 uppercase tracking-widest">[TITLE SAFE 80%]</div>
          </div>
        )}

        {/* Interactive Aspect Ratio Letterbox Overlays */}
        {aspectRatio === "2.39" && (
          <>
            <div className="absolute top-0 left-0 right-0 h-[12%] bg-black/95 border-b border-zinc-900/60 z-20 transition-all duration-300" />
            <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-black/95 border-t border-zinc-900/60 z-20 transition-all duration-300" />
          </>
        )}
        {aspectRatio === "1.33" && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-[15%] bg-black/95 border-r border-zinc-900/60 z-20 transition-all duration-300" />
            <div className="absolute right-0 top-0 bottom-0 w-[15%] bg-black/95 border-l border-zinc-900/60 z-20 transition-all duration-300" />
          </>
        )}
        {aspectRatio === "9:16" && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-[30%] bg-black/95 border-r border-zinc-900/60 z-20 transition-all duration-300" />
            <div className="absolute right-0 top-0 bottom-0 w-[30%] bg-black/95 border-l border-zinc-900/60 z-20 transition-all duration-300" />
          </>
        )}

        {/* Cinematic Black Letterbox HUD - Top */}
        <div className="absolute top-0 left-0 right-0 h-[8%] bg-black/90 border-b border-white/10 z-25 flex items-center justify-between px-4 font-mono text-[10px] text-zinc-500">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-white uppercase tracking-widest font-bold font-sans text-[9px]">LIVE MONITOR</span>
          </div>
          <span className="font-sans text-[10px] font-semibold text-amber-500/90">{colorGradeClasses.label}</span>
          <span>{activeClip ? activeClip.clip_id : "NO CLIP LOADED"}</span>
        </div>

        {/* Screen flash on SFX / Bass hits */}
        <div 
          className={`absolute inset-0 pointer-events-none z-15 transition-all duration-75 mix-blend-screen ${
            isImpactActive 
              ? "bg-amber-500/20 border-4 border-amber-400" 
              : isSwellActive 
                ? "bg-blue-500/10 border-2 border-blue-400/40" 
                : "bg-transparent"
          }`} 
        />

        {/* Left & Right Audio DB meters */}
        {isPlaying && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-[45%] w-5 flex items-center justify-around z-25 bg-black/85 border border-zinc-800 p-1 rounded backdrop-blur-sm shadow-xl animate-fade-in">
            {/* L */}
            <div className="h-full flex flex-col justify-between items-center w-1.5">
              {Array.from({ length: 10 }).map((_, idx) => {
                const val = 10 - idx;
                const isActive = audioPeaks.left >= val;
                const color = val > 8 ? "bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.6)]" : val > 5 ? "bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.6)]" : "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]";
                return (
                  <div 
                    key={idx} 
                    className={`w-1 h-1 rounded-[1px] transition-all duration-75 ${
                      isActive ? color : "bg-zinc-900/60"
                    }`} 
                  />
                );
              })}
            </div>
            {/* R */}
            <div className="h-full flex flex-col justify-between items-center w-1.5">
              {Array.from({ length: 10 }).map((_, idx) => {
                const val = 10 - idx;
                const isActive = audioPeaks.right >= val;
                const color = val > 8 ? "bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.6)]" : val > 5 ? "bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.6)]" : "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]";
                return (
                  <div 
                    key={idx} 
                    className={`w-1 h-1 rounded-[1px] transition-all duration-75 ${
                      isActive ? color : "bg-zinc-900/60"
                    }`} 
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Primary Video Container */}
        {activeClip ? (
          <div 
            className="absolute inset-0 flex items-center justify-center overflow-hidden transition-all duration-500"
            style={{ 
              filter: colorGradeClasses.filter,
            }}
          >
            {/* Dynamic Ambient Grade Underlay */}
            <div className={`absolute inset-0 ${colorGradeClasses.overlay} mix-blend-overlay z-0`} />

            {/* Procedural Graphic Layer with dynamic Ken Burns movement */}
            <div 
              className="w-full h-full relative z-0 flex flex-col items-center justify-center text-center p-8 transition-transform"
              style={{
                transform: isPlaying 
                  ? `scale(${(1 + clipProgress * 0.12) * transitionScale}) translate(${Math.sin(currentTime * 2) * 1.5}px, ${Math.cos(currentTime * 1.5) * 1.2}px)`
                  : `scale(${transitionScale})`,
              }}
            >
              {/* Visual background patterns matching scene mood */}
              {visualSceneElements}

              {/* Procedural Visual Object inside the scene */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-0 z-0">
                {uploadedVideoUrl ? (
                  <div className="w-full h-full rounded overflow-hidden border border-zinc-850 shadow-2xl relative bg-black/60">
                    <video
                      ref={videoRef}
                      src={uploadedVideoUrl}
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/85 border border-zinc-850 px-1.5 py-0.5 rounded text-[8px] font-mono text-amber-500 uppercase tracking-widest">
                      INGESTED MEDIA SYNCED
                    </div>
                  </div>
                ) : videoGeneratedUrl ? (
                  <div className="w-full h-full rounded overflow-hidden border border-zinc-850 shadow-2xl relative bg-black/60">
                    <video
                      ref={videoRef}
                      src={videoGeneratedUrl}
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/85 border border-zinc-850 px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-400 uppercase tracking-widest flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse mr-1" />
                      <span>VEO AI VIDEO SYNCED</span>
                    </div>
                  </div>
                ) : (storyboardImages && storyboardImages[activeClip.clip_id]) ? (
                  <div className="w-full h-full rounded overflow-hidden border border-zinc-850 shadow-2xl relative bg-black/60">
                    <img
                      src={storyboardImages[activeClip.clip_id]}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover animate-fade-in"
                      alt={activeClip.description}
                    />
                    <div className="absolute top-2 left-2 bg-black/85 border border-zinc-850 px-1.5 py-0.5 rounded text-[8px] font-mono text-amber-500 uppercase tracking-widest flex items-center space-x-1">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400 animate-pulse mr-1" />
                      <span>AI STORYBOARD KEYFRAME</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full rounded overflow-hidden border border-white/5 relative flex flex-col items-center justify-center p-6">
                    {/* Atmospheric pulsing center shape representing active scene vectors */}
                    <div 
                      className={`absolute w-64 h-64 rounded-full filter blur-3xl opacity-20 animate-pulse transition-all duration-1000 ${
                        activeClip.action_type.toLowerCase().includes("action") || activeClip.description.toLowerCase().includes("run")
                          ? "bg-red-600 scale-110"
                          : activeClip.description.toLowerCase().includes("horror") || activeClip.description.toLowerCase().includes("terror")
                            ? "bg-emerald-500 scale-105"
                            : activeClip.description.toLowerCase().includes("science") || activeClip.description.toLowerCase().includes("space")
                              ? "bg-sky-500 scale-125"
                              : "bg-amber-500"
                      }`}
                    />

                    {/* Vector camera focus reticle and diagnostic cues */}
                    <div className="absolute top-8 left-8 w-8 h-8 border-t border-l border-white/20" />
                    <div className="absolute top-8 right-8 w-8 h-8 border-t border-r border-white/20" />
                    <div className="absolute bottom-8 left-8 w-8 h-8 border-b border-l border-white/20" />
                    <div className="absolute bottom-8 right-8 w-8 h-8 border-b border-r border-white/20" />

                    <div className="z-10 text-center space-y-1.5">
                      <div className="inline-flex items-center space-x-1.5 bg-black/75 border border-zinc-800 px-2.5 py-1 rounded-full text-[9px] font-mono text-zinc-400 tracking-wider">
                        <Film className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                        <span>RENDER MODEL: VIRTUAL SET READY</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-mono select-none">
                        ACTIVE MOOD: {activeClip.action_type.toUpperCase()} / {activeClip.emotion.toUpperCase()}
                      </p>
                      <p className="text-[9px] text-zinc-500 font-mono italic max-w-sm mx-auto leading-relaxed">
                        Create an AI Storyboard frame or Veo video clip under the AI Tools tab to project graphics here!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Subtitles / Action descriptions overlay */}
              <div className="absolute bottom-14 left-12 right-12 text-center select-none z-10">
                {dialogueLine ? (
                  <div className="bg-black/75 px-4 py-2 rounded border border-zinc-800/40 inline-block">
                    <p className="text-yellow-400 font-serif text-sm italic tracking-wide">
                      {dialogueLine}
                    </p>
                  </div>
                ) : (
                  <div className="bg-black/75 px-3 py-1.5 rounded-full border border-zinc-800/40 inline-block max-w-[85%] text-xs font-medium text-zinc-200 shadow-md">
                    {activeClip.description.split("|").pop()?.trim() || activeClip.description}
                  </div>
                )}
              </div>
            </div>
            {/* Visual Transition Overlay Layer */}
            {transitionOverlay}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 space-y-3 z-0">
            <Film className="w-10 h-10 text-zinc-800 animate-pulse" />
            <p className="text-xs font-semibold tracking-wider font-mono uppercase text-zinc-400">STANDBY — NO SEQUENCE BUFFERED</p>
            <p className="text-[10px] text-zinc-600 max-w-xs text-center leading-relaxed">Select a template or paste custom footage logs, then click FORGE DECK TRAILER to sync monitor streams.</p>
          </div>
        )}

        {/* Cinematic Full Screen Title Card Overlay */}
        {titleCardText && activeClip && (
          <div className="absolute inset-0 bg-[#020202] flex flex-col items-center justify-center text-center z-30 transition-all duration-300">
            <div className="space-y-3 p-8">
              <p className="text-zinc-600 font-mono text-[8px] tracking-[0.3em] uppercase">[TITLE FRAME SEQUENCE]</p>
              <h1 className="text-2xl md:text-3xl text-zinc-100 font-extrabold tracking-[0.25em] font-sans antialiased text-shadow-lg drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] transform scale-102">
                {titleCardText}
              </h1>
            </div>
          </div>
        )}

        {/* Interactive Scrubbing Timeline Bar overlay */}
        {totalDuration && totalDuration > 0 && onSeek && (
          <div 
            className="absolute bottom-10 left-4 right-4 h-1 bg-zinc-900/90 border border-zinc-800/40 rounded overflow-hidden cursor-pointer group z-25 transition-all hover:h-1.5"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const pct = Math.max(0, Math.min(1, clickX / rect.width));
              onSeek(pct * totalDuration);
            }}
          >
            <div 
              className="h-full bg-amber-500 relative transition-all duration-150"
              style={{ width: `${(currentTime / totalDuration) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white opacity-0 group-hover:opacity-100 shadow" />
            </div>
          </div>
        )}

        {/* Cinematic Black Letterbox HUD - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[8%] bg-black/90 border-t border-white/10 z-25 flex items-center justify-between px-4 font-mono text-[10px] text-zinc-500">
          <div className="flex items-center space-x-3">
            <span className="text-amber-500/90 font-bold uppercase">{activeItem ? activeItem.pacing_role : "STANDBY"}</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-300">CUT {activeItem ? activeItem.sequence_order : "-"}</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-zinc-600">TIME:</span>
            <span className="text-zinc-100 font-bold">
              {currentTime.toFixed(2)}s / {totalDuration.toFixed(2)}s
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Digital Colorist Desk & Monitor Diagnostics Dock */}
      <div className="w-full bg-[#08090c] border-x border-b border-white/10 p-4 flex flex-col space-y-3 font-sans" id="cinematic-colorist-deck">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-amber-500" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-300">
              POST-PRODUCTION DOCK & COLORIST SUITE
            </span>
          </div>
          <div className="flex items-center space-x-1 text-[9px] font-mono text-zinc-500">
            <span>RENDER MONITOR FEED: READY</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Col 1: Preset Film LUT Selectors (Col span 5) */}
          <div className="md:col-span-5 space-y-2">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              <span>ACTIVE FILM LUT (LOOK-UP TABLE)</span>
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "neo-noir", label: "NEO-NOIR", desc: "Cyan/Pink Split" },
                { id: "gothic-cold", label: "GOTHIC COLD", desc: "Low-Sat Shadow" },
                { id: "bleach-bypass", label: "BLEACH BYPASS", desc: "High-Cont Silver" },
                { id: "golden-hour", label: "GOLDEN HOUR", desc: "Warm Analog Film" },
                { id: "imax-mono", label: "IMAX MONO", desc: "Silver Scale B&W" },
                { id: "auto", label: "AUTO (BY TONE)", desc: "Preset Derived" },
              ].map((lut) => (
                <button
                  key={lut.id}
                  type="button"
                  onClick={() => setSelectedLut(lut.id === "auto" ? null : lut.id)}
                  className={`text-left p-1.5 border rounded transition-all flex flex-col justify-between cursor-pointer ${
                    (lut.id === "auto" && selectedLut === null) || selectedLut === lut.id
                      ? "bg-amber-500/10 border-amber-500 text-amber-500"
                      : "bg-black/40 border-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold tracking-tight">{lut.label}</span>
                  <span className="text-[7.5px] text-zinc-500 truncate max-w-[85px] leading-none mt-1">{lut.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Col 2: Cinematic Aspect Ratios & Overlays (Col span 3.5) */}
          <div className="md:col-span-3.5 space-y-3">
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block flex items-center space-x-1">
                <Maximize2 className="w-3.5 h-3.5 text-zinc-500" />
                <span>CINEMATIC ASPECT GUIDES</span>
              </span>
              <div className="flex gap-1">
                {[
                  { id: "2.39", label: "2.39:1" },
                  { id: "16:9", label: "16:9" },
                  { id: "1.33", label: "1.33:1" },
                  { id: "9:16", label: "9:16" },
                ].map((asp) => (
                  <button
                    key={asp.id}
                    type="button"
                    onClick={() => setAspectRatio(asp.id as any)}
                    className={`flex-1 text-center py-1 border rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                      aspectRatio === asp.id
                        ? "bg-amber-500/15 border-amber-500 text-amber-500"
                        : "bg-black/40 border-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {asp.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block flex items-center space-x-1">
                <Grid className="w-3.5 h-3.5 text-zinc-500" />
                <span>DIAGNOSTIC DISPLAY OVERLAYS</span>
              </span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setShowGrid(!showGrid)}
                  className={`py-1 text-[9px] font-mono rounded border transition-all cursor-pointer text-center ${
                    showGrid ? "bg-amber-500/10 border-amber-500 text-amber-500" : "bg-black/30 border-zinc-900 text-zinc-500"
                  }`}
                >
                  GRID
                </button>
                <button
                  type="button"
                  onClick={() => setShowCRT(!showCRT)}
                  className={`py-1 text-[9px] font-mono rounded border transition-all cursor-pointer text-center ${
                    showCRT ? "bg-amber-500/10 border-amber-500 text-amber-500" : "bg-black/30 border-zinc-900 text-zinc-500"
                  }`}
                >
                  CRT
                </button>
                <button
                  type="button"
                  onClick={() => setShowSafeAreas(!showSafeAreas)}
                  className={`py-1 text-[9px] font-mono rounded border transition-all cursor-pointer text-center ${
                    showSafeAreas ? "bg-amber-500/10 border-amber-500 text-amber-500" : "bg-black/30 border-zinc-900 text-zinc-500"
                  }`}
                >
                  SAFE
                </button>
              </div>
            </div>
          </div>

          {/* Col 3: Grading Fine-Tuning Sliders (Col span 3.5) */}
          <div className="md:col-span-3.5 space-y-2">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block flex items-center space-x-1">
              <Sliders className="w-3.5 h-3.5 text-zinc-500" />
              <span>LIVE SIGNAL ADJUSTMENTS</span>
            </span>
            <div className="space-y-2 bg-black/40 border border-zinc-900 p-2 rounded">
              {/* Exposure */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                  <span>EXPOSURE</span>
                  <span className="text-zinc-300">{exposure}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={exposure}
                  onChange={(e) => setExposure(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-zinc-900 h-1 rounded cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                  <span>CONTRAST</span>
                  <span className="text-zinc-300">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-zinc-900 h-1 rounded cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                  <span>SATURATION</span>
                  <span className="text-zinc-300">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-zinc-900 h-1 rounded cursor-pointer"
                />
              </div>

              {/* Vignette check */}
              <div className="flex items-center justify-between text-[8px] font-mono text-zinc-500 pt-1 border-t border-zinc-900/60">
                <span>VIGNETTE MASKING</span>
                <input
                  type="checkbox"
                  checked={vignette}
                  onChange={(e) => setVignette(e.target.checked)}
                  className="accent-amber-500 cursor-pointer h-2.5 w-2.5"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
