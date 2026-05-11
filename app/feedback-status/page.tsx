// Drop at: app/feedback-status/page.tsx in the voice-recording-transcription repo
// Also requires: components/FeedbackStatus.tsx (copy from shared/FeedbackStatus.tsx)

import FeedbackStatus from '@/components/FeedbackStatus';

export default function FeedbackStatusPage() {
  return (
    <FeedbackStatus
      artifactName="Voice Recording & Transcription"
      tableName="voice_recording_transcription_feedback"
    />
  );
}
