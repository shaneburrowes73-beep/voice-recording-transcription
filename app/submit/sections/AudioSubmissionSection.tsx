'use client';

import React from 'react';
import { MAX_FILES_PER_SUBMISSION, MAX_FILE_SIZE_BYTES, ACCEPTED_AUDIO_MIME_TYPES } from '@/lib/submission-schema';

export interface UploadSlot {
  file: File | null;
  status: 'idle' | 'uploading' | 'done' | 'error';
  url: string | null;
  errorMsg: string | null;
  progress: number;
}

interface Props {
  values: {
    contentType: string;
    audioDurationSeconds: string;
    topicsCovered: string;
    willingToProvideAdditionalContent: string;
  };
  onChange: (field: keyof Props['values'], value: string) => void;
  errors: Partial<Record<keyof Props['values'] | 'audioFiles', string>>;
  slots: UploadSlot[];
  onPickFile: (slotIndex: number, file: File | null) => void;
}

const CONTENT_TYPES = ['Conversation', 'Reading', 'Singing', 'Storytelling', 'Other'];
const YES_NO = ['Yes', 'No', 'Maybe'];

export function AudioSubmissionSection({ values, onChange, errors, slots, onPickFile }: Props) {
  const acceptAttr = ACCEPTED_AUDIO_MIME_TYPES.join(',');
  const maxMB = MAX_FILE_SIZE_BYTES / 1024 / 1024;

  return (
    <fieldset style={fs}>
      <legend style={lg}>Audio Submission Details</legend>

      <Field label="Content Type">
        <select value={values.contentType} onChange={e => onChange('contentType', e.target.value)} style={inp}>
          <option value="">— Select —</option>
          {CONTENT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>

      <Field label="Audio Duration (seconds, total across all files)">
        <input type="number" min={0} value={values.audioDurationSeconds} onChange={e => onChange('audioDurationSeconds', e.target.value)} style={inp} />
      </Field>

      <Field label="Topics Covered (briefly)">
        <textarea rows={3} value={values.topicsCovered} onChange={e => onChange('topicsCovered', e.target.value)} style={{ ...inp, resize: 'vertical' }} />
      </Field>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
          Audio Files * (up to {MAX_FILES_PER_SUBMISSION}, max {maxMB} MB each)
        </label>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 0, marginBottom: 12 }}>
          Accepted formats: MP3, WAV, M4A, OGG, WEBM, AAC. The first file is required.
        </p>

        {slots.map((slot, i) => (
          <div key={i} style={slotBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="file"
                accept={acceptAttr}
                onChange={e => onPickFile(i, e.target.files?.[0] ?? null)}
                disabled={slot.status === 'uploading'}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 13, color: statusColor(slot.status), minWidth: 100 }}>
                {slot.status === 'idle' && (i === 0 ? 'Required' : 'Optional')}
                {slot.status === 'uploading' && `Uploading ${slot.progress}%`}
                {slot.status === 'done' && '✓ Uploaded'}
                {slot.status === 'error' && '✗ Failed'}
              </span>
            </div>
            {slot.errorMsg && <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 4 }}>{slot.errorMsg}</div>}
          </div>
        ))}

        {errors.audioFiles && <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 4 }}>{errors.audioFiles}</div>}
      </div>

      <Field label="Are you willing to provide additional content?">
        <select value={values.willingToProvideAdditionalContent} onChange={e => onChange('willingToProvideAdditionalContent', e.target.value)} style={inp}>
          <option value="">— Select —</option>
          {YES_NO.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </Field>
    </fieldset>
  );
}

function statusColor(s: UploadSlot['status']) {
  if (s === 'done') return '#059669';
  if (s === 'error') return '#b91c1c';
  if (s === 'uploading') return '#2563eb';
  return '#6b7280';
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const fs: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginBottom: 24 };
const lg: React.CSSProperties = { fontWeight: 600, fontSize: 18, padding: '0 8px' };
const inp: React.CSSProperties = { width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4, fontFamily: 'inherit' };
const slotBox: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 4, padding: 12, marginBottom: 8 };
