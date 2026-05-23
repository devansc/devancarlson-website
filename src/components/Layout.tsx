import { Link, NavLink, Outlet } from "react-router-dom";
import { LoginButton } from "./LoginButton";

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">
            Devan Carlson
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `btn-ghost ${isActive ? "text-emerald-400" : ""}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/gigg"
              className={({ isActive }) =>
                `btn-ghost ${isActive ? "text-emerald-400" : ""}`
              }
            >
              Gigg
            </NavLink>
            <div className="ml-2">
              <LoginButton />
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-500">
        &copy; {new Date().getFullYear()} Devan Carlson
      </footer>
    </div>
  );
}
