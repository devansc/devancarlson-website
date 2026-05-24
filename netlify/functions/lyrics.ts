// Genius lyrics lookup.
//
// Genius's API returns song metadata and a URL to the lyrics page, but doesn't
// return the lyrics text itself. The community-accepted approach is to fetch
// the lyrics page HTML and extract the lyric containers. This is best-effort:
// Genius changes their markup occasionally, so if extraction breaks, update
// the selector logic below.
//
// Required env var: GENIUS_ACCESS_TOKEN (a client access token from
// https://genius.com/api-clients)

import type { Context } from "@netlify/functions";

interface GeniusSearchHit {
  result: {
    id: number;
    title: string;
    primary_artist: { name: string };
    url: string;
  };
}

interface GeniusSearchResponse {
  response: { hits: GeniusSearchHit[] };
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const title = url.searchParams.get("title")?.trim();
  const artist = url.searchParams.get("artist")?.trim() ?? "";

  if (!title) {
    return json({ error: "Missing 'title' query param" }, 400);
  }

  const token = process.env.GENIUS_ACCESS_TOKEN;
  if (!token) {
    return json(
      { error: "Server is not configured: GENIUS_ACCESS_TOKEN is missing." },
      500,
    );
  }

  const query = `${title} ${artist}`.trim();
  const searchRes = await fetch(
    `https://api.genius.com/search?q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!searchRes.ok) {
    return json({ error: `Genius search failed (${searchRes.status})` }, 502);
  }
  const search = (await searchRes.json()) as GeniusSearchResponse;
  const hit = pickBestHit(search.response.hits, title, artist);
  if (!hit) {
    return json({ error: "No matching song on Genius." }, 404);
  }

  const pageRes = await fetch(hit.result.url, {
    headers: { "User-Agent": "Mozilla/5.0 (gigg-lyrics-fetcher)" },
  });
  if (!pageRes.ok) {
    return json({ error: `Failed to fetch lyrics page (${pageRes.status})` }, 502);
  }
  const html = await pageRes.text();
  const lyrics = extractLyrics(html);
  if (!lyrics) {
    return json(
      { error: "Could not extract lyrics from page. Genius may have updated their markup." },
      502,
    );
  }

  return json({
    lyrics,
    source: {
      title: hit.result.title,
      artist: hit.result.primary_artist.name,
      url: hit.result.url,
    },
  });
};

function pickBestHit(
  hits: GeniusSearchHit[],
  title: string,
  artist: string,
): GeniusSearchHit | undefined {
  if (hits.length === 0) return undefined;
  if (!artist) return hits[0];
  const a = artist.toLowerCase();
  const exact = hits.find((h) => h.result.primary_artist.name.toLowerCase() === a);
  if (exact) return exact;
  const partial = hits.find((h) => h.result.primary_artist.name.toLowerCase().includes(a));
  return partial ?? hits[0];
  // title is implicitly part of the search query; Genius ranks by relevance.
  void title;
}

// Genius lyrics live inside elements with `data-lyrics-container="true"`.
// Within them, <br> separates lines and other tags can be stripped.
// We track nested <div> depth to find the true closing tag instead of
// stopping at the first inner </div> (which would cut off verse content).
function extractLyrics(html: string): string | null {
  const chunks: string[] = [];
  let searchFrom = 0;

  while (true) {
    const markerIdx = html.indexOf('data-lyrics-container="true"', searchFrom);
    if (markerIdx === -1) break;

    const openingClose = html.indexOf('>', markerIdx);
    if (openingClose === -1) break;

    let depth = 1;
    let pos = openingClose + 1;

    while (pos < html.length && depth > 0) {
      const nextOpen = html.indexOf('<div', pos);
      const nextClose = html.indexOf('</div', pos);

      if (nextClose === -1) { pos = html.length; break; }

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 4;
      } else {
        depth--;
        if (depth === 0) chunks.push(html.slice(openingClose + 1, nextClose));
        pos = nextClose + 5;
      }
    }

    searchFrom = openingClose + 1;
  }

  if (chunks.length === 0) return null;
  const joined = chunks.join("\n");
  const text = joined
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/^\d+\s+Contributors[^\[]*/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const config = { path: "/api/lyrics" };
