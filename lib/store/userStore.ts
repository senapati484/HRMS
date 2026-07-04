import { create } from "zustand";

export interface User {
  _id: string;
  name: string;
  employeeId: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  department?: string;
  designation?: string;
  joinDate?: string;
  isVerified: boolean;
}

interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  updateUserFields: (fields: Partial<User>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: false,
  error: null,
  fetchUser: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Failed to fetch user session");
      const data = await res.json();
      if (data.user) {
        set({ user: data.user, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch (err) {
      set({ error: (err as Error).message || "Failed to load user", loading: false });
    }
  },
  setUser: (user) => set({ user }),
  updateUserFields: (fields) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...fields } : null,
    })),
}));
