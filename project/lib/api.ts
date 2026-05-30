import { Profile, Document, DocumentAnalysis, DocumentSigner, DashboardStats, SystemLog, Department } from './supabase';

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

function normalizeProfile(raw: Record<string, unknown>): Profile {
  return {
    id: String(raw.id ?? ''),
    full_name: String(raw.full_name ?? raw.fullName ?? ''),
    email: String(raw.email ?? ''),
    role: (String(raw.role ?? 'employee').toLowerCase() as Profile['role']),
    department: String(raw.department ?? ''),
    is_active: Boolean(raw.is_active ?? raw.isActive ?? true),
    created_by: (raw.created_by ?? raw.createdBy ?? null) as string | null,
    avatar_initials: String(raw.avatar_initials ?? raw.avatarInitials ?? ''),
    created_at: String(raw.created_at ?? raw.createdAt ?? ''),
    updated_at: String(raw.updated_at ?? raw.updatedAt ?? ''),
  };
}

function normalizeSignerStatus(status: unknown): DocumentSigner['status'] {
  const raw = String(status ?? 'pending').toLowerCase();
  if (raw === 'signed' || raw === 'rejected') return raw;
  return 'pending';
}

function normalizeDocumentSigner(raw: Record<string, unknown>): DocumentSigner {
  const user = raw.user as Record<string, unknown> | undefined;

  return {
    id: String(raw.id ?? ''),
    document_id: String(raw.document_id ?? raw.documentId ?? ''),
    user_id: String(raw.user_id ?? raw.userId ?? ''),
    status: normalizeSignerStatus(raw.status),
    signed_at: (raw.signed_at ?? raw.signedAt ?? null) as string | null,
    comment: (raw.comment ?? null) as string | null,
    created_at: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
    user: user ? normalizeProfile(user) : undefined,
  };
}

function normalizeDocumentSigners(data: unknown): DocumentSigner[] {
  if (!Array.isArray(data)) return [];
  return data.map((item) => normalizeDocumentSigner(item as Record<string, unknown>));
}

