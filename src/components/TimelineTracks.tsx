import React, { useMemo, useRef } from "react";
import { EditItem, Clip } from "../types";
import { timecodeToSeconds, secondsToTimecode } from "../utils/timecode";
import { Film, ArrowRightLeft, Move, AlertTriangle, Music, Sparkles, Magnet, Activity, Wand2, CheckCircle } from "lucide-react";

interface TimelineTracksProps {
  editSheet: EditItem[];
  rankedLibrary: Clip[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  selectedItem: EditItem | null;
  onSelectItem: (item: EditItem | null) => void;
  onUpdateItem: (updated: EditItem) => void;
  bpm?: number;
  sfxImpacts?: string[];
  bassSwells?: string[];
}

export const TimelineTracks: React.FC<TimelineTracksProps> = ({
  editSheet,
  rankedLibrary,
  currentTime,
  duration,
  onSeek,
  selectedItem,
  onSelectItem,
  onUpdateItem,
  bpm = 120,
  sfxImpacts = [],
  bassSwells = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [magneticSnapping, setMagneticSnapping] = React.useState(true);

  // Compute absolute start and end times for each edit sheet item in sequence
  const editTimingDetails = useMemo(() => {
    let elapsed = 0;
    return editSheet.map((item) => {
      const startSec = timecodeToSeconds(item.in_point);
      const endSec = timecodeToSeconds(item.out_point);
      const rawLen = endSec - startSec;
      const isTooShort = rawLen < 0.5;
      const clipLen = Math.max(0.5, rawLen);
      const seqStart = elapsed;
      const seqEnd = elapsed + clipLen;
      elapsed += clipLen;

      // Find library description
      const libraryClip = (rankedLibrary || []).find((c) => c.clip_id === item.clip_id);

      return {
        ...item,
        seqStart,
        seqEnd,
        clipLen,
        rawLen,
        isTooShort,
        libraryClip,
      };
    });
  }, [editSheet, rankedLibrary]);

  const totalCalculatedDuration = useMemo(() => {
    if (editTimingDetails.length === 0) return duration;
    return editTimingDetails[editTimingDetails.length - 1].seqEnd;
  }, [editTimingDetails, duration]);

  // List of all calculated beat markers in seconds
  const allBeatMarkers = useMemo(() => {
    const beatInterval = 60 / bpm;
    const sfxSeconds = sfxImpacts.map(timecodeToSeconds);
    const swellSeconds = bassSwells.map(timecodeToSeconds);

    const regularBeats: number[] = [];
    for (let b = 0; b <= 120; b += beatInterval) {
      regularBeats.push(b);
    }

    return Array.from(
      new Set([...regularBeats, ...sfxSeconds, ...swellSeconds])
    ).sort((a, b) => a - b);
  }, [bpm, sfxImpacts, bassSwells]);

  const visualBeatLines = useMemo(() => {
    const beatInterval = 60 / bpm;
    const sfxSeconds = sfxImpacts.map(timecodeToSeconds);
    const swellSeconds = bassSwells.map(timecodeToSeconds);

    const lines: Array<{ time: number; type: 'beat' | 'sfx' | 'swell' }> = [];

    // Add regular musical beats up to the duration of the current sequence
    const maxDur = totalCalculatedDuration || 30;
    for (let b = 0; b <= maxDur; b += beatInterval) {
      lines.push({ time: b, type: 'beat' });
    }

    // Add SFX impacts
    sfxSeconds.forEach((time) => {
      if (time <= maxDur) {
        lines.push({ time, type: 'sfx' });
      }
    });

    // Add Bass swells
    swellSeconds.forEach((time) => {
      if (time <= maxDur) {
        lines.push({ time, type: 'swell' });
      }
    });

    // Remove duplicates, keeping the highest priority type (sfx/swell > beat)
    const uniqueLines: typeof lines = [];
    const seenTimes = new Set<string>();

    const sortedRaw = [...lines].sort((a, b) => {
      if (a.type !== 'beat' && b.type === 'beat') return -1;
      if (a.type === 'beat' && b.type !== 'beat') return 1;
      return 0;
    });

    sortedRaw.forEach((line) => {
      const key = line.time.toFixed(3);
      if (!seenTimes.has(key)) {
        seenTimes.add(key);
        uniqueLines.push(line);
      }
    });

    return uniqueLines.sort((a, b) => a.time - b.time);
  }, [bpm, sfxImpacts, bassSwells, totalCalculatedDuration]);

  // Handler to expand a clip to the next beat marker (minimum of 0.5s duration)
  const handleExpandClipToBeat = (item: EditItem) => {
    const startSec = timecodeToSeconds(item.in_point);
    const currentOutSec = timecodeToSeconds(item.out_point);

    // Find the next beat marker that is > startSec + 0.5
    const targetMinEnd = startSec + 0.5;
    const futureBeats = allBeatMarkers.filter((b) => b >= targetMinEnd && b > currentOutSec + 0.05);

    let nextBeat = targetMinEnd;
    if (futureBeats.length > 0) {
      nextBeat = futureBeats[0];
    } else {
      // If no future beat, expand by one standard beat interval from targetMinEnd
      const beatInterval = 60 / bpm;
      nextBeat = targetMinEnd + beatInterval;
    }

    onUpdateItem({
      ...item,
      out_point: secondsToTimecode(nextBeat),
    });
  };

  const tooShortClips = useMemo(() => {
    return editTimingDetails.filter((item) => item.isTooShort);
  }, [editTimingDetails]);

  const beatGaps = useMemo(() => {
    if (editTimingDetails.length === 0 || allBeatMarkers.length === 0) return [];
    
    // Gather all transition/boundary times
    const boundaries = [0, ...editTimingDetails.map(item => item.seqEnd)];
    const gaps: Array<{ start: number; end: number; duration: number; nearestBeat: number; boundaryTime: number }> = [];

    boundaries.forEach((T) => {
      // Find closest beat
      let closestBeat = allBeatMarkers[0];
      let minDiff = Math.abs(T - closestBeat);
      for (let i = 1; i < allBeatMarkers.length; i++) {
        const diff = Math.abs(T - allBeatMarkers[i]);
        if (diff < minDiff) {
          minDiff = diff;
          closestBeat = allBeatMarkers[i];
        }
      }

      // If the closest beat is further than a tolerance of 0.05 seconds, it's a alignment gap
      if (minDiff > 0.05) {
        const start = Math.min(T, closestBeat);
        const end = Math.max(T, closestBeat);
        gaps.push({
          start,
          end,
          duration: end - start,
          nearestBeat: closestBeat,
          boundaryTime: T
        });
      }
    });

    return gaps;
  }, [editTimingDetails, allBeatMarkers]);

  // Global Trailer Pacing Sync Score Calculation
  const syncScore = useMemo(() => {
    let score = 100;
    // Deduct 10 points for every extremely short clip that creates pacing jitter
    score -= tooShortClips.length * 10;
    // Deduct 5 points for every edit alignment beat gap
    score -= beatGaps.length * 5;
    return Math.max(10, Math.min(100, score));
  }, [tooShortClips, beatGaps]);

  const syncGradeInfo = useMemo(() => {
    if (syncScore >= 90) return { label: "EXCELLENT", color: "text-emerald-400 bg-emerald-950/45 border-emerald-500/35" };
    if (syncScore >= 75) return { label: "GOOD", color: "text-blue-400 bg-blue-950/45 border-blue-500/35" };
    if (syncScore >= 55) return { label: "FAIR", color: "text-amber-400 bg-amber-950/45 border-amber-500/35" };
    return { label: "JITTERY", color: "text-rose-400 bg-rose-950/45 border-rose-500/35 animate-pulse" };
  }, [syncScore]);

  // Magnetic Snapping helper for seeking & placing playhead
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || totalCalculatedDuration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const ratio = Math.max(0, Math.min(1, clickX / width));
    let targetTime = ratio * totalCalculatedDuration;

    if (magneticSnapping && allBeatMarkers.length > 0) {
      let closestBeat = allBeatMarkers[0];
      let minDiff = Math.abs(targetTime - closestBeat);
      for (let i = 1; i < allBeatMarkers.length; i++) {
        const diff = Math.abs(targetTime - allBeatMarkers[i]);
        if (diff < minDiff) {
          minDiff = diff;
          closestBeat = allBeatMarkers[i];
        }
      }
      // Snap playhead if cursor is within 0.22s of a beat or audio impact marker
      if (minDiff < 0.22) {
        targetTime = closestBeat;
      }
    }
    onSeek(targetTime);
  };

  // Interactive heal gap action: automatically expands the preceding clip to snap flush to the next beat marker
  const handleHealGap = (gap: { boundaryTime: number; nearestBeat: number }) => {
    const precedingIndex = editTimingDetails.findIndex(
      (item) => Math.abs(item.seqEnd - gap.boundaryTime) < 0.05
    );
    if (precedingIndex !== -1) {
      const item = editTimingDetails[precedingIndex];
      const startSec = timecodeToSeconds(item.in_point);
      const newDuration = gap.nearestBeat - item.seqStart;
      if (newDuration >= 0.5) {
        onUpdateItem({
          ...item,
          out_point: secondsToTimecode(startSec + newDuration),
        });
      }
    }
  };

  // SVG Waveform generator based on rhythmic intervals, SFX spikes and swells
  const waveformPath = useMemo(() => {
    const pointsCount = 110;
    const pathSegments: string[] = [];
    const maxDur = totalCalculatedDuration || 30;

    for (let i = 0; i <= pointsCount; i++) {
      const time = (i / pointsCount) * maxDur;
      let amp = 8; // base soundbed volume line

      allBeatMarkers.forEach((bm) => {
        const dist = Math.abs(time - bm);
        if (dist < 0.12) amp = 24;
      });

      sfxImpacts.map(timecodeToSeconds).forEach((sfx) => {
        const dist = Math.abs(time - sfx);
        if (dist < 0.22) amp = 46; // big audio spikes for explosions & impact FX
      });

      bassSwells.map(timecodeToSeconds).forEach((swell) => {
        const dist = Math.abs(time - swell);
        if (dist < 0.3) amp = Math.max(amp, 32 - dist * 25); // rounded hill curves for bass drops
      });

      // Add symmetric noise spikes
      amp += Math.sin(i * 1.6) * 2.5 + (i % 2 === 0 ? 1 : -1);
      amp = Math.max(3, Math.min(48, amp));

      const x = (i / pointsCount) * 100;
      const yUpper = 50 - amp;
      if (i === 0) {
        pathSegments.push(`M ${x} ${yUpper}`);
      } else {
        pathSegments.push(`L ${x} ${yUpper}`);
      }
    }

    // Symmetry mirror lines back to start
    for (let i = pointsCount; i >= 0; i--) {
      const time = (i / pointsCount) * maxDur;
      let amp = 8;

      allBeatMarkers.forEach((bm) => {
        const dist = Math.abs(time - bm);
        if (dist < 0.12) amp = 24;
      });

      sfxImpacts.map(timecodeToSeconds).forEach((sfx) => {
        const dist = Math.abs(time - sfx);
        if (dist < 0.22) amp = 46;
      });

      bassSwells.map(timecodeToSeconds).forEach((swell) => {
        const dist = Math.abs(time - swell);
        if (dist < 0.3) amp = Math.max(amp, 32 - dist * 25);
      });

      amp += Math.sin(i * 1.6) * 2.5 + (i % 2 === 0 ? 1 : -1);
      amp = Math.max(3, Math.min(48, amp));

      const x = (i / pointsCount) * 100;
      const yLower = 50 + amp;
      pathSegments.push(`L ${x} ${yLower}`);
    }

    pathSegments.push("Z");
    return pathSegments.join(" ");
  }, [allBeatMarkers, sfxImpacts, bassSwells, totalCalculatedDuration]);

  return (
    <div className="bg-white/5 border border-white/10 p-4 select-none animate-fade-in" id="nle-timeline-tracks">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-white/5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Film className="w-4.5 h-4.5 text-amber-500" />
            <span className="text-xs font-bold tracking-widest font-mono text-zinc-300 uppercase">
              NLE TIME TRACKS (A/V SPLIT)
            </span>
          </div>

          {/* Interactive Trailer Sync Score Badge */}
          <div className={`flex items-center space-x-2 border px-2 py-0.5 rounded text-[10px] font-mono font-bold ${syncGradeInfo.color}`}>
            <Activity className="w-3.5 h-3.5" />
            <span>SYNC SCORE: {syncScore}%</span>
            <span className="opacity-40">•</span>
            <span>{syncGradeInfo.label}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Magnetic Snapping Toggle Switch */}
          <button
            onClick={() => setMagneticSnapping(!magneticSnapping)}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded border text-[10px] font-mono font-bold transition-all cursor-pointer ${
              magneticSnapping
                ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                : "bg-zinc-950/40 text-zinc-500 border-zinc-800/60 hover:text-zinc-400"
            }`}
            title="Snap playhead automatically to the nearest musical beat marker or SFX impact within 0.22 seconds"
          >
            <Magnet className={`w-3.5 h-3.5 ${magneticSnapping ? "animate-pulse" : ""}`} />
            <span>SNAP: {magneticSnapping ? "ACTIVE" : "OFF"}</span>
          </button>

          <div className="text-[10px] font-mono text-zinc-500 flex items-center space-x-3">
            <span className="hidden md:inline">SEQUENCE RESOLUTION: 24 FPS</span>
            <span className="hidden md:inline">|</span>
            <span className="text-zinc-400">TOTAL: {totalCalculatedDuration.toFixed(2)}s</span>
          </div>
        </div>
      </div>

      {/* Dynamic Diagnostic HUD Warning Center */}
      {tooShortClips.length > 0 && (
        <div className="mb-3.5 bg-rose-950/25 border border-rose-500/40 p-3 rounded flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in" id="timeline-diagnostic-hud">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-4.5 h-4.5 text-rose-500 animate-bounce shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider font-mono text-rose-400 flex items-center space-x-1.5">
                <span>TIMELINE DIAGNOSTIC: {tooShortClips.length} PACING WARNINGS DETECTED</span>
              </p>
              <p className="text-[9.5px] text-zinc-300 leading-normal font-sans mt-0.5">
                The clips highlighted below have active edit durations shorter than <strong className="text-rose-300">0.5 seconds</strong>. This can cause high-frequency visual pacing jitter. Expand them to snap to the next soundbed beat marker.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tooShortClips.map((clip) => (
                  <span
                    key={`diagnostic-${clip.sequence_order}`}
                    onClick={() => onSelectItem(clip)}
                    className="bg-black/55 hover:bg-black/85 border border-rose-500/30 hover:border-rose-400 rounded px-2 py-0.5 font-mono text-[9px] text-rose-300 cursor-pointer flex items-center space-x-1"
                  >
                    <span>Scene #{clip.sequence_order} ({clip.clip_id})</span>
                    <span className="text-zinc-700 font-bold">•</span>
                    <span className="text-rose-400 font-bold">{clip.rawLen.toFixed(2)}s</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              tooShortClips.forEach((item) => {
                handleExpandClipToBeat(item);
              });
            }}
            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded font-mono font-bold text-[9.5px] uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-all shrink-0 shadow-lg shadow-rose-950/40 border border-rose-400/20"
            title="Expand all too short clips to their respective next musical beat anchors"
          >
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>Expand All to Beats</span>
          </button>
        </div>
      )}

      {/* Grid ruler tracks */}
      <div className="relative h-6 bg-black/40 border border-white/10 rounded-none px-2 flex items-center justify-between text-[9px] font-mono text-zinc-500 overflow-hidden">
        <span className="text-zinc-600">00:00:00:00</span>
        {[...Array(5)].map((_, i) => {
          const tickSec = ((i + 1) / 6) * totalCalculatedDuration;
          const tickMinutes = Math.floor(tickSec / 60);
          const tickSeconds = Math.floor(tickSec % 60);
          const tickFrames = Math.round((tickSec % 1) * 24);
          const pad = (n: number) => String(n).padStart(2, "0");
          return (
            <span key={i} className="opacity-75">
              {pad(tickMinutes)}:{pad(tickSeconds)}:{pad(tickFrames)}
            </span>
          );
        })}
        <span className="text-zinc-600">END</span>
      </div>

      {/* Main Track container */}
      <div 
        ref={containerRef}
        onClick={handleTrackClick}
        className="relative h-28 bg-[#040405] hover:bg-[#060607] border border-t-0 border-white/10 rounded-none cursor-ew-resize overflow-hidden flex flex-col justify-between py-1 px-0.5 transition-colors group"
      >
        {/* Audio Waveform Background Layer */}
        <div className="absolute inset-x-0 bottom-1 top-1 pointer-events-none opacity-[0.06] z-0 overflow-hidden">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path
              d={waveformPath}
              fill="currentColor"
              className="text-amber-500"
            />
          </svg>
        </div>

        {/* Playhead line overlay */}
        <div 
          className="absolute top-0 bottom-0 w-[1.5px] bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.5)] pointer-events-none z-20 transition-all duration-75"
          style={{ left: `${(currentTime / totalCalculatedDuration) * 100}%` }}
        />

        {/* Visual Beat Gaps / Alignment Mismatch Overlays (Interactive) */}
        {totalCalculatedDuration > 0 && beatGaps.map((gap, index) => {
          const leftPct = (gap.start / totalCalculatedDuration) * 100;
          const widthPct = (gap.duration / totalCalculatedDuration) * 100;
          if (leftPct < 0 || leftPct >= 100 || widthPct <= 0) return null;

          return (
            <div
              key={`beatgap-${index}`}
              onClick={(e) => {
                e.stopPropagation();
                handleHealGap(gap);
              }}
              className="absolute top-0 bottom-0 bg-red-600/10 border-x border-red-500/20 z-12 hover:bg-red-500/25 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center group/gap"
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.08) 0px, rgba(239, 68, 68, 0.08) 2px, transparent 2px, transparent 6px)'
              }}
              title={`Click to snap preceding clip end to closest beat and HEAL this ${gap.duration.toFixed(2)}s misalignment gap!`}
            >
              {gap.duration > 0.12 && (
                <div className="flex flex-col items-center scale-75 md:scale-90 transition-transform">
                  <span className="text-[6px] font-mono font-bold text-rose-400 bg-black/85 px-1 py-0.5 rounded border border-rose-500/30 uppercase tracking-tighter whitespace-nowrap">
                    ALIGN GAP: {gap.duration.toFixed(2)}s
                  </span>
                  <span className="text-[5px] font-mono text-zinc-500 mt-0.5 uppercase tracking-tighter group-hover/gap:text-amber-300 transition-colors font-bold whitespace-nowrap">
                    ⚡ CLICK TO HEAL
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Visual beat & SFX vertical marker lines across both tracks */}
        <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
          {visualBeatLines.map((line, idx) => {
            const leftPct = (line.time / totalCalculatedDuration) * 100;
            if (leftPct < 0 || leftPct > 100) return null;

            let borderClass = "border-zinc-800/25 border-dashed";
            let dotColor = "bg-zinc-700/40";
            if (line.type === "sfx") {
              borderClass = "border-amber-500/35 border-solid";
              dotColor = "bg-amber-500";
            } else if (line.type === "swell") {
              borderClass = "border-rose-500/35 border-solid";
              dotColor = "bg-rose-500";
            }

            return (
              <div
                key={`beatline-${idx}`}
                className={`absolute top-0 bottom-0 border-l ${borderClass}`}
                style={{ left: `${leftPct}%` }}
              >
                {line.type !== "beat" && (
                  <div className="absolute top-1 -left-1 flex flex-col items-center">
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor} scale-75 animate-pulse`} />
                    <span className="text-[5.5px] font-mono text-zinc-400 font-bold tracking-tighter uppercase scale-90 origin-left mt-0.5 whitespace-nowrap bg-black/90 px-0.5 rounded border border-white/5">
                      {line.type}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Video clips track */}
        <div className="h-[48%] flex items-center relative z-10">
          {editTimingDetails.map((item, index) => {
            const widthPct = (item.clipLen / totalCalculatedDuration) * 100;
            const isSelected = selectedItem?.sequence_order === item.sequence_order;
            const isCurrentPlaying = currentTime >= item.seqStart && currentTime < item.seqEnd;

            // Coloring based on narrative role & diagnostic warnings
            let bgClass = "bg-[#181a24] hover:bg-[#202330] border-zinc-800 text-zinc-300";
            if (item.isTooShort) {
              bgClass = "bg-rose-950/15 hover:bg-rose-950/25 border-rose-500/50 text-rose-200 ring-1 ring-rose-500/10";
            }
            if (isSelected) {
              bgClass = item.isTooShort
                ? "bg-amber-950/50 hover:bg-amber-950/65 border-rose-500 ring-1 ring-rose-500/35 text-amber-200 shadow-[0_0_10px_rgba(244,63,94,0.25)] animate-pulse"
                : "bg-amber-950/40 hover:bg-amber-950/50 border-amber-500 text-amber-200";
            } else if (isCurrentPlaying) {
              bgClass = item.isTooShort
                ? "bg-rose-950/30 hover:bg-rose-950/40 border-rose-400 text-white ring-1 ring-rose-500/20"
                : "bg-zinc-800 hover:bg-zinc-700/80 border-zinc-500 text-white";
            }

            let roleTagColor = "bg-zinc-900 text-zinc-500";
            if (item.pacing_role === "Climax") roleTagColor = "bg-rose-950/60 text-rose-400";
            else if (item.pacing_role === "Escalation") roleTagColor = "bg-indigo-950/60 text-indigo-400";
            else if (item.pacing_role === "Setup") roleTagColor = "bg-emerald-950/60 text-emerald-400";

            return (
              <div
                key={index}
                onClick={(e) => {
                  e.stopPropagation(); // Avoid tracking seek clicks when selecting a clip
                  onSelectItem(item);
                }}
                className={`h-full border-r last:border-r-0 border-y flex flex-col justify-between p-1.5 cursor-pointer relative overflow-hidden transition-all duration-150 ${bgClass}`}
                style={{ width: `${widthPct}%` }}
              >
                <div className="flex items-center justify-between w-full min-w-0">
                  <span className="font-mono text-[9px] truncate font-bold uppercase tracking-wider flex items-center space-x-1">
                    {item.isTooShort && (
                      <AlertTriangle className="w-3 h-3 text-rose-500 animate-pulse shrink-0" title="Ultra-short clip (<0.5s duration)!" />
                    )}
                    <span>{index + 1}. {item.clip_id}</span>
                  </span>
                  {!item.isTooShort && (
                    <span className={`text-[8px] font-mono font-bold px-1 rounded scale-90 ${roleTagColor}`}>
                      {item.pacing_role.slice(0, 3).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center text-[8px] text-zinc-500 font-mono">
                  {item.isTooShort ? (
                    <div className="flex items-center space-x-1">
                      <span className="text-rose-400 font-black">{item.rawLen.toFixed(2)}s</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpandClipToBeat(item);
                        }}
                        className="bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500 hover:text-white px-1 py-0.2 rounded text-[7px] font-mono font-bold uppercase transition-all"
                        title="Expand clip to the next audio beat/sfx impact point"
                      >
                        +BEAT
                      </button>
                    </div>
                  ) : (
                    <span>{item.clipLen.toFixed(1)}s</span>
                  )}
                  {item.transition !== "Cut" && (
                    <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-0.5 rounded text-[7px] font-bold">
                      {item.transition.slice(0, 3).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Narrative phase track blocks */}
        <div className="h-[44%] border-t border-zinc-900/60 flex items-center relative z-10 bg-zinc-950/45">
          {editTimingDetails.map((item, index) => {
            const widthPct = (item.clipLen / totalCalculatedDuration) * 100;
            const isCurrentPlaying = currentTime >= item.seqStart && currentTime < item.seqEnd;

            let arcBg = "bg-zinc-950/20 text-zinc-500";
            if (isCurrentPlaying) {
              if (item.pacing_role === "Climax") arcBg = "bg-rose-950/25 text-rose-400 font-bold";
              else if (item.pacing_role === "Escalation") arcBg = "bg-indigo-950/25 text-indigo-400 font-bold";
              else arcBg = "bg-emerald-950/25 text-emerald-400 font-bold";
            }

            return (
              <div
                key={`arc-${index}`}
                className={`h-full border-r last:border-r-0 flex flex-col items-center justify-center font-mono text-[9px] tracking-widest text-center truncate ${arcBg}`}
                style={{ width: `${widthPct}%` }}
              >
                {item.pacing_role.toUpperCase()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Clip Quick controls */}
      {selectedItem && (
        <div className="mt-3.5 bg-black border border-white/10 p-3 rounded-none flex flex-wrap items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center space-x-3">
            <span className="text-[10px] font-mono text-zinc-500">SELECTED CUT #{selectedItem.sequence_order}:</span>
            <span className="text-xs font-bold text-amber-400 font-mono">{selectedItem.clip_id}</span>
            <span className="text-zinc-700">|</span>
            <span className="text-[10px] text-zinc-400 italic max-w-sm truncate">
              {editTimingDetails.find(item => item.sequence_order === selectedItem.sequence_order)?.libraryClip?.description || "No description"}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-mono text-zinc-500">TRANSITION:</span>
              <select
                value={selectedItem.transition}
                onChange={(e) => {
                  onUpdateItem({
                    ...selectedItem,
                    transition: e.target.value as any,
                  });
                }}
                className="bg-[#0f1115] border border-zinc-800 text-[10px] text-zinc-300 rounded px-2 py-1 focus:outline-none focus:border-amber-500 cursor-pointer font-mono"
              >
                <option value="Cut">Cut</option>
                <option value="Dissolve">Dissolve</option>
                <option value="Fade to Black">Fade to Black</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-mono text-zinc-500">ROLE:</span>
              <select
                value={selectedItem.pacing_role}
                onChange={(e) => {
                  onUpdateItem({
                    ...selectedItem,
                    pacing_role: e.target.value as any,
                  });
                }}
                className="bg-[#0f1115] border border-zinc-800 text-[10px] text-zinc-300 rounded px-2 py-1 focus:outline-none focus:border-amber-500 cursor-pointer font-mono"
              >
                <option value="Setup">Setup</option>
                <option value="Escalation">Escalation</option>
                <option value="Climax">Climax</option>
              </select>
            </div>

            <button
              onClick={() => onSelectItem(null)}
              className="text-[9px] font-mono text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 px-2 py-1 rounded"
            >
              DESELECT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
