"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (compact) {
    return (
      <button
        onClick={logout}
        disabled={loading}
        title="Logout"
        className="w-full flex items-center justify-center p-2 rounded-xl transition-all disabled:opacity-60 cursor-pointer"
        style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)" }}
      >
        {loading ? (
          <span className="w-4 h-4 rounded-full border border-red-500 border-t-transparent animate-spin inline-block" />
        ) : (
          <LogOut size={16} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="flex-1 text-xs px-3 py-2 rounded-xl font-bold uppercase tracking-wide transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer border"
      style={{
        background: "rgba(239,68,68,0.08)",
        color: "var(--danger)",
        borderColor: "rgba(239,68,68,0.15)",
      }}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-red-500 border-t-transparent animate-spin inline-block" />
      ) : (
        <LogOut size={14} />
      )}
      <span>{loading ? "..." : "Logout"}</span>
    </button>
  );
}
