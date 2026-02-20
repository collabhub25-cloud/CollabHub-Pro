import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserRole, PlanType } from '@/lib/models';

// ============================================
// TYPES
// ============================================
export type { UserRole, PlanType };

export interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  verificationLevel: 0 | 1 | 2 | 3;
  trustScore: number;
  kycStatus: 'pending' | 'verified' | 'rejected';
  bio?: string;
  skills?: string[];
  isEmailVerified: boolean;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  location?: string;
  plan?: PlanType;
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
  // Investor-specific fields
  investmentThesis?: string;
  preferredIndustries?: string[];
  stagePreference?: string[];
  ticketSize?: { min: number; max: number };
  accreditationStatus?: string;
  experience?: string;
  // Talent-specific fields
  title?: string;
  hourlyRate?: number;
  availability?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  updateUser: (updates: Partial<User>) => void;
  fetchUser: () => Promise<void>;
}

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  activeTab: string;
  modalOpen: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setActiveTab: (tab: string) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

// ============================================
// AUTH STORE — no token, no persist of sensitive data
// ============================================
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: (user) => set({ user, isAuthenticated: true }),

      logout: async () => {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
        } catch {
          // Best-effort
        }
        set({ user: null, isAuthenticated: false });
      },

      setLoading: (isLoading) => set({ isLoading }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      fetchUser: async () => {
        try {
          set({ isLoading: true });
          const res = await fetch('/api/auth/me', {
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            set({
              user: data.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'collabhub-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist the non-sensitive user info for instant hydration
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================
// UI STORE
// ============================================
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system',
      activeTab: 'dashboard',
      modalOpen: null,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      openModal: (modalId) => set({ modalOpen: modalId }),
      closeModal: () => set({ modalOpen: null }),
    }),
    {
      name: 'collabhub-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
      }),
    }
  )
);

// ============================================
// NOTIFICATION STORE
// ============================================
export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (notification) => {
    const newNotification = {
      ...notification,
      id: Math.random().toString(36).substring(7),
      createdAt: new Date(),
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50),
    }));
  },
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    ),
  })),
  clearAll: () => set({ notifications: [] }),
}));
