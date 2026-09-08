import React, { useState, useEffect } from "react";
import { ArrowRightLeft, Sparkles, Play, Clock, Check, HelpCircle, Zap } from "lucide-react";
import { EditItem } from "../types";

interface TransitionEditorProps {
  selectedItem: EditItem | null;
  onUpdateTransition: (transitionType: EditItem["transition"]) => void;
  nextItem: EditItem | null;
}

const TRANSITION_PRESETS = [
  {
    type: "Cut" as const,
    name: "Standard Cut",
    description: "Instantaneous visual change. Standard pacing.",
    animationClass: "group-hover:opacity-0 transition-none",
    color: "from-zinc-800 to-zinc-900 border-zinc-700",
    badge: "Basic",
  },
  {
    type: "Dissolve" as const,
    name: "Cross Dissolve",
    description: "Gentle blending overlay. Ideal for dialogue or dream sequences.",
    animationClass: "group-hover:opacity-0 transition-opacity duration-1000",
    color: "from-blue-900/40 to-indigo-900/40 border-blue-800/40",
    badge: "Cinematic",
  },
  {
    type: "Dip to Black" as const,
    name: "Dip to Black",
    description: "Smooth fade out to pitch black, followed by a fade in.",
    animationClass: "group-hover:bg-black transition-all duration-700 ease-in-out",
    color: "from-zinc-950 to-zinc-900 border-zinc-850",
    badge: "Dramatic",
  },
  {
    type: "Fade to Black" as const,
    name: "Fade to Black",
    description: "Fades completely to black at scene boundaries.",
    animationClass: "group-hover:opacity-100 bg-black/95 transition-opacity duration-1000",
    color: "from-neutral-950 to-neutral-900 border-neutral-850",
    badge: "Scene End",
  },
  {
    type: "Glitch Cut" as const,
    name: "Glitch Cut",
    description: "A digital chromatic aberration noise burst. Perfect for action or sci-fi.",
    animationClass: "group-hover:animate-[ping_0.3s_ease-in-out_infinite] group-hover:bg-red-500/25",
    color: "from-pink-950/30 to-rose-950/30 border-rose-900/35",
    badge: "Sci-Fi/Action",
  },
  {
    type: "Cross Zoom" as const,
    name: "Cross Zoom",
    description: "Fast dramatic zoom into the frame, bursting into the next.",
    animationClass: "group-hover:scale-150 transition-transform duration-700 ease-in-out",
    color: "from-amber-950/20 to-orange-950/20 border-orange-900/30",
    badge: "Dynamic",
  },
  {
    type: "Fade to White" as const,
    name: "Fade to White",
    description: "Ethereal wash out to solid white. Used for flashbacks or high exposure.",
    animationClass: "group-hover:bg-white transition-colors duration-700",
    color: "from-slate-800 to-slate-900 border-slate-700",
    badge: "Flashback",
  },
];

