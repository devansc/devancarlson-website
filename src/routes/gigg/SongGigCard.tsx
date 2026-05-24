import { useMemo } from "react";
import type { Section, Song } from "@/lib/database.types";
import { sectionAbbrev } from "./songParser";

interface Props {
  song: Song;
  sections: Section[];
}

export function SongGigCard({ song, sections }: Props) {
  const sectionByName = useMemo(() => {
    const m = new Map<string, Section>();
    for (const s of sections) m.set(s.name.toLowerCase(), s);
    return m;
  }, [sections]);

  const form = song.form ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-4xl font-semibold">{song.title}</h2>
        {song.artist && <div className="text-neutral-400 text-xl">{song.artist}</div>}
      </div>

      {form.length > 0 && (
        <div className="flex flex-wrap gap-1 font-mono">
          {form.map((name, i) => {
            const known = sectionByName.has(name.toLowerCase());
            return (
              <span
                key={i}
                className={`chip text-lg ${known ? "text-emerald-300" : "border-red-900 text-red-300"}`}
                title={name}
              >
                {sectionAbbrev(name)}
              </span>
            );
          })}
        </div>
      )}

      <div className="grid gap-3">
        {sections.map((s) => (
          <div key={s.id} className="card">
            <div className="font-medium text-2xl">{s.name}</div>
            <div className="mt-1 flex flex-wrap gap-1 font-mono text-2xl">
              {(s.chords ?? []).map((c, j) => (
                <span key={j} className="chip text-emerald-300">
                  {c}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {song.lyrics && (
        <div className="card whitespace-pre-wrap text-xl leading-relaxed">{song.lyrics}</div>
      )}
    </div>
  );
}
