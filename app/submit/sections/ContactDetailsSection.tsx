'use client';

import React from 'react';

interface Props {
  values: {
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneWhatsapp: string;
  };
  onChange: (field: keyof Props['values'], value: string) => void;
  errors: Partial<Record<keyof Props['values'], string>>;
}

export function ContactDetailsSection({ values, onChange, errors }: Props) {
  return (
    <fieldset style={fs}>
      <legend style={lg}>Contact Details</legend>

      <Field label="First Name *" error={errors.firstName}>
        <input type="text" value={values.firstName} onChange={e => onChange('firstName', e.target.value)} style={inp} required />
      </Field>

      <Field label="Last Name *" error={errors.lastName}>
        <input type="text" value={values.lastName} onChange={e => onChange('lastName', e.target.value)} style={inp} required />
      </Field>

      <Field label="Email Address *" error={errors.emailAddress}>
        <input type="email" value={values.emailAddress} onChange={e => onChange('emailAddress', e.target.value)} style={inp} required />
      </Field>

      <Field label="Phone / WhatsApp" error={errors.phoneWhatsapp}>
        <input type="tel" value={values.phoneWhatsapp} onChange={e => onChange('phoneWhatsapp', e.target.value)} style={inp} />
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
  fontSize: '14px',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};
