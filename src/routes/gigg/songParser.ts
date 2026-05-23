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
