"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
        className="w-full flex items-center justify-center p-2 rounded-xl transition-all disabled:opacity-60"
        style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)" }}
      >
        {loading ? "·" : "⏻"}
      </button>
    );
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="w-full text-sm px-3 py-2 rounded-xl font-medium transition-all disabled:opacity-60 flex items-center justify-center gap-2"
      style={{
        background: "rgba(239,68,68,0.08)",
        color: "var(--danger)",
        border: "1px solid rgba(239,68,68,0.15)",
      }}
    >
      <span>⏻</span>
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
