'use client';

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useLang } from '@/contexts/language-context';

interface MonthlyData {
  month: string;
  total: number;
  signed: number;
  pending: number;
  rejected: number;
}

const STATUS_COLORS = {
  signed: '#10b981',
  pending: '#f59e0b',
  rejected: '#ef4444',
  total: '#3b82f6',
};

interface DocumentFlowChartProps {
  data: MonthlyData[];
}

export function DocumentFlowChart({ data }: DocumentFlowChartProps) {
  const { t } = useLang();

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-slate-900 font-semibold text-base">{t('documentFlow')}</h3>
          <p className="text-slate-400 text-sm mt-0.5">{t('thisMonth')}</p>
        </div>
        <div className="flex items-center gap-4">
          {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'total').map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-slate-500 capitalize">{t(key as Parameters<typeof t>[0])}</span>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="signedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', padding: '8px 12px' }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            itemStyle={{ fontSize: 12 }}
          />
          <Area type="monotone" dataKey="signed" stroke="#10b981" strokeWidth={2} fill="url(#signedGrad)" dot={false} />
          <Area type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} fill="url(#pendingGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface StatusPieChartProps {
  signed: number;
  pending: number;
  rejected: number;
  draft: number;
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

export function StatusPieChart({ signed, pending, rejected, draft }: StatusPieChartProps) {
  const { t } = useLang();
  const data = [
    { name: t('signed'), value: signed },
    { name: t('pending'), value: pending },
    { name: t('rejected'), value: rejected },
    { name: t('draft'), value: draft },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">{t('noData')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="mb-4">
        <h3 className="text-slate-900 font-semibold text-base">{t('overview')}</h3>
        <p className="text-slate-400 text-sm mt-0.5">Status breakdown</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
            {data.map((_, index) => (
              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', padding: '8px 12px' }}
            itemStyle={{ fontSize: 12 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', color: '#64748b' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DeptBarChartProps {
  data: { department: string; count: number }[];
}

export function DeptBarChart({ data }: DeptBarChartProps) {
  const { t } = useLang();

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="mb-6">
        <h3 className="text-slate-900 font-semibold text-base">Documents by Department</h3>
        <p className="text-slate-400 text-sm mt-0.5">All departments</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', padding: '8px 12px' }}
            itemStyle={{ fontSize: 12 }}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
