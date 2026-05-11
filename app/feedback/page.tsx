// Drop at: app/feedback/page.tsx in the voice-recording-transcription repo
// Also requires: components/FeedbackForm.tsx (copy from shared/FeedbackForm.tsx)

import FeedbackForm, { SmartQuestion } from '@/components/FeedbackForm';

const ARTIFACT = 'Voice Recording & Transcription';
const TABLE = 'voice_recording_transcription_feedback';

const QUESTIONS: [SmartQuestion, SmartQuestion, SmartQuestion] = [
  { key: 'q1_record_transcribe_reliability', label: 'Recording and transcription works reliably first time.' },
  { key: 'q2_transcription_accuracy',        label: 'The transcription is accurate enough to use as-is.' },
  { key: 'q3_time_savings_50pct',            label: 'This saves me at least 50% of the time I would spend manually.' },
];

export default function FeedbackPage() {
  return <FeedbackForm artifactName={ARTIFACT} tableName={TABLE} questions={QUESTIONS} />;
}
