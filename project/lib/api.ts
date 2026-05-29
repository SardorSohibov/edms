import { Profile, Document, DocumentAnalysis, DashboardStats, SystemLog, Department } from './supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';
const AUTH_PROFILE_KEY = 'smartdoc-auth-profile';
const AUTH_TOKEN_KEY = 'smartdoc-auth-token';
const AUTH_REFRESH_TOKEN_KEY = 'smartdoc-auth-refresh-token';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function backendRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || result?.error || 'Request failed');
  }

  return (result.data !== undefined ? result.data : result) as T;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

const DOCUMENT_STATUSES: Document['status'][] = ['draft', 'pending', 'signed', 'rejected'];

function normalizeDocumentStatus(status: unknown): Document['status'] {
  if (status == null) return 'draft';

  let raw: string;
  if (typeof status === 'object') {
    const value = status as Record<string, unknown>;
    raw = String(value.name ?? value.value ?? value.status ?? 'draft');
  } else {
    raw = String(status);
  }

  const normalized = raw.toLowerCase().trim();
  if (DOCUMENT_STATUSES.includes(normalized as Document['status'])) {
    return normalized as Document['status'];
  }

  const aliases: Record<string, Document['status']> = {
    approved: 'signed',
    in_progress: 'pending',
    in_review: 'pending',
    submitted: 'pending',
    waiting: 'pending',
    declined: 'rejected',
  };

  return aliases[normalized] ?? 'draft';
}

function normalizeDocument(raw: Record<string, unknown>): Document {
  const owner = raw.owner as Record<string, unknown> | undefined;

  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    content: String(raw.content ?? ''),
    status: normalizeDocumentStatus(raw.status ?? raw.documentStatus ?? raw.document_status),
    owner_id: String(raw.owner_id ?? raw.ownerId ?? ''),
    department: String(raw.department ?? ''),
    file_url: String(raw.file_url ?? raw.fileUrl ?? ''),
    signed_at: (raw.signed_at ?? raw.signedAt ?? null) as string | null,
    ai_analyzed: Boolean(raw.ai_analyzed ?? raw.aiAnalyzed),
    created_at: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? raw.updatedAt ?? new Date().toISOString()),
    owner: owner
      ? {
          id: String(owner.id ?? ''),
          full_name: String(owner.full_name ?? owner.fullName ?? ''),
          email: String(owner.email ?? ''),
          role: (String(owner.role ?? 'employee').toLowerCase() as Profile['role']),
          department: String(owner.department ?? ''),
          is_active: Boolean(owner.is_active ?? owner.isActive ?? true),
          created_by: (owner.created_by ?? owner.createdBy ?? null) as string | null,
          avatar_initials: String(owner.avatar_initials ?? owner.avatarInitials ?? ''),
          created_at: String(owner.created_at ?? owner.createdAt ?? ''),
          updated_at: String(owner.updated_at ?? owner.updatedAt ?? ''),
        }
      : undefined,
  };
}

function normalizeDocuments(data: unknown): Document[] {
  if (!Array.isArray(data)) return [];
  return data.map((item) => normalizeDocument(item as Record<string, unknown>));
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();
  if (!response.ok || !result?.success) {
    throw new Error(result?.message || 'Invalid login credentials');
  }

  const profile = result.user as Profile;
  if (!profile?.is_active) {
    throw new Error('Your account has been deactivated');
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile));
    if (result.token) localStorage.setItem(AUTH_TOKEN_KEY, result.token);
    if (result.refreshToken) localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, result.refreshToken);
  }

  return { profile, token: result.token, refreshToken: result.refreshToken };
}

export async function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_PROFILE_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_PROFILE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUsers(role?: string, department?: string): Promise<Profile[]> {
  return backendRequest<Profile[]>(`/api/users${buildQuery({ role, department })}`);
}

export async function createUser(payload: {
  full_name: string;
  email: string;
  password: string;
  role: string;
  department: string;
}): Promise<Profile> {
  return backendRequest<Profile>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<Profile, 'full_name' | 'department' | 'is_active'>>
): Promise<Profile> {
  return backendRequest<Profile>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

function normalizeDepartment(raw: Record<string, unknown>): Department {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    document_count: Number(raw.document_count ?? raw.documentCount ?? 0),
    created_at: raw.created_at ? String(raw.created_at) : raw.createdAt ? String(raw.createdAt) : undefined,
  };
}

export async function getDepartments(): Promise<Department[]> {
  const data = await backendRequest<unknown>('/api/departments');
  if (!Array.isArray(data)) return [];
  return data.map((item) => normalizeDepartment(item as Record<string, unknown>));
}

export async function createDepartment(name: string): Promise<Department> {
  const data = await backendRequest<Record<string, unknown>>('/api/departments', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return normalizeDepartment(data);
}

// ─── Documents ───────────────────────────────────────────────────────────────

export async function getDocuments(filters?: { status?: string; department?: string }): Promise<Document[]> {
  const data = await backendRequest<unknown>(
    `/api/documents${buildQuery({ status: filters?.status, department: filters?.department })}`
  );
  return normalizeDocuments(data);
}

export async function createDocument(payload: {
  title: string;
  description: string;
  content: string;
  department: string;
  file_url?: string;
  recipient_ids?: string[];
}): Promise<Document> {
  const data = await backendRequest<Record<string, unknown>>('/api/documents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeDocument(data);
}

export async function getDepartmentEmployees(department: string): Promise<Profile[]> {
  return getUsers('employee', department);
}

export async function updateDocumentStatus(id: string, status: Document['status']): Promise<Document> {
  const data = await backendRequest<Record<string, unknown>>(`/api/documents/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return normalizeDocument(data);
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────

export async function analyzeDocument(
  documentId: string,
  _documentTitle: string,
  analysisType: DocumentAnalysis['analysis_type']
): Promise<DocumentAnalysis> {
  return backendRequest<DocumentAnalysis>(`/api/documents/${documentId}/analyses`, {
    method: 'POST',
    body: JSON.stringify({ analysis_type: analysisType }),
  });
}

export async function getDocumentAnalyses(documentId: string): Promise<DocumentAnalysis[]> {
  return backendRequest<DocumentAnalysis[]>(`/api/documents/${documentId}/analyses`);
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getStats(department?: string): Promise<DashboardStats> {
  return backendRequest<DashboardStats>(`/api/stats${buildQuery({ department })}`);
}

export async function getSystemLogs(): Promise<SystemLog[]> {
  return backendRequest<SystemLog[]>('/api/logs');
}

// ─── Chart Data ──────────────────────────────────────────────────────────────

export async function getMonthlyChartData(department?: string) {
  return backendRequest<
    { month: string; total: number; signed: number; pending: number; rejected: number }[]
  >(`/api/charts/monthly${buildQuery({ department })}`);
}
