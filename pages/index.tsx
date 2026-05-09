```typescript
import { useEffect } from 'react';
import { registerArtifact } from '@/lib/registerArtifact';

export default function Home() {
  useEffect(() => {
    registerArtifact({
      name: 'voice-recording-transcription'
      type: 'application',
      url: typeof window !== 'undefined' ? window.location.origin : '',
      description: 'Your artifact description here',
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-4xl font-bold mb-4">Voice-recording-transcription</h1>
      <p className="text-lg text-gray-600 mb-8">Beta Testing Program</p>
      <a href="/feedback" className="px-6 py-3 bg-blue-600 text-white rounded">Submit Feedback</a>
    </div>
  );
}
```

---
