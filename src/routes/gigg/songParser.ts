// Parses an "easy entry" textarea format into sections + chords.
//
// Format:
//   [Verse 1]
//   C G Am F
//   C G F
//
//   [Chorus]
//   Am F C G
//
// Rules:
// - Lines wrapped in [brackets] start a new section.
// - Lines outside any section are ignored unless they're chord lines under a section.
// - Chord lines split on whitespace and "|" so users can type "| C | G | Am | F |" too.
// - Empty lines are separators only.

export interface ParsedSection {
  name: string;
  chords: string[];
}

const BRACKET_RE = /^\s*\[(.+?)\]\s*$/;

export function parseSongText(text: string): ParsedSection[] {
  const lines = text.split(/\r?\n/);
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const bracket = line.match(BRACKET_RE);
    if (bracket) {
      current = { name: bracket[1].trim(), chords: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      // Lines before any [Section] header are treated as the first untitled section.
      current = { name: "Intro", chords: [] };
      sections.push(current);
    }

    const tokens = line
      .split(/[\s|]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    current.chords.push(...tokens);
  }

  return sections;
}

export function stringifySections(sections: ParsedSection[]): string {
  return sections
    .map((s) => `[${s.name}]\n${s.chords.join(" ")}`)
    .join("\n\n");
}

// --- Song form helpers ----------------------------------------------------
//
// A song's "form" is the playback order of its sections, e.g.
//   ["Verse", "Verse", "Chorus", "Bridge", "Verse", "Chorus"]
// Sections themselves are unique (Verse defined once, with its chords);
// the form references them by name (case-insensitive match).

// Parse a comma- or whitespace-separated form string into an array of names,
// normalising each name to the canonical case from `knownSections` when possible.
export function parseFormText(text: string, knownSections: string[] = []): string[] {
  const lookup = new Map(knownSections.map((n) => [n.toLowerCase(), n]));
  return text
    .split(/[,\n]+|\s{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => lookup.get(s.toLowerCase()) ?? s);
}

export function stringifyForm(form: string[]): string {
  return form.join(", ");
}

// Short label for a section name, used in compact form display.
//   "Verse 1"     -> "V1"
//   "Pre-Chorus"  -> "PC"
//   "Chorus"      -> "C"
//   "Solo"        -> "S"
//   "Drum Break"  -> "DB"
export function sectionAbbrev(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // Split on whitespace + hyphen to catch "Pre-Chorus".
  const parts = trimmed.split(/[\s\-_]+/).filter(Boolean);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  // Append a trailing number if the last word looks like one ("Verse 1" -> "V1").
  const lastNum = trimmed.match(/(\d+)\s*$/);
  if (lastNum && !/\d/.test(letters)) {
    return letters + lastNum[1];
  }
  return letters || trimmed.slice(0, 2).toUpperCase();
}
