import React, { useMemo, useRef, useState, useEffect } from "react";
import { Music, Volume2, VolumeX, ShieldAlert, Play, Sparkles, Radio } from "lucide-react";
import { timecodeToSeconds } from "../utils/timecode";

interface SoundDesignTrackProps {
  currentTime: number;
  duration: number;
  bpm: number;
  bassSwells: string[];
  sfxImpacts: string[];
  isPlaying: boolean;
  onSeek: (time: number) => void;
  musicGeneratedUrl?: string | null;
}

export const SoundDesignTrack: React.FC<SoundDesignTrackProps> = ({
  currentTime,
  duration,
  bpm,
  bassSwells,
  sfxImpacts,
  isPlaying,
  onSeek,
  musicGeneratedUrl = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Context & Synth references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);

  // Sound Engine Setup & Volume State
  const [isAudioEngineReady, setIsAudioEngineReady] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(75); // %
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [soundboardTriggered, setSoundboardTriggered] = useState<string | null>(null);

  // Convert timecode arrays to standard seconds
  const swells = useMemo(() => bassSwells.map(timecodeToSeconds), [bassSwells]);
  const impacts = useMemo(() => sfxImpacts.map(timecodeToSeconds), [sfxImpacts]);

  // Track the trigger state of each swell / impact timestamp in this current playback run
  const lastTriggeredImpacts = useRef<{ [key: number]: boolean }>({});
  const lastTriggeredSwells = useRef<{ [key: number]: boolean }>({});
  const prevTimeRef = useRef<number>(0);

  // 1. Reset trigger states on timeline loop-back or backward seek
  if (currentTime < prevTimeRef.current - 0.4 || currentTime === 0) {
    lastTriggeredImpacts.current = {};
    lastTriggeredSwells.current = {};
  }
  prevTimeRef.current = currentTime;

  // Initialize Web Audio Context
  const handleInitializeAudio = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }

      // Configure high-fidelity real-time Analyser
      if (!analyserRef.current && audioCtxRef.current) {
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyser.connect(audioCtxRef.current.destination);
        analyserRef.current = analyser;
      }

      setIsAudioEngineReady(true);
      // Play a very subtle high-grade pleasant chime to indicate state ready
      triggerChime(660); // E5
      setTimeout(() => triggerChime(880), 120); // A5
    } catch (e) {
      console.error("Failed to boot web audio pipeline:", e);
    }
  };

  const connectToOutput = (node: AudioNode) => {
    if (analyserRef.current) {
      node.connect(analyserRef.current);
    } else if (audioCtxRef.current) {
      node.connect(audioCtxRef.current.destination);
    }
  };

  // 2. Playback / Pause synchronization of generated soundtrack track
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      // Sync playhead time with audio time before playing
      if (Math.abs(audioRef.current.currentTime - currentTime) > 0.25) {
        audioRef.current.currentTime = currentTime;
      }
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, musicGeneratedUrl]);

  // Sync seek points continuously when user scrubs manually
  useEffect(() => {
    if (!audioRef.current || isPlaying) return;
    audioRef.current.currentTime = currentTime;
  }, [currentTime, isPlaying]);

  // Sync volume & mute on audio tag
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  // 3. Synth Soundboard Chime
  const triggerChime = (freq: number) => {
    if (!audioCtxRef.current || isMuted) return;
    const ctx = audioCtxRef.current;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime((volume / 100) * 0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      connectToOutput(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {}
  };

  // 4. Procedural Cinematic Sub-Impact Synthesizer
  const triggerSyntheticImpact = () => {
    if (!audioCtxRef.current || isMuted) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    try {
      // Channel 1: Sub Bass drop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.85);

      gain.gain.setValueAtTime((volume / 100) * 0.85, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gain);
      connectToOutput(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.9);

      // Channel 2: High frequency white-noise blast transient (cinematic spark)
      const bufferSize = ctx.sampleRate * 0.15; // 150ms spark
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 1200;
      noiseFilter.Q.value = 1.8;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime((volume / 100) * 0.12, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      connectToOutput(noiseGain);

      noiseNode.start();
      noiseNode.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Synth Impact failure", e);
    }
  };

  // 5. Procedural Cinematic Rising Bass Swell Synthesizer
  const triggerSyntheticSwell = () => {
    if (!audioCtxRef.current || isMuted) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(42, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(85, ctx.currentTime + 0.65);

      gain.gain.setValueAtTime(0.005, ctx.currentTime);
      gain.gain.linearRampToValueAtTime((volume / 100) * 0.55, ctx.currentTime + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);

      osc.connect(gain);
      connectToOutput(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn("Synth Swell failure", e);
    }
  };

  // 6. Drone synthesizer for active sequence playback (when no custom track is loaded)
  const startProceduralDrone = () => {
    if (!audioCtxRef.current || isMuted || !isPlaying || musicGeneratedUrl) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    try {
      stopProceduralDrone();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(55, ctx.currentTime); // A1 low base pitch

      // Low pass to strip abrasive harmonics and make it deep & cinematic
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(140, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime((volume / 100) * 0.14, ctx.currentTime + 0.4);

      osc.connect(lp);
      lp.connect(gain);
      connectToOutput(gain);

      osc.start();
      droneOscRef.current = osc;
      droneGainRef.current = gain;
    } catch (e) {}
  };

  const stopProceduralDrone = () => {
    try {
      if (droneOscRef.current) {
        droneOscRef.current.stop();
        droneOscRef.current.disconnect();
        droneOscRef.current = null;
      }
      if (droneGainRef.current) {
        droneGainRef.current.disconnect();
        droneGainRef.current = null;
      }
    } catch (e) {}
  };

  // 7. Check playhead progression and trigger synths precisely when playhead crosses timestamps
  useEffect(() => {
    if (!isPlaying) {
      stopProceduralDrone();
      return;
    }

    // Start/Update procedural background drone if no composed music track is playing
    if (!musicGeneratedUrl) {
      startProceduralDrone();
    } else {
      stopProceduralDrone();
    }

    // Scan for and trigger impact markers
    impacts.forEach((impSec, idx) => {
      if (currentTime >= impSec && currentTime < impSec + 0.25 && !lastTriggeredImpacts.current[idx]) {
        lastTriggeredImpacts.current[idx] = true;
        triggerSyntheticImpact();
        setSoundboardTriggered(`IMPACT [${idx + 1}]`);
        setTimeout(() => setSoundboardTriggered(null), 300);
      }
    });

    // Scan for and trigger swell markers
    swells.forEach((swellSec, idx) => {
      if (currentTime >= swellSec && currentTime < swellSec + 0.3 && !lastTriggeredSwells.current[idx]) {
        lastTriggeredSwells.current[idx] = true;
        triggerSyntheticSwell();
        setSoundboardTriggered(`SWELL [${idx + 1}]`);
        setTimeout(() => setSoundboardTriggered(null), 350);
      }
    });

  }, [currentTime, isPlaying, swells, impacts, musicGeneratedUrl, isMuted, volume]);

  // Real-time Glowing Acoustic Oscilloscope Canvas Loop
  useEffect(() => {
    if (!isAudioEngineReady || !analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationFrameId: number;

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "rgba(4, 4, 6, 0.45)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw cybernetic monitor grid lines
      ctx.strokeStyle = "rgba(244, 63, 94, 0.05)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < canvas.width; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 8) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw neural acoustic wave trace
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#f43f5e"; // rose-500
      ctx.shadowBlur = 4;
      ctx.shadowColor = "rgba(244, 63, 94, 0.6)";

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Reset shadows
      ctx.shadowBlur = 0;
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAudioEngineReady]);

  // Click track to seek
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const ratio = Math.max(0, Math.min(1, clickX / width));
    onSeek(ratio * duration);
  };

  // Generate waveform bars
  const waveformBars = useMemo(() => {
    const barsCount = 120;
    const bars: { height: number; type: "normal" | "swell" | "impact" }[] = [];

    for (let i = 0; i < barsCount; i++) {
      const sec = (i / barsCount) * duration;
      
      const isNearSwell = swells.some((swellSec) => Math.abs(sec - swellSec) < 0.6);
      const isNearImpact = impacts.some((impSec) => Math.abs(sec - impSec) < 0.4);

      let height = 20 + Math.sin(i * 0.15) * 15 + Math.cos(i * 0.4) * 8;
      let type: "normal" | "swell" | "impact" = "normal";

      if (isNearImpact) {
        height = Math.max(height, 82 + Math.sin(i * 0.8) * 10);
        type = "impact";
      } else if (isNearSwell) {
        height = Math.max(height, 55 + Math.cos(i * 0.5) * 15);
        type = "swell";
      }

      bars.push({ height: Math.max(12, Math.min(95, height)), type });
    }
    return bars;
  }, [duration, swells, impacts]);

  // Check if active beat triggers flashing visual feedback
  const isBeatTriggered = useMemo(() => {
    if (!isPlaying) return false;
    const bps = bpm / 60;
    const totalBeats = currentTime * bps;
    const fraction = totalBeats % 1;
    return fraction < 0.12;
  }, [currentTime, bpm, isPlaying]);

  return (
    <div className="bg-white/5 border border-white/10 p-5 select-none" id="sonic-design-console">
      {/* Hidden Audio Element for Composed/Ingested Soundtrack Tracks */}
      <audio 
        ref={audioRef} 
        src={musicGeneratedUrl || undefined} 
        preload="auto" 
        loop 
        className="hidden" 
      />

      {/* Title Bar & Statuses */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2">
          <Music className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
          <span className="text-xs font-bold tracking-widest font-mono text-zinc-300 uppercase">
            SONIC LAYOUT & COGNITIVE SFX HARBOR
          </span>
        </div>

        {/* Status flags */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-1 font-mono text-[10px]">
          {/* Audio Engine Activation Status */}
          {!isAudioEngineReady ? (
            <button
              onClick={handleInitializeAudio}
              className="bg-amber-500 hover:bg-amber-400 text-black px-2.5 py-1 rounded font-bold uppercase tracking-widest text-[9px] flex items-center space-x-1.5 animate-bounce shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ENABLE AUDIO SYNTH</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse mr-1" />
              <span>SYNTHESIS ENGINE ACTIVE</span>
            </div>
          )}

          <div className="flex items-center space-x-1.5 text-zinc-400 bg-black/40 border border-zinc-900 px-2 py-0.5 rounded">
            <span>TEMPO:</span>
            <span className={`font-extrabold ${isBeatTriggered ? "text-rose-500 scale-105" : "text-zinc-200"} transition-all duration-75`}>
              {bpm} BPM
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-zinc-400 bg-black/40 border border-zinc-900 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>IMPACTS:</span>
            <span className="text-zinc-200">{sfxImpacts.length}</span>
          </div>

          <div className="flex items-center space-x-1.5 text-zinc-400 bg-black/40 border border-zinc-900 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            <span>SWELLS:</span>
            <span className="text-zinc-200">{bassSwells.length}</span>
          </div>
        </div>
      </div>

      {/* Central Interactive Waveform Track */}
      <div 
        ref={containerRef}
        onClick={handleTrackClick}
        className="relative h-24 bg-black/45 hover:bg-black/60 border border-white/10 rounded-none overflow-hidden cursor-ew-resize flex items-end justify-between px-1 transition-colors group mb-4"
        title="Interactive Sonic Layout - Click to Seek Timeline"
      >
        {/* Playback timeline dashed segment grids */}
        <div className="absolute inset-0 grid grid-cols-6 pointer-events-none opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border-r border-dashed border-zinc-400 h-full" />
          ))}
        </div>

        {/* Dynamic rendering of waveform peaks */}
        <div className="absolute inset-0 flex items-center justify-between px-2 pt-2 pb-1 pointer-events-none">
          {waveformBars.map((bar, i) => {
            const barTime = (i / waveformBars.length) * duration;
            const isPlayed = barTime <= currentTime;

            let colorClass = "bg-zinc-800";
            if (isPlayed) {
              if (bar.type === "impact") colorClass = "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)] animate-pulse";
              else if (bar.type === "swell") colorClass = "bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.4)]";
              else colorClass = "bg-zinc-400";
            } else {
              if (bar.type === "impact") colorClass = "bg-rose-950/40";
              else if (bar.type === "swell") colorClass = "bg-sky-950/40";
            }

            return (
              <div
                key={i}
                className="w-[2.5px] rounded-full transition-all duration-300"
                style={{ 
                  height: `${bar.height}%`,
                  backgroundColor: isPlayed ? undefined : "rgba(39, 39, 42, 0.4)",
                }}
              >
                <div className={`w-full h-full rounded-full ${colorClass}`} />
              </div>
            );
          })}
        </div>

        {/* Flash banner when sound FX is actively triggered */}
        {soundboardTriggered && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-amber-500/5 transition-all">
            <div className="bg-black/85 border border-amber-500 px-3 py-1 text-[9px] font-mono text-amber-500 uppercase tracking-[0.25em] animate-ping">
              ⚡ ACTIVE SYNCED SFX: {soundboardTriggered}
            </div>
          </div>
        )}

        {/* Timeline Playhead Overlay Bar */}
        <div 
          className="absolute top-0 bottom-0 w-[1.5px] bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.4)] pointer-events-none z-10 transition-all duration-75"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />

        {/* Visual Cue Pin Flags */}
        {swells.map((swellSec, idx) => (
          <div
            key={`swell-${idx}`}
            className="absolute top-1 transform -translate-x-1/2 pointer-events-none z-10"
            style={{ left: `${(swellSec / duration) * 100}%` }}
          >
            <span className={`border text-[8px] font-mono px-1 py-0.5 rounded shadow ${
              currentTime >= swellSec && currentTime < swellSec + 0.4
                ? "bg-sky-500 text-white border-white scale-110"
                : "bg-sky-950/80 border-sky-500/50 text-sky-400"
            } transition-all`}>
              SWELL
            </span>
          </div>
        ))}

        {impacts.map((impSec, idx) => (
          <div
            key={`impact-${idx}`}
            className="absolute top-1 transform -translate-x-1/2 pointer-events-none z-10"
            style={{ left: `${(impSec / duration) * 100}%` }}
          >
            <span className={`border text-[8px] font-mono px-1 py-0.5 rounded shadow ${
              currentTime >= impSec && currentTime < impSec + 0.3
                ? "bg-rose-500 text-white border-white scale-110 animate-ping"
                : "bg-rose-950/80 border-rose-500/50 text-rose-400"
            } transition-all`}>
              HIT
            </span>
          </div>
        ))}

        {/* Current soundtrack status badge on waveform */}
        <div className="absolute bottom-2 left-2 flex items-center space-x-1 bg-black/85 border border-zinc-900 px-2 py-0.5 rounded text-[8px] font-mono text-zinc-400">
          <Radio className="w-3 h-3 text-amber-500 animate-pulse" />
          <span>SOUNDBED: {musicGeneratedUrl ? "COMPOSED AUDIO ACTIVE" : "SYNTH DRONE READY"}</span>
        </div>

        {/* Progress Timer display */}
        <div className="absolute bottom-2 right-2 bg-black/80 border border-zinc-900 px-2 py-0.5 rounded text-[9px] font-mono text-zinc-500 pointer-events-none">
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </div>
      </div>

      {/* Audio Desk Controllers & Sound FX Board */}
      <div className="bg-[#050608] border border-zinc-900 p-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 font-sans text-xs">
        
        {/* Column 1: Vol slider & mute button */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition-colors"
            title={isMuted ? "Unmute Master Sound" : "Mute Master Sound"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-amber-500" />}
          </button>
          
          <div className="flex flex-col space-y-0.5">
            <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase tracking-wider">
              <span>MASTER WORKSPACE VOLUME</span>
              <span className="text-zinc-300 font-bold">{isMuted ? "0" : volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              disabled={isMuted}
              className="w-44 accent-amber-500 bg-zinc-900 h-1.5 rounded cursor-pointer disabled:opacity-30"
            />
          </div>
        </div>

        {/* Column 2: Real-time Audio Oscilloscope Telemetry Monitor */}
        <div className="flex items-center space-x-3 bg-black/60 border border-zinc-950 px-3 py-1.5 rounded min-w-[240px] justify-between self-stretch xl:self-auto">
          <div className="flex flex-col">
            <span className="text-[8.5px] font-mono text-zinc-400 uppercase tracking-wider font-bold flex items-center space-x-1">
              <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
              <span>COGNITIVE SPECTRA</span>
            </span>
            <span className="text-[7.5px] font-mono text-zinc-600 uppercase mt-0.5">
              {isAudioEngineReady ? "Oscilloscope Active" : "Waiting for activation..."}
            </span>
          </div>
          <div className="relative">
            <canvas
              ref={canvasRef}
              width="130"
              height="30"
              className="bg-black/90 border border-zinc-900 rounded opacity-90 w-[130px] h-[30px]"
            />
            {!isAudioEngineReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded border border-dashed border-zinc-800">
                <span className="text-[6.5px] font-mono text-zinc-500 uppercase">SYNTH STANDBY</span>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Manual Test Soundboard triggers for producer feedback */}
        <div className="flex items-center space-x-2 justify-between xl:justify-start">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mr-2 block hidden sm:inline">
            MANUAL SOUND FX TESTING BOARD
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                handleInitializeAudio();
                triggerSyntheticImpact();
              }}
              className="px-2.5 py-1.5 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/20 rounded font-mono text-[9px] text-rose-400 hover:text-rose-300 transition-colors uppercase cursor-pointer"
            >
              TEST IMPACT BOOM
            </button>
            <button
              type="button"
              onClick={() => {
                handleInitializeAudio();
                triggerSyntheticSwell();
              }}
              className="px-2.5 py-1.5 bg-sky-950/30 hover:bg-sky-950/60 border border-sky-500/20 rounded font-mono text-[9px] text-sky-400 hover:text-sky-300 transition-colors uppercase cursor-pointer"
            >
              TEST BASS SWELL
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
