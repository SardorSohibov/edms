'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLang } from '@/contexts/language-context';
import { getStats, getMonthlyChartData, getDocuments, computeStatsFromDocuments, computeMonthlyChartFromDocuments } from '@/lib/api';
import { DashboardStats, Document } from '@/lib/supabase';
import { StatsCards } from '@/components/stats-cards';
import { DocumentFlowChart, StatusPieChart } from '@/components/document-chart';
import { FileText, ArrowRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'goodMorning';
  if (h < 17) return 'goodAfternoon';
  return 'goodEvening';
}

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-700',
  signed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const { t } = useLang();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<unknown[]>([]);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        if (profile.role === 'employee') {
          const mine = await getDocuments({ owner_id: profile.id });
          setStats(computeStatsFromDocuments(mine));
          setChartData(computeMonthlyChartFromDocuments(mine));
          setRecentDocs(mine.slice(0, 5));
          return;
        }

        const filters =
          profile.role === 'director' ? { department: profile.department } : undefined;

        const [s, c, docs] = await Promise.all([
          getStats(filters),
          getMonthlyChartData(filters),
          getDocuments(filters),
        ]);

        setStats(s);
        setChartData(c);
        setRecentDocs(docs.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [profile]);

  if (loading || !profile) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded-xl w-64" />
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-72 bg-slate-200 rounded-2xl" />
            <div className="h-72 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const greetingKey = getGreeting();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium">{t(greetingKey as Parameters<typeof t>[0])},</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{profile.full_name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
              {t(profile.role as Parameters<typeof t>[0])}
            </span>
            {profile.department && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {profile.department}
              </span>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-slate-400 text-xs">
          <TrendingUp size={14} />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats */}
      {stats && <StatsCards stats={stats} />}

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DocumentFlowChart data={chartData as Parameters<typeof DocumentFlowChart>[0]['data']} />
        </div>
        {stats && (
          <StatusPieChart
            signed={stats.signed}
            pending={stats.pending_signatures}
            rejected={stats.rejected}
            draft={stats.draft}
          />
        )}
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-slate-900 font-semibold text-base">{t('recentActivity')}</h3>
            <p className="text-slate-400 text-sm">Latest document updates</p>
          </div>
          <Link
            href="/documents"
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {recentDocs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <FileText size={20} className="text-slate-400" />
            </div>
            <p className="text-slate-400 text-sm">{t('noData')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {doc.owner?.full_name} &bull; {doc.department}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[doc.status]}`}>
                    {t(doc.status as Parameters<typeof t>[0])}
                  </span>
                  <span className="text-slate-400 text-xs hidden sm:block">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
