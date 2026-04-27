import { supabase, Profile, Document, DocumentAnalysis, DashboardStats, SystemLog } from './supabase';

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile) throw new Error('Profile not found. Contact your administrator.');
  if (!profile.is_active) throw new Error('Your account has been deactivated. Contact your administrator.');

  return { user: data.user, profile, session: data.session };
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return data;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUsers(role?: string, department?: string): Promise<Profile[]> {
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

  if (role) query = query.eq('role', role);
  if (department) query = query.eq('department', department);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createUser(payload: {
  full_name: string;
  email: string;
  password: string;
  role: string;
  department: string;
}): Promise<Profile> {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-users/create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
        Apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Failed to create user');
  return result.data;
}

export async function updateUser(id: string, updates: Partial<Pick<Profile, 'full_name' | 'department' | 'is_active'>>): Promise<Profile> {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-users/update/${id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
        Apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(updates),
    }
  );

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Failed to update user');
  return result.data;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export async function getDocuments(filters?: { status?: string; department?: string }): Promise<Document[]> {
  let query = supabase
    .from('documents')
    .select('*, owner:profiles(id, full_name, email, role, department, avatar_initials)')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.department) query = query.eq('department', filters.department);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as Document[];
}

export async function createDocument(payload: {
  title: string;
  description: string;
  content: string;
  department: string;
}): Promise<Document> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('documents')
    .insert({ ...payload, owner_id: user!.id, status: 'draft' })
    .select('*, owner:profiles(id, full_name, email, role, department, avatar_initials)')
    .single();

  if (error) throw new Error(error.message);
  return data as Document;
}

export async function updateDocumentStatus(id: string, status: Document['status']): Promise<Document> {
  const updates: Record<string, unknown> = { status };
  if (status === 'signed') updates.signed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select('*, owner:profiles(id, full_name, email, role, department, avatar_initials)')
    .single();

  if (error) throw new Error(error.message);
  return data as Document;
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────

const AI_RESPONSES: Record<string, (title: string) => string> = {
  summary: (title) =>
    `**Document Summary: "${title}"**\n\nThis document outlines the terms, conditions, and procedural requirements related to the subject matter. Key sections include introductory clauses, main obligations of each party, payment terms, and termination conditions.\n\n**Key Points:**\n- Effective date: Upon signature of all parties\n- Duration: 12 months with automatic renewal\n- Jurisdiction: Republic of Uzbekistan\n- Governing Law: Civil Code of Uzbekistan`,

  legal_risk: (title) =>
    `**Legal Risk Assessment: "${title}"**\n\n🔴 **High Risk:** Section 4.2 contains ambiguous liability clauses that may expose the organization to unlimited damages.\n\n🟡 **Medium Risk:** Intellectual property rights are not clearly defined in Article 7. Recommend explicit ownership clause.\n\n🟡 **Medium Risk:** Force majeure clause (Section 9) does not include pandemic or cyber-attack scenarios.\n\n🟢 **Low Risk:** Payment terms are standard and legally sound.\n\n**Recommendation:** Legal counsel review recommended before signing.`,

  key_dates: (title) =>
    `**Key Dates Extracted: "${title}"**\n\n📅 **Effective Date:** January 1, 2025\n📅 **First Review Period:** March 31, 2025\n📅 **Payment Due Date:** 15th of each month\n📅 **Contract Expiration:** December 31, 2025\n📅 **Notice Period for Termination:** 30 days prior to expiration\n📅 **Renewal Decision Deadline:** November 30, 2025\n\n⚠️ **Upcoming:** Contract renewal decision required by November 30, 2025.`,
};

export async function analyzeDocument(
  documentId: string,
  documentTitle: string,
  analysisType: DocumentAnalysis['analysis_type']
): Promise<DocumentAnalysis> {
  await new Promise((r) => setTimeout(r, 1800));

  const result = AI_RESPONSES[analysisType](documentTitle);
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('document_analyses')
    .insert({ document_id: documentId, analysis_type: analysisType, result, created_by: user?.id })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('documents').update({ ai_analyzed: true }).eq('id', documentId);

  return data;
}

export async function getDocumentAnalyses(documentId: string): Promise<DocumentAnalysis[]> {
  const { data, error } = await supabase
    .from('document_analyses')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getStats(department?: string): Promise<DashboardStats> {
  let query = supabase.from('documents').select('status');
  if (department) query = query.eq('department', department);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const docs = data || [];
  return {
    total_documents: docs.length,
    pending_signatures: docs.filter((d) => d.status === 'pending').length,
    ai_analyzed: 0,
    rejected: docs.filter((d) => d.status === 'rejected').length,
    signed: docs.filter((d) => d.status === 'signed').length,
    draft: docs.filter((d) => d.status === 'draft').length,
  };
}

export async function getSystemLogs(): Promise<SystemLog[]> {
  const { data, error } = await supabase
    .from('system_logs')
    .select('*, user:profiles(id, full_name, email, role, avatar_initials)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data || []) as SystemLog[];
}

// ─── Chart Data ──────────────────────────────────────────────────────────────

export async function getMonthlyChartData(department?: string) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  const result = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    let query = supabase
      .from('documents')
      .select('status')
      .gte('created_at', date.toISOString())
      .lt('created_at', nextDate.toISOString());

    if (department) query = query.eq('department', department);

    const { data } = await query;
    const docs = data || [];

    result.push({
      month: months[date.getMonth()],
      total: docs.length,
      signed: docs.filter((d) => d.status === 'signed').length,
      pending: docs.filter((d) => d.status === 'pending').length,
      rejected: docs.filter((d) => d.status === 'rejected').length,
    });
  }

  return result;
}
