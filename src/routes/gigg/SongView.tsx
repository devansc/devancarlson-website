import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Section, Song, Tag } from "@/lib/database.types";
import { sectionAbbrev } from "./songParser";
import { formatOffset, transposeChord, transposeKey } from "./transpose";

type ViewMode = "practice" | "gig";

export function SongView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [song, setSong] = useState<Song | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("practice");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [songRes, sectionsRes, tagsRes] = await Promise.all([
        supabase.from("songs").select("*").eq("id", id).single(),
        supabase.from("sections").select("*").eq("song_id", id).order("position"),
        supabase.from("song_tags").select("tag:tags(*)").eq("song_id", id),
      ]);
      if (cancelled) return;
      if (songRes.error) {
        setError(songRes.error.message);
        setLoading(false);
        return;
      }
      setSong(songRes.data as Song);
      setSections((sectionsRes.data ?? []) as Section[]);
      setTags(
        ((tagsRes.data ?? []) as unknown as { tag: Tag }[])
          .map((r) => r.tag)
          .filter(Boolean),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  // Map section name (lowercased) -> section, for resolving the form.
  const sectionByName = useMemo(() => {
    const m = new Map<string, Section>();
    for (const s of sections) m.set(s.name.toLowerCase(), s);
    return m;
  }, [sections]);

  if (loading) return <div className="text-neutral-500 text-sm">Loading…</div>;
  if (!song) return <div className="text-sm text-red-300">{error ?? "Not found."}</div>;

  const form = song.form ?? [];
  const hasForm = form.length > 0;

  // In gig mode, we hide chrome and use larger type for readability on stage.
  const isGig = mode === "gig";

  return (
    <div className={isGig ? "space-y-6" : "space-y-5"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="btn-ghost" onClick={() => navigate("/gigg")}>
          ← Songs
        </button>
        <div className="flex gap-1">
          <button
            className={`btn-ghost ${mode === "practice" ? "text-emerald-400" : ""}`}
            onClick={() => setMode("practice")}
          >
            Practice
          </button>
          <button
            className={`btn-ghost ${mode === "gig" ? "text-emerald-400" : ""}`}
            onClick={() => setMode("gig")}
          >
            Gig
          </button>
          <Link to={`/gigg/songs/${id}/edit`} className="btn-ghost">
            Edit
          </Link>
        </div>
      </div>

      <div>
        <h2 className={isGig ? "text-4xl font-semibold" : "text-2xl font-semibold"}>
          {song.title}
        </h2>
        {song.artist && (
          <div className={`text-neutral-400 ${isGig ? "text-xl" : "text-sm"}`}>
            {song.artist}
          </div>
        )}

        {/* Metadata row: key (with transpose arrow), tempo, time sig, capo. */}
        <div
          className={`mt-2 flex flex-wrap items-center gap-1 ${
            isGig ? "text-lg" : "text-xs"
          }`}
        >
          {song.song_key && (
            <span className="chip">
              Key {song.song_key}
              {offset !== 0 && (
                <>
                  {" → "}
                  <span className="text-emerald-300">
                    {transposeKey(song.song_key, offset)}
                  </span>
                </>
              )}
            </span>
          )}
          {song.tempo != null && <span className="chip">{song.tempo} BPM</span>}
          {song.time_sig && <span className="chip">{song.time_sig}</span>}
          {song.capo != null && song.capo > 0 && (
            <span className="chip">Capo {song.capo}</span>
          )}
        </div>

        {/* Transpose control. */}
        <div
          className={`mt-2 flex flex-wrap items-center gap-1 ${
            isGig ? "text-lg" : "text-xs"
          }`}
        >
          <span className="text-neutral-500 mr-1">Transpose</span>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Transpose down"
          >
            −
          </button>
          <span className="font-mono w-8 text-center">{formatOffset(offset)}</span>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Transpose up"
          >
            +
          </button>
          {offset !== 0 && (
            <button
              type="button"
              className="btn-ghost text-neutral-400"
              onClick={() => setOffset(0)}
            >
              Reset
            </button>
          )}
        </div>

        {!isGig && tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span key={t.id} className="chip">
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {hasForm && (
        <div>
          {!isGig && (
            <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
              Form
            </div>
          )}
          <div className="flex flex-wrap gap-1 font-mono">
            {form.map((name, i) => {
              const known = sectionByName.has(name.toLowerCase());
              return (
                <span
                  key={i}
                  className={`chip ${isGig ? "text-lg" : ""} ${
                    known ? "text-emerald-300" : "border-red-900 text-red-300"
                  }`}
                  title={name}
                >
                  {sectionAbbrev(name)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className={`grid gap-3 ${isGig ? "" : "sm:grid-cols-2"}`}>
        {sections.map((s) => (
          <div key={s.id} className="card">
            <div
              className={`font-medium ${isGig ? "text-2xl" : "text-sm"}`}
            >
              {s.name}
              {!isGig && (
                <span className="ml-2 text-xs text-neutral-500 font-mono">
                  ({sectionAbbrev(s.name)})
                </span>
              )}
            </div>
            <div
              className={`mt-1 flex flex-wrap gap-1 font-mono ${
                isGig ? "text-2xl" : "text-sm"
              }`}
            >
              {(s.chords ?? []).map((c, j) => (
                <span key={j} className="chip text-emerald-300">
                  {transposeChord(c, offset)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!isGig && song.notes && (
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
            Notes
          </div>
          <div className="card whitespace-pre-wrap text-sm">{song.notes}</div>
        </div>
      )}

      {song.lyrics && (
        <div>
          {!isGig && (
            <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
              Lyrics
            </div>
          )}
          <div
            className={`card whitespace-pre-wrap ${
              isGig ? "text-xl leading-relaxed" : "text-sm"
            }`}
          >
            {song.lyrics}
          </div>
        </div>
      )}
    </div>
  );
}
