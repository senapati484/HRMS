import { create } from "zustand";

interface ThemeState {
  theme: "light" | "dark";
  initTheme: () => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "light",
  initTheme: () => {
    if (typeof window === "undefined") return;
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light";
    set({ theme: savedTheme });
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(savedTheme);
  },
  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", nextTheme);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(nextTheme);
      }
      return { theme: nextTheme };
    });
  },
}));
