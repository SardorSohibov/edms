'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLang } from '@/contexts/language-context';
import { getUsers, createUser, updateUser } from '@/lib/api';
import { Profile } from '@/lib/supabase';
import {
  Users, Plus, Search, Pencil, UserCheck, UserX,
  X, Shield, Briefcase, User, ChevronDown,
} from 'lucide-react';

const DEPARTMENTS = ['Legal', 'Finance', 'HR', 'Operations', 'IT', 'Procurement', 'Executive', 'Compliance'];

const roleStyles = {
  admin: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Shield },
  director: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Briefcase },
  employee: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: User },
};

interface UserFormData {
  full_name: string;
  email: string;
  password: string;
  role: string;
  department: string;
}

interface EditFormData {
  full_name: string;
  department: string;
  is_active: boolean;
}

function UserModal({
  open, onClose, onSubmit, callerRole, callerDept, loading, error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
  callerRole: string;
  callerDept: string;
  loading: boolean;
  error: string;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<UserFormData>({
    full_name: '', email: '', password: '', role: callerRole === 'admin' ? 'director' : 'employee', department: callerDept,
  });

  useEffect(() => {
    if (open) setForm({ full_name: '', email: '', password: '', role: callerRole === 'admin' ? 'director' : 'employee', department: callerDept });
  }, [open, callerRole, callerDept]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-slate-900 font-semibold text-lg">{t('createUser')}</h2>
            <p className="text-slate-400 text-sm mt-0.5">Fill in the details below</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('fullName')}</label>
            <input
              required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('email')}</label>
            <input
              required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="user@organization.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('initialPassword')}</label>
            <input
              required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Min. 8 characters"
              minLength={8}
            />
          </div>

          {callerRole === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('role')}</label>
              <div className="relative">
                <select
                  value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="director">{t('director')}</option>
                  <option value="employee">{t('employee')}</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('department')}</label>
            {callerRole === 'director' ? (
              <input
                value={callerDept} disabled
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-500 bg-slate-50"
              />
            ) : (
              <div className="relative">
                <select
                  value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
              {t('cancel')}
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('creating')}</>
              ) : t('createUser')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({
  user, open, onClose, onSubmit, loading, error,
}: {
  user: Profile | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EditFormData) => void;
  loading: boolean;
  error: string;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<EditFormData>({ full_name: '', department: '', is_active: true });

  useEffect(() => {
    if (user) setForm({ full_name: user.full_name, department: user.department, is_active: user.is_active });
  }, [user]);

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-slate-900 font-semibold text-lg">{t('editUser')}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('fullName')}</label>
            <input
              required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('department')}</label>
            <div className="relative">
              <select
                value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="">No department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`w-10 h-6 rounded-full transition-all flex items-center ${form.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-1 ${form.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm text-slate-700 font-medium">{form.is_active ? t('active') : t('inactive')}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
              {t('cancel')}
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('saving')}</>
              ) : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { profile } = useAuth();
  const { t } = useLang();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const targetRole = profile?.role === 'admin' ? 'director' : 'employee';
  const targetDept = profile?.role === 'director' ? profile.department : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers(targetRole, targetDept);
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, [targetRole, targetDept]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: UserFormData) => {
    setFormLoading(true);
    setFormError('');
    try {
      await createUser(data);
      setCreateOpen(false);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : t('error'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (data: EditFormData) => {
    if (!editUser) return;
    setFormLoading(true);
    setFormError('');
    try {
      await updateUser(editUser.id, data);
      setEditUser(null);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : t('error'));
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase())
  );

  const title = profile?.role === 'admin' ? t('manageDirectors') : t('manageEmployees');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {filtered.length} {t('users').toLowerCase()} total
          </p>
        </div>
        <button
          onClick={() => { setFormError(''); setCreateOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/25"
        >
          <Plus size={16} />
          {t('createUser')}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search')}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Users size={20} className="text-slate-400" />
            </div>
            <p className="text-slate-400 text-sm">{t('noData')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {[t('fullName'), t('email'), t('department'), t('role'), t('status'), t('created'), t('actions')].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((u) => {
                  const rs = roleStyles[u.role as keyof typeof roleStyles] || roleStyles.employee;
                  const RIcon = rs.icon;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {u.avatar_initials || u.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-slate-900 text-sm font-medium">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-sm">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-slate-600 text-sm">{u.department || '—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${rs.bg} ${rs.text}`}>
                          <RIcon size={11} />
                          {t(u.role as Parameters<typeof t>[0])}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {u.is_active ? t('active') : t('inactive')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setFormError(''); setEditUser(u); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            title={t('editUser')}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => updateUser(u.id, { is_active: !u.is_active }).then(load)}
                            className={`p-1.5 rounded-lg transition-all ${u.is_active ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            title={u.is_active ? t('deactivate') : t('activate')}
                          >
                            {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserModal
        open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        callerRole={profile?.role || 'admin'} callerDept={profile?.department || ''}
        loading={formLoading} error={formError}
      />
      <EditModal
        user={editUser} open={!!editUser} onClose={() => setEditUser(null)} onSubmit={handleEdit}
        loading={formLoading} error={formError}
      />
    </div>
  );
}
