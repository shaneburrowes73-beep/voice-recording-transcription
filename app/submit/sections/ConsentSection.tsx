'use client';

import React from 'react';

interface Props {
  values: {
    consentGiven: boolean;
    anyOtherRelevantInformation: string;
    additionalNotes: string;
  };
  onChange: <K extends keyof Props['values']>(field: K, value: Props['values'][K]) => void;
  errors: Partial<Record<keyof Props['values'], string>>;
}

export function ConsentSection({ values, onChange, errors }: Props) {
  return (
    <fieldset style={fs}>
      <legend style={lg}>Consent & Notes</legend>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={values.consentGiven}
            onChange={e => onChange('consentGiven', e.target.checked)}
            style={{ marginTop: 4 }}
          />
          <span>
            I consent to my audio recordings and provided information being used for the Voice Recording &
            Transcription project, including processing, transcription, and analysis. I understand my data will
            be handled in line with AI Solutions' data protection practices. *
          </span>
        </label>
        {errors.consentGiven && <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 4 }}>{errors.consentGiven}</div>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Any other relevant information</label>
        <textarea
          rows={3}
          value={values.anyOtherRelevantInformation}
          onChange={e => onChange('anyOtherRelevantInformation', e.target.value)}
          style={textareaStyle}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Additional Notes (optional)</label>
        <textarea
          rows={3}
          value={values.additionalNotes}
          onChange={e => onChange('additionalNotes', e.target.value)}
          style={textareaStyle}
        />
      </div>
    </fieldset>
  );
}

const fs: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 20,
  marginBottom: 24,
  backgroundColor: '#fafbfc',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};
const lg: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 18,
  padding: '0 8px',
  color: '#111827',
  borderBottom: '2px solid #dc2626',
  paddingBottom: 12,
  marginBottom: 12
};
const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontFamily: 'inherit',
  resize: 'vertical',
  fontSize: '14px'
};
