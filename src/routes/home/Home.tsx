import { Link } from "react-router-dom";

// TODO: replace YouTube IDs and side-project links with your real content.
const YOUTUBE_VIDEOS: { id: string; title: string }[] = [
  { id: "dQw4w9WgXcQ", title: "Placeholder video 1" },
  { id: "dQw4w9WgXcQ", title: "Placeholder video 2" },
];

const SIDE_PROJECTS: { name: string; href: string; description: string; internal?: boolean }[] = [
  {
    name: "Gigg",
    href: "/gigg",
    description: "Note-taking and song-writing app for musicians.",
    internal: true,
  },
  // Add future side-projects here.
];

export function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-16">
      <section>
        <h1 className="text-4xl font-semibold tracking-tight">Devan Carlson</h1>
        <p className="mt-4 text-neutral-300 leading-relaxed">
          {/* TODO: replace with your real bio */}
          Software engineer, musician, and tinkerer. I build small, useful things
          on the web and play guitar more than I should. This site is a hub for
          a few projects I'm working on — feel free to poke around.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Videos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {YOUTUBE_VIDEOS.map((v, i) => (
            <div key={i} className="card overflow-hidden p-0">
              <div className="aspect-video w-full">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${v.id}`}
                  title={v.title}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-3 text-sm text-neutral-300">{v.title}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Side projects</h2>
        <ul className="space-y-3">
          {SIDE_PROJECTS.map((p) => (
            <li key={p.name} className="card flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-neutral-400">{p.description}</div>
              </div>
              {p.internal ? (
                <Link to={p.href} className="btn-primary shrink-0">
                  Open
                </Link>
              ) : (
                <a
                  href={p.href}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary shrink-0"
                >
                  Visit
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
