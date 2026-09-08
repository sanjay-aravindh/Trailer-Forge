export interface Clip {
  clip_id: string;
  start_timecode: string;
  end_timecode: string;
  score: number;
  emotion: string;
  action_type: string;
  description: string;
}

export interface EditItem {
  sequence_order: number;
  clip_id: string;
  in_point: string;
  out_point: string;
  transition: "Cut" | "Dissolve" | "Fade to Black" | "Dip to Black" | "Glitch Cut" | "Cross Zoom" | "Fade to White";
  pacing_role: "Setup" | "Escalation" | "Climax";
}

export interface AudioSpec {
  music_bpm_target: number;
  bass_swell_timestamps: string[];
  sfx_impact_points: string[];
}

export interface TrailerForgeProject {
  project_title: string;
  brief_tone: string;
  target_duration_seconds: number;
  ranked_clip_library: Clip[];
  edit_sheet: EditItem[];
  audio_spec: AudioSpec;
  edl_export_string: string;
}

export interface EdlVersion {
  id: string;
  projectTitle: string;
  versionName: string;
  timestamp: string;
  notes: string;
  edlString: string;
  editSheet: EditItem[];
  syncScore: number;
}

export type TimelineTrack = "video" | "audio" | "narrative";
