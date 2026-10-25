import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  FileCheck,
  FileText,
  Info,
  MoreVertical,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from './Button';
import { PdfViewerModal } from './PdfViewerModal';
import { Alert } from './Alert';

type ResumeItem = {
  id: string;
  name?: string;
  filename: string;
  secureUrl: string;
  mimeType: string;
  size: number;
  version: number;
  status: 'ACTIVE' | 'ARCHIVED';
  uploadDate: string;
};

type Version = {
  id: string;
  resumeId?: string;
  version: number;
  filename: string;
  secureUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

type Extraction = {
  status: 'COMPLETED' | 'FAILED';
  parsedContent?: {
    plainText?: string;
    wordCount?: number;
    pageCount?: number;
    source?: 'TEXT' | 'OCR';
    layout?: 'SINGLE_COLUMN' | 'TABLE_OR_COLUMNS' | 'UNCERTAIN';
    warnings?: string[];
  };
  errorMessage?: string;
} | null;

type Feedback = {
  status: string;
  summary?: string;
  strengths?: Array<{ title: string; evidence: string; whyItMatters: string }>;
  weaknesses?: Array<{ title: string; evidence: string; whyItMatters: string }>;
  suggestions?: Array<{
    priority: string;
    issue: string;
    action: string;
    exampleRewrite?: string;
  }>;
  recruiterFeedback?: {
    firstImpression: string;
    concerns: string[];
    recommendation: string;
  };
  errorMessage?: string;
};

type Evaluation = {
  score: number;
  targetRole?: string;
  jobDescription?: string;
  hasJobDescription: boolean;
  breakdown: {
    matchedKeywords: string[];
    missingKeywords: string[];
    simulation?: {
      stages: Array<{ id: string; label: string; status: 'PASS' | 'REVIEW' | 'FAIL'; detail: string }>;
      decision: 'LIKELY_ADVANCE' | 'NEEDS_REVIEW' | 'LIKELY_FILTERED';
      confidence: 'LOW' | 'MEDIUM';
      requiredMatches: string[];
      requiredGaps: string[];
      preferredMatches: string[];
      preferredGaps: string[];
      explicitRules: Array<{ label: string; status: 'PASS' | 'REVIEW' | 'FAIL'; detail: string }>;
      requirements: {
        requiredSkills: string[];
        minimumYearsExperience?: number;
        requiredEducation?: string;
        requiredLocation?: string;
      };
      ranking: {
        required: { matched: number; total: number; percentage: number };
        preferred: { matched: number; total: number; percentage: number };
        general: { matched: number; total: number; percentage: number };
        role: { matched: number; total: number; percentage: number };
        weightedPercentage: number;
      };
    };
    categories: Array<{ id: string; label: string; score: number; maxScore: number; findings: string[] }>;
  };
  interpretation?: string;
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.ceil(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Compact, crisp design tokens aligned with SkillTrackingView & RoadmapView
const cardStyle: CSSProperties = {
  background: '#ffffff',
  border: '1.5px solid #e2e8f0',
  borderRadius: '16px',
  padding: '1.35rem 1.5rem',
  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
  minWidth: 0,
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  color: '#334155',
  fontWeight: 700,
  marginBottom: '0.35rem',
  letterSpacing: '-0.01em',
};

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1.5px solid #cbd5e1',
  borderRadius: '10px',
  padding: '0.65rem 0.8rem',
  fontSize: '0.875rem',
  color: '#0f172a',
  background: '#ffffff',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

export function ResumeCenter({ accessToken }: { accessToken: string | null }) {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState(0);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [extraction, setExtraction] = useState<Extraction>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [analyzingAts, setAnalyzingAts] = useState(false);
  const [analyzingFeedback, setAnalyzingFeedback] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [minimumYearsExperience, setMinimumYearsExperience] = useState('');
  const [requiredEducation, setRequiredEducation] = useState('');
  const [requiredLocation, setRequiredLocation] = useState('');
  const [preview, setPreview] = useState(false);
  const [advancedCriteriaOpen, setAdvancedCriteriaOpen] = useState(false);
  const [overflowMenuId, setOverflowMenuId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'all' | 'ats' | 'feedback'>('all');

  const auth = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  const request = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const response = await fetch(url, { ...init, headers: { ...auth, ...init.headers } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error?.message || body.message || 'Request failed');
      return body;
    },
    [auth]
  );

  const loadResumes = useCallback(
    async (preferredId?: string) => {
      const data = await request('/api/v1/resume/');
      const items: ResumeItem[] = data.resumes || [];
      setResumes(items);
      const next =
        preferredId && items.some((item) => item.id === preferredId)
          ? preferredId
          : (items.find((item) => item.status === 'ACTIVE') || items[0])?.id || '';
      setSelectedId(next);
      if (!next) {
        setVersions([]);
        setSelectedVersion(0);
        setEvaluation(null);
        setFeedback(null);
        setExtraction(null);
      }
      return next;
    },
    [request]
  );

  const loadDetail = useCallback(
    async (resumeId: string) => {
      if (!resumeId) return;
      const data = await request(`/api/v1/resume/${resumeId}/versions`);
      const list: Version[] = data.versions || [];
      setVersions(list);
      const latest = list[0]?.version || 0;
      setSelectedVersion(latest);
    },
    [request]
  );

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    (async () => {
      try {
        const id = await loadResumes();
        if (active && id) await loadDetail(id);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [accessToken, loadResumes, loadDetail]);

  useEffect(() => {
    if (!selectedId || !selectedVersion) {
      setEvaluation(null);
      setFeedback(null);
      setExtraction(null);
      return;
    }
    let active = true;
    Promise.all([
      request(`/api/v1/resume/${selectedId}/versions/${selectedVersion}/ats`),
      request(`/api/v1/resume/${selectedId}/versions/${selectedVersion}/feedback`),
      request(`/api/v1/resume/${selectedId}/versions/${selectedVersion}/extraction`),
    ])
      .then(([ats, ai, parsed]) => {
        if (active) {
          const latest: Evaluation | null = ats.evaluation;
          setEvaluation(latest);
          setFeedback(ai.feedback);
          setExtraction(parsed.extraction);
          if (latest) {
            setTargetRole(latest.targetRole || '');
            setJobDescription(latest.jobDescription || '');
            const configured = latest.breakdown.simulation?.requirements;
            if (configured) {
              setRequiredSkills(configured.requiredSkills.join(', '));
              setMinimumYearsExperience(configured.minimumYearsExperience?.toString() || '');
              setRequiredEducation(configured.requiredEducation || '');
              setRequiredLocation(configured.requiredLocation || '');
              if (
                configured.requiredSkills.length > 0 ||
                configured.minimumYearsExperience !== undefined ||
                configured.requiredEducation ||
                configured.requiredLocation
              ) {
                setAdvancedCriteriaOpen(true);
              }
            }
          }
        }
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      });
    return () => {
      active = false;
    };
  }, [selectedId, selectedVersion, request]);

  useEffect(() => {
    const handleDocClick = () => {
      if (overflowMenuId) setOverflowMenuId(null);
    };
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, [overflowMenuId]);

  const requirements = useMemo(
    () => ({
      requiredSkills: requiredSkills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
      ...(minimumYearsExperience === '' ? {} : { minimumYearsExperience: Number(minimumYearsExperience) }),
      ...(requiredEducation.trim() ? { requiredEducation: requiredEducation.trim() } : {}),
      ...(requiredLocation.trim() ? { requiredLocation: requiredLocation.trim() } : {}),
    }),
    [requiredSkills, minimumYearsExperience, requiredEducation, requiredLocation]
  );

  const upload = async (file?: File, append = false) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('targetRole', targetRole);
      body.append('jobDescription', jobDescription);
      body.append('requirements', JSON.stringify(requirements));
      if (!append && name.trim()) body.append('name', name.trim());
      const url = append ? `/api/v1/resume/${selectedId}/versions` : '/api/v1/resume/upload';
      const result = await request(url, { method: 'POST', body });
      await loadResumes(result.resume.id);
      await loadDetail(result.resume.id);
      setSelectedVersion(result.resume.version);
      setName('');
      setSuccess(append ? `Version ${result.resume.version} added successfully!` : 'Resume uploaded and processed successfully!');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runAnalysis = async (kind: 'ats' | 'feedback') => {
    if (!selectedId || !selectedVersion || busy) return;
    setBusy(true);
    if (kind === 'ats') setAnalyzingAts(true);
    else setAnalyzingFeedback(true);
    setError('');
    setSuccess('');
    try {
      const data = await request(`/api/v1/resume/${selectedId}/versions/${selectedVersion}/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, jobDescription, requirements }),
      });
      if (kind === 'ats') {
        setEvaluation(data.evaluation);
        setSuccess('ATS screening completed with latest criteria.');
      } else {
        setFeedback(data.feedback);
        setSuccess('AI recruiter feedback refreshed successfully.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setAnalyzingAts(false);
      setAnalyzingFeedback(false);
    }
  };

  const updateResume = async (changes: Record<string, string>, targetId?: string) => {
    const idToUpdate = targetId || selectedId;
    if (!idToUpdate) return;
    setBusy(true);
    setError('');
    try {
      await request(`/api/v1/resume/${idToUpdate}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      await loadResumes(idToUpdate);
      setSuccess('Resume updated successfully.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setEditingNameId(null);
    }
  };

  const deleteResume = async (targetId?: string) => {
    const idToDelete = targetId || selectedId;
    if (!idToDelete) return;
    setBusy(true);
    setError('');
    try {
      await request(`/api/v1/resume/${idToDelete}`, { method: 'DELETE' });
      await loadResumes();
      setDeleteConfirmId(null);
      setSuccess('Resume and associated versions deleted.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2200);
    } catch {
      // ignore clipboard error
    }
  };

  const current = resumes.find((item) => item.id === selectedId);
  const currentVersion = versions.find((item) => item.version === selectedVersion);

  const stageCounts = useMemo(() => {
    const stages = evaluation?.breakdown?.simulation?.stages || [];
    return {
      pass: stages.filter((s) => s.status === 'PASS').length,
      review: stages.filter((s) => s.status === 'REVIEW').length,
      fail: stages.filter((s) => s.status === 'FAIL').length,
    };
  }, [evaluation]);

  const activeCriteriaCount = useMemo(() => {
    let count = 0;
    if (requirements.requiredSkills.length > 0) count++;
    if (requirements.minimumYearsExperience !== undefined) count++;
    if (requirements.requiredEducation) count++;
    if (requirements.requiredLocation) count++;
    return count;
  }, [requirements]);

  return (
    <div
      className="animate-reveal stagger-1"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        minWidth: 0,
        maxWidth: '1200px',
        margin: '0 auto',
        paddingBottom: '2.5rem',
      }}
    >
      {/* 1. Page Header (Visual hierarchy aligned with AI Roadmap & Skill Tracking) */}
      <header
        style={{
          ...cardStyle,
          padding: '1.5rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)',
        }}
      >
        <div style={{ maxWidth: '680px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <span className="tech-badge tech-badge-indigo" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
              <Sparkles size={11} style={{ display: 'inline', marginRight: '4px' }} /> AI RESUME SUITE
            </span>
            <span className="tech-badge tech-badge-emerald" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
              ATS COMPLIANCE SCREENING
            </span>
            {current && (
              <span className="tech-badge tech-badge-cyan" style={{ fontSize: '0.72rem' }}>
                ACTIVE: {current.name || current.filename} (v{selectedVersion || current.version})
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0', letterSpacing: '-0.03em' }}>
            Resume Center
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Audit your resume against ATS screening simulations, role requirements, and recruiter expectations with actionable rewrite recommendations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              width: 'auto',
              cursor: busy ? 'wait' : 'pointer',
              padding: '0.65rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
            }}
          >
            <Upload size={15} style={{ marginRight: 6 }} />
            Upload Resume
            <input
              type="file"
              accept=".pdf,.docx"
              hidden
              disabled={busy}
              onChange={(e) => {
                void upload(e.target.files?.[0], false);
                e.currentTarget.value = '';
              }}
            />
          </label>
        </div>
      </header>

      {/* Global Alerts */}
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Loading Skeletons */}
      {loading ? (
        <div style={{ ...cardStyle, padding: '3.5rem 2rem', textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: '#4f46e5', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
            Loading your resume library...
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Retrieving resume versions, parsing status, and ATS screenings.
          </p>
        </div>
      ) : (
        <>
          {/* 2. Resume Library & Active Quick Actions */}
          <section style={{ ...cardStyle, padding: '1.25rem 1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={17} style={{ color: '#4f46e5' }} />
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Resume Library
                </h2>
                <span
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.5rem',
                    borderRadius: '9999px',
                  }}
                >
                  {resumes.length}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Select a resume to evaluate and tailor against job descriptions.
              </div>
            </div>

            {resumes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background: 'rgba(79, 70, 229, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    color: '#4f46e5',
                  }}
                >
                  <FileText size={26} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                  No Resumes in Library Yet
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
                  Upload your master resume in PDF or DOCX format to start your library and run ATS compatibility screenings.
                </p>
                <label
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    width: 'auto',
                    cursor: busy ? 'wait' : 'pointer',
                    padding: '0.65rem 1.25rem',
                  }}
                >
                  <Upload size={15} style={{ marginRight: 6 }} /> Choose Resume File
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    hidden
                    disabled={busy}
                    onChange={(e) => {
                      void upload(e.target.files?.[0], false);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {resumes.map((item) => {
                  const isSelected = item.id === selectedId;
                  const isArchived = item.status === 'ARCHIVED';
                  const isPdf = item.mimeType === 'application/pdf' || item.filename.toLowerCase().endsWith('.pdf');

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!isSelected) {
                          setSelectedId(item.id);
                          setSelectedVersion(item.version);
                          void loadDetail(item.id);
                        }
                      }}
                      style={{
                        background: isSelected ? 'rgba(79, 70, 229, 0.02)' : '#ffffff',
                        border: isSelected ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'relative',
                        boxShadow: isSelected ? '0 4px 14px rgba(79, 70, 229, 0.08)' : '0 1px 2px rgba(15, 23, 42, 0.03)',
                        opacity: isArchived ? 0.75 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '7px',
                              background: isPdf ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                              color: isPdf ? '#dc2626' : '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.65rem',
                              flexShrink: 0,
                            }}
                          >
                            {isPdf ? 'PDF' : 'DOC'}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            {editingNameId === item.id ? (
                              <input
                                autoFocus
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void updateResume({ name: editNameValue.trim() }, item.id);
                                  if (e.key === 'Escape') setEditingNameId(null);
                                }}
                                onBlur={() => void updateResume({ name: editNameValue.trim() }, item.id)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  ...inputStyle,
                                  padding: '0.15rem 0.35rem',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                }}
                              />
                            ) : (
                              <strong
                                style={{
                                  display: 'block',
                                  color: '#0f172a',
                                  fontSize: '0.9rem',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={item.name || item.filename}
                              >
                                {item.name || item.filename}
                              </strong>
                            )}
                            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                              v{item.version} · {formatBytes(item.size)} · {formatDate(item.uploadDate)}
                            </div>
                          </div>
                        </div>

                        {/* Overflow Menu */}
                        <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            aria-label="Resume options"
                            onClick={() => setOverflowMenuId(overflowMenuId === item.id ? null : item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748b',
                              padding: '0.2rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <MoreVertical size={15} />
                          </button>

                          {overflowMenuId === item.id && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                marginTop: '4px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                                padding: '0.35rem',
                                zIndex: 40,
                                minWidth: '150px',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNameId(item.id);
                                  setEditNameValue(item.name || item.filename.replace(/\.[^.]+$/, ''));
                                  setOverflowMenuId(null);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  fontSize: '0.8rem',
                                  border: 'none',
                                  background: 'none',
                                  color: '#334155',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void updateResume({ status: item.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' }, item.id);
                                  setOverflowMenuId(null);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  fontSize: '0.8rem',
                                  border: 'none',
                                  background: 'none',
                                  color: '#334155',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                {item.status === 'ACTIVE' ? <Archive size={13} /> : <CheckCircle2 size={13} />}
                                {item.status === 'ACTIVE' ? 'Archive' : 'Reactivate'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfirmId(item.id);
                                  setOverflowMenuId(null);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  fontSize: '0.8rem',
                                  border: 'none',
                                  background: 'none',
                                  color: '#dc2626',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                        <span
                          className={`tech-badge ${item.status === 'ACTIVE' ? 'tech-badge-emerald' : 'tech-badge-amber'}`}
                          style={{ fontSize: '0.68rem', padding: '0.12rem 0.45rem' }}
                        >
                          {item.status === 'ACTIVE' ? 'Active' : 'Archived'}
                        </span>
                        {isSelected && (
                          <span style={{ color: '#4f46e5', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Check size={12} /> Selected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Delete Confirmation Alert */}
          {deleteConfirmId && (
            <div
              style={{
                ...cardStyle,
                borderColor: '#fca5a5',
                background: '#fff5f5',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
              }}
            >
              <div>
                <strong style={{ color: '#b91c1c', display: 'block', fontSize: '0.9rem' }}>
                  Are you sure you want to delete this resume?
                </strong>
                <p style={{ margin: '0.15rem 0 0 0', color: '#7f1d1d', fontSize: '0.8rem' }}>
                  This permanently removes all versions, ATS screenings, and extracted feedback.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="secondary" onClick={() => setDeleteConfirmId(null)} style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void deleteResume(deleteConfirmId)}
                  disabled={busy}
                  style={{ width: 'auto', padding: '0.4rem 0.9rem', fontSize: '0.8rem', background: '#dc2626', borderColor: '#dc2626' }}
                >
                  Confirm Delete
                </Button>
              </div>
            </div>
          )}

          {current ? (
            <main style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>
              {/* 3. Active Resume Quick Actions Toolbar */}
              <section
                style={{
                  ...cardStyle,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.85rem',
                  padding: '1rem 1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {current.name || current.filename}
                      </h3>
                      <span className="tech-badge tech-badge-indigo" style={{ fontSize: '0.7rem' }}>
                        Version {selectedVersion}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      File: <strong>{currentVersion?.filename || current.filename}</strong> ·{' '}
                      {formatBytes(currentVersion?.size ?? current.size)} · Uploaded{' '}
                      {formatDate(currentVersion?.createdAt || current.uploadDate)}
                    </div>
                  </div>

                  {versions.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
                      <label htmlFor="resume-version-select" style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        Version:
                      </label>
                      <select
                        id="resume-version-select"
                        value={selectedVersion}
                        onChange={(e) => setSelectedVersion(Number(e.target.value))}
                        style={{
                          ...inputStyle,
                          width: 'auto',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.78rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        {versions.map((v) => (
                          <option key={v.version} value={v.version}>
                            v{v.version} ({formatDate(v.createdAt)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {currentVersion?.mimeType === 'application/pdf' && (
                    <Button
                      variant="secondary"
                      style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                      onClick={() => setPreview(true)}
                    >
                      <Eye size={14} style={{ marginRight: 5 }} /> Preview PDF
                    </Button>
                  )}

                  <label
                    className="btn btn-secondary"
                    style={{
                      width: 'auto',
                      cursor: busy ? 'wait' : 'pointer',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <Plus size={14} style={{ marginRight: 4 }} /> Add Version
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      hidden
                      disabled={busy}
                      onChange={(e) => {
                        void upload(e.target.files?.[0], true);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>

                  <Button
                    variant="secondary"
                    disabled={busy}
                    style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                    onClick={() => void updateResume({ status: current.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' })}
                  >
                    {current.status === 'ACTIVE' ? <Archive size={13} style={{ marginRight: 4 }} /> : <CheckCircle2 size={13} style={{ marginRight: 4 }} />}
                    {current.status === 'ACTIVE' ? 'Archive' : 'Reactivate'}
                  </Button>
                </div>
              </section>

              {/* 4. Resume Tailoring Form (Target Role & Job Description) */}
              <section style={{ ...cardStyle, padding: '1.35rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.2rem 0', letterSpacing: '-0.02em' }}>
                      Target Role & Screening Configuration
                    </h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                      Tailor the ATS screening simulation and AI recommendations to a specific job opening.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <Button
                      variant="primary"
                      disabled={busy}
                      isLoading={analyzingAts}
                      style={{
                        width: 'auto',
                        padding: '0.55rem 1.25rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)',
                      }}
                      onClick={() => void runAnalysis('ats')}
                    >
                      <ShieldCheck size={15} style={{ marginRight: 5 }} /> Run ATS Analysis
                    </Button>

                    <Button
                      variant="secondary"
                      disabled={busy}
                      isLoading={analyzingFeedback}
                      style={{
                        width: 'auto',
                        padding: '0.55rem 1.15rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                      onClick={() => void runAnalysis('feedback')}
                    >
                      <Sparkles size={15} style={{ marginRight: 5, color: '#7c3aed' }} /> Generate AI Feedback
                    </Button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={labelStyle} htmlFor="resume-target-role">
                      Target Job Role <span style={{ color: '#94a3b8', fontWeight: 400 }}>(e.g. Senior Full Stack Engineer, Product Designer)</span>
                    </label>
                    <input
                      id="resume-target-role"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Staff Software Engineer"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle} htmlFor="resume-job-description">
                      Job Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(paste full job description for targeted keyword and requirement matching)</span>
                    </label>
                    <textarea
                      id="resume-job-description"
                      rows={3}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the target job description here. The ATS parser will extract key qualifications, seniority requirements, and core technical competencies..."
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                    />
                  </div>

                  {/* Expandable Advanced Screening Criteria */}
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      marginTop: '0.1rem',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setAdvancedCriteriaOpen(!advancedCriteriaOpen)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#f8fafc',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <SlidersHorizontal size={15} style={{ color: '#4f46e5' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                          Advanced Screening Criteria
                        </span>
                        {activeCriteriaCount > 0 && (
                          <span
                            className="tech-badge tech-badge-indigo"
                            style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem' }}
                          >
                            {activeCriteriaCount} configured
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.78rem' }}>
                        <span>{advancedCriteriaOpen ? 'Hide' : 'Configure minimum rules'}</span>
                        {advancedCriteriaOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    </button>

                    {advancedCriteriaOpen && (
                      <div style={{ padding: '1rem', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '0.85rem',
                            marginBottom: '0.85rem',
                          }}
                        >
                          <div>
                            <label style={labelStyle} htmlFor="ats-skills">
                              Required Skills <span style={{ color: '#94a3b8', fontWeight: 400 }}>(comma separated)</span>
                            </label>
                            <input
                              id="ats-skills"
                              value={requiredSkills}
                              onChange={(e) => setRequiredSkills(e.target.value)}
                              placeholder="React, TypeScript, AWS, PostgreSQL"
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={labelStyle} htmlFor="ats-years">
                              Minimum Years Experience
                            </label>
                            <input
                              id="ats-years"
                              type="number"
                              min="0"
                              max="60"
                              value={minimumYearsExperience}
                              onChange={(e) => setMinimumYearsExperience(e.target.value)}
                              placeholder="e.g. 5"
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={labelStyle} htmlFor="ats-education">
                              Required Credential / Degree
                            </label>
                            <input
                              id="ats-education"
                              value={requiredEducation}
                              onChange={(e) => setRequiredEducation(e.target.value)}
                              placeholder="e.g. Bachelor's in CS or equivalent"
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={labelStyle} htmlFor="ats-location">
                              Required Location Phrase
                            </label>
                            <input
                              id="ats-location"
                              value={requiredLocation}
                              onChange={(e) => setRequiredLocation(e.target.value)}
                              placeholder="e.g. Remote, San Francisco, CA"
                              style={inputStyle}
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.5rem',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '0.65rem 0.85rem',
                            fontSize: '0.78rem',
                            color: '#64748b',
                            lineHeight: 1.45,
                          }}
                        >
                          <Info size={15} style={{ color: '#2563eb', flexShrink: 0, marginTop: '1px' }} />
                          <div>
                            Explicit rule checks inspect parsed resume text. Missing location or ambiguous date ranges trigger a
                            <strong> Needs Review</strong> status rather than immediate disqualification.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* View Mode Tabs (All Insights | ATS Screening | AI Feedback) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewTab('all')}
                  style={{
                    background: viewTab === 'all' ? '#4f46e5' : '#f8fafc',
                    color: viewTab === 'all' ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: viewTab === 'all' ? '#4f46e5' : '#e2e8f0',
                    borderRadius: '8px',
                    padding: '0.45rem 0.95rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Award size={14} /> All Analysis & Feedback
                </button>

                <button
                  type="button"
                  onClick={() => setViewTab('ats')}
                  style={{
                    background: viewTab === 'ats' ? '#4f46e5' : '#f8fafc',
                    color: viewTab === 'ats' ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: viewTab === 'ats' ? '#4f46e5' : '#e2e8f0',
                    borderRadius: '8px',
                    padding: '0.45rem 0.95rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <ShieldCheck size={14} /> ATS Screening Simulation ({stageCounts.pass} Pass, {stageCounts.review} Review)
                </button>

                <button
                  type="button"
                  onClick={() => setViewTab('feedback')}
                  style={{
                    background: viewTab === 'feedback' ? '#4f46e5' : '#f8fafc',
                    color: viewTab === 'feedback' ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: viewTab === 'feedback' ? '#4f46e5' : '#e2e8f0',
                    borderRadius: '8px',
                    padding: '0.45rem 0.95rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Sparkles size={14} /> AI Recruiter Feedback ({feedback?.suggestions?.length || 0} Rewrites)
                </button>
              </div>

              {/* 5. BALANCED 2-COLUMN RESULTS: ATS SCREENING SECTION */}
              {(viewTab === 'all' || viewTab === 'ats') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={18} style={{ color: '#4f46e5' }} />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      ATS Screening & Telemetry
                    </h3>
                  </div>

                  <div className="resume-two-col-grid">
                    {/* COLUMN 1: Score & Parsing Health */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Score & Decision Card */}
                      <div style={{ ...cardStyle, padding: '1.25rem 1.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            ATS Match Score
                          </span>
                          {evaluation && (
                            <span
                              className={`tech-badge ${
                                evaluation.score >= 75
                                  ? 'tech-badge-emerald'
                                  : evaluation.score >= 50
                                  ? 'tech-badge-amber'
                                  : 'tech-badge-indigo'
                              }`}
                              style={{ fontSize: '0.7rem', padding: '0.12rem 0.45rem' }}
                            >
                              {evaluation.score >= 75 ? 'Strong Match' : evaluation.score >= 50 ? 'Moderate' : 'Needs Work'}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.15rem 0' }}>
                          <div style={{ fontSize: '2.6rem', fontWeight: 800, color: evaluation ? (evaluation.score >= 70 ? '#059669' : evaluation.score >= 50 ? '#d97706' : '#2563eb') : '#94a3b8', lineHeight: 1 }}>
                            {evaluation ? evaluation.score : '--'}
                          </div>
                          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8' }}>/100</span>
                        </div>

                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', margin: '0.65rem 0 1rem' }}>
                          <div
                            style={{
                              width: `${evaluation ? evaluation.score : 0}%`,
                              height: '100%',
                              background: evaluation && evaluation.score >= 70 ? '#059669' : '#2563eb',
                              borderRadius: '3px',
                              transition: 'width 0.5s ease-out',
                            }}
                          />
                        </div>

                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                              Screening Status
                            </div>
                            {evaluation?.breakdown?.simulation ? (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '6px',
                                  fontWeight: 800,
                                  fontSize: '0.8rem',
                                  background:
                                    evaluation.breakdown.simulation.decision === 'LIKELY_ADVANCE'
                                      ? '#ecfdf5'
                                      : evaluation.breakdown.simulation.decision === 'LIKELY_FILTERED'
                                      ? '#fef2f2'
                                      : '#fffbeb',
                                  color:
                                    evaluation.breakdown.simulation.decision === 'LIKELY_ADVANCE'
                                      ? '#047857'
                                      : evaluation.breakdown.simulation.decision === 'LIKELY_FILTERED'
                                      ? '#b91c1c'
                                      : '#a16207',
                                }}
                              >
                                {evaluation.breakdown.simulation.decision === 'LIKELY_ADVANCE' && <CheckCircle2 size={13} />}
                                {evaluation.breakdown.simulation.decision === 'NEEDS_REVIEW' && <AlertTriangle size={13} />}
                                {evaluation.breakdown.simulation.decision === 'LIKELY_FILTERED' && <AlertCircle size={13} />}
                                {evaluation.breakdown.simulation.decision.replaceAll('_', ' ')}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>Pending</span>
                            )}
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                              Analysis Confidence
                            </div>
                            <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>
                              {evaluation?.breakdown?.simulation?.confidence ?? 'Pending'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Parsing & Document Integrity Card */}
                      <div style={{ ...cardStyle, padding: '1.25rem 1.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <FileCheck size={16} style={{ color: extraction?.status === 'COMPLETED' ? '#059669' : '#d97706' }} />
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                              Parsing & Text Extraction Health
                            </h4>
                          </div>
                          <span
                            className={`tech-badge ${extraction?.status === 'COMPLETED' ? 'tech-badge-emerald' : 'tech-badge-amber'}`}
                            style={{ fontSize: '0.68rem' }}
                          >
                            {extraction?.status === 'COMPLETED' ? 'Ready for Screen' : 'Needs Review'}
                          </span>
                        </div>

                        {extraction?.status === 'FAILED' ? (
                          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.65rem', color: '#b91c1c', fontSize: '0.8rem' }}>
                            {extraction.errorMessage || 'Extraction could not read plain text. Try uploading a clearer PDF or DOCX.'}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.82rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', borderBottom: '1px solid #f8fafc', paddingBottom: '0.25rem' }}>
                              <span>Extraction Source</span>
                              <strong style={{ color: '#0f172a' }}>
                                {extraction?.parsedContent?.source === 'OCR' ? 'OCR Image Scan' : 'Selectable Digital Text'}
                              </strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', borderBottom: '1px solid #f8fafc', paddingBottom: '0.25rem' }}>
                              <span>Length & Coverage</span>
                              <strong style={{ color: '#0f172a' }}>
                                {extraction?.parsedContent?.wordCount ?? 0} words
                                {extraction?.parsedContent?.pageCount ? ` · ${extraction.parsedContent.pageCount} pages` : ''}
                              </strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                              <span>Layout Type</span>
                              <strong style={{ color: '#0f172a' }}>
                                {extraction?.parsedContent?.layout === 'TABLE_OR_COLUMNS'
                                  ? 'Multi-Column / Tables'
                                  : extraction?.parsedContent?.layout === 'UNCERTAIN'
                                  ? 'Dense Formatting (Review Recommended)'
                                  : 'Standard Single Column'}
                              </strong>
                            </div>

                            {extraction?.parsedContent?.warnings && extraction.parsedContent.warnings.length > 0 && (
                              <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                {extraction.parsedContent.warnings.map((w, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      background: '#fffbeb',
                                      border: '1px solid #fde68a',
                                      borderRadius: '6px',
                                      padding: '0.45rem 0.6rem',
                                      fontSize: '0.78rem',
                                      color: '#92400e',
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '5px',
                                    }}
                                  >
                                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>{w}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* COLUMN 2: Automated ATS Checks & Keyword Signals */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Automated ATS Checks */}
                      <div style={{ ...cardStyle, padding: '1.25rem 1.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            Automated ATS Checks
                          </h4>
                          {evaluation?.breakdown?.simulation?.stages && (
                            <div style={{ display: 'flex', gap: '0.35rem', fontSize: '0.72rem' }}>
                              <span style={{ color: '#059669', fontWeight: 700 }}>{stageCounts.pass} Pass</span> ·{' '}
                              <span style={{ color: '#d97706', fontWeight: 700 }}>{stageCounts.review} Review</span> ·{' '}
                              <span style={{ color: '#dc2626', fontWeight: 700 }}>{stageCounts.fail} Fail</span>
                            </div>
                          )}
                        </div>

                        {evaluation?.breakdown?.simulation?.stages ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                            {evaluation.breakdown.simulation.stages.map((stage) => {
                              const isPass = stage.status === 'PASS';
                              const isFail = stage.status === 'FAIL';
                              return (
                                <div
                                  key={stage.id}
                                  style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '0.65rem 0.8rem',
                                    background: isPass ? '#ffffff' : isFail ? '#fef2f2' : '#fcfcfd',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                    <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>{stage.label}</strong>
                                    <span
                                      style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        padding: '0.1rem 0.45rem',
                                        borderRadius: '9999px',
                                        background: isPass ? '#ecfdf5' : isFail ? '#fee2e2' : '#fffbeb',
                                        color: isPass ? '#059669' : isFail ? '#dc2626' : '#d97706',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}
                                    >
                                      {isPass && <CheckCircle2 size={11} />}
                                      {stage.status === 'REVIEW' && <AlertTriangle size={11} />}
                                      {isFail && <AlertCircle size={11} />}
                                      {stage.status === 'REVIEW' ? 'NEEDS REVIEW' : stage.status}
                                    </span>
                                  </div>
                                  <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.4 }}>
                                    {stage.detail}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem', color: '#64748b' }}>
                            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem' }}>
                              No ATS screening has been simulated for this version yet.
                            </p>
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() => void runAnalysis('ats')}
                              style={{ width: 'auto', margin: '0 auto', fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                            >
                              <ShieldCheck size={13} style={{ marginRight: 4 }} /> Run Screen
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Keyword & Criteria Signals */}
                      {evaluation && (
                        <div style={{ ...cardStyle, padding: '1.25rem 1.4rem' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.65rem 0' }}>
                            Keyword & Criteria Signals
                          </h4>

                          {evaluation.breakdown?.simulation?.explicitRules && evaluation.breakdown.simulation.explicitRules.length > 0 && (
                            <div style={{ marginBottom: '0.85rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                                Configured Qualification Rules
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {evaluation.breakdown.simulation.explicitRules.map((r, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      fontSize: '0.78rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '0.35rem 0.55rem',
                                      background: '#f8fafc',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    <span style={{ color: '#334155' }}>
                                      <strong>{r.label}:</strong> {r.detail}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        color: r.status === 'PASS' ? '#059669' : r.status === 'FAIL' ? '#dc2626' : '#d97706',
                                      }}
                                    >
                                      {r.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={{ marginBottom: '0.65rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                              Matched Keywords ({evaluation.breakdown.matchedKeywords?.length || 0})
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {evaluation.breakdown.matchedKeywords?.length > 0 ? (
                                evaluation.breakdown.matchedKeywords.slice(0, 16).map((kw, i) => (
                                  <span
                                    key={i}
                                    className="tech-badge tech-badge-emerald"
                                    style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}
                                  >
                                    <Check size={10} style={{ marginRight: '3px' }} /> {kw}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No keywords matched yet.</span>
                              )}
                            </div>
                          </div>

                          {evaluation.breakdown.missingKeywords?.length > 0 && (
                            <div>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                                Missing Keywords ({evaluation.breakdown.missingKeywords.length})
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                {evaluation.breakdown.missingKeywords.slice(0, 16).map((kw, i) => (
                                  <span
                                    key={i}
                                    className="tech-badge tech-badge-amber"
                                    style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 6. BALANCED 2-COLUMN RESULTS: AI RECRUITER FEEDBACK & REWRITES */}
              {(viewTab === 'all' || viewTab === 'feedback') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: viewTab === 'all' ? '0.75rem' : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '7px',
                          background: 'rgba(124, 58, 237, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#7c3aed',
                        }}
                      >
                        <Sparkles size={15} />
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        AI Recruiter Feedback & Actionable Rewrites
                      </h3>
                    </div>

                    <Button
                      variant="secondary"
                      disabled={busy}
                      isLoading={analyzingFeedback}
                      onClick={() => void runAnalysis('feedback')}
                      style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <RefreshCw size={12} style={{ marginRight: 4 }} className={analyzingFeedback ? 'animate-spin' : ''} />
                      Refresh Feedback
                    </Button>
                  </div>

                  {feedback?.status === 'COMPLETED' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Executive Summary (Full Width Banner) */}
                      {feedback.summary && (
                        <div
                          style={{
                            background: '#f8fafc',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '1rem 1.25rem',
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.35rem' }}>
                            Executive Overview
                          </span>
                          <p style={{ margin: 0, color: '#1e293b', fontSize: '0.875rem', lineHeight: 1.6 }}>
                            {feedback.summary}
                          </p>
                        </div>
                      )}

                      {/* 2-COLUMN SIDE-BY-SIDE: Core Strengths (Col 1) vs Areas to Improve (Col 2) */}
                      <div className="resume-two-col-grid">
                        {/* Column 1: Core Strengths */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} /> Core Strengths ({feedback.strengths?.length || 0})
                          </span>

                          {feedback.strengths && feedback.strengths.length > 0 ? (
                            feedback.strengths.map((str, i) => (
                              <div
                                key={i}
                                style={{
                                  border: '1px solid #e2e8f0',
                                  borderLeft: '4px solid #10b981',
                                  borderRadius: '10px',
                                  padding: '0.85rem 1rem',
                                  background: '#ffffff',
                                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
                                }}
                              >
                                <strong style={{ color: '#0f172a', fontSize: '0.88rem', display: 'block', marginBottom: '0.2rem' }}>
                                  {str.title}
                                </strong>
                                <p style={{ margin: 0, color: '#475569', fontSize: '0.82rem', lineHeight: 1.5 }}>
                                  {str.whyItMatters}
                                </p>
                                {str.evidence && (
                                  <div style={{ marginTop: '0.35rem', color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic', background: '#f8fafc', padding: '0.3rem 0.55rem', borderRadius: '6px' }}>
                                    Evidence: "{str.evidence}"
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '0.5rem' }}>No strengths identified.</div>
                          )}
                        </div>

                        {/* Column 2: Areas to Improve */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={14} /> Areas to Improve ({feedback.weaknesses?.length || 0})
                          </span>

                          {feedback.weaknesses && feedback.weaknesses.length > 0 ? (
                            feedback.weaknesses.map((weak, i) => (
                              <div
                                key={i}
                                style={{
                                  border: '1px solid #e2e8f0',
                                  borderLeft: '4px solid #f59e0b',
                                  borderRadius: '10px',
                                  padding: '0.85rem 1rem',
                                  background: '#ffffff',
                                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
                                }}
                              >
                                <strong style={{ color: '#0f172a', fontSize: '0.88rem', display: 'block', marginBottom: '0.2rem' }}>
                                  {weak.title}
                                </strong>
                                <p style={{ margin: 0, color: '#475569', fontSize: '0.82rem', lineHeight: 1.5 }}>
                                  {weak.evidence}
                                </p>
                                {weak.whyItMatters && (
                                  <div style={{ marginTop: '0.35rem', color: '#92400e', fontSize: '0.75rem' }}>
                                    Impact: {weak.whyItMatters}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '0.5rem' }}>No areas to improve flagged.</div>
                          )}
                        </div>
                      </div>

                      {/* 2-COLUMN GRID: Priority Recommendations & Proposed Rewrites */}
                      {feedback.suggestions && feedback.suggestions.length > 0 && (
                        <div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.65rem' }}>
                            <Sparkles size={14} /> Priority Recommendations & Proposed Rewrites ({feedback.suggestions.length})
                          </span>

                          <div className="resume-two-col-grid">
                            {feedback.suggestions.map((sug, i) => {
                              const isHigh = sug.priority === 'HIGH';
                              const isMed = sug.priority === 'MEDIUM';
                              const key = `rewrite-${i}`;
                              const isCopied = copiedKey === key;

                              return (
                                <div
                                  key={i}
                                  style={{
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    background: '#ffffff',
                                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                      <span
                                        style={{
                                          fontSize: '0.7rem',
                                          fontWeight: 800,
                                          padding: '0.12rem 0.45rem',
                                          borderRadius: '6px',
                                          background: isHigh ? '#fee2e2' : isMed ? '#fef3c7' : '#dbeafe',
                                          color: isHigh ? '#b91c1c' : isMed ? '#b45309' : '#1d4ed8',
                                        }}
                                      >
                                        {sug.priority} PRIORITY
                                      </span>
                                    </div>

                                    <strong style={{ color: '#0f172a', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                                      {sug.issue}
                                    </strong>
                                    <p style={{ margin: '0 0 0.65rem 0', color: '#475569', fontSize: '0.82rem', lineHeight: 1.5 }}>
                                      {sug.action}
                                    </p>
                                  </div>

                                  {sug.exampleRewrite && (
                                    <div
                                      style={{
                                        background: 'linear-gradient(180deg, #f8faff 0%, #f5f3ff 100%)',
                                        border: '1px solid #e0e7ff',
                                        borderLeft: '4px solid #7c3aed',
                                        borderRadius: '8px',
                                        padding: '0.75rem 0.9rem',
                                        marginTop: '0.5rem',
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#7c3aed', letterSpacing: '0.04em' }}>
                                          PROPOSED REWRITE
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => void copyToClipboard(sug.exampleRewrite || '', key)}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            background: isCopied ? '#dcfce7' : '#ffffff',
                                            border: '1px solid #cbd5e1',
                                            color: isCopied ? '#15803d' : '#475569',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            padding: '0.15rem 0.5rem',
                                            borderRadius: '5px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                          }}
                                        >
                                          {isCopied ? <Check size={11} /> : <Copy size={11} />}
                                          {isCopied ? 'Copied!' : 'Copy Rewrite'}
                                        </button>
                                      </div>
                                      <div style={{ color: '#1e293b', fontSize: '0.82rem', fontStyle: 'italic', lineHeight: 1.45 }}>
                                        "{sug.exampleRewrite}"
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Recruiter Perspective in 2 Columns */}
                      {feedback.recruiterFeedback && (
                        <div
                          style={{
                            border: '1.5px solid #ddd6fe',
                            background: '#faf5ff',
                            borderRadius: '12px',
                            padding: '1.25rem',
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.75rem' }}>
                            <Award size={15} /> Recruiter Perspective
                          </span>

                          <div className="resume-two-col-grid">
                            <div>
                              <strong style={{ color: '#4c1d95', fontSize: '0.85rem', display: 'block', marginBottom: '0.2rem' }}>
                                First Impression
                              </strong>
                              <p style={{ margin: '0 0 0.75rem 0', color: '#5b21b6', fontSize: '0.82rem', lineHeight: 1.5 }}>
                                {feedback.recruiterFeedback.firstImpression}
                              </p>

                              <strong style={{ color: '#4c1d95', fontSize: '0.85rem', display: 'block', marginBottom: '0.2rem' }}>
                                Hiring Recommendation
                              </strong>
                              <p style={{ margin: 0, color: '#5b21b6', fontSize: '0.82rem', lineHeight: 1.5 }}>
                                {feedback.recruiterFeedback.recommendation}
                              </p>
                            </div>

                            <div>
                              {feedback.recruiterFeedback.concerns && feedback.recruiterFeedback.concerns.length > 0 && (
                                <div>
                                  <strong style={{ color: '#4c1d95', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
                                    Key Concerns
                                  </strong>
                                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#5b21b6', fontSize: '0.82rem', lineHeight: 1.5 }}>
                                    {feedback.recruiterFeedback.concerns.map((c, i) => (
                                      <li key={i} style={{ marginBottom: '0.2rem' }}>{c}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', background: '#ffffff', borderRadius: '14px', border: '1.5px solid #e2e8f0' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: 'rgba(124, 58, 237, 0.08)',
                          color: '#7c3aed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 0.75rem',
                        }}
                      >
                        <Sparkles size={22} />
                      </div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                        No AI Feedback Generated Yet
                      </h4>
                      <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
                        {feedback?.status === 'FAILED'
                          ? feedback.errorMessage || 'Analysis failed. Please click below to retry.'
                          : 'Generate executive recruiter feedback, key strengths, priority bullet rewrites, and hiring impressions for this resume version.'}
                      </p>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        isLoading={analyzingFeedback}
                        onClick={() => void runAnalysis('feedback')}
                        style={{ width: 'auto', margin: '0 auto', fontSize: '0.85rem' }}
                      >
                        <Sparkles size={14} style={{ marginRight: 5, color: '#7c3aed' }} /> Generate AI Feedback
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </main>
          ) : null}
        </>
      )}

      {/* PDF Viewer Modal */}
      {currentVersion?.mimeType === 'application/pdf' && (
        <PdfViewerModal
          isOpen={preview}
          onClose={() => setPreview(false)}
          pdfUrl={currentVersion.secureUrl}
          filename={currentVersion.filename}
          accessToken={accessToken}
        />
      )}
    </div>
  );
}
