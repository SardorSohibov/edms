'use client';

import { FileText, Clock, Zap, Circle as XCircle, CircleCheck as CheckCircle, FolderOpen, PenLine } from 'lucide-react';
import { DashboardStats } from '@/lib/supabase';
import { useLang } from '@/contexts/language-context';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'amber' | 'emerald' | 'red' | 'slate' | 'teal' | 'violet';
  trend?: number;
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    value: 'text-blue-700',
    badge: 'bg-blue-600',
    border: 'border-blue-100',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-100 text-amber-600',
    value: 'text-amber-700',
    badge: 'bg-amber-500',
    border: 'border-amber-100',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-600',
    value: 'text-emerald-700',
    badge: 'bg-emerald-500',
    border: 'border-emerald-100',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-100 text-red-600',
    value: 'text-red-700',
    badge: 'bg-red-500',
    border: 'border-red-100',
  },
  slate: {
    bg: 'bg-slate-50',
    icon: 'bg-slate-100 text-slate-600',
    value: 'text-slate-700',
    badge: 'bg-slate-500',
    border: 'border-slate-200',
  },
  teal: {
    bg: 'bg-teal-50',
    icon: 'bg-teal-100 text-teal-600',
    value: 'text-teal-700',
    badge: 'bg-teal-500',
    border: 'border-teal-100',
  },
  violet: {
    bg: 'bg-violet-50',
    icon: 'bg-violet-100 text-violet-600',
    value: 'text-violet-700',
    badge: 'bg-violet-500',
    border: 'border-violet-100',
  },
};

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={`bg-white rounded-2xl p-5 border ${c.border} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.icon}`}>
          <Icon size={20} />
        </div>
        <div className={`w-2 h-2 rounded-full ${c.badge} mt-1`} />
      </div>
      <div className={`text-3xl font-bold ${c.value} mb-1`}>{value.toLocaleString()}</div>
      <div className="text-slate-500 text-sm font-medium">{label}</div>
    </div>
  );
}

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useLang();

  const cards: StatCardProps[] = [
    { label: t('totalDocuments'), value: stats.total_documents, icon: FileText, color: 'blue' },
    { label: t('pendingSignatures'), value: stats.pending_signatures, icon: Clock, color: 'amber' },
    { label: t('aiAnalyzed'), value: stats.ai_analyzed, icon: Zap, color: 'teal' },
    { label: t('rejected'), value: stats.rejected, icon: XCircle, color: 'red' },
    { label: t('signed'), value: stats.signed, icon: CheckCircle, color: 'emerald' },
    { label: t('signedByMe'), value: stats.signed_by_me, icon: PenLine, color: 'violet' },
    { label: t('draft'), value: stats.draft, icon: FolderOpen, color: 'slate' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
