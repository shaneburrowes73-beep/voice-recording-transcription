/**
 * Barbadian Dialect Lexicon — Post-processing corrections for Whisper transcripts.
 *
 * These are common Barbadian Creole words/phrases that Whisper (trained on standard
 * English) frequently transcribes incorrectly. The corrections map the phonetic
 * approximation Whisper returns to the correct Barbadian form.
 *
 * This is the TypeScript equivalent of the Python AccentLexicon class from
 * src/core/voice_transcription_v2.py, without the ML dependency.
 *
 * Grow this list as real transcription errors are observed from the corpus.
 */

// Map of: Whisper output (lowercase) → Barbadian correction
const BARBADIAN_CORRECTIONS: Record<string, string> = {
  // Common Bajan expressions misheard by Whisper
  "wuh": "wuh",
  "wuh you talking": "wuh you talking",
  "leh we": "leh we",
  "leh": "leh",
  "bout here": "bout here",
  "duh": "duh",
  "doan": "doan",
  "dat": "dat",
  "dem": "dem",
  "dey": "dey",
  "de": "de",
  "wunna": "wunna",
  "gine": "gine",
  "guh": "guh",
  "hay": "hey",
  "um": "um",
  "nuff": "nuff",
  "bare": "bare",
  "wam": "wam",
  "real talk": "real talk",
  "pun": "pon",
  "pon": "pon",
  // Common police/formal usage
  "the accused": "the accused",
  "the complainant": "the complainant",
};

// Regex-based phrase corrections (more complex replacements)
const PHRASE_CORRECTIONS: Array<{ pattern: RegExp; replacement: string }> = [
  // "leh we" sometimes transcribed as "let we" or "let's we"
  { pattern: /\blet['']?s?\s+we\b/gi, replacement: "leh we" },
  // "wunna" sometimes transcribed as "one of" or "all of you"
  { pattern: /\bone of you all\b/gi, replacement: "wunna" },
  // "gine" (going to) transcribed as "going"
  { pattern: /\bgine\b/gi, replacement: "gine" },
  // "bout" for "about"
  { pattern: /\b'bout\b/gi, replacement: "bout" },
];

export interface LexiconResult {
  corrected_transcript: string;
  corrections_applied: number;
  correction_details: Array<{ original: string; corrected: string }>;
}

/**
 * Apply Barbadian dialect corrections to a Whisper transcript.
 * Safe to call with any text — if no corrections apply, returns original unchanged.
 */
export function applyBarbadianCorrections(transcript: string): LexiconResult {
  let result = transcript;
  const correction_details: Array<{ original: string; corrected: string }> = [];
  let corrections_applied = 0;

  // Apply phrase-level corrections first
  for (const { pattern, replacement } of PHRASE_CORRECTIONS) {
    const before = result;
    result = result.replace(pattern, replacement);
    if (result !== before) {
      corrections_applied++;
      correction_details.push({ original: before, corrected: result });
    }
  }

  // Apply word-level corrections
  const words = result.split(/(\s+)/);
  const corrected_words = words.map(token => {
    const lower = token.toLowerCase().trim();
    if (BARBADIAN_CORRECTIONS[lower] && BARBADIAN_CORRECTIONS[lower] !== lower) {
      corrections_applied++;
      correction_details.push({ original: token, corrected: BARBADIAN_CORRECTIONS[lower] });
      return BARBADIAN_CORRECTIONS[lower];
    }
    return token;
  });

  return {
    corrected_transcript: corrected_words.join(""),
    corrections_applied,
    correction_details,
  };
}
