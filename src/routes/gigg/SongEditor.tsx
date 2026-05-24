import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Section, Tag } from "@/lib/database.types";
import {
  parseFormText,
  parseSongText,
  sectionAbbrev,
  stringifyForm,
  stringifySections,
} from "./songParser";

interface FormState {
  title: string;
  artist: string;
  notes: string;
  lyrics: string;
  sectionsText: string;
  formText: string;
  tagIds: Set<string>;
}

const EMPTY: FormState = {
  title: "",
  artist: "",
  notes: "",
  lyrics: "",
  sectionsText: "[Verse 1]\nC G Am F\n\n[Chorus]\nF C G Am\n",
  formText: "",
  tagIds: new Set(),
};

export function SongEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingLyrics, setFetchingLyrics] = useState(false);

  // Load song + tags
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const tagsRes = await supabase.from("tags").select("*").order("name");
      if (!cancelled && !tagsRes.error) setTags(tagsRes.data ?? []);

      if (isNew) return;

      const [songRes, sectionsRes, songTagsRes] = await Promise.all([
        supabase.from("songs").select("*").eq("id", id!).single(),
        supabase.from("sections").select("*").eq("song_id", id!).order("position"),
        supabase.from("song_tags").select("tag_id").eq("song_id", id!),
      ]);
      if (cancelled) return;
      if (songRes.error) {
        setError(songRes.error.message);
        setLoading(false);
        return;
      }
      const song = songRes.data!;
      const sections = (sectionsRes.data ?? []) as Section[];
      setForm({
        title: song.title,
        artist: song.artist ?? "",
        notes: song.notes ?? "",
        lyrics: song.lyrics ?? "",
        sectionsText: stringifySections(
          sections.map((s) => ({ name: s.name, chords: s.chords ?? [] })),
        ),
        formText: stringifyForm(song.form ?? []),
        tagIds: new Set((songTagsRes.data ?? []).map((r) => r.tag_id)),
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, user]);

  const parsedSections = useMemo(() => parseSongText(form.sectionsText), [form.sectionsText]);
  const sectionNames = useMemo(() => parsedSections.map((s) => s.name), [parsedSections]);
  const parsedForm = useMemo(
    () => parseFormText(form.formText, sectionNames),
    [form.formText, sectionNames],
  );
  const sectionNameSet = useMemo(
    () => new Set(sectionNames.map((n) => n.toLowerCase())),
    [sectionNames],
  );

  const save = useCallback(async () => {
    if (!user) return;
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);

    let songId = id;
    if (isNew) {
      const { data, error } = await supabase
        .from("songs")
        .insert({
          user_id: user.id,
          title: form.title.trim(),
          artist: form.artist.trim() || null,
          notes: form.notes || null,
          lyrics: form.lyrics || null,
          form: parsedForm,
        })
        .select("id")
        .single();
      if (error || !data) {
        setError(error?.message ?? "Failed to create song");
        setSaving(false);
        return;
      }
      songId = data.id;
    } else {
      const { error } = await supabase
        .from("songs")
        .update({
          title: form.title.trim(),
          artist: form.artist.trim() || null,
          notes: form.notes || null,
          lyrics: form.lyrics || null,
          form: parsedForm,
          updated_at: new Date().toISOString(),
        })
        .eq("id", songId!);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    // Replace sections wholesale (simplest, predictable).
    await supabase.from("sections").delete().eq("song_id", songId!);
    if (parsedSections.length > 0) {
      const { error: secErr } = await supabase.from("sections").insert(
        parsedSections.map((s, i) => ({
          song_id: songId!,
          position: i,
          name: s.name,
          chords: s.chords,
        })),
      );
      if (secErr) {
        setError(secErr.message);
        setSaving(false);
        return;
      }
    }

    // Replace song_tags wholesale.
    await supabase.from("song_tags").delete().eq("song_id", songId!);
    if (form.tagIds.size > 0) {
      await supabase.from("song_tags").insert(
        Array.from(form.tagIds).map((tag_id) => ({ song_id: songId!, tag_id })),
      );
    }

    setSaving(false);
    if (isNew) navigate(`/gigg/songs/${songId}`, { replace: true });
    else navigate(`/gigg/songs/${songId}`);
  }, [user, id, isNew, form, parsedSections, parsedForm, navigate]);

  const remove = async () => {
    if (!id) return;
    if (!confirm("Delete this song?")) return;
    const { error } = await supabase.from("songs").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    navigate("/gigg");
  };

  const addTag = async () => {
    const name = newTag.trim();
    if (!name || !user) return;
    const { data, error } = await supabase
      .from("tags")
      .insert({ user_id: user.id, name })
      .select("*")
      .single();
    if (error || !data) {
      setError(error?.message ?? "Failed to add tag");
      return;
    }
    setTags((t) => [...t, data]);
    setForm((f) => {
      const next = new Set(f.tagIds);
      next.add(data.id);
      return { ...f, tagIds: next };
    });
    setNewTag("");
  };

  const toggleTag = (tagId: string) => {
    setForm((f) => {
      const next = new Set(f.tagIds);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return { ...f, tagIds: next };
    });
  };

  const fetchLyrics = async () => {
    if (!form.title.trim()) {
      setError("Enter a title (and ideally artist) before fetching lyrics.");
      return;
    }
    setFetchingLyrics(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        title: form.title,
        artist: form.artist,
      });
      const res = await fetch(`/api/lyrics?${params.toString()}`);
      const data = (await res.json()) as { lyrics?: string; error?: string };
      if (!res.ok) throw new Error(data.error || `Lyrics fetch failed (${res.status})`);
      setForm((f) => ({ ...f, lyrics: data.lyrics ?? "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFetchingLyrics(false);
    }
  };

  if (loading) return <div className="text-neutral-500 text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <button
          className="btn-ghost"
          onClick={() => navigate(isNew ? "/gigg" : `/gigg/songs/${id}`)}
        >
          ← {isNew ? "Back" : "Cancel"}
        </button>
        <div className="flex gap-2">
          {!isNew && (
            <button className="btn-ghost text-red-300 hover:bg-red-950/40" onClick={remove}>
              Delete
            </button>
          )}
          <button className="btn-primary" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && <div className="card border-red-900 text-sm text-red-300">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">
            Title
          </label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Song title"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">
            Artist
          </label>
          <input
            className="input"
            value={form.artist}
            onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))}
            placeholder="Artist (optional)"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs uppercase tracking-wide text-neutral-500">
            Sections &amp; chords
          </label>
          <span className="text-xs text-neutral-500">
            Use <code>[Section Name]</code> headers, then chord lines.
          </span>
        </div>
        <textarea
          className="input font-mono min-h-[180px]"
          value={form.sectionsText}
          onChange={(e) => setForm((f) => ({ ...f, sectionsText: e.target.value }))}
        />
        {parsedSections.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {parsedSections.map((s, i) => (
              <div key={i} className="card">
                <div className="text-sm font-medium">{s.name}</div>
                <div className="mt-1 flex flex-wrap gap-1 font-mono text-sm">
                  {s.chords.map((c, j) => (
                    <span key={j} className="chip text-emerald-300">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs uppercase tracking-wide text-neutral-500">
            Form
          </label>
          <span className="text-xs text-neutral-500">
            Play order, e.g. <code>Verse 1, Verse 1, Chorus, Bridge, Verse 1, Chorus</code>
          </span>
        </div>
        <input
          className="input font-mono"
          value={form.formText}
          onChange={(e) => setForm((f) => ({ ...f, formText: e.target.value }))}
          placeholder="Comma-separated section names…"
        />
        {parsedForm.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {parsedForm.map((name, i) => {
              const known = sectionNameSet.has(name.toLowerCase());
              return (
                <span
                  key={i}
                  className={`chip font-mono ${known ? "text-emerald-300" : "border-red-900 text-red-300"}`}
                  title={known ? name : `${name} — no matching section`}
                >
                  {sectionAbbrev(name)}
                </span>
              );
            })}
          </div>
        )}
        {parsedSections.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-neutral-500 mb-1">Click to append:</div>
            <div className="flex flex-wrap gap-1">
              {parsedSections.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className="chip cursor-pointer hover:border-emerald-700"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      formText: f.formText.trim()
                        ? `${f.formText.replace(/[\s,]+$/, "")}, ${s.name}`
                        : s.name,
                    }))
                  }
                >
                  + {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">
            Notes
          </label>
          <textarea
            className="input min-h-[140px]"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Tuning, capo, arrangement notes…"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs uppercase tracking-wide text-neutral-500">
              Lyrics
            </label>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={fetchLyrics}
              disabled={fetchingLyrics}
            >
              {fetchingLyrics ? "Fetching…" : "Fetch from Genius"}
            </button>
          </div>
          <textarea
            className="input min-h-[140px]"
            value={form.lyrics}
            onChange={(e) => setForm((f) => ({ ...f, lyrics: e.target.value }))}
            placeholder="Paste or fetch lyrics here."
          />
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-neutral-500 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => {
            const active = form.tagIds.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                className={`chip cursor-pointer ${
                  active ? "bg-emerald-500 text-neutral-950" : ""
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="input max-w-xs"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="New tag (e.g. 'solo', 'band-x')"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <button type="button" className="btn-ghost" onClick={addTag}>
            Add tag
          </button>
        </div>
      </div>
    </div>
  );
}
