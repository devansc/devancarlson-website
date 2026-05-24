import type { Context } from "@netlify/functions";

interface LyricsOvhResponse {
  lyrics?: string;
  error?: string;
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const title = url.searchParams.get("title")?.trim();
  const artist = url.searchParams.get("artist")?.trim();

  if (!title || !artist) {
    return json({ error: "Missing 'title' and 'artist' query params" }, 400);
  }

  const apiUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  const res = await fetch(apiUrl);

  if (res.status === 404) {
    return json({ error: "No lyrics found." }, 404);
  }
  if (!res.ok) {
    return json({ error: `Lyrics lookup failed (${res.status})` }, 502);
  }

  const data = (await res.json()) as LyricsOvhResponse;
  if (data.error || !data.lyrics) {
    return json({ error: data.error ?? "No lyrics found." }, 404);
  }

  return json({ lyrics: data.lyrics.trim() });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const config = { path: "/api/lyrics" };
