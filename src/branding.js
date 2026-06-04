// ═══════════════════════════════════════════════
// branding.js — Per-organisation branding config
// Loaded at runtime from the organisations table
// ═══════════════════════════════════════════════

export const DEFAULT_BRANDING = {
  primary:   '#00267F',  // Barbados ultramarine
  accent:    '#FFC726',  // Barbados gold
  accentText:'#00267F',  // Text on accent bg
  orgName:   'Voice Transcript',
  flagStripe: ['#00267F','#FFC726','#00267F'],
  trident:   '⍦',
};

export function getBranding(org) {
  if (!org) return DEFAULT_BRANDING;
  const slug = org.slug || '';
  if (slug === 'barbados-police') return {
    primary:   '#00267F',
    accent:    '#FFC726',
    accentText:'#00267F',
    orgName:   org.name || 'Barbados Police Force',
    flagStripe: ['#00267F','#FFC726','#00267F'],
    trident:   '⍦',
  };
  // Generic fallback — can be extended per org
  return {
    primary:   '#2563eb',
    accent:    '#f59e0b',
    accentText:'#fff',
    orgName:   org.name || 'Voice Transcript',
    flagStripe: ['#2563eb','#f59e0b','#2563eb'],
    trident:   '',
  };
}