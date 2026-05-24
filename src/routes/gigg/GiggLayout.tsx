import { NavLink, Outlet } from "react-router-dom";

export function GiggLayout() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Gigg</h1>
          <p className="text-sm text-neutral-400">
            Songs, sections, chords, and setlists.
          </p>
        </div>
        <nav className="flex gap-1">
          <NavLink
            to="/gigg"
            end
            className={({ isActive }) => `btn-ghost ${isActive ? "text-emerald-400" : ""}`}
          >
            Songs
          </NavLink>
          <NavLink
            to="/gigg/setlists"
            className={({ isActive }) => `btn-ghost ${isActive ? "text-emerald-400" : ""}`}
          >
            Setlists
          </NavLink>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
