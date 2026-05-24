import { useAuth } from "@/lib/auth";

export function LoginButton({ className = "" }: { className?: string }) {
  const { user, signInWithGoogle, signOut, loading } = useAuth();

  if (loading) {
    return <span className="text-sm text-neutral-500">…</span>;
  }

  if (user) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="hidden sm:inline text-sm text-neutral-400 truncate max-w-[180px]">
          {user.email}
        </span>
        <button className="btn-ghost" onClick={signOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button className={`btn-primary ${className}`} onClick={signInWithGoogle}>
      Sign in with Google
    </button>
  );
}
