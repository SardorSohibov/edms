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

export type SignerStatus = 'pending' | 'signed' | 'rejected';

export interface DocumentSigner {
  id: string;
  document_id: string;
  user_id: string;
  status: SignerStatus;
  signed_at: string | null;
  comment: string | null;
  created_at: string;
  user?: Profile;
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
  signers?: DocumentSigner[];
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

export interface Department {
  id: string;
  name: string;
  document_count: number;
  created_at?: string;
}
