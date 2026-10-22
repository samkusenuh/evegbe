export type EntryStatus = "pending" | "approved" | "disputed";
export type EntryType = "word" | "phrase";
export type ValidationVerdict = "correct" | "incorrect";
export type ValidationTarget = "entry" | "recording";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  is_native_speaker: boolean;
  reputation: number;
  created_at: string;
}

export interface Group {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  display_order: number;
}

export interface Entry {
  id: string;
  ewe: string;
  english: string;
  notes: string | null;
  entry_type: EntryType;
  group_id: string | null;
  submitted_by: string | null;
  status: EntryStatus;
  approval_score: number;
  rejection_score: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  group?: Group | null;
  submitter?: Pick<Profile, "username" | "display_name" | "is_native_speaker"> | null;
  recordings?: Recording[];
}

export interface Recording {
  id: string;
  entry_id: string;
  user_id: string | null;
  storage_path: string;
  duration_ms: number | null;
  approval_score: number;
  rejection_score: number;
  created_at: string;
  uploader?: Pick<Profile, "username" | "is_native_speaker"> | null;
}

export interface Validation {
  id: string;
  user_id: string;
  target_type: ValidationTarget;
  target_id: string;
  verdict: ValidationVerdict;
  note: string | null;
  weight: number;
  created_at: string;
}
