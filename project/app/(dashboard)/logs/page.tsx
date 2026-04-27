'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useLang } from '@/contexts/language-context';
import { getSystemLogs } from '@/lib/api';
import { SystemLog } from '@/lib/supabase';
import { ScrollText, Search, Shield, UserPlus, FilePen, RefreshCw } from 'lucide-react';

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  CREATE_USER: { label: 'User Created', icon: UserPlus, color: 'text-emerald-600 bg-emerald-100' },
  UPDATE_USER: { label: 'User Updated', icon: FilePen, color: 'text-blue-600 bg-blue-100' },
  DEFAULT: { label: 'System Action', icon: Shield, color: 'text-slate-500 bg-slate-100' },
};

export default function LogsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLang();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [profile, router]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getSystemLogs();
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') load();
  }, [profile]);

  const filtered = logs.filter((l) =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.user as { full_name?: string } | null)?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('systemLogs')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('systemActivity')} &bull; {filtered.length} entries</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search')}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <ScrollText size={20} className="text-slate-400" />
            </div>
            <p className="text-slate-400 text-sm">{t('noData')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((log) => {
              const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.DEFAULT;
              const Icon = config.icon;
              const user = log.user as { full_name?: string; avatar_initials?: string } | null;

              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${config.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-900 text-sm font-semibold">{config.label}</span>
                      {log.entity_type && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">{log.entity_type}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      {user?.full_name && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
                            {user.avatar_initials || user.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{user.full_name}</span>
                        </div>
                      )}
                      <span>&bull;</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <pre className="text-xs text-slate-500 font-mono overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
