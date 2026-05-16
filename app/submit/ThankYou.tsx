'use client';

import React from 'react';

export function ThankYou({ submissionId, onSubmitAnother }: { submissionId: string; onSubmitAnother: () => void }) {
  return (
    <div style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', textAlign: 'center' as const }}>
      <div style={{ fontSize: 48, marginBottom: 20, color: '#059669' }}>✓</div>
      <h2 style={{ marginTop: 0, fontSize: 28, color: '#111827', marginBottom: 12 }}>Thank you!</h2>
      <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 16, lineHeight: 1.6 }}>
        We've received your audio submission and saved it securely.
      </p>
      <div
        style={{
          background: '#f3f4f6',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
          border: '1px solid #e5e7eb',
          textAlign: 'left' as const
        }}
      >
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Reference ID:</div>
        <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#111827', wordBreak: 'break-all' }}>
          {submissionId}
        </div>
      </div>
      <p style={{ color: '#6b7280', marginBottom: 28, fontSize: 15 }}>
        A confirmation email has been sent to your inbox. You can submit more recordings anytime by clicking the button below.
      </p>
      <button
        type="button"
        onClick={onSubmitAnother}
        style={{
          padding: '12px 24px',
          background: '#dc2626',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 16,
          transition: 'background-color 0.2s'
        }}
      >
        Submit another recording
      </button>
    </div>
  );
}
