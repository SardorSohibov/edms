'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLang } from '@/contexts/language-context';
import { createDepartment } from '@/lib/api';
import { useDepartments } from '@/hooks/use-departments';
import { Building2, Plus, RefreshCw } from 'lucide-react';

export default function DepartmentsPage() {
  const { profile } = useAuth();
  const { t } = useLang();
  const { departments, loading, error, reload } = useDepartments(!!profile);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setCreateError('');
    try {
      await createDepartment(trimmed);
      setName('');
      await reload();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t('error'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('manageDepartments')}</h1>
          <p className="text-slate-400 text-sm mt-1">{departments.length} {t('departments').toLowerCase()}</p>
        </div>
        <button
          onClick={reload}
          className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-3">{t('createDepartment')}</h2>
        {createError && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{createError}</div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('departmentName')}
            className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-60 transition-colors"
          >
            <Plus size={16} />
            {creating ? t('creatingDepartment') : t('createDepartment')}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Building2 size={20} className="text-slate-400" />
            </div>
            <p className="text-slate-400 text-sm">{t('noData')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t('department')}
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t('documentCount')}
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t('created')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {departments.map((dept) => (
                  <tr key={dept.id || dept.name} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Building2 size={16} className="text-blue-600" />
                        </div>
                        <span className="text-slate-900 text-sm font-medium">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                        {dept.document_count}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {dept.created_at ? new Date(dept.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
