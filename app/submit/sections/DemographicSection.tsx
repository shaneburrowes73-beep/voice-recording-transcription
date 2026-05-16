'use client';

import React from 'react';

interface Props {
  values: {
    ageRange: string;
    gender: string;
    birthplace: string;
    totalYearsLivedInCountry: string;
    currentOccupation: string;
    nativeSpeakerOfDialect: string;
  };
  onChange: (field: keyof Props['values'], value: string) => void;
  errors: Partial<Record<keyof Props['values'], string>>;
}

const AGE_RANGES = ['Under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+'];
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'];
const YES_NO = ['Yes', 'No', 'Not sure'];

export function DemographicSection({ values, onChange, errors }: Props) {
  return (
    <fieldset style={fs}>
      <legend style={lg}>Demographic Information</legend>

      <Field label="Age Range" error={errors.ageRange}>
        <select value={values.ageRange} onChange={e => onChange('ageRange', e.target.value)} style={inp}>
          <option value="">— Select —</option>
          {AGE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>

      <Field label="Gender" error={errors.gender}>
        <select value={values.gender} onChange={e => onChange('gender', e.target.value)} style={inp}>
          <option value="">— Select —</option>
          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </Field>

      <Field label="Birthplace (city, country)" error={errors.birthplace}>
        <input type="text" value={values.birthplace} onChange={e => onChange('birthplace', e.target.value)} style={inp} />
      </Field>

      <Field label="Total Years Lived in Your Country" error={errors.totalYearsLivedInCountry}>
        <input type="number" min={0} max={120} value={values.totalYearsLivedInCountry} onChange={e => onChange('totalYearsLivedInCountry', e.target.value)} style={inp} />
      </Field>

      <Field label="Current Occupation" error={errors.currentOccupation}>
        <input type="text" value={values.currentOccupation} onChange={e => onChange('currentOccupation', e.target.value)} style={inp} />
      </Field>

      <Field label="Are you a Native Speaker of the dialect?" error={errors.nativeSpeakerOfDialect}>
        <select value={values.nativeSpeakerOfDialect} onChange={e => onChange('nativeSpeakerOfDialect', e.target.value)} style={inp}>
          <option value="">— Select —</option>
          {YES_NO.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </Field>
    </fieldset>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>{label}</label>
      {children}
      {error && <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 4 }}>{error}</div>}
    </div>
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
const inp: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontFamily: 'inherit',
  fontSize: '14px'
};
