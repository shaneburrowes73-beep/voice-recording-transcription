// Per-organisation branding config — loaded at runtime from the organisations table.
// To add a new client: add a new slug case below and set colours/name.

export const DEFAULT_BRANDING = {
  primary:    '#00267F',  // Barbados ultramarine
  accent:     '#FFC726',  // Barbados gold
  accentText: '#00267F',
  orgName:    'Voice Transcript',
  flagStripe: ['#00267F','#FFC726','#00267F'],
  trident:    '⍦',
};

export function getBranding(org) {
  if (!org) return DEFAULT_BRANDING;
  const slug = org.slug || '';
  if (slug === 'barbados-police') return {
    primary:    '#00267F',
    accent:     '#FFC726',
    accentText: '#00267F',
    orgName:    org.name || 'Barbados Police Force',
    flagStripe: ['#00267F','#FFC726','#00267F'],
    trident:    '⍦',
  };
  // Generic fallback — extend with additional slug cases per new client
  return {
    primary:    '#2563eb',
    accent:     '#f59e0b',
    accentText: '#fff',
    orgName:    org.name || 'Voice Transcript',
    flagStripe: ['#2563eb','#f59e0b','#2563eb'],
    trident:    '',
  };
}
