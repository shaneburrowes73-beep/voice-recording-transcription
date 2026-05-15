'use client';

import React, { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-client';
import { submissionSchema, MAX_FILES_PER_SUBMISSION, MAX_FILE_SIZE_BYTES } from '@/lib/submission-schema';
import { ContactDetailsSection } from './sections/ContactDetailsSection';
import { DemographicSection } from './sections/DemographicSection';
import { AudioSubmissionSection, UploadSlot } from './sections/AudioSubmissionSection';
import { ConsentSection } from './sections/ConsentSection';
import { ThankYou } from './ThankYou';

const emptySlot = (): UploadSlot => ({ file: null, status: 'idle', url: null, errorMsg: null, progress: 0 });

export function SubmitForm() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [contact, setContact] = useState({ firstName: '', lastName: '', emailAddress: '', phoneWhatsapp: '' });
  const [demo, setDemo] = useState({ ageRange: '', gender: '', birthplace: '', totalYearsLivedInCountry: '', currentOccupation: '', nativeSpeakerOfDialect: '' });
  const [audio, setAudio] = useState({ contentType: '', audioDurationSeconds: '', topicsCovered: '', willingToProvideAdditionalContent: '' });
  const [consent, setConsent] = useState({ consentGiven: false, anyOtherRelevantInformation: '', additionalNotes: '' });

  const [slots, setSlots] = useState<UploadSlot[]>(() => Array.from({ length: MAX_FILES_PER_SUBMISSION }, emptySlot));

  function resetForm() {
    setSubmitted(null);
    setGlobalError(null);
    setErrors({});
    setContact({ firstName: '', lastName: '', emailAddress: '', phoneWhatsapp: '' });
    setDemo({ ageRange: '', gender: '', birthplace: '', totalYearsLivedInCountry: '', currentOccupation: '', nativeSpeakerOfDialect: '' });
    setAudio({ contentType: '', audioDurationSeconds: '', topicsCovered: '', willingToProvideAdditionalContent: '' });
    setConsent({ consentGiven: false, anyOtherRelevantInformation: '', additionalNotes: '' });
    setSlots(Array.from({ length: MAX_FILES_PER_SUBMISSION }, emptySlot));
  }

  async function handlePickFile(slotIndex: number, file: File | null) {
    if (!file) {
      setSlots(prev => prev.map((s, i) => (i === slotIndex ? emptySlot() : s)));
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSlots(prev => prev.map((s, i) => (i === slotIndex ? { ...emptySlot(), file, status: 'error', errorMsg: `File too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB)` } : s)));
      return;
    }

    setSlots(prev => prev.map((s, i) => (i === slotIndex ? { ...emptySlot(), file, status: 'uploading', progress: 0 } : s)));

    try {
      const signedRes = await fetch('/api/submit-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType: file.type || 'audio/mpeg' }),
      });

      if (!signedRes.ok) {
        const err = await signedRes.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to get upload URL');
      }

      const { token, objectPath } = await signedRes.json();

      const { error: uploadErr } = await supabaseBrowser.storage
        .from('voice-submissions')
        .uploadToSignedUrl(objectPath, token, file, { contentType: file.type });

      if (uploadErr) throw new Error(uploadErr.message);

      const url = `voice-submissions/${objectPath}`;

      setSlots(prev => prev.map((s, i) => (i === slotIndex ? { ...s, status: 'done', url, progress: 100 } : s)));
    } catch (err: any) {
      setSlots(prev => prev.map((s, i) => (i === slotIndex ? { ...s, status: 'error', errorMsg: err?.message || 'Upload failed' } : s)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);
    setErrors({});

    const uploadedUrls = slots.filter(s => s.status === 'done' && s.url).map(s => s.url!);

    const payload = {
      firstName: contact.firstName.trim(),
      lastName: contact.lastName.trim(),
      emailAddress: contact.emailAddress.trim(),
      phoneWhatsapp: contact.phoneWhatsapp.trim(),
      ageRange: demo.ageRange,
      gender: demo.gender,
      birthplace: demo.birthplace.trim(),
      totalYearsLivedInCountry: demo.totalYearsLivedInCountry ? Number(demo.totalYearsLivedInCountry) : undefined,
      currentOccupation: demo.currentOccupation.trim(),
      nativeSpeakerOfDialect: demo.nativeSpeakerOfDialect,
      contentType: audio.contentType,
      audioDurationSeconds: audio.audioDurationSeconds ? Number(audio.audioDurationSeconds) : undefined,
      topicsCovered: audio.topicsCovered.trim(),
      audioFileUrls: uploadedUrls,
      willingToProvideAdditionalContent: audio.willingToProvideAdditionalContent,
      consentGiven: consent.consentGiven,
      anyOtherRelevantInformation: consent.anyOtherRelevantInformation.trim(),
      additionalNotes: consent.additionalNotes.trim(),
    };

    const parsed = submissionSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setGlobalError('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Submission failed');
      }

      const { submissionId } = await res.json();
      setSubmitted(submissionId);
    } catch (err: any) {
      setGlobalError(err?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <ThankYou submissionId={submitted} onSubmitAnother={resetForm} />;
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 24, maxWidth: 720, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ marginTop: 0 }}>Voice Recording & Transcription — Audio Submission</h1>
      <p style={{ color: '#6b7280' }}>
        Thank you for helping the Voice Recording & Transcription project. Please complete the form below and
        upload your audio file(s). All fields marked * are required. You can submit as many times as you like.
      </p>

      <ContactDetailsSection
        values={contact}
        onChange={(f, v) => setContact(prev => ({ ...prev, [f]: v }))}
        errors={errors as any}
      />
      <DemographicSection
        values={demo}
        onChange={(f, v) => setDemo(prev => ({ ...prev, [f]: v }))}
        errors={errors as any}
      />
      <AudioSubmissionSection
        values={audio}
        onChange={(f, v) => setAudio(prev => ({ ...prev, [f]: v }))}
        errors={errors as any}
        slots={slots}
        onPickFile={handlePickFile}
      />
      <ConsentSection
        values={consent}
        onChange={(f, v) => setConsent(prev => ({ ...prev, [f]: v }))}
        errors={errors as any}
      />

      {globalError && (
        <div style={{ color: '#b91c1c', background: '#fef2f2', padding: 12, borderRadius: 4, marginBottom: 16 }}>
          {globalError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || slots.some(s => s.status === 'uploading')}
        style={{ padding: '12px 20px', background: submitting ? '#9ca3af' : '#1f2937', color: '#fff', border: 'none', borderRadius: 4, cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 500, fontSize: 16 }}
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
