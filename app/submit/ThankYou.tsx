'use client';

import React from 'react';

export function ThankYou({ submissionId, onSubmitAnother }: { submissionId: string; onSubmitAnother: () => void }) {
  return (
    <div style={{ padding: 24, maxWidth: 560, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Thank you — submission received</h2>
      <p>We've received your audio submission and saved it securely.</p>
      <p style={{ background: '#f3f4f6', padding: 12, borderRadius: 4, fontFamily: 'monospace', fontSize: 13 }}>
        Reference ID: {submissionId}
      </p>
      <p>A confirmation email has been sent. You can submit more recordings anytime by clicking below.</p>
      <button
        type="button"
        onClick={onSubmitAnother}
        style={{ padding: '10px 16px', background: '#1f2937', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}
      >
        Submit another recording
      </button>
    </div>
  );
}
