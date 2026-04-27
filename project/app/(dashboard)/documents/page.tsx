'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLang } from '@/contexts/language-context';
import { getDocuments, createDocument, updateDocumentStatus, analyzeDocument, getDocumentAnalyses } from '@/lib/api';
import { Document, DocumentAnalysis } from '@/lib/supabase';
import { FileText, Plus, Search, X, Zap, PenLine, ChevronDown, ChevronRight, Sparkles, Scale, Calendar, CircleCheck as CheckCircle, Clock, CircleAlert as AlertCircle, FolderOpen, ArrowLeft, RefreshCw } from 'lucide-react';

const STATUS_CONFIG = {
  draft: { label: 'Draft', icon: FolderOpen, bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  pending: { label: 'Pending', icon: Clock, bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  signed: { label: 'Signed', icon: CheckCircle, bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', icon: AlertCircle, bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

const AI_TOOLS = [
  { type: 'summary' as const, icon: Sparkles, label: 'Summarize', color: 'bg-blue-600 hover:bg-blue-500 text-white' },
  { type: 'legal_risk' as const, icon: Scale, label: 'Legal Risk', color: 'bg-amber-500 hover:bg-amber-400 text-white' },
  { type: 'key_dates' as const, icon: Calendar, label: 'Key Dates', color: 'bg-teal-600 hover:bg-teal-500 text-white' },
];

const ANALYSIS_LABELS = {
  summary: { label: 'Summary', icon: Sparkles, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  legal_risk: { label: 'Legal Risk', icon: Scale, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  key_dates: { label: 'Key Dates', icon: Calendar, color: 'text-teal-600 bg-teal-50 border-teal-200' },
};

function CreateDocModal({
  open, onClose, onSubmit, loading, error, department,
}: {
  open: boolean; onClose: () => void; onSubmit: (d: { title: string; description: string; content: string; department: string }) => void;
  loading: boolean; error: string; department: string;
}) {
  const { t } = useLang();
  const DEPTS = ['Legal', 'Finance', 'HR', 'Operations', 'IT', 'Procurement', 'Executive', 'Compliance'];
  const [form, setForm] = useState({ title: '', description: '', content: '', department: department || '' });

  useEffect(() => {
    if (open) setForm({ title: '', description: '', content: '', department: department || '' });
  }, [open, department]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-slate-900 font-semibold text-lg">{t('newDocument')}</h2>
            <p className="text-slate-400 text-sm mt-0.5">Create a new document</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('documentTitle')}</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Service Agreement Q1 2025" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('description')}</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Short description" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('department')}</label>
            {department ? (
              <input value={department} disabled className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-500 bg-slate-50" />
            ) : (
              <div className="relative">
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white">
                  <option value="">Select department</option>
                  {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
            <textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Paste or type document content for AI analysis..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">{t('cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</> : t('createDocument')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AISidePanel({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const { t } = useLang();
  const { profile } = useAuth();
  const [analyses, setAnalyses] = useState<DocumentAnalysis[]>([]);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(doc.status === 'signed');
  const [activeTab, setActiveTab] = useState<'ai' | 'sign'>('ai');

  const loadAnalyses = useCallback(async () => {
    const data = await getDocumentAnalyses(doc.id);
    setAnalyses(data);
  }, [doc.id]);

  useEffect(() => { loadAnalyses(); }, [loadAnalyses]);

  const handleAnalyze = async (type: DocumentAnalysis['analysis_type']) => {
    setAnalyzing(type);
    try {
      await analyzeDocument(doc.id, doc.title, type);
      await loadAnalyses();
    } catch {
      // silently fail
    } finally {
      setAnalyzing(null);
    }
  };

  const handleSign = async () => {
    setSigning(true);
    try {
      await updateDocumentStatus(doc.id, 'signed');
      setSigned(true);
    } finally {
      setSigning(false);
    }
  };

  const canSign = profile?.id === doc.owner_id && !signed;

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-100 w-full lg:w-96 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="text-slate-900 font-semibold text-sm truncate">{doc.title}</h3>
          <p className="text-slate-400 text-xs mt-0.5">{doc.department}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {([['ai', 'AI Analysis', Zap], ['sign', 'E-Signature', PenLine]] as const).map(([tab, label, Icon]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'ai' && (
          <div className="p-4 space-y-4">
            {/* AI Tools */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('aiAnalysis')}</p>
              <div className="space-y-2">
                {AI_TOOLS.map(({ type, icon: Icon, label, color }) => (
                  <button key={type} onClick={() => handleAnalyze(type)} disabled={!!analyzing}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${color} disabled:opacity-50`}>
                    {analyzing === type ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : <Icon size={16} />}
                    {analyzing === type ? t('analyzing') : label}
                    {analyzing !== type && <ChevronRight size={14} className="ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            {analyses.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('analysisResult')}</p>
                <div className="space-y-3">
                  {analyses.map((a) => {
                    const cfg = ANALYSIS_LABELS[a.analysis_type];
                    const Icon = cfg.icon;
                    return (
                      <div key={a.id} className={`rounded-xl border p-4 ${cfg.color}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Icon size={14} />
                          <span className="text-xs font-semibold uppercase tracking-wider">{cfg.label}</span>
                          <span className="text-xs opacity-60 ml-auto">{new Date(a.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-xs leading-relaxed whitespace-pre-wrap text-slate-700">{a.result}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {analyses.length === 0 && !analyzing && (
              <div className="text-center py-8 text-slate-400 text-sm">{t('noAnalysis')}</div>
            )}
          </div>
        )}

        {activeTab === 'sign' && (
          <div className="p-4 space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <PenLine size={16} className="text-slate-600" />
                <span className="text-sm font-semibold text-slate-700">{t('eSignature')}</span>
              </div>
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex justify-between"><span>Document:</span><span className="font-medium text-slate-700 truncate max-w-40">{doc.title}</span></div>
                <div className="flex justify-between"><span>Owner:</span><span className="font-medium text-slate-700">{doc.owner?.full_name}</span></div>
                <div className="flex justify-between"><span>Status:</span>
                  <span className={`font-medium capitalize ${signed ? 'text-emerald-600' : 'text-amber-600'}`}>{signed ? 'Signed' : doc.status}</span>
                </div>
                {doc.signed_at && (
                  <div className="flex justify-between"><span>{t('signedOn')}:</span><span className="font-medium text-slate-700">{new Date(doc.signed_at).toLocaleDateString()}</span></div>
                )}
              </div>
            </div>

            {signed ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-emerald-700 text-sm font-semibold">Document Signed</p>
                <p className="text-emerald-500 text-xs mt-1">Verified via E-Imzo</p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <PenLine size={20} className="text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">E-Imzo Signature Area</p>
                  <p className="text-slate-400 text-xs mt-1">Click below to apply your digital signature</p>
                </div>
                <button onClick={handleSign} disabled={!canSign || signing}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
                  {signing ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Signing...</> : <><PenLine size={16} />{t('signDocument')}</>}
                </button>
                {!canSign && !signed && <p className="text-center text-xs text-slate-400">Only the document owner can sign</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { profile } = useAuth();
  const { t } = useLang();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const dept = profile.role === 'director' ? profile.department : undefined;
      const data = await getDocuments(dept ? { department: dept } : undefined);
      setDocs(data);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: { title: string; description: string; content: string; department: string }) => {
    setCreateLoading(true);
    setCreateError('');
    try {
      await createDocument(data);
      setCreateOpen(false);
      await load();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t('error'));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusChange = async (docId: string, status: Document['status']) => {
    await updateDocumentStatus(docId, status);
    await load();
    if (selectedDoc?.id === docId) {
      setSelectedDoc(prev => prev ? { ...prev, status } : prev);
    }
  };

  const filtered = docs.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.department.toLowerCase().includes(search.toLowerCase()) ||
      (d.owner?.full_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const dept = profile?.role === 'director' ? profile.department :
               profile?.role === 'employee' ? profile.department : '';

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen overflow-hidden">
      {/* Main List */}
      <div className={`flex flex-col flex-1 min-w-0 ${selectedDoc ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-6 lg:p-8 space-y-5 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('documents')}</h1>
              <p className="text-slate-400 text-sm mt-1">{filtered.length} documents</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
              {profile?.role === 'employee' && (
                <button onClick={() => { setCreateError(''); setCreateOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/25">
                  <Plus size={16} />{t('newDocument')}
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[['', 'All'], ['draft', 'Draft'], ['pending', 'Pending'], ['signed', 'Signed'], ['rejected', 'Rejected']].map(([val, label]) => (
                <button key={val} onClick={() => setStatusFilter(val)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${statusFilter === val ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Document List */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">{t('noData')}</p>
              {profile?.role === 'employee' && (
                <button onClick={() => setCreateOpen(true)} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-500 transition-colors">
                  {t('newDocument')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((doc) => {
                const sc = STATUS_CONFIG[doc.status];
                const SIcon = sc.icon;
                const isSelected = selectedDoc?.id === doc.id;

                return (
                  <div key={doc.id}
                    onClick={() => setSelectedDoc(isSelected ? null : doc)}
                    className={`bg-white rounded-2xl border shadow-sm cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-blue-500 shadow-blue-500/10' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-4 p-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${sc.bg}`}>
                        <SIcon size={18} className={sc.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-slate-900 text-sm font-semibold truncate">{doc.title}</p>
                          <span className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                          <span>{doc.owner?.full_name}</span>
                          <span>&bull;</span>
                          <span>{doc.department}</span>
                          {doc.ai_analyzed && (
                            <><span>&bull;</span><span className="flex items-center gap-1 text-teal-600"><Zap size={10} />AI</span></>
                          )}
                          <span className="ml-auto">{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Inline actions for non-employee or owner */}
                    {(profile?.role !== 'employee' || profile?.id === doc.owner_id) && !isSelected && (
                      <div className="flex items-center gap-2 px-4 pb-3" onClick={(e) => e.stopPropagation()}>
                        {doc.status === 'draft' && profile?.id === doc.owner_id && (
                          <button onClick={() => handleStatusChange(doc.id, 'pending')}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                            Submit for Signature
                          </button>
                        )}
                        {doc.status === 'pending' && profile?.role === 'director' && (
                          <>
                            <button onClick={() => handleStatusChange(doc.id, 'signed')}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                              Approve
                            </button>
                            <button onClick={() => handleStatusChange(doc.id, 'rejected')}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI Side Panel */}
      {selectedDoc && (
        <div className="flex flex-col w-full lg:w-96 flex-shrink-0 lg:border-l lg:border-slate-100">
          {/* Mobile back button */}
          <div className="lg:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-100">
            <button onClick={() => setSelectedDoc(null)} className="flex items-center gap-1.5 text-blue-600 text-sm font-medium">
              <ArrowLeft size={16} />Back to list
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <AISidePanel doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
          </div>
        </div>
      )}

      <CreateDocModal
        open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate}
        loading={createLoading} error={createError} department={dept}
      />
    </div>
  );
}
