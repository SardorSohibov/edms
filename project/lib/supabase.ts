import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'admin' | 'director' | 'employee';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string;
  is_active: boolean;
  created_by: string | null;
  avatar_initials: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  description: string;
  content: string;
  status: 'draft' | 'pending' | 'signed' | 'rejected';
  owner_id: string;
  department: string;
  file_url: string;
  signed_at: string | null;
  ai_analyzed: boolean;
  created_at: string;
  updated_at: string;
  owner?: Profile;
}

export interface DocumentAnalysis {
  id: string;
  document_id: string;
  analysis_type: 'summary' | 'legal_risk' | 'key_dates';
  result: string;
  created_by: string | null;
  created_at: string;
}

export interface SystemLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  user?: Profile;
}

export interface DashboardStats {
  total_documents: number;
  pending_signatures: number;
  ai_analyzed: number;
  rejected: number;
  signed: number;
  draft: number;
}