function normalizeDocument(raw: Record<string, unknown>): Document {
  const owner = raw.owner as Record<string, unknown> | undefined;
  const signers = raw.signers;

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
    owner: owner ? normalizeProfile(owner) : undefined,
    signers: signers ? normalizeDocumentSigners(signers) : undefined,
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

export async function getDocuments(filters?: {
  status?: string;
  department?: string;
  owner_id?: string;
  signer_id?: string;
}): Promise<Document[]> {
  const data = await backendRequest<unknown>(
    `/api/documents${buildQuery({
      status: filters?.status,
      department: filters?.department,
      owner_id: filters?.owner_id,
      signer_id: filters?.signer_id,
    })}`
  );
  const documents = normalizeDocuments(data);
  if (filters?.owner_id) {
    return documents.filter((doc) => doc.owner_id === filters.owner_id);
  }
  if (filters?.signer_id) {
    return documents.filter((doc) =>
      doc.signers?.some((signer) => signer.user_id === filters.signer_id)
    );
  }
  return documents;
}

export function mergeDocumentsById(...lists: Document[][]): Document[] {
  const map = new Map<string, Document>();
  for (const list of lists) {
    for (const doc of list) {
      map.set(doc.id, doc);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function parseRecipientNames(description: string): string[] {
  const match = description.match(/Recipients:\s*([^\n|]+)/i);
  if (!match) return [];
  return match[1].split(',').map((name) => name.trim()).filter(Boolean);
}

export async function enrichDocumentSigners(doc: Document, users?: Profile[]): Promise<Document> {
  if (doc.signers?.length) return doc;

  const names = parseRecipientNames(doc.description);
  if (!names.length) return doc;

  try {
    const allUsers = users ?? (await getUsers());
    const signers = names.flatMap((name, index) => {
      const user = allUsers.find((u) => u.full_name === name);
      if (!user) return [];
      return [{
        id: `fallback-${doc.id}-${index}`,
        document_id: doc.id,
        user_id: user.id,
        status: doc.status === 'signed' ? 'signed' as const : 'pending' as const,
        signed_at: doc.status === 'signed' ? doc.signed_at : null,
        comment: null,
        created_at: doc.created_at,
        user,
      }];
    });

    return signers.length ? { ...doc, signers } : doc;
  } catch {
    return doc;
  }
}

export function isUserAssignedSigner(
  doc: Document,
  profile: Pick<Profile, 'id' | 'full_name'>
): boolean {
  if (doc.signers?.some((signer) => signer.user_id === profile.id)) return true;
  return parseRecipientNames(doc.description).includes(profile.full_name);
}

export function isPendingSignerForUser(
  doc: Document,
  profile: Pick<Profile, 'id' | 'full_name'>
): boolean {
  if (doc.status !== 'pending') return false;
  const mySigner = doc.signers?.find((signer) => signer.user_id === profile.id);
  if (mySigner) return mySigner.status === 'pending';
  return parseRecipientNames(doc.description).includes(profile.full_name);
}

async function fetchDocumentsAssignedToSigner(profile: Profile): Promise<Document[]> {
  try {
    const assigned = await getDocuments({ signer_id: profile.id });
    if (assigned.length) return assigned;
  } catch {
    // backend may not support signer_id yet
  }

  try {
    const pending = await backendRequest<unknown>(
      `/api/documents/pending-signatures${buildQuery({ user_id: profile.id })}`
    );
    const documents = normalizeDocuments(pending);
    if (documents.length) return documents;
  } catch {
    // optional endpoint
  }

  const poolFilters =
    profile.role === 'director'
      ? { department: profile.department, status: 'pending' }
      : profile.role === 'employee'
        ? { department: profile.department, status: 'pending' }
        : { status: 'pending' };

  try {
    const pool = await getDocuments(poolFilters);
    const users = await getUsers().catch(() => [] as Profile[]);
    const enriched = await Promise.all(pool.map((doc) => enrichDocumentSigners(doc, users)));
    return enriched.filter(
      (doc) => isUserAssignedSigner(doc, profile) && doc.owner_id !== profile.id
    );
  } catch {
    return [];
  }
}

export async function getAccessibleDocuments(profile: Profile): Promise<Document[]> {
  const assignedPromise = fetchDocumentsAssignedToSigner(profile);

  let scoped: Document[];
  if (profile.role === 'employee') {
    scoped = await getDocuments({ owner_id: profile.id });
  } else if (profile.role === 'director') {
    scoped = await getDocuments({ department: profile.department });
  } else {
    scoped = await getDocuments();
  }

  const assigned = await assignedPromise;
  const merged = mergeDocumentsById(scoped, assigned);
  const users = await getUsers().catch(() => [] as Profile[]);

  return Promise.all(merged.map((doc) => enrichDocumentSigners(doc, users)));
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

export async function getDepartmentSigners(department: string): Promise<Profile[]> {
  const [employees, directors] = await Promise.all([
    getUsers('employee', department).catch(() => [] as Profile[]),
    getUsers('director', department).catch(() => [] as Profile[]),
  ]);

  const merged = [...directors, ...employees];
  const seen = new Set<string>();

  return merged.filter((user) => {
    if (!user.is_active || seen.has(user.id)) return false;
    seen.add(user.id);
    return true;
  });
}

function mergeProfilesById(users: Profile[]): Profile[] {
  const seen = new Set<string>();
  return users.filter((user) => {
    if (seen.has(user.id)) return false;
    seen.add(user.id);
    return true;
  });
}

export async function getSignersFromDepartments(departments: string[]): Promise<Profile[]> {
  if (!departments.length) return [];

  const lists = await Promise.all(departments.map((department) => getDepartmentSigners(department)));
  return mergeProfilesById(lists.flat());
}

export async function updateDocumentStatus(id: string, status: Document['status']): Promise<Document> {
  const data = await backendRequest<Record<string, unknown>>(`/api/documents/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return normalizeDocument(data);
}

export async function getDocumentSigners(documentId: string): Promise<DocumentSigner[]> {
  const data = await backendRequest<unknown>(`/api/documents/${documentId}/signers`);
  return normalizeDocumentSigners(data);
}

export async function signDocument(
  documentId: string,
  payload?: { signature_data?: string; comment?: string }
): Promise<{ signer: DocumentSigner; document: Document }> {
  const data = await backendRequest<Record<string, unknown>>(`/api/documents/${documentId}/sign`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });

  const signerRaw = (data.signer ?? data) as Record<string, unknown>;
  const documentRaw = data.document as Record<string, unknown> | undefined;

  return {
    signer: normalizeDocumentSigner(signerRaw),
    document: documentRaw ? normalizeDocument(documentRaw) : normalizeDocument({ id: documentId, status: 'pending' }),
  };
}

export async function rejectDocument(
  documentId: string,
  reason?: string
): Promise<{ signer: DocumentSigner; document: Document }> {
  const data = await backendRequest<Record<string, unknown>>(`/api/documents/${documentId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? '' }),
  });

  const signerRaw = (data.signer ?? data) as Record<string, unknown>;
  const documentRaw = data.document as Record<string, unknown> | undefined;

  return {
    signer: normalizeDocumentSigner(signerRaw),
    document: documentRaw ? normalizeDocument(documentRaw) : normalizeDocument({ id: documentId, status: 'rejected' }),
  };
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

export function computeStatsFromDocuments(docs: Document[], signedByMe = 0): DashboardStats {
  return {
    total_documents: docs.length,
    pending_signatures: docs.filter((d) => d.status === 'pending').length,
    signed: docs.filter((d) => d.status === 'signed').length,
    rejected: docs.filter((d) => d.status === 'rejected').length,
    draft: docs.filter((d) => d.status === 'draft').length,
    ai_analyzed: docs.filter((d) => d.ai_analyzed).length,
    signed_by_me: signedByMe,
  };
}

export function countDocumentsSignedByUser(
  docs: Document[],
  profile: Pick<Profile, 'id'>
): number {
  return docs.filter((doc) =>
    doc.signers?.some((signer) => signer.user_id === profile.id && signer.status === 'signed')
  ).length;
}

export async function getDocumentsSignedByUser(profile: Profile): Promise<Document[]> {
  try {
    const data = await backendRequest<unknown>(
      `/api/documents/signed-by-me${buildQuery({ user_id: profile.id })}`
    );
    const documents = normalizeDocuments(data);
    if (documents.length) return documents;
  } catch {
    // optional backend endpoint
  }

  const pools: Document[][] = [];

  try {
    pools.push(await getDocuments({ signer_id: profile.id }));
  } catch {
    // signer_id filter may be unsupported
  }

  try {
    if (profile.role === 'director') {
      pools.push(await getDocuments({ department: profile.department, status: 'signed' }));
    } else if (profile.role === 'admin') {
      pools.push(await getDocuments({ status: 'signed' }));
    } else {
      pools.push(await getDocuments({ department: profile.department, status: 'signed' }));
    }
  } catch {
    // ignore pool fetch errors
  }

  const users = await getUsers().catch(() => [] as Profile[]);
  const merged = mergeDocumentsById(...pools);
  const enriched = await Promise.all(merged.map((doc) => enrichDocumentSigners(doc, users)));

  return enriched.filter((doc) =>
    doc.signers?.some((signer) => signer.user_id === profile.id && signer.status === 'signed')
  );
}

export function computeMonthlyChartFromDocuments(docs: Document[]) {
  const months: { month: string; total: number; signed: number; pending: number; rejected: number }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
    const monthDocs = docs.filter((d) => {
      const created = new Date(d.created_at);
      return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth();
    });

    months.push({
      month: monthLabel,
      total: monthDocs.length,
      signed: monthDocs.filter((d) => d.status === 'signed').length,
      pending: monthDocs.filter((d) => d.status === 'pending').length,
      rejected: monthDocs.filter((d) => d.status === 'rejected').length,
    });
  }

  return months;
}

export async function getStats(filters?: { department?: string; owner_id?: string }): Promise<DashboardStats> {
  return backendRequest<DashboardStats>(
    `/api/stats${buildQuery({ department: filters?.department, owner_id: filters?.owner_id })}`
  );
}

export async function getSystemLogs(): Promise<SystemLog[]> {
  return backendRequest<SystemLog[]>('/api/logs');
}

// ─── Chart Data ──────────────────────────────────────────────────────────────

export async function getMonthlyChartData(filters?: { department?: string; owner_id?: string }) {
  return backendRequest<
    { month: string; total: number; signed: number; pending: number; rejected: number }[]
  >(`/api/charts/monthly${buildQuery({ department: filters?.department, owner_id: filters?.owner_id })}`);
}