export const TransitionEditor: React.FC<TransitionEditorProps> = ({
  selectedItem,
  onUpdateTransition,
  nextItem,
}) => {
  const [activePreset, setActivePreset] = useState<string>("Cut");
  const [transitionDuration, setTransitionDuration] = useState<number>(0.5); // seconds
  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);
  const [demoProgress, setDemoProgress] = useState<number>(0);

  useEffect(() => {
    if (selectedItem) {
      setActivePreset(selectedItem.transition);
    }
  }, [selectedItem]);

  // Handle local loop demo for card animations
  useEffect(() => {
    let interval: any;
    if (isPlayingDemo) {
      interval = setInterval(() => {
        setDemoProgress((prev) => {
          if (prev >= 100) {
            return 0; // restart
          }
          return prev + 5;
        });
      }, 50);
    } else {
      setDemoProgress(0);
    }
    return () => clearInterval(interval);
  }, [isPlayingDemo]);

  if (!selectedItem) {
    return (
      <div 
        className="bg-[#050608] border border-white/5 p-6 text-center text-zinc-500 rounded-none flex flex-col items-center justify-center space-y-2 h-full min-h-[220px]"
        id="transition-editor-empty-state"
      >
        <ArrowRightLeft className="w-8 h-8 text-zinc-700 animate-pulse" />
        <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">Transition Designer Standby</p>
        <p className="text-[10px] text-zinc-600 max-w-xs leading-relaxed">
          Select a cut on the timeline below to customize visual transitions, transition durations, and trigger live rendering previews.
        </p>
      </div>
    );
  }

  const handleSelectPreset = (type: EditItem["transition"]) => {
    setActivePreset(type);
    onUpdateTransition(type);
  };

  return (
    <div 
      className="bg-[#050608] border border-white/10 p-4 font-sans space-y-4"
      id="dedicated-transition-editor"
    >
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-900 pb-2">
        <div className="flex items-center space-x-2">
          <ArrowRightLeft className="w-4.5 h-4.5 text-amber-500" />
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-300">
            DEDICATED TRANSITION ENGINE
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[9px] font-mono text-zinc-500">
            BRIDGING CUT #{selectedItem.sequence_order} ➔ {nextItem ? `#{nextItem.sequence_order}` : "END"}
          </span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Presets List - 8 Cols */}
        <div className="lg:col-span-8 space-y-2.5">
          <div className="text-[10px] text-zinc-400 font-sans">
            Select a transition block below to stitch your scenes together. Hover over any tile to preview its timing behavior.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {TRANSITION_PRESETS.map((preset) => {
              const isSelected = activePreset === preset.type;
              return (
                <div
                  key={preset.type}
                  onClick={() => handleSelectPreset(preset.type)}
                  className={`group relative flex flex-col justify-between p-2.5 rounded border text-left cursor-pointer transition-all ${
                    isSelected
                      ? "bg-gradient-to-br border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.08)] text-white"
                      : "bg-[#0b0c10] border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-300"
                  } ${preset.color}`}
                  title={preset.description}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[10.5px] uppercase tracking-wide">
                      {preset.name}
                    </span>
                    <span className="text-[7.5px] uppercase font-bold tracking-widest bg-zinc-900 text-zinc-500 px-1 py-0.5 rounded">
                      {preset.badge}
                    </span>
                  </div>

                  {/* Tiny Interactive Mini-Preview Canvas inside card */}
                  <div className="my-2 h-10 w-full bg-black/40 border border-zinc-900/60 rounded flex items-center justify-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center text-[7px] font-mono text-cyan-400">
                      <span>CLIP A</span>
                    </div>

                    {/* Transition overlay representing effect */}
                    <div 
                      className={`absolute inset-0 flex items-center justify-center text-[7px] font-mono text-amber-400 bg-amber-500/20 ${preset.animationClass}`}
                    >
                      <span>CLIP B</span>
                    </div>

                    {/* Simulation timeline ribbon when clicked / hovered */}
                    <div className="absolute bottom-0 left-0 h-[2px] bg-amber-500/40 w-0 group-hover:w-full transition-all duration-1000 ease-out" />
                  </div>

                  <p className="text-[8.5px] text-zinc-500 font-sans leading-relaxed line-clamp-2">
                    {preset.description}
                  </p>

                  {isSelected && (
                    <div className="absolute bottom-1 right-1 bg-amber-500 text-black p-0.5 rounded-full">
                      <Check className="w-2.5 h-2.5 font-extrabold" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Configuration Panel - 4 Cols */}
        <div className="lg:col-span-4 bg-[#0a0c10] border border-zinc-900 p-3 rounded space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center space-x-1.5 text-zinc-300 border-b border-zinc-900 pb-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                ENGINE SETTINGS
              </span>
            </div>

            {/* Transition Timing Duration Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
                <span>TRANSITION DURATION:</span>
                <span className="text-amber-500 font-bold">{transitionDuration.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={transitionDuration}
                onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[7px] font-mono text-zinc-600">
                <span>0.10s (RAPID)</span>
                <span>1.00s</span>
                <span>2.00s (DRAMATIC)</span>
              </div>
            </div>

            {/* Quick Presets for Transition Duration */}
            <div className="grid grid-cols-4 gap-1.5">
              {[0.15, 0.3, 0.5, 1.2].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setTransitionDuration(time)}
                  className={`py-1 text-[8px] font-mono border rounded ${
                    transitionDuration === time
                      ? "bg-amber-500/10 border-amber-500 text-amber-400 font-bold"
                      : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-400"
                  }`}
                >
                  {time}s
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Preview Simulator */}
          <div className="bg-black/50 border border-zinc-900 p-2.5 rounded space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] font-mono text-zinc-400 flex items-center space-x-1">
                <Zap className="w-3 h-3 text-amber-400 animate-pulse mr-0.5" />
                <span>ACTIVE PREVIEW WAVE</span>
              </span>
              {isPlayingDemo && (
                <span className="text-[7px] font-mono text-emerald-400 uppercase animate-pulse">
                  RENDERING PREVIEW...
                </span>
              )}
            </div>

            {/* Mock Display screen */}
            <div className="h-16 bg-black border border-zinc-900 rounded overflow-hidden relative flex flex-col justify-between p-1.5">
              {/* Transition logic simulation */}
              {isPlayingDemo ? (
                <div className="absolute inset-0 flex items-center justify-center text-center">
                  {activePreset === "Cut" && (
                    <div className="w-full h-full flex items-center justify-center">
                      {demoProgress < 50 ? (
                        <div className="w-full h-full bg-blue-900/40 flex items-center justify-center text-[9px] font-mono text-cyan-400">CLIP A</div>
                      ) : (
                        <div className="w-full h-full bg-orange-950/40 flex items-center justify-center text-[9px] font-mono text-amber-400 animate-fade-in">CLIP B</div>
                      )}
                    </div>
                  )}

                  {activePreset === "Dissolve" && (
                    <div className="w-full h-full relative">
                      <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center text-[9px] font-mono text-cyan-400">CLIP A</div>
                      <div 
                        className="absolute inset-0 bg-orange-950/40 flex items-center justify-center text-[9px] font-mono text-amber-400"
                        style={{ opacity: demoProgress / 100 }}
                      />
                    </div>
                  )}

                  {activePreset === "Dip to Black" && (
                    <div className="w-full h-full relative">
                      {demoProgress < 50 ? (
                        <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center text-[9px] font-mono text-cyan-400">CLIP A</div>
                      ) : (
                        <div className="absolute inset-0 bg-orange-950/40 flex items-center justify-center text-[9px] font-mono text-amber-400">CLIP B</div>
                      )}
                      {/* Black dip layer overlay */}
                      <div 
                        className="absolute inset-0 bg-black" 
                        style={{ opacity: 1 - Math.abs(50 - demoProgress) / 50 }}
                      />
                    </div>
                  )}

                  {activePreset === "Fade to Black" && (
                    <div className="w-full h-full relative">
                      <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center text-[9px] font-mono text-cyan-400">CLIP A</div>
                      <div 
                        className="absolute inset-0 bg-black" 
                        style={{ opacity: demoProgress / 100 }}
                      />
                    </div>
                  )}

                  {activePreset === "Glitch Cut" && (
                    <div className="w-full h-full relative overflow-hidden">
                      {demoProgress < 50 ? (
                        <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center text-[9px] font-mono text-cyan-400">CLIP A</div>
                      ) : (
                        <div className="absolute inset-0 bg-orange-950/40 flex items-center justify-center text-[9px] font-mono text-amber-400">CLIP B</div>
                      )}
                      {/* Random Glitch visual bursts */}
                      {demoProgress > 40 && demoProgress < 65 && (
                        <div className="absolute inset-0 bg-red-600/30 border border-red-500/50 flex flex-col justify-around text-[11px] font-mono text-red-400 font-extrabold tracking-widest leading-none">
                          <div className="animate-pulse">CHROMATIC ERROR_</div>
                          <div className="bg-cyan-500/20 h-1" />
                          <div className="bg-red-500/20 h-1.5" />
                        </div>
                      )}
                    </div>
                  )}

                  {activePreset === "Cross Zoom" && (
                    <div className="w-full h-full relative overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-blue-900/40 flex items-center justify-center text-[9px] font-mono text-cyan-400 transition-transform"
                        style={{ transform: `scale(${demoProgress < 50 ? (1 + demoProgress * 0.02) : (1.5 - (demoProgress - 50) * 0.01)})` }}
                      >
                        {demoProgress < 50 ? "CLIP A" : "CLIP B"}
                      </div>
                    </div>
                  )}

                  {activePreset === "Fade to White" && (
                    <div className="w-full h-full relative">
                      {demoProgress < 50 ? (
                        <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center text-[9px] font-mono text-cyan-400">CLIP A</div>
                      ) : (
                        <div className="absolute inset-0 bg-orange-950/40 flex items-center justify-center text-[9px] font-mono text-amber-400">CLIP B</div>
                      )}
                      {/* White wash layer */}
                      <div 
                        className="absolute inset-0 bg-white" 
                        style={{ opacity: 1 - Math.abs(50 - demoProgress) / 50 }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                  <span className="text-[8px] text-zinc-500 uppercase tracking-wider">PREVIEW SCREEN DISENGAGED</span>
                  <span className="text-[7.5px] text-zinc-600">Click SIMULATE below to inspect transition wave</span>
                </div>
              )}

              {/* Simulation Progress bar overlay */}
              {isPlayingDemo && (
                <div className="relative w-full h-[2px] bg-zinc-900 rounded overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${demoProgress}%` }} />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsPlayingDemo(!isPlayingDemo)}
              className={`w-full py-1.5 rounded text-[9.5px] font-mono uppercase font-bold flex items-center justify-center space-x-1 border cursor-pointer transition-colors ${
                isPlayingDemo
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                  : "bg-amber-500 border-amber-600 text-black hover:bg-amber-400"
              }`}
            >
              <Play className="w-3 h-3 fill-current mr-1" />
              <span>{isPlayingDemo ? "STOP SIMULATOR" : "SIMULATE TRANSITION"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
