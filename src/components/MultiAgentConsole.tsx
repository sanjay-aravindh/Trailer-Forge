import React, { useState, useEffect } from "react";
import { Cpu, Film, Sparkles, Sliders, Music, Paintbrush, FileText, CheckCircle2 } from "lucide-react";
import { TrailerForgeProject } from "../types";

interface MultiAgentConsoleProps {
  isGenerating: boolean;
  project: TrailerForgeProject | null;
}

interface AgentLog {
  agentNumber: number;
  icon: React.ReactNode;
  name: string;
  roleName: string;
  status: "idle" | "processing" | "completed";
  logs: string[];
}

export const MultiAgentConsole: React.FC<MultiAgentConsoleProps> = ({
  isGenerating,
  project,
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [logs, setLogs] = useState<Record<number, string[]>>({});

  const agents: Omit<AgentLog, "status" | "logs">[] = [
    {
      agentNumber: 1,
      name: "Video Understanding",
      roleName: "Temporal & Spatial Analyst",
      icon: <Film className="w-4 h-4 text-sky-400" />,
    },
    {
      agentNumber: 2,
      name: "Dramatic Moment Detector",
      roleName: "Climax & Score Allocator",
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
    },
    {
      agentNumber: 3,
      name: "Narrative Arc Editor",
      roleName: "Setup → Escalation → Climax Architect",
      icon: <Sliders className="w-4 h-4 text-indigo-400" />,
    },
    {
      agentNumber: 4,
      name: "Cinematic Pacing Engine",
      roleName: "Durational Rhythm & Speed Ramp Expert",
      icon: <Cpu className="w-4 h-4 text-emerald-400" />,
    },
    {
      agentNumber: 5,
      name: "Sonic Design Agent",
      roleName: "Sync SFX & Rhythm Drop Synchronizer",
      icon: <Music className="w-4 h-4 text-rose-400" />,
    },
    {
      agentNumber: 6,
      name: "Visual Polish Agent",
      roleName: "Color Grade & Film Finisher",
      icon: <Paintbrush className="w-4 h-4 text-purple-400" />,
    },
    {
      agentNumber: 7,
      name: "EDL Architect",
      roleName: "SMPTE & CMX 3600 Compiler",
      icon: <FileText className="w-4 h-4 text-cyan-400" />,
    },
  ];

  // Procedural logs generation during simulation
  useEffect(() => {
    if (!isGenerating) {
      if (project) {
        // Project generated, populate final logs
        setActiveStep(7);
        const finalLogs: Record<number, string[]> = {
          1: [
            `INGESTING: Footage scanned at 0.5s frames...`,
            `DETECTED: ${project.ranked_clip_library.length} candidate cuts identified.`,
            `FEATURES: Extracted lighting cues, dialogue boundaries, and composition details.`,
            `STATUS: Temporal context mapped successfully.`
          ],
          2: [
            `SCORING: Running dramatic threat-matrix...`,
            ...project.ranked_clip_library.slice(0, 3).map(
              (clip) => `CLIP: ${clip.clip_id} | SCORE: ${clip.score}/10 [${clip.emotion}] -> ${clip.description.slice(0, 30)}...`
            ),
            `STATUS: High-score segments cataloged and indexed.`
          ],
          3: [
            `ARC BUILD: Structuring: Setup → Escalation → Climax → Hook.`,
            `ARRANGED: ${project.edit_sheet.length} edits mapped into chronological sequence.`,
            `STORY: ${project.brief_tone} flow stabilized.`,
            `STATUS: Sequence story logic validated.`
          ],
          4: [
            `DURATION: Fits ${project.target_duration_seconds}s target beautifully.`,
            ...project.edit_sheet.slice(0, 2).map(
              (item) => `PACING: ${item.clip_id} assigned to role [${item.pacing_role}].`
            ),
            `STATUS: Pacing frequency adjusted from long-holds to rapid edits.`
          ],
          5: [
            `BPM CAPTURE: Stabilized target soundtrack at ${project.audio_spec.music_bpm_target} BPM.`,
            `MARKERS: Loaded ${project.audio_spec.bass_swell_timestamps.length} bass swells.`,
            `TRIGGERS: Positioned ${project.audio_spec.sfx_impact_points.length} high-impact booms.`,
            `STATUS: Visual beat-cut alignment completed.`
          ],
          6: [
            `GRADING: Tone [${project.brief_tone}] mapping lookup table.`,
            `TREATMENTS: Chromatic adjustments, slow motion, speed ramps injected.`,
            `TRANSITIONS: ${project.edit_sheet.filter(e => e.transition !== "Cut").length} non-linear dissolves added.`,
            `STATUS: Color finish output locked.`
          ],
          7: [
            `EDL PREP: Creating standard CMX 3600 export.`,
            `VALIDATION: Zero overlapping tracks, valid FPS 24.`,
            `EXPORT: EDL generated successfully. Ready for Avid/Premiere/DaVinci.`,
            `STATUS: Trailer Forge pipeline execution completed!`
          ]
        };
        setLogs(finalLogs);
      } else {
        // Clear when idle
        setActiveStep(0);
        setLogs({});
      }
      return;
    }

    // Interactive step pacing simulation
    setActiveStep(1);
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= 7) {
          clearInterval(interval);
          return 7;
        }
        return prev + 1;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isGenerating, project]);

  // Procedural logs for active scanning state
  useEffect(() => {
    if (!isGenerating || activeStep === 0) return;

    const currentAgent = activeStep;
    const interval = setInterval(() => {
      setLogs((prev) => {
        const existing = prev[currentAgent] || [];
        if (existing.length >= 4) return prev;

        const randomLogs = [
          `SCANNING: Checking pipeline buffers...`,
          `PROCESSING: Distilling scene frame heuristics...`,
          `EVALUATING: Matching metadata markers...`,
          `STABILIZING: Anchoring mathematical SMPTE ratios...`,
          `SUCCESS: Thread lock active.`,
        ];

        const nextLog = randomLogs[existing.length % randomLogs.length];
        return {
          ...prev,
          [currentAgent]: [...existing, nextLog],
        };
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isGenerating, activeStep]);

  return (
    <div className="bg-white/5 border border-white/10 p-5 flex flex-col h-full shadow-lg" id="agent-pipeline-console">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-amber-500 animate-pulse" />
          <h2 className="text-sm font-extrabold tracking-widest font-mono text-zinc-100 uppercase">
            MULTI-AGENT ORCHESTRATOR
          </h2>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className={`w-2 h-2 rounded-full ${isGenerating ? "bg-amber-500 animate-ping" : project ? "bg-emerald-500" : "bg-zinc-700"}`} />
          <span className="font-mono text-[10px] text-zinc-500 uppercase">
            {isGenerating ? "FORGING TRAILER..." : project ? "LOCK READY" : "STANDBY"}
          </span>
        </div>
      </div>

      {/* Agents grid */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px]">
        {agents.map((agent) => {
          const isCurrent = activeStep === agent.agentNumber;
          const isDone = activeStep > agent.agentNumber || (!isGenerating && project);
          const isIdle = activeStep < agent.agentNumber && !isGenerating;

          return (
            <div
              key={agent.agentNumber}
              className={`p-3 rounded border transition-all duration-300 ${
                isCurrent
                  ? "bg-amber-950/20 border-amber-500/40 shadow-inner"
                  : isDone
                    ? "bg-zinc-950/40 border-zinc-900"
                    : "bg-transparent border-zinc-950 opacity-40"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-1.5 rounded ${isCurrent ? "bg-amber-500/10" : isDone ? "bg-emerald-500/10" : "bg-zinc-800"}`}>
                    {agent.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 flex items-center space-x-2">
                      <span className="text-[10px] text-zinc-500 font-mono">AGENT 0{agent.agentNumber}</span>
                      <span>{agent.name}</span>
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{agent.roleName}</p>
                  </div>
                </div>

                <div>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : isCurrent ? (
                    <div className="w-3 h-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-zinc-800 inline-block" />
                  )}
                </div>
              </div>

              {/* Real-time streaming log lines */}
              {(isCurrent || isDone) && logs[agent.agentNumber] && (
                <div className="mt-2.5 bg-black/60 p-2 rounded border border-zinc-900/60 font-mono text-[10px] space-y-1 text-zinc-400">
                  {logs[agent.agentNumber].map((logLine, idx) => (
                    <div key={idx} className="flex items-start space-x-1.5">
                      <span className="text-zinc-600 select-none">❯</span>
                      <span className={idx === logs[agent.agentNumber].length - 1 && isCurrent ? "text-amber-400" : ""}>{logLine}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
