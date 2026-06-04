import { useEffect } from 'react';
import { registerArtifact } from '@/lib/registerArtifact';

export default function Home() {
  useEffect(() => {
    registerArtifact({
      name: 'Voice Recording & Transcription',
      type: 'application',
      url: typeof window !== 'undefined' ? window.location.origin : '',
      description: 'Submit voice recordings to help improve speech recognition and dialect documentation',
      metadata: {
        version: '1.0.0',
        status: 'active',
      },
    });
  }, []);

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>Voice Recording & Transcription</h1>
      <p>Help us improve speech recognition and dialect documentation by submitting your voice recordings.</p>
      <div style={{ marginTop: '20px' }}>
        <a href="/submit" style={{ marginRight: '10px', display: 'inline-block', padding: '10px 16px', background: '#1f2937', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>Submit Audio</a>
        <a href="/feedback" style={{ marginRight: '10px', display: 'inline-block', padding: '10px 16px', background: '#6b7280', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>Send Feedback</a>
        <a href="/feedback-status" style={{ display: 'inline-block', padding: '10px 16px', background: '#6b7280', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>View Feedback Status</a>
      </div>
    </div>
  );
}
