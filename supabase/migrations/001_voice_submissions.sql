-- Voice Recording & Transcription submissions table
-- Created: 2026-05-15

CREATE TABLE IF NOT EXISTS voice_recording_transcription_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contact Details (fields 2-5 from Google Form)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email_address TEXT NOT NULL,
  phone_whatsapp TEXT,

  -- Demographic Information (fields 6-12)
  age_range TEXT,
  gender TEXT,
  birthplace TEXT,
  total_years_lived_in_country INTEGER,
  current_occupation TEXT,
  native_speaker_of_dialect TEXT,

  -- Audio Submission Details (fields 13-17)
  content_type TEXT,
  audio_duration_seconds INTEGER,
  topics_covered TEXT,
  audio_file_urls TEXT[] NOT NULL DEFAULT '{}',
  willing_to_provide_additional_content TEXT,

  -- Consent + open text (fields 18-22)
  consent_given BOOLEAN NOT NULL,
  any_other_relevant_information TEXT,
  additional_notes TEXT,

  -- Internal tracking
  user_agent TEXT,
  ip_country TEXT
);

CREATE INDEX idx_vrt_submissions_email ON voice_recording_transcription_submissions(email_address);
CREATE INDEX idx_vrt_submissions_submitted_at ON voice_recording_transcription_submissions(submitted_at DESC);

-- Enable RLS but allow only service-role writes
ALTER TABLE voice_recording_transcription_submissions ENABLE ROW LEVEL SECURITY;

-- No public read or write policy; only service role (which bypasses RLS) can access.
-- This is intentional: all reads/writes go through server-side API routes.
