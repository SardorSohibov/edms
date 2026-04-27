'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Profile } from '@/lib/supabase';
import { getCurrentProfile, logout } from '@/lib/api';

const AUTH_BYPASS_ENABLED = process.env.NEXT_PUBLIC_AUTH_BYPASS !== 'false';
const BYPASS_PROFILE: Profile = {
  id: 'dev-bypass-user',
  full_name: 'Dev Admin',
  email: 'dev@smartdoc.local',
  role: 'admin',
  department: 'IT',
  is_active: true,
  created_by: null,
  avatar_initials: 'DA',
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(AUTH_BYPASS_ENABLED ? BYPASS_PROFILE : null);
  const [loading, setLoading] = useState(!AUTH_BYPASS_ENABLED);

  const refreshProfile = useCallback(async () => {
    if (AUTH_BYPASS_ENABLED) {
      setProfile(BYPASS_PROFILE);
      return;
    }
    const p = await getCurrentProfile();
    setProfile(p);
  }, []);

  useEffect(() => {
    if (AUTH_BYPASS_ENABLED) {
      setProfile(BYPASS_PROFILE);
      setLoading(false);
      return;
    }

    getCurrentProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  const signOut = async () => {
    if (AUTH_BYPASS_ENABLED) {
      setProfile(BYPASS_PROFILE);
      return;
    }
    await logout();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
