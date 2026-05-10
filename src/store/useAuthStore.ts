import { create } from 'zustand';
import { supabase } from '../services/supabase';

interface AuthState {
  user: any | null;
  profile: any | null;
  loading: boolean;
  // checkUser endi ixtiyoriy 'showLoading' parametrini qabul qiladi
  checkUser: (showLoading?: boolean) => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Profilni refreshsiz yangilash uchun yordamchi funksiya
  updateLocalProfile: (newData: any) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  checkUser: async (showLoading = false) => {
    // Faqat showLoading true bo'lsa butun ekranni yopadi (masalan, App.tsx da boshida)
    if (showLoading) set({ loading: true });

    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      set({ user: session.user, profile, loading: false });
    } else {
      set({ user: null, profile: null, loading: false });
    }
  },

  updateLocalProfile: (newData: any) => {
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...newData } : null
    }));
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    set({ user: data.user, profile, loading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, loading: false });
  }
}));