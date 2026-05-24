// Chord transposition utilities.
//
// Parses chord tokens like "C", "Am", "F#m7", "Bbmaj7", "G/B", "Csus4/E"
// and shifts them by N semitones, preserving the quality suffix and any
// bass note. Stored chord data is never mutated — this is purely a
// view-time transform.

const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const ROOT_TO_INDEX: Record<string, number> = {
  C: 0, "C#": 1, Db: 1,
  D: 2, "D#": 3, Eb: 3,
  E: 4, Fb: 4,
  "E#": 5, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8,
  A: 9, "A#": 10, Bb: 10,
  B: 11, Cb: 11,
};

// Matches an optional root + optional accidental at the start of a token.
const ROOT_RE = /^([A-G])([#b])?(.*)$/;

function wrap(n: number): number {
  return ((n % 12) + 12) % 12;
}

interface ParsedRoot {
  root: string;       // e.g. "C", "F#", "Bb"
  preferFlat: boolean;
  rest: string;       // remainder of the token (suffix, possibly with /bass)
}

function parseRoot(token: string): ParsedRoot | null {
  const m = token.match(ROOT_RE);
  if (!m) return null;
  const letter = m[1];
  const acc = m[2] ?? "";
  const rest = m[3] ?? "";
  const root = letter + acc;
  if (!(root in ROOT_TO_INDEX)) return null;
  return { root, preferFlat: acc === "b", rest };
}

function shiftRoot(root: string, semitones: number, preferFlat: boolean): string {
  const idx = ROOT_TO_INDEX[root];
  if (idx == null) return root;
  const target = wrap(idx + semitones);
  return (preferFlat ? FLATS : SHARPS)[target];
}

export function transposeChord(chord: string, semitones: number): string {
  if (!chord || semitones === 0) return chord;
  // Don't try to transpose obvious non-chord tokens like "N.C." or "|".
  if (!/^[A-G]/.test(chord)) return chord;

  // Split off optional bass note.
  const slashIdx = chord.indexOf("/");
  const mainPart = slashIdx === -1 ? chord : chord.slice(0, slashIdx);
  const bassPart = slashIdx === -1 ? null : chord.slice(slashIdx + 1);

  const main = parseRoot(mainPart);
  if (!main) return chord;
  const newMain = shiftRoot(main.root, semitones, main.preferFlat) + main.rest;

  if (bassPart == null) return newMain;
  const bass = parseRoot(bassPart);
  if (!bass) return `${newMain}/${bassPart}`;
  const newBass = shiftRoot(bass.root, semitones, bass.preferFlat) + bass.rest;
  return `${newMain}/${newBass}`;
}

// Transpose a key name like "G", "Am", "F#m", "Bb". Returns null if input is null/empty.
export function transposeKey(key: string | null, semitones: number): string | null {
  if (!key) return key;
  if (semitones === 0) return key;
  return transposeChord(key, semitones);
}

// Format a signed semitone offset for display: -2, -1, 0, +1, +2.
export function formatOffset(semitones: number): string {
  if (semitones === 0) return "0";
  return semitones > 0 ? `+${semitones}` : String(semitones);
}
