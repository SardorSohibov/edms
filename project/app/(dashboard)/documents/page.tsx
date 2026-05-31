'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLang } from '@/contexts/language-context';
import { getAccessibleDocuments, createDocument, updateDocumentStatus, analyzeDocument, getDocumentAnalyses, getSignersFromDepartments, getDocumentSigners, signDocument, rejectDocument, enrichDocumentSigners, isPendingSignerForUser, parseRecipientNames } from '@/lib/api';
import { Document, DocumentAnalysis, DocumentSigner, Profile } from '@/lib/supabase';
import { useDepartments } from '@/hooks/use-departments';
import { FileText, Plus, Search, X, Zap, PenLine, ChevronRight, Sparkles, Scale, Calendar, CircleCheck as CheckCircle, Clock, CircleAlert as AlertCircle, FolderOpen, ArrowLeft, RefreshCw, Upload, Send, Download, Eye } from 'lucide-react';

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

type CreateDocPayload = {
  title: string;
  description: string;
  content: string;
  department: string;
  recipientIds: string[];
  recipientNames: string[];
  fileName: string;
  fileDataUrl: string;
  submitForSignature: boolean;
};

function CreateDocModal({
  open, onClose, onSubmit, loading, error,
  callerRole, profileId, ownerDepartment, departments, departmentsLoading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (d: CreateDocPayload) => void;
  loading: boolean;
  error: string;
  callerRole: string;
  profileId: string;
  ownerDepartment: string;
  departments: string[];
  departmentsLoading: boolean;
}) {
  const { t } = useLang();
  const usesDepartmentSigners = callerRole === 'employee' || callerRole === 'director';

  const [form, setForm] = useState({
    title: '',
    description: '',
    content: '',
    recipientIds: [] as string[],
  });
  const [fileName, setFileName] = useState('');
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [localError, setLocalError] = useState('');
  const [selectedSignerDepartments, setSelectedSignerDepartments] = useState<string[]>([]);
  const [departmentSigners, setDepartmentSigners] = useState<Profile[]>([]);
  const [signersLoading, setSignersLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        title: '',
        description: '',
        content: '',
        recipientIds: [],
      });
      setFileName('');
      setFileDataUrl('');
      setLocalError('');
      setSelectedSignerDepartments([]);
      setDepartmentSigners([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !usesDepartmentSigners || selectedSignerDepartments.length === 0) {
      setDepartmentSigners([]);
      return;
    }

    let cancelled = false;
    setSignersLoading(true);
    getSignersFromDepartments(selectedSignerDepartments)
      .then((users) => {
        if (!cancelled) {
          const filtered = users.filter((u) => u.id !== profileId);
          setDepartmentSigners(filtered);
          setForm((prev) => ({
            ...prev,
            recipientIds: prev.recipientIds.filter((id) => filtered.some((u) => u.id === id)),
          }));
        }
      })
      .catch(() => {
        if (!cancelled) setDepartmentSigners([]);
      })
      .finally(() => {
        if (!cancelled) setSignersLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, usesDepartmentSigners, selectedSignerDepartments, profileId]);

  const toggleSignerDepartment = (department: string) => {
    setSelectedSignerDepartments((prev) =>
      prev.includes(department) ? prev.filter((d) => d !== department) : [...prev, department]
    );
    setLocalError('');
  };

  if (!open) return null;

  const validate = (submitForSignature: boolean) => {
    if (!form.title.trim()) return t('documentTitle');
    if (usesDepartmentSigners && !fileDataUrl) return t('fileRequired');
    if (usesDepartmentSigners && !ownerDepartment) return t('selectDepartmentFirst');
    if (submitForSignature && form.recipientIds.length === 0) return t('selectApprovers');
    if (submitForSignature && selectedSignerDepartments.length === 0) return t('selectSignerDepartmentsFirst');
    return '';
  };

  const submitForm = (submitForSignature: boolean) => {
    const validationError = validate(submitForSignature);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError('');
    const selectedRecipients = departmentSigners.filter((r) => form.recipientIds.includes(r.id));
    onSubmit({
      title: form.title,
      description: form.description,
      content: form.content,
      department: ownerDepartment,
      recipientIds: form.recipientIds,
      recipientNames: selectedRecipients.map((r) => r.full_name),
      fileName,
      fileDataUrl,
      submitForSignature,
    });
  };

  const signersByDepartment = selectedSignerDepartments.map((department) => ({
    department,
    users: departmentSigners.filter((user) => user.department === department),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100">
          <div>
            <h2 className="text-slate-900 font-semibold text-lg">{t('newDocument')}</h2>
            <p className="text-slate-400 text-sm mt-0.5">Create a new document</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="p-4 sm:p-6 space-y-4 overflow-y-auto"
        >
          {(error || localError) && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{localError || error}</div>
          )}
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
          {usesDepartmentSigners && ownerDepartment && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              <span className="text-slate-500">{t('documentDepartment')}:</span>
              <span className="font-medium text-slate-800">{ownerDepartment}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
            <textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Paste or type document content for AI analysis..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('attachFile')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <label className={`flex items-center gap-2 w-full px-3.5 py-2.5 border border-dashed rounded-xl text-sm hover:bg-slate-50 cursor-pointer transition-colors ${
              !fileDataUrl ? 'border-amber-300 bg-amber-50/50 text-amber-800' : 'border-slate-300 text-slate-600'
            }`}>
              <Upload size={15} />
              <span className="truncate">{fileName || 'Choose a file (PDF, DOCX, TXT)'}</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                required
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setFileName(file.name);
                  setLocalError('');
                  const reader = new FileReader();
                  reader.onload = () => setFileDataUrl(typeof reader.result === 'string' ? reader.result : '');
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('signerDepartments')}</label>
            <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl max-h-32 overflow-y-auto">
              {departmentsLoading ? (
                <p className="text-xs text-slate-400">{t('loading')}</p>
              ) : departments.length === 0 ? (
                <p className="text-xs text-slate-400">{t('noData')}</p>
              ) : departments.map((department) => {
                const checked = selectedSignerDepartments.includes(department);
                return (
                  <label
                    key={department}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${
                      checked
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleSignerDepartment(department)}
                    />
                    {department}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('departmentSigners')}</label>
            {selectedSignerDepartments.length === 0 ? (
              <p className="text-xs text-slate-400 px-3 py-2 border border-slate-200 rounded-xl">{t('selectSignerDepartmentsFirst')}</p>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-2">
                {signersLoading ? (
                  <p className="text-xs text-slate-400 px-2 py-1">{t('loading')}</p>
                ) : departmentSigners.length === 0 ? (
                  <p className="text-xs text-slate-400 px-2 py-1">{t('noData')}</p>
                ) : (
                  signersByDepartment.map(({ department, users }) =>
                    users.length === 0 ? null : (
                      <div key={department}>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">{department}</p>
                        {users.map((user) => {
                          const checked = form.recipientIds.includes(user.id);
                          const roleLabel = t(user.role as Parameters<typeof t>[0]);
                          return (
                            <label key={user.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setForm((prev) => ({ ...prev, recipientIds: [...prev.recipientIds, user.id] }));
                                  } else {
                                    setForm((prev) => ({ ...prev, recipientIds: prev.recipientIds.filter((id) => id !== user.id) }));
                                  }
                                  setLocalError('');
                                }}
                              />
                              <span className="text-sm text-slate-700">{user.full_name}</span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-auto ${
                                user.role === 'director' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {roleLabel}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )
                  )
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => submitForm(false)}
              className="py-2.5 px-4 rounded-xl border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 disabled:opacity-60 transition-colors"
            >
              {loading ? t('saving') : t('saveDraft')}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => submitForm(true)}
              className="py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('loading')}</>
              ) : (
                <><Send size={14} />{t('sendForApproval')}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const SIGNER_STATUS_CONFIG = {
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  signed: { label: 'Signed', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

function AISidePanel({
  doc,
  onClose,
  onDocumentUpdate,
  onSubmitDraft,
}: {
  doc: Document;
  onClose: () => void;
  onDocumentUpdate: (doc: Document) => void;
  onSubmitDraft: (doc: Document) => Promise<string | null>;
}) {
  const { t } = useLang();
  const { profile } = useAuth();
  const [analyses, setAnalyses] = useState<DocumentAnalysis[]>([]);
  const [signers, setSigners] = useState<DocumentSigner[]>(doc.signers ?? []);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [signError, setSignError] = useState('');
  const [draftSubmitError, setDraftSubmitError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [docStatus, setDocStatus] = useState(doc.status);
  const [activeTab, setActiveTab] = useState<'ai' | 'sign'>(doc.status === 'pending' ? 'sign' : 'ai');

  const loadAnalyses = useCallback(async () => {
    const data = await getDocumentAnalyses(doc.id);
    setAnalyses(data);
  }, [doc.id]);

  const loadSigners = useCallback(async () => {
    try {
      const data = await getDocumentSigners(doc.id);
      if (data.length > 0) {
        setSigners(data);
        return;
      }
    } catch {
      // backend endpoint may not exist yet
    }

    if (doc.signers?.length) {
      setSigners(doc.signers);
      return;
    }

    const fallback = await enrichDocumentSigners(doc);
    if (fallback.signers?.length) setSigners(fallback.signers);
  }, [doc]);

  useEffect(() => { loadAnalyses(); }, [loadAnalyses]);
  useEffect(() => { loadSigners(); }, [loadSigners]);
  useEffect(() => {
    setDocStatus(doc.status);
    if (doc.signers?.length) setSigners(doc.signers);
  }, [doc]);

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
    setSignError('');
    try {
      const result = await signDocument(doc.id);
      setSigners((prev) =>
        prev.map((s) => (s.user_id === profile?.id ? result.signer : s))
      );
      setDocStatus(result.document.status);
      onDocumentUpdate(result.document);
      await loadSigners();
    } catch (err) {
      setSignError(err instanceof Error ? err.message : t('error'));
    } finally {
      setSigning(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    setSignError('');
    try {
      const result = await rejectDocument(doc.id, rejectReason);
      setSigners((prev) =>
        prev.map((s) => (s.user_id === profile?.id ? result.signer : s))
      );
      setDocStatus(result.document.status);
      onDocumentUpdate(result.document);
      await loadSigners();
    } catch (err) {
      setSignError(err instanceof Error ? err.message : t('error'));
    } finally {
      setRejecting(false);
    }
  };

  const mySigner = signers.find((s) => s.user_id === profile?.id);
  const canSign = docStatus === 'pending' && mySigner?.status === 'pending';
  const hasCurrentUserSigned = mySigner?.status === 'signed';
  const isFullySigned = docStatus === 'signed';
  const signedCount = signers.filter((s) => s.status === 'signed').length;
  const canSubmitDraft = profile?.id === doc.owner_id && docStatus === 'draft';
  const fileName = doc.description.match(/File:\s*([^|\n]+)/i)?.[1]?.trim() || `${doc.title}.file`;
  const hasFile = Boolean(doc.file_url);

  const openFile = () => {
    if (!doc.file_url) return;
    window.open(doc.file_url, '_blank');
  };

  const downloadFile = () => {
    if (!doc.file_url) return;
    const link = document.createElement('a');
    link.href = doc.file_url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

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
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 space-y-2">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Status:</span> {docStatus}
          </p>
          {doc.description && (
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Izoh:</span> {doc.description}
            </p>
          )}
          {doc.content && (
            <p className="text-xs text-slate-500 line-clamp-3">
              <span className="font-semibold text-slate-700">Matn:</span> {doc.content}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            {hasFile ? (
              <>
                <button onClick={openFile} className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-blue-200">
                  <Eye size={12} />
                  Ko&apos;rish
                </button>
                <button onClick={downloadFile} className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-emerald-200">
                  <Download size={12} />
                  Yuklab olish
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-400">Fayl biriktirilmagan</span>
            )}
          </div>
        </div>

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
                  <span className={`font-medium capitalize ${isFullySigned ? 'text-emerald-600' : docStatus === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>
                    {docStatus}
                  </span>
                </div>
                {doc.signed_at && (
                  <div className="flex justify-between"><span>{t('signedOn')}:</span><span className="font-medium text-slate-700">{new Date(doc.signed_at).toLocaleDateString()}</span></div>
                )}
              </div>
            </div>

            {signers.length > 0 && (
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('signingProgress')}</span>
                  <span className="text-xs font-medium text-slate-600">{signedCount}/{signers.length}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: signers.length ? `${(signedCount / signers.length) * 100}%` : '0%' }}
                  />
                </div>
                <div className="space-y-2">
                  {signers.map((signer) => {
                    const cfg = SIGNER_STATUS_CONFIG[signer.status];
                    return (
                      <div key={signer.id} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="text-slate-700 font-medium truncate flex-1">
                          {signer.user?.full_name || signer.user_id}
                          {signer.user_id === profile?.id && <span className="text-slate-400 ml-1">(siz)</span>}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} font-medium capitalize`}>
                          {signer.status === 'pending' ? t('pendingSignature') : cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {signError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{signError}</div>
            )}

            {isFullySigned ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-emerald-700 text-sm font-semibold">{t('allSigned')}</p>
                <p className="text-emerald-500 text-xs mt-1">E-Imzo orqali tasdiqlangan</p>
              </div>
            ) : docStatus === 'rejected' ? (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
                <AlertCircle size={28} className="text-red-500 mx-auto mb-2" />
                <p className="text-red-700 text-sm font-semibold">{t('rejected')}</p>
              </div>
            ) : (
              <>
                {canSubmitDraft && (
                  <>
                    {draftSubmitError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{draftSubmitError}</div>
                    )}
                    <button
                      onClick={async () => {
                        setDraftSubmitError('');
                        const error = await onSubmitDraft(doc);
                        if (error) {
                          setDraftSubmitError(error);
                          return;
                        }
                        setDocStatus('pending');
                        await loadSigners();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Send size={15} />
                      {t('submitDocument')}
                    </button>
                    <p className="text-center text-xs text-slate-400">{t('draftSavedHint')}</p>
                  </>
                )}

                {hasCurrentUserSigned && (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
                    <CheckCircle size={20} className="text-blue-500 mx-auto mb-1" />
                    <p className="text-blue-700 text-sm font-medium">{t('youHaveSigned')}</p>
                    {mySigner?.signed_at && (
                      <p className="text-blue-500 text-xs mt-0.5">{new Date(mySigner.signed_at).toLocaleString()}</p>
                    )}
                  </div>
                )}

                {canSign && (
                  <>
                    <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                        <PenLine size={20} className="text-emerald-600" />
                      </div>
                      <p className="text-emerald-700 text-sm font-medium">{t('awaitingYourSignature')}</p>
                      <p className="text-emerald-600/70 text-xs mt-1">E-Imzo bilan raqamli imzo qo&apos;ying</p>
                    </div>
                    <button
                      onClick={handleSign}
                      disabled={signing}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      {signing ? (
                        <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t('loading')}</>
                      ) : (
                        <><PenLine size={16} />{t('signDocument')}</>
                      )}
                    </button>
                    <div className="space-y-2">
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder={t('rejectionReason')}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button
                        onClick={handleReject}
                        disabled={rejecting}
                        className="w-full py-2.5 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                      >
                        {rejecting ? t('loading') : t('rejectDocument')}
                      </button>
                    </div>
                  </>
                )}

                {!canSign && !hasCurrentUserSigned && docStatus === 'pending' && (
                  <p className="text-center text-xs text-slate-400">{t('onlySignersCanSign')}</p>
                )}
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
  const { departmentNames, loading: departmentsLoading } = useDepartments(!!profile);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [draftActionError, setDraftActionError] = useState<{ docId: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await getAccessibleDocuments(profile);
      setDocs(data);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: CreateDocPayload) => {
    setCreateLoading(true);
    setCreateError('');
    try {
      const signatureMeta = [
        data.fileName ? `File: ${data.fileName}` : '',
        data.recipientNames.length ? `Recipients: ${data.recipientNames.join(', ')}` : '',
      ].filter(Boolean).join(' | ');

      const created = await createDocument({
        title: data.title,
        description: signatureMeta ? `${data.description}\n${signatureMeta}`.trim() : data.description,
        content: data.content,
        department: data.department,
        file_url: data.fileDataUrl || '',
        recipient_ids: data.recipientIds,
      });

      if (data.submitForSignature) {
        await updateDocumentStatus(created.id, 'pending');
      }

      setCreateOpen(false);
      await load();
    } catch (err: unknown) {
      if (profile?.id === 'dev-bypass-user') {
        const localDoc: Document = {
          id: `local-${Date.now()}`,
          title: data.title,
          description: data.description,
          content: data.content,
          status: data.submitForSignature ? 'pending' : 'draft',
          owner_id: profile.id,
          department: data.department,
          file_url: data.fileDataUrl || '',
          signed_at: null,
          ai_analyzed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          owner: profile,
        };
        setDocs((prev) => [localDoc, ...prev]);
        setCreateOpen(false);
      } else {
        setCreateError(err instanceof Error ? err.message : t('error'));
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusChange = async (docId: string, status: Document['status']) => {
    const updated = await updateDocumentStatus(docId, status);
    await load();
    if (selectedDoc?.id === docId) {
      setSelectedDoc(updated);
    }
  };

  const handleSubmitDraft = async (doc: Document): Promise<string | null> => {
    const enriched = await enrichDocumentSigners(doc);
    const hasRecipients =
      (enriched.signers?.length ?? 0) > 0 ||
      parseRecipientNames(enriched.description).length > 0;

    if (!hasRecipients) {
      return t('selectApproversBeforeSubmit');
    }

    await handleStatusChange(doc.id, 'pending');
    setDraftActionError(null);
    return null;
  };

  const handleDocumentUpdate = (updated: Document) => {
    setDocs((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
    if (selectedDoc?.id === updated.id) {
      setSelectedDoc((prev) => (prev ? { ...prev, ...updated } : prev));
    }
  };

  const handleQuickSign = async (docId: string) => {
    try {
      const result = await signDocument(docId);
      handleDocumentUpdate(result.document);
      setSelectedDoc((prev) => (prev?.id === docId ? result.document : prev));
    } catch {
      // open side panel for error display
      const doc = docs.find((d) => d.id === docId);
      if (doc) setSelectedDoc(doc);
    }
  };

  const isPendingSigner = (doc: Document) =>
    profile ? isPendingSignerForUser(doc, profile) : false;

  const filtered = docs.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.department.toLowerCase().includes(search.toLowerCase()) ||
      (d.owner?.full_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const canCreateDocument = profile?.role !== 'admin';

  const getFileName = (doc: Document) => {
    const match = doc.description.match(/File:\s*([^|\n]+)/i);
    return match?.[1]?.trim() || `${doc.title}.file`;
  };

  const handleOpenFile = (doc: Document) => {
    if (!doc.file_url) return;
    window.open(doc.file_url, '_blank');
  };

  const handleDownloadFile = (doc: Document) => {
    if (!doc.file_url) return;
    const link = document.createElement('a');
    link.href = doc.file_url;
    link.download = getFileName(doc);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

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
              {canCreateDocument && (
                <button
                  onClick={() => { setCreateError(''); setCreateOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/25"
                >
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
              {canCreateDocument && (
                <button onClick={() => setCreateOpen(true)} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-500 transition-colors">
                  {t('newDocument')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((doc) => {
                const sc = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.draft;
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
                          {isPendingSigner(doc) && (
                            <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              <PenLine size={10} />
                              {t('awaitingYourSignature')}
                            </span>
                          )}
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
                        {(doc.description || doc.content) && (
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                            {doc.description || doc.content}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {sc.label}
                          </span>
                          {doc.file_url ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFile(doc);
                              }}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 inline-flex items-center gap-1"
                            >
                              <Download size={11} />
                              Faylni yuklab olish
                            </button>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              Fayl biriktirilmagan
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inline actions for non-employee or owner */}
                    {!isSelected && (profile?.id === doc.owner_id || isPendingSigner(doc) || profile?.role !== 'employee') && (
                      <div className="flex items-center gap-2 px-4 pb-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {doc.status === 'draft' && profile?.id === doc.owner_id && (
                          <button
                            onClick={async () => {
                              setDraftActionError(null);
                              const error = await handleSubmitDraft(doc);
                              if (error) {
                                setDraftActionError({ docId: doc.id, message: error });
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors inline-flex items-center gap-1.5"
                          >
                            <Send size={12} />
                            {t('submitDocument')}
                          </button>
                        )}
                        {doc.status === 'draft' && profile?.id === doc.owner_id && (
                          <span className="text-[11px] text-slate-400">{t('draftSavedHint')}</span>
                        )}
                        {draftActionError?.docId === doc.id && (
                          <span className="text-[11px] text-red-600">{draftActionError.message}</span>
                        )}
                        {doc.status === 'pending' && isPendingSigner(doc) && (
                          <button
                            onClick={() => handleQuickSign(doc.id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors inline-flex items-center gap-1.5"
                          >
                            <PenLine size={12} />
                            {t('signDocument')}
                          </button>
                        )}
                        {doc.status === 'pending' && doc.signers && doc.signers.length > 0 && (
                          <span className="text-[11px] text-slate-400">
                            {doc.signers.filter((s) => s.status === 'signed').length}/{doc.signers.length} imzolangan
                          </span>
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
            <AISidePanel doc={selectedDoc} onClose={() => setSelectedDoc(null)} onDocumentUpdate={handleDocumentUpdate} onSubmitDraft={handleSubmitDraft} />
          </div>
        </div>
      )}

      {canCreateDocument && (
        <CreateDocModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          loading={createLoading}
          error={createError}
          callerRole={profile?.role || 'employee'}
          profileId={profile?.id || ''}
          ownerDepartment={profile?.department || ''}
          departments={departmentNames}
          departmentsLoading={departmentsLoading}
        />
      )}
    </div>
  );
}
