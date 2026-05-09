import { useEffect } from 'react';
import { registerArtifact } from '@/lib/registerArtifact';

export default function Home() {
  useEffect(() => {
    registerArtifact({
      name: 'Social Content Pipeline',
      type: 'application',
      url: typeof window !== 'undefined' ? window.location.origin : '',
      description: 'AI-powered tool to draft and schedule social media content',
      metadata: {
        version: '1.0.0',
        status: 'beta',
      },
    });
  }, []);

  return (
    <div style={{ padding: '40px' }}>
      <h1>Social Content Pipeline</h1>
      <p>Draft and schedule social media content in minutes using AI</p>
      <div style={{ marginTop: '20px' }}>
        <a href="/feedback" style={{ marginRight: '10px' }}>Submit Feedback</a>
        <a href="/feedback-status">View Status</a>
      </div>
    </div>
  );
}
