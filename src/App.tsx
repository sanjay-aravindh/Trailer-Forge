import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Code, 
  FileText, 
  Copy, 
  HelpCircle, 
  ExternalLink,
  ChevronRight,
  BookOpen,
  Film,
  ListVideo,
  Database,
  PenTool,
  Workflow,
  AlertTriangle,
  MessageSquare,
  Image as ImageIcon,
  Music,
  Video,
  Mic,
  Upload,
  Send,
  Trash2,
  RefreshCw,
  Save,
  History,
  Download,
  GitBranch
} from "lucide-react";
import { TrailerForgeProject, Clip, EditItem, EdlVersion } from "./types";
import { timecodeToSeconds, secondsToTimecode } from "./utils/timecode";
import { CinematicVideoCanvas } from "./components/CinematicVideoCanvas";
import { MultiAgentConsole } from "./components/MultiAgentConsole";
import { SoundDesignTrack } from "./components/SoundDesignTrack";
import { TimelineTracks } from "./components/TimelineTracks";
import { TransitionEditor } from "./components/TransitionEditor";

export default function App() {
  const [templates, setTemplates] = useState<Record<string, { title: string; tone: string; duration: number; scenes: string }>>({});
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("neon-shadows");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [customTone, setCustomTone] = useState<string>("");
  const [customScenes, setCustomScenes] = useState<string>("");
  const [targetDuration, setTargetDuration] = useState<number>(30);
  const [rhythm, setRhythm] = useState<string>("Paced Cuts");

  // Generated Project data
  const [project, setProject] = useState<TrailerForgeProject | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Playback System
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const playbackRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Active Tab for outputs (expanded to support ai-tools)
  const [activeOutputTab, setActiveOutputTab] = useState<"edl" | "json" | "guide" | "ai-tools">("edl");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // AI Creative Suite - Chat states
  const [chatModel, setChatModel] = useState<"gemini-3.5-flash" | "gemini-3.1-pro-preview" | "gemini-3.1-flash-lite">("gemini-3.5-flash");
  const [chatRole, setChatRole] = useState<string>("Hollywood Script Doctor");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "model"; parts: [{ text: string }] }>>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // AI Creative Suite - Veo Video Generator states
  const [videoMode, setVideoMode] = useState<"text-to-video" | "animate-image">("text-to-video");
  const [videoPrompt, setVideoPrompt] = useState<string>("");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [videoImageBase64, setVideoImageBase64] = useState<string | null>(null);
  const [videoGeneratedUrl, setVideoGeneratedUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<"idle" | "generating" | "finished" | "error">("idle");
  const [videoProgressText, setVideoProgressText] = useState<string>("");

  // AI Creative Suite - Lyria Music states
  const [musicPrompt, setMusicPrompt] = useState<string>("");
  const [musicModel, setMusicModel] = useState<"lyria-3-clip-preview" | "lyria-3-pro-preview">("lyria-3-clip-preview");
  const [musicGeneratedUrl, setMusicGeneratedUrl] = useState<string | null>(null);
  const [isMusicGenerating, setIsMusicGenerating] = useState<boolean>(false);

  // AI Creative Suite - Image states
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [imageInputBase64, setImageInputBase64] = useState<string | null>(null);
  const [imageGeneratedUrl, setImageGeneratedUrl] = useState<string | null>(null);
  const [isImageGenerating, setIsImageGenerating] = useState<boolean>(false);

  // AI Creative Suite - Microphone & Transcription states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcriptionText, setTranscriptionText] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

  // Ingested / Uploaded Media states
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedMusicUrl, setUploadedMusicUrl] = useState<string | null>(null);
  const [uploadedMusicName, setUploadedMusicName] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedTextName, setUploadedTextName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);

  // Currently selected edit item from timeline for tweaking
  const [selectedEditItem, setSelectedEditItem] = useState<EditItem | null>(null);

  // EDL Version Control System
  const [edlVersions, setEdlVersions] = useState<EdlVersion[]>(() => {
    try {
      const saved = localStorage.getItem("trailerforge_edl_versions");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newVersionName, setNewVersionName] = useState<string>("");
  const [newVersionNotes, setNewVersionNotes] = useState<string>("");

  useEffect(() => {
    localStorage.setItem("trailerforge_edl_versions", JSON.stringify(edlVersions));
  }, [edlVersions]);

  const handleDownloadEdl = (edlString: string, filename: string) => {
    const blob = new Blob([edlString], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".edl") ? filename : `${filename}.edl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const calculateSyncScore = (editSheet: EditItem[], bpm: number, sfxImpacts: string[], bassSwells: string[]) => {
    const beatInterval = 60 / bpm;
    const sfxSeconds = sfxImpacts.map(timecodeToSeconds);
    const swellSeconds = bassSwells.map(timecodeToSeconds);

    const regularBeats: number[] = [];
    for (let b = 0; b <= 120; b += beatInterval) {
      regularBeats.push(b);
    }

    const allBeats = Array.from(new Set([...regularBeats, ...sfxSeconds, ...swellSeconds])).sort((a, b) => a - b);

    let elapsed = 0;
    let shortClipsCount = 0;
    const boundaries = [0];

    editSheet.forEach((item) => {
      const startSec = timecodeToSeconds(item.in_point);
      const endSec = timecodeToSeconds(item.out_point);
      const rawLen = endSec - startSec;
      if (rawLen < 0.5) shortClipsCount++;
      const clipLen = Math.max(0.5, rawLen);
      elapsed += clipLen;
      boundaries.push(elapsed);
    });

    let gapCount = 0;
    boundaries.forEach((T) => {
      if (allBeats.length === 0) return;
      let minDiff = Math.abs(T - allBeats[0]);
      for (let i = 1; i < allBeats.length; i++) {
        const diff = Math.abs(T - allBeats[i]);
        if (diff < minDiff) minDiff = diff;
      }
      if (minDiff > 0.05) gapCount++;
    });

    return Math.max(10, 100 - shortClipsCount * 10 - gapCount * 5);
  };

  const handleSaveEdlVersion = () => {
    if (!project) return;
    const currentProjectVersions = edlVersions.filter(v => v.projectTitle === project.project_title);
    const vName = newVersionName.trim() || `v${currentProjectVersions.length + 1}`;
    const vNotes = newVersionNotes.trim() || "Pacing revision";
    
    // Calculate sync score using our helper
    const bpm = project.audio_spec?.music_bpm_target || 120;
    const sfxImpacts = project.audio_spec?.sfx_impact_points || [];
    const bassSwells = project.audio_spec?.bass_swell_timestamps || [];
    const score = calculateSyncScore(project.edit_sheet, bpm, sfxImpacts, bassSwells);

    const newVersion: EdlVersion = {
      id: Math.random().toString(36).substr(2, 9),
      projectTitle: project.project_title,
      versionName: vName,
      timestamp: new Date().toLocaleString(),
      notes: vNotes,
      edlString: project.edl_export_string,
      editSheet: JSON.parse(JSON.stringify(project.edit_sheet)),
      syncScore: score,
    };

    setEdlVersions([newVersion, ...edlVersions]);
    setNewVersionName("");
    setNewVersionNotes("");
    setSuccessMessage(`Successfully saved version "${vName}" to your local pacing logs!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDeleteEdlVersion = (id: string) => {
    setEdlVersions(edlVersions.filter(v => v.id !== id));
  };

  const handleRestoreEdlVersion = (version: EdlVersion) => {
    if (!project) return;
    
    const updatedProject = {
      ...project,
      edit_sheet: version.editSheet,
      edl_export_string: version.edlString
    };
    setProject(updatedProject);
    setSuccessMessage(`Restored timeline and EDL to "${version.versionName}"!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Storyboard state variables
  const [storyboardImages, setStoryboardImages] = useState<Record<string, string>>({});
  const [isStoryboarding, setIsStoryboarding] = useState<boolean>(false);
  const [storyboardProgress, setStoryboardProgress] = useState<string>("");

  // Fetch preloaded templates from Express server
  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data);
        // Default to first template content
        if (data["neon-shadows"]) {
          setCustomTitle(data["neon-shadows"].title);
          setCustomTone(data["neon-shadows"].tone);
          setCustomScenes(data["neon-shadows"].scenes);
        }
      })
      .catch(() => {
        console.error("Failed to load movie log templates");
      });
  }, []);

  // Update text areas when selecting preset template
  const handleTemplateChange = (key: string) => {
    setSelectedTemplateKey(key);
    if (key === "custom") {
      setCustomTitle("My Sci-Fi Epic");
      setCustomTone("Action Thriller");
      setCustomScenes("00:00:00:00 - 00:00:10:00 | Enter your raw scene descriptions here with timestamps...");
    } else {
      const template = templates[key];
      if (template) {
        setCustomTitle(template.title);
        setCustomTone(template.tone);
        setCustomScenes(template.scenes);
      }
    }
  };

  // Build sequential timing tracks
  const editTimingDetails = useMemo(() => {
    if (!project) return [];
    let elapsed = 0;
    return project.edit_sheet.map((item) => {
      const startSec = timecodeToSeconds(item.in_point);
      const endSec = timecodeToSeconds(item.out_point);
      const clipLen = Math.max(0.5, endSec - startSec);
      const seqStart = elapsed;
      const seqEnd = elapsed + clipLen;
      elapsed += clipLen;

      // Find original clip details
      const libraryClip = (project.ranked_clip_library || []).find((c) => c.clip_id === item.clip_id);

      return {
        ...item,
        seqStart,
        seqEnd,
        clipLen,
        libraryClip,
      };
    });
  }, [project]);

  // Total duration based on timeline segments
  const totalDuration = useMemo(() => {
    if (editTimingDetails.length === 0) return targetDuration;
    return editTimingDetails[editTimingDetails.length - 1].seqEnd;
  }, [editTimingDetails, targetDuration]);

  // Get active editing clip at current second
  const activePlayState = useMemo(() => {
    if (editTimingDetails.length === 0) return null;
    const active = editTimingDetails.find(
      (item) => currentTime >= item.seqStart && currentTime < item.seqEnd
    );
    if (active) {
      const clipOffset = currentTime - active.seqStart;
      const progress = clipOffset / active.clipLen;
      return {
        item: active,
        clip: active.libraryClip || null,
        progress,
      };
    }
    // Loop back to start or stay on last frame
    return {
      item: editTimingDetails[editTimingDetails.length - 1],
      clip: editTimingDetails[editTimingDetails.length - 1].libraryClip || null,
      progress: 1,
    };
  }, [editTimingDetails, currentTime]);

  // Playback Animation frame callback (24 FPS locked or smooth interval)
  const animatePlayback = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    setCurrentTime((prev) => {
      const next = prev + delta * playbackSpeed;
      if (next >= totalDuration) {
        // Loop sequence
        return 0;
      }
      return next;
    });

    playbackRef.current = requestAnimationFrame(animatePlayback);
  }, [totalDuration, playbackSpeed]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0;
      playbackRef.current = requestAnimationFrame(animatePlayback);
    } else {
      if (playbackRef.current) {
        cancelAnimationFrame(playbackRef.current);
        playbackRef.current = null;
      }
    }
    return () => {
      if (playbackRef.current) {
        cancelAnimationFrame(playbackRef.current);
      }
    };
  }, [isPlaying, animatePlayback]);

  // --- AI FORGE CREATIVE SUITE CONTROLLER SUITE ---

  // 1. Gemini Multi-Turn Dialogue Chatbot
  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const currentInput = chatInput;
    setChatInput("");
    setIsChatLoading(true);

    const newUserMsg = { role: "user" as const, parts: [{ text: currentInput }] };
    const updatedHistory = [...chatHistory, newUserMsg];
    setChatHistory(updatedHistory as any);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: chatHistory,
          message: currentInput,
          model: chatModel,
          systemInstruction: `You are in character as: ${chatRole}. Formulate detailed advice fitting this specific role.`
        })
      });
      const data = await res.json();
      if (data.text) {
        setChatHistory(prev => [...prev, { role: "model" as const, parts: [{ text: data.text }] as any }]);
      }
    } catch (e) {
      console.error("Chatbot query failed:", e);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChatHistory = () => {
    setChatHistory([]);
  };

  // 2. Veo Video Generation (Start operation and poll progress)
  const handleStartVideoGeneration = async () => {
    if (!videoPrompt.trim()) return;
    setVideoStatus("generating");
    setVideoProgressText("Initializing Veo 3 engine cores...");
    setVideoGeneratedUrl(null);

    try {
      const res = await fetch("/api/ai/video/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: videoPrompt,
          base64Image: videoMode === "animate-image" ? videoImageBase64 : null,
          aspectRatio: videoAspectRatio
        })
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setVideoProgressText("Analyzing prompt and keyframe vectors (0%)...");
      
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 5) {
          clearInterval(interval);
          setVideoStatus("error");
          setVideoProgressText("Veo compilation timed out. Try again.");
          return;
        }

        setVideoProgressText(`Compiling cinematic temporal motion blocks (${attempts * 20}%)...`);

        try {
          const statusRes = await fetch("/api/ai/video/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operationName: data.operationName,
              isMock: data.isMock,
              prompt: data.prompt,
              aspectRatio: data.aspectRatio
            })
          });
          const statusData = await statusRes.json();
          if (statusData.done) {
            clearInterval(interval);
            setVideoGeneratedUrl(statusData.videoUrl);
            setVideoStatus("finished");
          }
        } catch (e) {
          console.error("Veo polling failed:", e);
        }
      }, 1500);

    } catch (err: any) {
      setVideoStatus("error");
      setVideoProgressText(err.message || "Failed to generate cinematic video sequence.");
    }
  };

  // 3. Lyria Audio soundbed track generator
  const handleMusicGeneration = async () => {
    if (!musicPrompt.trim()) return;
    setIsMusicGenerating(true);
    setMusicGeneratedUrl(null);

    try {
      const res = await fetch("/api/ai/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: musicPrompt,
          model: musicModel
        })
      });
      const data = await res.json();
      if (data.audioUrl) {
        setMusicGeneratedUrl(data.audioUrl);
      } else if (data.audioBase64) {
        const audioUrl = `data:${data.mimeType || "audio/wav"};base64,${data.audioBase64}`;
        setMusicGeneratedUrl(audioUrl);
      }
    } catch (e) {
      console.error("Music render error:", e);
    } finally {
      setIsMusicGenerating(false);
    }
  };

  // 4. Image Creation and Manipulation via gemini-3.1-flash-image
  const handleImageGeneration = async () => {
    if (!imagePrompt.trim()) return;
    setIsImageGenerating(true);
    setImageGeneratedUrl(null);

    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          base64Image: imageInputBase64
        })
      });
      const data = await res.json();
      if (data.imageUrl) {
        setImageGeneratedUrl(data.imageUrl);
      }
    } catch (e) {
      console.error("Image render error:", e);
    } finally {
      setIsImageGenerating(false);
    }
  };

  // 5. Microphone Audio capture and transcription
  const handleStartAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          setIsTranscribing(true);
          try {
            const res = await fetch("/api/ai/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ base64Audio, mimeType: "audio/wav" })
            });
            const data = await res.json();
            if (data.text) {
              setTranscriptionText(data.text);
            }
          } catch (e) {
            console.error("Transcription pipeline error:", e);
          } finally {
            setIsTranscribing(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn("Audio recording hardware not accessible. Loading realistic high-stakes cinematic audio context transcript simulation.");
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setIsTranscribing(true);
        setTimeout(() => {
          setTranscriptionText("Low bass drop drone rises, matching transition. Cut to deep silhouette, dust particles caught in cinematic backlight spotlight.");
          setIsTranscribing(false);
        }, 1200);
      }, 2500);
    }
  };

  const handleStopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track: any) => track.stop());
      } catch (e) {}
      setIsRecording(false);
    } else {
      setIsRecording(false);
    }
  };

  // Drag-and-Drop & File Ingestion Handler core
  const handleFileUpload = (file: File) => {
    const type = file.type;
    const name = file.name;

    // 1. Text file handling
    if (type.includes("text") || name.endsWith(".txt") || name.endsWith(".log")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = e.target?.result as string;
        if (textContent) {
          setSelectedTemplateKey("custom");
          setCustomScenes(textContent);
          setUploadedTextName(name);
        }
      };
      reader.readAsText(file);
    }
    // 2. Image asset handling
    else if (type.includes("image")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64) {
          setUploadedImageUrl(base64);
          setImageInputBase64(base64);
          setVideoImageBase64(base64); // Autoload into video animation mode
        }
      };
      reader.readAsDataURL(file);
    }
    // 3. Audio / Music track handling
    else if (type.includes("audio") || name.endsWith(".mp3") || name.endsWith(".wav") || name.endsWith(".m4a")) {
      const objectUrl = URL.createObjectURL(file);
      setUploadedMusicUrl(objectUrl);
      setUploadedMusicName(name);
      setMusicGeneratedUrl(objectUrl); // Load into Lyria soundtrack panel immediately
    }
    // 4. Video file handling
    else if (type.includes("video") || name.endsWith(".mp4") || name.endsWith(".webm")) {
      const objectUrl = URL.createObjectURL(file);
      setUploadedVideoUrl(objectUrl);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Call Express server-side Gemini generation
  const handleForgeTrailer = async () => {
    setIsGenerating(true);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);

    try {
      const response = await fetch("/api/generate-trailer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_key: selectedTemplateKey === "custom" ? null : selectedTemplateKey,
          custom_scenes: selectedTemplateKey === "custom" ? customScenes : null,
          custom_title: customTitle,
          custom_tone: customTone,
          target_duration_seconds: targetDuration,
          rhythm: rhythm
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setProject(data);
        setSelectedEditItem(data.edit_sheet[0] || null);
      } else {
        setError(data.error || "Failed to process film logs.");
      }
    } catch (err: any) {
      setError("Failed to connect to the film generation service. Check your internet connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Batch storyboard generator for the active project
  const handleGenerateAllStoryboards = async () => {
    if (!project || !project.edit_sheet) return;
    setIsStoryboarding(true);
    setStoryboardProgress("Booting up Gemini storyboard artists...");

    const updatedStoryboards = { ...storyboardImages };

    for (let i = 0; i < project.edit_sheet.length; i++) {
      const item = project.edit_sheet[i];
      const clip = (project.ranked_clip_library || []).find(c => c.clip_id === item.clip_id);
      if (!clip) continue;

      if (updatedStoryboards[clip.clip_id]) {
        // Skip already rendered storyboards to be fast and cost-effective
        continue;
      }

      setStoryboardProgress(`Rendering frame ${i + 1} of ${project.edit_sheet.length}: ${clip.clip_id}...`);

      try {
        const res = await fetch("/api/ai/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Cinematic high-production-value widescreen film still, ultra-realistic, matching movie tone ${project.brief_tone}: ${clip.description}`
          })
        });
        const data = await res.json();
        if (data.imageUrl) {
          updatedStoryboards[clip.clip_id] = data.imageUrl;
          setStoryboardImages({ ...updatedStoryboards });
        }
      } catch (e) {
        console.error("Storyboard image render error:", e);
      }
    }

    setIsStoryboarding(false);
    setStoryboardProgress("");
  };

  // Single frame storyboard generator
  const handleGenerateSingleStoryboard = async (clipId: string, description: string) => {
    setIsStoryboarding(true);
    setStoryboardProgress(`Rendering keyframe for ${clipId}...`);
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Cinematic high-production-value widescreen film still, ultra-realistic, matching tone: ${description}`
        })
      });
      const data = await res.json();
      if (data.imageUrl) {
        setStoryboardImages(prev => ({
          ...prev,
          [clipId]: data.imageUrl
        }));
      }
    } catch (e) {
      console.error("Single storyboard generation error:", e);
    } finally {
      setIsStoryboarding(false);
      setStoryboardProgress("");
    }
  };

  // Automatically trims high-scoring clips based on audio beat markers
  const handleAutoTrimClipsToBeats = () => {
    if (!project) return;

    const bpm = project.audio_spec?.music_bpm_target || 120;
    const beatInterval = 60 / bpm;
    const sfxSeconds = (project.audio_spec?.sfx_impact_points || []).map(timecodeToSeconds);
    const swellSeconds = (project.audio_spec?.bass_swell_timestamps || []).map(timecodeToSeconds);

    // Generate regular musical beats up to 120 seconds
    const regularBeats: number[] = [];
    for (let b = 0; b <= 120; b += beatInterval) {
      regularBeats.push(b);
    }

    // Combine all beat markers and sort them
    const allBeatMarkers = Array.from(
      new Set([...regularBeats, ...sfxSeconds, ...swellSeconds])
    ).sort((a, b) => a - b);

    // Find the closest beat marker to a target timestamp in seconds
    const findClosestBeat = (t: number): number => {
      if (allBeatMarkers.length === 0) return t;
      let closest = allBeatMarkers[0];
      let minDiff = Math.abs(t - closest);
      for (let i = 1; i < allBeatMarkers.length; i++) {
        const diff = Math.abs(t - allBeatMarkers[i]);
        if (diff < minDiff) {
          minDiff = diff;
          closest = allBeatMarkers[i];
        }
      }
      return closest;
    };

    // Trim clips in the ranked moments library
    const updatedLibrary = project.ranked_clip_library.map((clip) => {
      const originalStart = timecodeToSeconds(clip.start_timecode);
      const originalEnd = timecodeToSeconds(clip.end_timecode);

      let alignedStart = findClosestBeat(originalStart);
      let alignedEnd = findClosestBeat(originalEnd);

      // Keep duration positive (ensure at least 1 beat interval length)
      if (Math.abs(alignedEnd - alignedStart) < 0.25) {
        const startIndex = allBeatMarkers.findIndex((b) => Math.abs(b - alignedStart) < 0.01);
        if (startIndex !== -1 && startIndex + 1 < allBeatMarkers.length) {
          alignedEnd = allBeatMarkers[startIndex + 1];
        } else {
          alignedEnd = alignedStart + beatInterval;
        }
      }

      return {
        ...clip,
        start_timecode: secondsToTimecode(alignedStart),
        end_timecode: secondsToTimecode(alignedEnd),
      };
    });

    // Also update any referencing elements in the edit sheet (the NLE timeline) to match the new trimmed timings
    const updatedSheet = project.edit_sheet.map((item) => {
      const matchingLibraryClip = updatedLibrary.find((c) => c.clip_id === item.clip_id);
      if (matchingLibraryClip) {
        return {
          ...item,
          in_point: matchingLibraryClip.start_timecode,
          out_point: matchingLibraryClip.end_timecode,
        };
      }
      return item;
    });

    // Re-compile basic CMX 3600 EDL based on updated timings
    let edl = `TITLE: ${project.project_title}\nFCM: NON-DROP FRAME\n\n`;
    let elapsedFrames = 0;

    updatedSheet.forEach((item, index) => {
      const numStr = String(index + 1).padStart(3, "0");
      
      const inSec = timecodeToSeconds(item.in_point);
      const outSec = timecodeToSeconds(item.out_point);
      const lenSec = Math.max(0.5, outSec - inSec);
      const lenFrames = Math.round(lenSec * 24);

      const recordInSec = elapsedFrames / 24;
      const recordOutSec = (elapsedFrames + lenFrames) / 24;

      const recordIn = secondsToTimecode(recordInSec);
      const recordOut = secondsToTimecode(recordOutSec);
      
      elapsedFrames += lenFrames;

      edl += `${numStr}  ${item.clip_id.padEnd(8, " ")} V     C        ${item.in_point} ${item.out_point} ${recordIn} ${recordOut}\n`;
      edl += `* FROM CLIP: ${item.clip_id}\n`;
      edl += `* TRANSITION: ${item.transition}\n`;
      edl += `* PACING ROLE: ${item.pacing_role}\n\n`;
    });

    setProject({
      ...project,
      ranked_clip_library: updatedLibrary,
      edit_sheet: updatedSheet,
      edl_export_string: edl,
    });

    // If the active edit item is updated, sync that selection state as well
    if (selectedEditItem) {
      const matchingUpdated = updatedSheet.find(
        (item) => item.sequence_order === selectedEditItem.sequence_order
      );
      if (matchingUpdated) {
        setSelectedEditItem(matchingUpdated);
      }
    }

    // Set a neat confirmation toast
    setSuccessMessage(
      `Sync Complete: Automatically aligned all moments to ${bpm} BPM tempo grids and audio SFX anchors!`
    );
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4500);
  };

  // Modify timeline item transition or role and update EDL dynamically
  const handleUpdateEditItem = (updated: EditItem) => {
    if (!project) return;
    const updatedSheet = project.edit_sheet.map((item) =>
      item.sequence_order === updated.sequence_order ? updated : item
    );

    // Re-compile basic CMX 3600 EDL based on manual changes
    let edl = `TITLE: ${project.project_title}\nFCM: NON-DROP FRAME\n\n`;
    let elapsedFrames = 0;

    updatedSheet.forEach((item, index) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      const numStr = String(index + 1).padStart(3, "0");
      
      const inSec = timecodeToSeconds(item.in_point);
      const outSec = timecodeToSeconds(item.out_point);
      const lenSec = Math.max(0.5, outSec - inSec);
      const lenFrames = Math.round(lenSec * 24);

      const recordInSec = elapsedFrames / 24;
      const recordOutSec = (elapsedFrames + lenFrames) / 24;

      const recordIn = secondsToTimecode(recordInSec);
      const recordOut = secondsToTimecode(recordOutSec);
      
      elapsedFrames += lenFrames;

      edl += `${numStr}  ${item.clip_id.padEnd(8, " ")} V     C        ${item.in_point} ${item.out_point} ${recordIn} ${recordOut}\n`;
      edl += `* FROM CLIP: ${item.clip_id}\n`;
      edl += `* TRANSITION: ${item.transition}\n`;
      edl += `* PACING ROLE: ${item.pacing_role}\n\n`;
    });

    const updatedProject = {
      ...project,
      edit_sheet: updatedSheet,
      edl_export_string: edl
    };

    setProject(updatedProject);
    setSelectedEditItem(updated);
  };

  // Copy code blocks
  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(type);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans p-6 flex flex-col" id="trailer-forge-root">
      {/* Cinematic Top Navigation Header Bar */}
      <header className="flex justify-between items-end border-b border-white/10 pb-4 mb-6 select-none">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.3em] text-amber-500 font-bold">Autonomous Multi-Agent Engine</span>
          <h1 className="text-4xl font-black tracking-tighter text-white">TRAILER FORGE <span className="text-amber-500">CORE</span></h1>
        </div>
        <div className="flex gap-8 items-center">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase opacity-50 text-zinc-500">System Status</span>
            <span className="text-emerald-400 font-mono text-xs md:text-sm uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              Logic Active / Pipeline Synced
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase opacity-50 text-zinc-500">Duration Target</span>
            <span className="text-white font-mono text-lg md:text-xl uppercase">
              {project ? secondsToTimecode(totalDuration) : `00:00:${targetDuration}:00`}
            </span>
          </div>
        </div>
      </header>

      {/* Main Studio Body Grid Workspace */}
      <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Side: Film Logs Ingest & Configuration Desk (Col Span 4) */}
        <section className="xl:col-span-4 flex flex-col space-y-6">
          
          {/* Panel: Footage Ingestion Center */}
          <div className="bg-white/5 border border-white/10 p-5 flex flex-col space-y-4 shadow-lg" id="panel-ingestion">
            <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
              <Database className="w-4.5 h-4.5 text-amber-500" />
              <h2 className="text-xs font-bold tracking-wider uppercase font-mono text-zinc-300">
                FOOTAGE INGESTION HARBOR
              </h2>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                FOOTAGE TEMPLATE SOURCE
              </label>
              <select
                value={selectedTemplateKey}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full bg-[#050608] border border-zinc-900 text-xs text-zinc-200 rounded px-3 py-2.5 focus:outline-none focus:border-amber-500 cursor-pointer font-sans"
              >
                <option value="neon-shadows">Neon Shadows (Sci-Fi Cyberpunk Noir)</option>
                <option value="whispering-well">The Whispering Well (Supernatural Gothic Horror)</option>
                <option value="chrono-trigger">Chrono Shift (Time-Travel Action Thriller)</option>
                <option value="after-the-rain">La Petite Joie (Poetic Muted Indie Drama)</option>
                <option value="custom">-- CUSTOM FOOTAGE SCRIPT --</option>
              </select>
            </div>

            {/* Cinematic Asset Ingestion Deck */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border border-dashed p-3.5 rounded text-center transition-all ${
                dragActive 
                  ? "border-amber-500 bg-amber-500/10 scale-[1.01]" 
                  : "border-zinc-800 bg-[#020203] hover:border-zinc-700"
              } relative flex flex-col items-center justify-center space-y-1`}
            >
              <input
                type="file"
                accept=".txt,.log,.png,.jpg,.jpeg,.mp3,.wav,.m4a,.mp4,.webm"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                title="Upload image, video, audio, or text log files"
              />
              <div className="flex items-center space-x-1.5 text-amber-500">
                <Upload className="w-4 h-4" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                  CINEMATIC ASSET INGESTION DECK
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 leading-normal max-w-[240px]">
                Drag-and-drop or click to ingest <span className="text-zinc-400">text logs</span>, <span className="text-zinc-400">images</span>, <span className="text-zinc-400">music</span>, or <span className="text-zinc-400">videos</span>
              </p>

              {/* Status Indicators of uploaded media */}
              {(uploadedTextName || uploadedImageUrl || uploadedMusicName || uploadedVideoUrl) && (
                <div className="w-full pt-2 mt-2 border-t border-zinc-900 grid grid-cols-2 gap-1.5 text-[8px] font-mono text-left">
                  {uploadedTextName && (
                    <div className="bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded text-emerald-400 truncate flex items-center space-x-1">
                      <span className="w-1 h-1 bg-emerald-400 rounded-full shrink-0 animate-pulse" />
                      <span className="truncate">TXT: {uploadedTextName}</span>
                    </div>
                  )}
                  {uploadedImageUrl && (
                    <div className="bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded text-amber-400 truncate flex items-center space-x-1">
                      <span className="w-1 h-1 bg-amber-400 rounded-full shrink-0 animate-pulse" />
                      <span className="truncate">IMG: Frame Loaded</span>
                    </div>
                  )}
                  {uploadedMusicName && (
                    <div className="bg-blue-500/10 border border-blue-500/25 px-1.5 py-0.5 rounded text-blue-400 truncate flex items-center space-x-1">
                      <span className="w-1 h-1 bg-blue-400 rounded-full shrink-0 animate-pulse" />
                      <span className="truncate">AUDIO: {uploadedMusicName}</span>
                    </div>
                  )}
                  {uploadedVideoUrl && (
                    <div className="bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.5 rounded text-rose-400 truncate flex items-center space-x-1">
                      <span className="w-1 h-1 bg-rose-400 rounded-full shrink-0 animate-pulse" />
                      <span className="truncate">VIDEO: Synced to Monitor</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* If Custom selected, editable title/tone */}
            {selectedTemplateKey === "custom" && (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                    PROJECT TITLE
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Iron Legacy"
                    className="w-full bg-[#050608] border border-zinc-900 text-xs text-zinc-300 rounded px-3 py-2.5 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                    TRAILER TONE
                  </label>
                  <input
                    type="text"
                    value={customTone}
                    onChange={(e) => setCustomTone(e.target.value)}
                    placeholder="e.g. Dark Thriller"
                    className="w-full bg-[#050608] border border-zinc-900 text-xs text-zinc-300 rounded px-3 py-2.5 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Script Text area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                  RAW FOOTAGE SCENE LOGS (HH:MM:SS:FF)
                </label>
                <span className="text-[8px] font-mono text-zinc-600 uppercase">24 FPS COMPLIANT</span>
              </div>
              <textarea
                value={customScenes}
                onChange={(e) => setCustomScenes(e.target.value)}
                disabled={selectedTemplateKey !== "custom"}
                rows={11}
                placeholder="00:00:00:00 - 00:00:05:00 | Wide shot of empty road..."
                className="w-full bg-[#050608] border border-zinc-900 text-[11px] text-zinc-400 rounded p-3 focus:outline-none focus:border-amber-500 font-mono resize-none leading-relaxed disabled:opacity-55"
              />
            </div>

            {/* Settings Layout */}
            <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                  TARGET DURATION
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[30, 60, 90].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setTargetDuration(sec)}
                      className={`text-[10px] font-mono py-1.5 border rounded transition-all font-bold ${
                        targetDuration === sec
                          ? "bg-amber-500/10 border-amber-500 text-amber-500"
                          : "bg-[#050608] border-zinc-900 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {sec}S
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                  RHYTHM STYLE
                </label>
                <select
                  value={rhythm}
                  onChange={(e) => setRhythm(e.target.value)}
                  className="w-full bg-[#050608] border border-zinc-900 text-[10px] text-zinc-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer font-mono"
                >
                  <option value="Fast Montage">Fast Montage</option>
                  <option value="Paced Cuts">Paced Cuts</option>
                  <option value="Slow Build">Slow Build</option>
                </select>
              </div>
            </div>

            {/* Launch CTA */}
            <button
              onClick={handleForgeTrailer}
              disabled={isGenerating}
              className={`w-full py-3.5 rounded font-black tracking-widest font-sans text-xs uppercase flex items-center justify-center space-x-2 border transition-all ${
                isGenerating
                  ? "bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed"
                  : "bg-amber-500 border-amber-600 text-black hover:bg-amber-400 shadow-md hover:shadow-amber-500/15"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? "FORGING TRAILER SEQUENCE..." : "FORGE TRAILER ENGINE"}</span>
            </button>
          </div>

          {/* Left panel 2: Active Multi-Agent Orchestrator View */}
          <MultiAgentConsole isGenerating={isGenerating} project={project} />

        </section>

        {/* Right Side: Visual NLE Monitors, Sonic Waveform, and Timeline (Col Span 8) */}
        <section className="xl:col-span-8 flex flex-col space-y-6">
          
          {/* Row: Interactive Video Monitor & Ranked clip library */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Realtime Video Display (LG 8) */}
            <div className="lg:col-span-8 flex flex-col space-y-3">
              <CinematicVideoCanvas
                activeItem={activePlayState?.item || null}
                activeClip={activePlayState?.clip || null}
                currentTime={currentTime}
                clipProgress={activePlayState?.progress || 0}
                tone={project ? project.brief_tone : customTone || "Action"}
                bpm={project ? project.audio_spec.music_bpm_target : 120}
                bassSwells={project ? project.audio_spec.bass_swell_timestamps : []}
                sfxImpacts={project ? project.audio_spec.sfx_impact_points : []}
                isPlaying={isPlaying}
                uploadedVideoUrl={uploadedVideoUrl}
                videoGeneratedUrl={videoGeneratedUrl}
                storyboardImages={storyboardImages}
                onSeek={(time) => setCurrentTime(time)}
                totalDuration={totalDuration}
                soundtrackUrl={uploadedMusicUrl || musicGeneratedUrl || null}
              />

              {/* NLE Deck playback controls bar */}
              <div className="bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setCurrentTime(0);
                      setIsPlaying(false);
                    }}
                    disabled={!project}
                    className="p-2 rounded bg-zinc-950 border border-zinc-900 hover:border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-40 transition-colors"
                    title="Reset to frame 1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={!project}
                    className={`px-5 py-2 rounded-full font-bold text-xs uppercase flex items-center space-x-1.5 transition-all ${
                      isPlaying
                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/15"
                        : "bg-amber-500 text-black hover:bg-amber-400 shadow-md shadow-amber-500/15"
                    } disabled:opacity-40`}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
                  </button>
                </div>

                {/* SMPTE Current Playback frame timer counters */}
                <div className="font-mono text-xs bg-zinc-950 px-4 py-1.5 rounded border border-zinc-900 text-zinc-400">
                  <span className="text-zinc-600 mr-2 uppercase text-[9px] tracking-wider">TIMECODE:</span>
                  <span className="text-zinc-200 tracking-widest font-black text-sm">
                    {secondsToTimecode(currentTime)}
                  </span>
                  <span className="text-zinc-600 mx-2">/</span>
                  <span className="text-zinc-500 text-[11px]">
                    {secondsToTimecode(totalDuration)}
                  </span>
                </div>

                {/* Playback speed selector */}
                <div className="flex items-center space-x-1 font-mono text-[10px]">
                  <span className="text-zinc-500">SPEED:</span>
                  {[1, 1.5, 2].map((sp) => (
                    <button
                      key={sp}
                      onClick={() => setPlaybackSpeed(sp)}
                      className={`px-1.5 py-1 rounded border text-[9px] ${
                        playbackSpeed === sp
                          ? "bg-amber-500/15 border-amber-500 text-amber-500"
                          : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {sp}X
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar: Ranked clip library detector (LG 4) */}
            <div className="lg:col-span-4 bg-white/5 border border-white/10 p-4 flex flex-col h-[340px] lg:h-auto shadow-lg" id="panel-clip-library">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3 gap-2">
                <div className="flex items-center space-x-2">
                  <ListVideo className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold tracking-wider uppercase font-mono text-zinc-300">
                    RANKED MOMENTS LIBRARY
                  </h3>
                </div>
                {project && (
                  <button
                    onClick={handleAutoTrimClipsToBeats}
                    className="px-2 py-1 bg-amber-500/10 border border-amber-500/35 hover:bg-amber-500 hover:text-black transition-all text-amber-400 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer shrink-0"
                    title="Automatically trim all high-scoring library clips to align perfectly with nearest audio beats/sfx impacts"
                  >
                    <Music className="w-3 h-3" />
                    <span>Sync Beats</span>
                  </button>
                )}
              </div>

              {/* Scrollable list of clips */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                {project ? (
                  project.ranked_clip_library.map((clip) => {
                    const isUsed = project.edit_sheet.some((e) => e.clip_id === clip.clip_id);
                    return (
                      <div
                        key={clip.clip_id}
                        className="bg-zinc-950 border border-zinc-900 p-2.5 rounded hover:border-zinc-700/80 transition-all flex flex-col space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-amber-400 font-bold">{clip.clip_id}</span>
                          <div className="flex items-center space-x-1.5">
                            <span className="bg-amber-500/10 text-amber-400 font-mono font-bold text-[9px] px-1.5 py-0.5 rounded">
                              {clip.score.toFixed(1)} ★
                            </span>
                            {isUsed && (
                              <span className="bg-emerald-500/10 text-emerald-400 font-mono text-[8px] px-1 py-0.5 rounded font-bold">
                                USED
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                          {clip.description}
                        </p>

                        <div className="flex items-center justify-between text-[8px] font-mono text-zinc-600 pt-1 border-t border-zinc-900">
                          <span>EMOTION: {clip.emotion.toUpperCase()}</span>
                          <span>{clip.start_timecode} - {clip.end_timecode}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center p-4">
                    <Database className="w-8 h-8 text-zinc-800 mb-2 animate-pulse" />
                    <p className="text-[11px] font-semibold font-mono tracking-wider">LIBRARY EMPTY</p>
                    <p className="text-[9px] leading-relaxed max-w-xs mt-1">Once the Multi-Agent Forge cycles through your video understanders, scored elements appear here.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Storyboard Production Deck */}
          {project && (
            <div className="bg-[#050608] border border-white/10 p-4 font-sans space-y-3" id="storyboard-production-deck">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-900 pb-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-300">
                    GEMINI AI CINEMATIC STORYBOARD DECK
                  </span>
                </div>
                {isStoryboarding && (
                  <div className="flex items-center space-x-1.5 text-amber-400 font-mono text-[9px] uppercase animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>{storyboardProgress}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-950 p-2.5 rounded border border-zinc-900">
                <div className="text-[10px] text-zinc-400 max-w-md font-sans">
                  Generate ultra-realistic widescreen AI stills matching the active script's narrative flow to view cinematic graphics in the live monitor.
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  {activePlayState?.clip && (
                    <button
                      type="button"
                      onClick={() => handleGenerateSingleStoryboard(activePlayState.clip!.clip_id, activePlayState.clip!.description)}
                      disabled={isStoryboarding}
                      className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-zinc-300 hover:text-white rounded text-[10px] font-mono uppercase cursor-pointer disabled:opacity-40 transition-all"
                    >
                      🎨 Render Active Frame ({activePlayState.clip.clip_id})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleGenerateAllStoryboards}
                    disabled={isStoryboarding}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded font-mono font-bold text-[10px] uppercase cursor-pointer disabled:opacity-40 transition-all shadow-md shadow-amber-500/10"
                  >
                    🚀 Storyboard All Scenes
                  </button>
                </div>
              </div>

              {/* Storyboard Thumbnails Row */}
              <div className="flex items-center space-x-2.5 overflow-x-auto py-1 scrollbar-thin">
                {project.edit_sheet.map((item, index) => {
                  const clip = (project.ranked_clip_library || []).find(c => c.clip_id === item.clip_id);
                  const imgUrl = storyboardImages[item.clip_id];
                  const inSec = timecodeToSeconds(item.in_point);
                  const isActive = activePlayState?.clip?.clip_id === item.clip_id;

                  return (
                    <div
                      key={`thumb-${index}`}
                      onClick={() => setCurrentTime(inSec)}
                      className={`relative flex-shrink-0 w-28 aspect-video rounded overflow-hidden border cursor-pointer transition-all ${
                        isActive
                          ? "border-amber-500 ring-1 ring-amber-500/50 scale-[1.02] shadow-lg shadow-amber-500/10"
                          : "border-zinc-900 hover:border-zinc-700"
                      }`}
                      title={`Jump to Scene ${index + 1}: ${clip?.description || ""}`}
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          alt={`Scene ${index + 1}`}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center p-1 font-mono">
                          <Film className="w-3.5 h-3.5 text-zinc-700 mb-1" />
                          <span className="text-[7.5px] text-zinc-500 uppercase">SCENE {index + 1}</span>
                          <span className="text-[6.5px] text-zinc-600 truncate max-w-full">{item.clip_id}</span>
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 bg-black/85 px-1 py-0.5 rounded text-[7px] font-mono text-zinc-400 leading-none">
                        {item.in_point}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Audio specifications & Visual Waveform track */}
          <SoundDesignTrack
            currentTime={currentTime}
            duration={totalDuration}
            bpm={project ? project.audio_spec.music_bpm_target : 120}
            bassSwells={project ? project.audio_spec.bass_swell_timestamps : []}
            sfxImpacts={project ? project.audio_spec.sfx_impact_points : []}
            isPlaying={isPlaying}
            onSeek={setCurrentTime}
            musicGeneratedUrl={musicGeneratedUrl}
          />

          {/* Interactive NLE Premiere-style multi-track timeline */}
          <TimelineTracks
            editSheet={project ? project.edit_sheet : []}
            rankedLibrary={project ? project.ranked_clip_library : []}
            currentTime={currentTime}
            duration={totalDuration}
            onSeek={setCurrentTime}
            selectedItem={selectedEditItem}
            onSelectItem={setSelectedEditItem}
            onUpdateItem={handleUpdateEditItem}
            bpm={project ? project.audio_spec?.music_bpm_target : 120}
            sfxImpacts={project ? project.audio_spec?.sfx_impact_points : []}
            bassSwells={project ? project.audio_spec?.bass_swell_timestamps : []}
          />

          {/* Dedicated Transition Editor Panel */}
          {project && (
            <TransitionEditor
              selectedItem={selectedEditItem}
              nextItem={
                selectedEditItem
                  ? project.edit_sheet.find(
                      (item) => item.sequence_order === selectedEditItem.sequence_order + 1
                    ) || null
                  : null
              }
              onUpdateTransition={(newTransition) => {
                if (selectedEditItem) {
                  const updated = {
                    ...selectedEditItem,
                    transition: newTransition,
                  };
                  setSelectedEditItem(updated);
                  handleUpdateEditItem(updated);
                }
              }}
            />
          )}

          {/* Success Message banner */}
          {successMessage && (
            <div className="bg-emerald-950/20 border border-emerald-500/40 rounded p-4 text-xs text-emerald-200 flex items-start space-x-3 transition-all">
              <div className="w-4 h-4 text-emerald-400 bg-emerald-500/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Music className="w-2.5 h-2.5 animate-bounce" />
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider font-mono text-emerald-400">AUTOMATED TEMPO ALIGNER ACTIVE</p>
                <p className="text-zinc-300 mt-1">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Message banner */}
          {error && (
            <div className="bg-red-950/30 border border-red-500/40 rounded p-4 text-xs text-red-200 flex items-start space-x-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider font-mono">FORGE PIPELINE FAULT</p>
                <p className="text-zinc-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Bottom Tabs: EDL outputs, JSON schemas, instructions */}
          <div className="bg-white/5 border border-white/10 overflow-hidden flex flex-col shadow-lg">
            
            {/* Tab selection triggers */}
            <div className="bg-black/35 border-b border-white/10 px-4 py-2 flex items-center justify-between text-xs font-mono select-none">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveOutputTab("edl")}
                  className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-colors ${
                    activeOutputTab === "edl"
                      ? "bg-zinc-900 text-amber-500 border border-zinc-800"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>EDL EXPORT (CMX 3600)</span>
                </button>
                <button
                  onClick={() => setActiveOutputTab("json")}
                  className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-colors ${
                    activeOutputTab === "json"
                      ? "bg-zinc-900 text-amber-500 border border-zinc-800"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>JSON DELIVERABLE SPEC</span>
                </button>
                <button
                  onClick={() => setActiveOutputTab("guide")}
                  className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-colors ${
                    activeOutputTab === "guide"
                      ? "bg-zinc-900 text-amber-500 border border-zinc-800"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>STUDIO HANDBOOK</span>
                </button>
                <button
                  onClick={() => setActiveOutputTab("ai-tools")}
                  className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-colors ${
                    activeOutputTab === "ai-tools"
                      ? "bg-zinc-900 text-amber-500 border border-zinc-800"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI CREATIVE FORGE SUITE</span>
                </button>
              </div>

              {project && activeOutputTab !== "guide" && (
                <button
                  onClick={() => {
                    const text = activeOutputTab === "edl" ? project.edl_export_string : JSON.stringify(project, null, 2);
                    handleCopyToClipboard(text, activeOutputTab);
                  }}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white px-2.5 py-1 rounded text-[10px] flex items-center space-x-1.5 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copyStatus === activeOutputTab ? "COPIED!" : "COPY TO CLIPBOARD"}</span>
                </button>
              )}
            </div>

            {/* Tab Contents */}
            <div className="p-4 bg-zinc-950/50 min-h-[160px]">
              {activeOutputTab === "edl" && (
                <div className="font-sans text-xs text-zinc-300">
                  {project ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                      
                      {/* Left Column: Live EDL string view */}
                      <div className="lg:col-span-7 space-y-3">
                        <div className="flex items-center justify-between bg-black/40 border border-zinc-900 px-3 py-1.5 rounded-t font-mono">
                          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">🔴 ACTIVE COMPILED EDL (CMX 3600)</span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleCopyToClipboard(project.edl_export_string, "edl")}
                              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white px-2 py-0.5 rounded text-[9px] flex items-center space-x-1 cursor-pointer transition-colors"
                            >
                              <Copy className="w-2.5 h-2.5" />
                              <span>{copyStatus === "edl" ? "COPIED" : "COPY"}</span>
                            </button>
                            <button
                              onClick={() => handleDownloadEdl(project.edl_export_string, `${project.project_title}_edl.edl`)}
                              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white px-2 py-0.5 rounded text-[9px] flex items-center space-x-1 cursor-pointer transition-colors"
                            >
                              <Download className="w-2.5 h-2.5" />
                              <span>DOWNLOAD</span>
                            </button>
                          </div>
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[300px] p-3 bg-black/60 border border-t-0 border-zinc-900/60 rounded-b font-mono text-zinc-400">
                          {project.edl_export_string}
                        </pre>
                      </div>

                      {/* Right Column: Version History log */}
                      <div className="lg:col-span-5 space-y-4">
                        
                        {/* New Revision Form */}
                        <div className="bg-[#050608]/75 border border-zinc-900 p-3 rounded space-y-3">
                          <h5 className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                            <GitBranch className="w-3.5 h-3.5 text-amber-500" />
                            <span>Save Current Pacing Iteration</span>
                          </h5>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8.5px] font-mono text-zinc-500 uppercase block mb-1">Version Name</label>
                              <input
                                type="text"
                                value={newVersionName}
                                onChange={(e) => setNewVersionName(e.target.value)}
                                placeholder={`e.g. v${edlVersions.filter(v => v.projectTitle === project.project_title).length + 1}`}
                                className="w-full bg-black/60 border border-zinc-900 rounded p-1.5 text-[10px] text-zinc-300 font-mono focus:outline-none focus:border-amber-500/50"
                              />
                            </div>
                            <div>
                              <label className="text-[8.5px] font-mono text-zinc-500 uppercase block mb-1">Revision Note</label>
                              <input
                                type="text"
                                value={newVersionNotes}
                                onChange={(e) => setNewVersionNotes(e.target.value)}
                                placeholder="e.g. Beats synced"
                                className="w-full bg-black/60 border border-zinc-900 rounded p-1.5 text-[10px] text-zinc-300 focus:outline-none focus:border-amber-500/50"
                              />
                            </div>
                          </div>

                          <button
                            onClick={handleSaveEdlVersion}
                            className="w-full bg-amber-600 hover:bg-amber-500 text-black font-mono font-bold text-[10px] py-1.5 rounded uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Pacing Revision</span>
                          </button>
                        </div>

                        {/* Version History Log List */}
                        <div className="space-y-2">
                          <h5 className="font-mono text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center space-x-1.5 px-1">
                            <History className="w-3.5 h-3.5" />
                            <span>VERSIONED HISTORIC LOGS ({edlVersions.filter(v => v.projectTitle === project.project_title).length})</span>
                          </h5>

                          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {edlVersions.filter(v => v.projectTitle === project.project_title).length > 0 ? (
                              edlVersions
                                .filter(v => v.projectTitle === project.project_title)
                                .map((ver) => (
                                  <div key={ver.id} className="bg-black/40 border border-zinc-900/60 p-2.5 rounded flex items-start justify-between gap-2.5 hover:border-zinc-800 transition-colors">
                                    <div className="min-w-0 space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-mono text-[11px] font-bold text-amber-500">{ver.versionName}</span>
                                        <span className="text-[8px] text-zinc-600 font-mono">{ver.timestamp}</span>
                                        {ver.syncScore !== undefined && (
                                          <span className="text-[8px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-800 px-1 rounded">
                                            Sync: {ver.syncScore}%
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-zinc-400 font-sans italic line-clamp-1">{ver.notes}</p>
                                    </div>

                                    <div className="flex items-center space-x-1 shrink-0">
                                      <button
                                        onClick={() => handleRestoreEdlVersion(ver)}
                                        className="p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded border border-zinc-800 text-[8.5px] font-mono flex items-center space-x-0.5 cursor-pointer"
                                        title="Restore this version back to the timeline for active playback & edits"
                                      >
                                        <RefreshCw className="w-2.5 h-2.5" />
                                        <span>RESTORE</span>
                                      </button>
                                      <button
                                        onClick={() => handleDownloadEdl(ver.edlString, `${project.project_title}_${ver.versionName}.edl`)}
                                        className="p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded border border-zinc-800"
                                        title="Download .edl"
                                      >
                                        <Download className="w-2.5 h-2.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEdlVersion(ver.id)}
                                        className="p-1 bg-zinc-900 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 rounded border border-zinc-800 hover:border-rose-950/60"
                                        title="Delete historic log"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                            ) : (
                              <div className="text-zinc-600 font-mono text-[9.5px] italic text-center py-4 border border-dashed border-zinc-900/50 rounded">
                                No historic pacing logs recorded for this project yet. Use the form above to capture your first EDL checkpoint!
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                    </div>
                  ) : (
                    <div className="text-zinc-600 text-center py-8">
                      <p className="font-bold">CMX 3600 EDIT DECISION LIST COMPILER</p>
                      <p className="text-[11px] leading-relaxed max-w-sm mx-auto mt-1">Press Ingest & Forge Trailer on the left to activate the EDL Architect. The compiled SMPTE timecodes will render here ready for copy-pasting into Avid, Premiere, or DaVinci Resolve.</p>
                    </div>
                  )}
                </div>
              )}

              {activeOutputTab === "json" && (
                <div className="font-mono text-xs text-zinc-400">
                  {project ? (
                    <pre className="overflow-x-auto whitespace-pre leading-relaxed max-h-64 p-3 bg-black/60 border border-zinc-900/60 rounded">
                      {JSON.stringify(project, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-zinc-600 text-center py-8">
                      <p className="font-bold">STRICT CODENAME SPECIFICATION SCHEMA</p>
                      <p className="text-[11px] leading-relaxed max-w-sm mx-auto mt-1">Once the multi-agent engine responds, the complete structured JSON deliverable conforming to the exact schema specified will render here in real time.</p>
                    </div>
                  )}
                </div>
              )}

              {activeOutputTab === "guide" && (
                <div className="text-zinc-400 text-xs leading-relaxed space-y-3 p-1 font-sans">
                  <h4 className="font-bold font-mono text-zinc-200 text-sm uppercase border-b border-zinc-900 pb-1.5">
                    🎬 TRAILER FORGE CORE HANDBOOK
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="font-semibold text-amber-500 font-mono text-[10px] uppercase">OPERATIONAL PARADIGMS:</p>
                      <p className="text-zinc-400 text-[11px]">
                        Our engine divides post-production workflow into <strong>7 discrete multi-agent scripts</strong> operating sequentially. The analysis handles character vectors, dialogue extraction, score metrics, pacing constraints, beat synchronization, and final SMPTE-grade output compilation.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-amber-500 font-mono text-[10px] uppercase">SMPTE TIMECODE INTEGRITY:</p>
                      <p className="text-zinc-400 text-[11px]">
                        We conform exactly to non-drop frame standard <strong>24 FPS timecodes (HH:MM:SS:FF)</strong>, where frames range 00-23. The total duration matches 30s, 60s, or 90s and is exported in strict CMX 3600 EDL formatting.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeOutputTab === "ai-tools" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs text-zinc-300 font-sans p-1">
                  
                  {/* Column Left: Chat Doctor & Ingest Micro (LG 6) */}
                  <div className="lg:col-span-6 space-y-5">
                    
                    {/* Multi-Turn Chatbot */}
                    <div className="bg-[#050608]/80 border border-zinc-900 rounded p-4 space-y-3 flex flex-col h-[340px]">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-amber-500" />
                          <span className="font-mono font-bold uppercase tracking-wider text-zinc-200">AI SCRIPT DOCTOR CHAT</span>
                        </div>
                        {/* Selector for Roles */}
                        <div className="flex items-center space-x-1.5 font-mono text-[9px]">
                          <span className="text-zinc-500">ROLE:</span>
                          <select
                            value={chatRole}
                            onChange={(e) => setChatRole(e.target.value)}
                            className="bg-black border border-zinc-800 text-zinc-300 rounded px-1.5 py-0.5 text-[9px] focus:outline-none"
                          >
                            <option value="Hollywood Script Doctor">Script Doctor</option>
                            <option value="Visual Pacing Consultant">Pacing Guru</option>
                            <option value="Sonic Supervisor">Sound Designer</option>
                          </select>
                        </div>
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-sans text-[11px] leading-relaxed max-h-48 scrollbar-thin">
                        {chatHistory.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 px-4 mt-6">
                            <Sparkles className="w-6 h-6 text-zinc-800 mb-1.5 animate-pulse" />
                            <p className="font-bold font-mono text-[10px]">SYSTEM READY</p>
                            <p className="text-[9px] mt-1 leading-normal">Ask for narrative fixes, sound cues, or cut rhythms from the script doctor.</p>
                          </div>
                        ) : (
                          chatHistory.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`p-2.5 rounded max-w-[85%] border ${
                                msg.role === 'user' 
                                  ? 'bg-amber-500/15 border-amber-500/25 text-zinc-100 rounded-br-none' 
                                  : 'bg-zinc-900 border-zinc-850 text-zinc-300 rounded-bl-none'
                              }`}>
                                <p className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest mb-1 font-bold">
                                  {msg.role === 'user' ? 'Producer' : chatRole}
                                </p>
                                <p className="whitespace-pre-wrap">{msg.parts[0]?.text || ""}</p>
                              </div>
                            </div>
                          ))
                        )}
                        {isChatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-zinc-900 border border-zinc-850 p-2.5 rounded rounded-bl-none text-zinc-500 flex items-center space-x-1.5">
                              <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                              <span className="font-mono text-[9px] uppercase tracking-wider">CONSULTING EXPERT GROUP...</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chat input */}
                      <div className="flex items-center space-x-1.5 border-t border-zinc-900 pt-2">
                        {/* Chat Model Selection */}
                        <select
                          value={chatModel}
                          onChange={(e) => setChatModel(e.target.value as any)}
                          className="bg-black border border-zinc-800 text-zinc-400 rounded px-1.5 py-2 text-[9px] font-mono focus:outline-none shrink-0"
                          title="Select Gemini Engine model type"
                        >
                          <option value="gemini-3.5-flash">General (3.5)</option>
                          <option value="gemini-3.1-pro-preview">Complex (3.1 Pro)</option>
                          <option value="gemini-3.1-flash-lite">Fast (3.1 Lite)</option>
                        </select>

                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                          placeholder="Ask the Hollywood Script Doctor..."
                          className="flex-1 bg-black border border-zinc-900 focus:border-amber-500/50 rounded px-2.5 py-1.5 text-[11px] focus:outline-none text-zinc-200"
                        />
                        <button
                          onClick={handleSendChatMessage}
                          disabled={isChatLoading || !chatInput.trim()}
                          className="p-1.5 rounded bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-30 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleClearChatHistory}
                          title="Clear conversation log"
                          className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-800 cursor-pointer transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Mic Voiceover Transcription */}
                    <div className="bg-[#050608]/80 border border-zinc-900 rounded p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                        <div className="flex items-center space-x-2">
                          <Mic className="w-4 h-4 text-amber-500" />
                          <span className="font-mono font-bold uppercase tracking-wider text-zinc-200">VOICEOVER TRANSCRIBE UNIT</span>
                        </div>
                        <span className="text-[8px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/15 px-1.5 py-0.5 rounded uppercase font-black">
                          gemini-3.5-transcribe
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={isRecording ? handleStopAudioRecording : handleStartAudioRecording}
                          className={`px-4 py-2.5 rounded font-mono text-[10px] uppercase font-bold tracking-widest flex items-center space-x-2 transition-all ${
                            isRecording 
                              ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20" 
                              : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200"
                          } cursor-pointer`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isRecording ? "bg-white" : "bg-rose-500"}`} />
                          <span>{isRecording ? "STOP INGEST" : "RECORD VOICEOVER"}</span>
                        </button>

                        <div className="text-[10px] text-zinc-500 font-mono flex-1">
                          {isRecording ? (
                            <span className="text-rose-400 animate-pulse">STREAMING LIVE AUDIO RAW BUFFER...</span>
                          ) : isTranscribing ? (
                            <div className="flex items-center space-x-1.5 text-amber-400">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>ANALYZING PHONEMES...</span>
                            </div>
                          ) : (
                            <span>PRESS RECORD TO INGEST MICROPHONE</span>
                          )}
                        </div>
                      </div>

                      {transcriptionText && (
                        <div className="bg-black/60 border border-zinc-900 p-2.5 rounded space-y-1.5">
                          <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">TRANSCRIBED SCRIPT FEEDBACK:</p>
                          <p className="font-serif italic text-[11px] text-zinc-300 leading-normal">"{transcriptionText}"</p>
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => {
                                handleCopyToClipboard(transcriptionText, "transcription");
                                if (selectedTemplateKey === "custom") {
                                  setCustomScenes(prev => prev + "\n" + transcriptionText);
                                }
                              }}
                              className="text-[9px] font-mono text-amber-500 hover:text-amber-400 flex items-center space-x-1 cursor-pointer"
                            >
                              <Copy className="w-2.5 h-2.5" />
                              <span>{copyStatus === "transcription" ? "COPIED TO CLIPBOARD!" : "USE AS FOOTAGE DESCRIPTION"}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Column Right: Veo Video generator & Lyria Music & Matte frame (LG 6) */}
                  <div className="lg:col-span-6 space-y-5">
                    
                    {/* Veo 3 Video Studio */}
                    <div className="bg-[#050608]/80 border border-zinc-900 rounded p-4 space-y-3 flex flex-col">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                        <div className="flex items-center space-x-2">
                          <Video className="w-4 h-4 text-amber-500" />
                          <span className="font-mono font-bold uppercase tracking-wider text-zinc-200">VEO 3 VIDEO STUDIO</span>
                        </div>
                        <span className="text-[8px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/15 px-1.5 py-0.5 rounded uppercase font-black">
                          veo-3.1-fast-generate-preview
                        </span>
                      </div>

                      {/* Video mode toggles */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setVideoMode("text-to-video")}
                          className={`flex-1 py-1 px-2.5 rounded border text-[9px] font-mono transition-all uppercase ${
                            videoMode === "text-to-video"
                              ? "bg-amber-500/10 border-amber-500 text-amber-400"
                              : "bg-black border-zinc-900 text-zinc-500 hover:text-zinc-300"
                          } cursor-pointer`}
                        >
                          Text to Video
                        </button>
                        <button
                          onClick={() => setVideoMode("animate-image")}
                          className={`flex-1 py-1 px-2.5 rounded border text-[9px] font-mono transition-all uppercase ${
                            videoMode === "animate-image"
                              ? "bg-amber-500/10 border-amber-500 text-amber-400"
                              : "bg-black border-zinc-900 text-zinc-500 hover:text-zinc-300"
                          } cursor-pointer`}
                        >
                          Animate Photo
                        </button>
                      </div>

                      {/* If Animate Photo, upload image base64 */}
                      {videoMode === "animate-image" && (
                        <div className="border border-zinc-900 rounded bg-black/40 p-2 text-center relative flex flex-col items-center justify-center min-h-[50px] cursor-pointer hover:border-zinc-750">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.readAsDataURL(file);
                                reader.onloadend = () => {
                                  setVideoImageBase64(reader.result as string);
                                };
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          {videoImageBase64 ? (
                            <div className="relative w-full h-10 flex items-center justify-between px-2 bg-zinc-900/40 rounded">
                              <span className="text-[9px] font-mono text-zinc-400 truncate max-w-[80%]">IMAGE LOADED SUCCESSFULLY</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setVideoImageBase64(null); }}
                                className="text-zinc-500 hover:text-white cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 text-zinc-500 text-[10px] font-mono justify-center py-2">
                              <Upload className="w-3.5 h-3.5 text-zinc-500" />
                              <span>UPLOAD KEYFRAME PHOTO</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Prompt & Aspect selector row */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={videoPrompt}
                          onChange={(e) => setVideoPrompt(e.target.value)}
                          placeholder={videoMode === "animate-image" ? "Describe camera movement e.g. slow pan right" : "Cinematic prompt e.g. Cyberpunk chase under heavy rain"}
                          className="flex-1 bg-black border border-zinc-900 focus:border-amber-500/50 rounded px-2 py-1.5 text-[11px] focus:outline-none text-zinc-200"
                        />
                        <select
                          value={videoAspectRatio}
                          onChange={(e) => setVideoAspectRatio(e.target.value as any)}
                          className="bg-black border border-zinc-800 text-zinc-300 rounded px-1.5 py-1 text-[9px] font-mono focus:outline-none shrink-0"
                        >
                          <option value="16:9">16:9 Landscape</option>
                          <option value="9:16">9:16 Portrait</option>
                        </select>
                      </div>

                      {/* Run button */}
                      <button
                        onClick={handleStartVideoGeneration}
                        disabled={videoStatus === "generating" || !videoPrompt.trim()}
                        className="w-full bg-amber-500 text-black hover:bg-amber-400 py-1.5 rounded font-mono font-bold uppercase text-[10px] tracking-widest flex items-center justify-center space-x-1.5 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{videoStatus === "generating" ? "COMPILING VIDEO..." : "GENERATE CINEMATIC VIDEO"}</span>
                      </button>

                      {videoStatus === "generating" && (
                        <div className="bg-black/50 border border-zinc-900 rounded p-2.5 space-y-1.5 animate-pulse">
                          <div className="flex items-center space-x-1.5 text-amber-500 text-[10px] font-mono">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>{videoProgressText}</span>
                          </div>
                        </div>
                      )}

                      {videoStatus === "finished" && videoGeneratedUrl && (
                        <div className="space-y-1 bg-black/40 border border-zinc-900 rounded p-2 text-center">
                          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">RENDER COMPLETED (VEO-3.1)</p>
                          <div className="flex justify-center py-1">
                            <video
                              src={videoGeneratedUrl}
                              controls
                              className={`rounded border border-zinc-800 shadow max-h-32 object-contain ${
                                videoAspectRatio === "9:16" ? "w-20" : "w-48"
                              }`}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lyria Music soundbed */}
                    <div className="bg-[#050608]/80 border border-zinc-900 rounded p-4 space-y-3 flex flex-col">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                        <div className="flex items-center space-x-2">
                          <Music className="w-4 h-4 text-amber-500" />
                          <span className="font-mono font-bold uppercase tracking-wider text-zinc-200">LYRIA SOUNDBED ENGINE</span>
                        </div>
                        {/* Selector for clip length */}
                        <div className="flex items-center space-x-1.5 font-mono text-[9px]">
                          <select
                            value={musicModel}
                            onChange={(e) => setMusicModel(e.target.value as any)}
                            className="bg-black border border-zinc-850 text-zinc-300 rounded px-1.5 py-0.5 text-[9px] focus:outline-none"
                          >
                            <option value="lyria-3-clip-preview">Clip (up to 30s)</option>
                            <option value="lyria-3-pro-preview">Full-Length Track</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={musicPrompt}
                          onChange={(e) => setMusicPrompt(e.target.value)}
                          placeholder="Music tone/vibe e.g. Dark industrial synthwave with slow driving bass"
                          className="flex-1 bg-black border border-zinc-900 focus:border-amber-500/50 rounded px-2 py-1.5 text-[11px] focus:outline-none text-zinc-200"
                        />
                        <button
                          onClick={handleMusicGeneration}
                          disabled={isMusicGenerating || !musicPrompt.trim()}
                          className="px-4 bg-amber-500 text-black hover:bg-amber-400 rounded font-mono font-bold text-[10px] uppercase tracking-wider flex items-center justify-center transition-colors disabled:opacity-40 shrink-0 cursor-pointer text-center"
                        >
                          {isMusicGenerating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>COMPOSE</span>
                          )}
                        </button>
                      </div>

                      {musicGeneratedUrl && (
                        <div className="bg-black/60 border border-zinc-900 p-2 rounded flex flex-col space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                              {uploadedMusicUrl === musicGeneratedUrl ? "INGESTED SOUNDBED DECK" : "COMPOSED AUDIO PREVIEW"}
                            </span>
                            {uploadedMusicUrl === musicGeneratedUrl && (
                              <span className="text-[8px] font-mono text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded uppercase">
                                Active Ingestion
                              </span>
                            )}
                          </div>
                          <audio src={musicGeneratedUrl} controls className="h-6 w-full text-zinc-200" />
                        </div>
                      )}
                    </div>

                    {/* Matte Painting image creation/edit */}
                    <div className="bg-[#050608]/80 border border-zinc-900 rounded p-4 space-y-3 flex flex-col">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                        <div className="flex items-center space-x-2">
                          <ImageIcon className="w-4 h-4 text-amber-500" />
                          <span className="font-mono font-bold uppercase tracking-wider text-zinc-200">CINEMATIC MATTE FRAME GENERATOR</span>
                        </div>
                        <span className="text-[8px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/15 px-1.5 py-0.5 rounded uppercase font-black">
                          gemini-3.1-flash-image
                        </span>
                      </div>

                      {/* Matte Image creation controls */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={imagePrompt}
                          onChange={(e) => setImagePrompt(e.target.value)}
                          placeholder="Describe frame design e.g. Cyberpunk skyline under cold rain"
                          className="flex-1 bg-black border border-zinc-900 focus:border-amber-500/50 rounded px-2 py-1.5 text-[11px] focus:outline-none text-zinc-200"
                        />
                        <button
                          onClick={handleImageGeneration}
                          disabled={isImageGenerating || !imagePrompt.trim()}
                          className="px-4 bg-amber-500 text-black hover:bg-amber-400 rounded font-mono font-bold text-[10px] uppercase tracking-wider flex items-center justify-center transition-colors disabled:opacity-40 shrink-0 cursor-pointer text-center"
                        >
                          {isImageGenerating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>RENDER FRAME</span>
                          )}
                        </button>
                      </div>

                      {imageGeneratedUrl && (
                        <div className="bg-black/40 border border-zinc-900 rounded p-2 text-center relative flex flex-col items-center">
                          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">RENDERED MATTE FRAME</p>
                          <img
                            src={imageGeneratedUrl}
                            alt="Matte frame preview"
                            referrerPolicy="no-referrer"
                            className="rounded border border-zinc-850 shadow w-32 h-32 object-cover"
                          />
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}
            </div>

          </div>

        </section>

      </main>

      {/* Immersive UI Render Footer Status Indicator */}
      <footer className="h-16 mt-6 border border-white/10 flex items-center px-4 gap-4 bg-white/5 select-none shadow-md">
        <div className="flex items-center gap-4 border-r border-white/10 pr-6">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500 flex items-center justify-center">
            <div className={`w-4 h-4 bg-amber-500 ${isPlaying ? "animate-pulse rounded-full" : ""}`}></div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Render Queue</span>
            <span className="text-sm font-bold text-white uppercase">{isGenerating ? "FORGING CORE..." : project ? "100.0% PROCESSED" : "STANDBY"}</span>
          </div>
        </div>
        <div className="flex-1 flex gap-2 overflow-hidden items-center">
           <div className="flex-1 h-1 bg-white/10 overflow-hidden relative">
             <div 
               className="absolute top-0 left-0 bottom-0 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-1000"
               style={{ width: isGenerating ? "82.4%" : project ? "100%" : "0%" }}
             ></div>
           </div>
           <span className="text-[10px] font-mono opacity-50 whitespace-nowrap">
             {isGenerating ? "EST REMAINING: 00:00:14" : "EST REMAINING: 00:00:00"}
           </span>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => {
              setProject(null);
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            className="bg-transparent border border-white/20 px-6 py-2 text-[10px] uppercase font-bold tracking-widest hover:bg-white/5 text-zinc-300 cursor-pointer"
          >
            Abort
          </button>
          <button 
            onClick={() => {
              if (project) handleCopyToClipboard(project.edl_export_string, "edl");
            }}
            disabled={!project}
            className="bg-amber-500 text-black px-6 py-2 text-[10px] uppercase font-bold tracking-widest hover:bg-amber-400 font-extrabold disabled:opacity-40 cursor-pointer"
          >
            Export Master
          </button>
        </div>
      </footer>
    </div>
  );
}
