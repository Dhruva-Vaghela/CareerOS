import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { SidebarLayout } from '../components/SidebarLayout';
import { DigitalTwinGraph } from '../components/DigitalTwinGraph';
import { PdfViewerModal } from '../components/PdfViewerModal';
import {
  User as UserIcon,
  Briefcase,
  FileText,
  Upload,
  RefreshCw,
  Trash2,
  Sparkles,
  Calendar,
  Building,
  Eye,
  Activity,
  Terminal,
} from 'lucide-react';

interface ResumeData {
  id: string;
  filename: string;
  secureUrl: string;
  publicId: string;
  size: number;
  uploadDate: string;
}

interface GoalData {
  targetRole: string;
  targetTimeline: string;
  targetCompanies: string[];
}

export function DashboardPage() {
  const { accessToken } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = (searchParams.get('tab') as 'dashboard' | 'digital-twin' | 'resume' | 'career-goals') || 'dashboard';
  const [activeTab, setActiveTab] = useState<'dashboard' | 'digital-twin' | 'resume' | 'career-goals' | 'profile'>(tabParam);

  const [resume, setResume] = useState<ResumeData | null>(null);
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [isLoadingResume, setIsLoadingResume] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [atsModalMessage, setAtsModalMessage] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'dashboard' | 'digital-twin' | 'resume' | 'career-goals' | 'profile') => {
    setActiveTab(tab);
    if (tab !== 'profile') {
      setSearchParams({ tab });
    }
  };

  const fetchDashboardData = async (signal?: AbortSignal) => {
    try {
      // 1. Fetch Resume
      const resResponse = await fetch('/api/v1/resume/latest', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      if (resResponse.ok) {
        const data = await resResponse.json();
        setResume(data.resume);
      }

      // 2. Fetch Goal
      const goalResponse = await fetch('/api/v1/career-goals/active', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      if (goalResponse.ok) {
        const data = await goalResponse.json();
        setGoal(data.goal);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoadingResume(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (accessToken) {
      fetchDashboardData(controller.signal);
    }
    return () => controller.abort();
  }, [accessToken]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isReplace = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = isReplace ? '/api/v1/resume/replace' : '/api/v1/resume/upload';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to upload resume');
      }

      setResume(data.resume);
    } catch (err: any) {
      setError(err.message || 'Failed to upload resume');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!resume) return;
    if (!confirm('Are you sure you want to delete your resume metadata?')) return;

    setIsUploading(true);
    try {
      const res = await fetch(`/api/v1/resume/${resume.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        setResume(null);
      }
    } catch (err: any) {
      setError('Failed to delete resume');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCalculateATS = () => {
    setAtsModalMessage(
      'ATS Score Calculation is an upcoming feature in Phase 2! Resume parsing, extraction, and ATS scoring logic are strictly reserved for separate implementation phases.',
    );
  };

  return (
    <SidebarLayout activeTab={activeTab} onTabChange={handleTabChange}>
      <div style={{ maxWidth: '1140px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {error && <Alert type="error" message={error} />}

        {/* Technical Header Banner */}
        <div
          className="cockpit-panel animate-reveal"
          style={{
            padding: '1.75rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.04) 0%, rgba(8, 145, 178, 0.04) 100%)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span className="tech-badge tech-badge-indigo">
                <Terminal size={12} /> INTERVIEW COCKPIT v1.0
              </span>
              <span className="tech-badge tech-badge-emerald">
                <Activity size={12} className="animate-pulse-glow" /> SYSTEM ACTIVE
              </span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              {activeTab === 'digital-twin'
                ? 'Career Digital Twin Engine'
                : activeTab === 'resume'
                ? 'Resume Foundation Center'
                : activeTab === 'career-goals'
                ? 'Career Goals & Timeline'
                : 'Interview Command Center'}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Autonomous technical interview preparation & telemetry engine for <strong style={{ color: '#4f46e5' }}>{profile?.fullName || 'User'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button onClick={() => navigate('/profile')} variant="secondary" style={{ width: 'auto' }}>
              <UserIcon size={16} style={{ marginRight: '0.5rem' }} /> Developer Profile
            </Button>
          </div>
        </div>

        {/* Tab 1: Dashboard Overview & Digital Twin Engine */}
        {(activeTab === 'dashboard' || activeTab === 'digital-twin') && (
          <div className="animate-reveal stagger-1">
            <DigitalTwinGraph accessToken={accessToken} />
          </div>
        )}

        {/* Tab 2: Career Goal & Timeline Architecture */}
        {(activeTab === 'dashboard' || activeTab === 'career-goals') && goal && (
          <div
            className="cockpit-panel animate-reveal stagger-2"
            style={{
              padding: '1.75rem',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
              <Briefcase size={20} color="#4f46e5" /> Career Goal & Timeline Architecture
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#f8fafc', padding: '1.15rem', borderRadius: 'var(--border-radius-md)', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', fontWeight: 600 }}>
                  TARGET ROLE
                </span>
                <strong style={{ fontSize: '1.15rem', color: '#0f172a', display: 'block', marginTop: '0.2rem' }}>{goal.targetRole}</strong>
              </div>

              <div style={{ background: 'rgba(79, 70, 229, 0.06)', padding: '1.15rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
                <span style={{ fontSize: '0.7rem', color: '#4f46e5', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', fontWeight: 600 }}>
                  <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> TIMELINE GOAL
                </span>
                <strong style={{ fontSize: '1.15rem', color: '#4f46e5', display: 'block', marginTop: '0.2rem' }}>{goal.targetTimeline}</strong>
              </div>
            </div>

            {goal.targetCompanies && goal.targetCompanies.length > 0 && (
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: '0.6rem', fontWeight: 600 }}>
                  <Building size={12} style={{ display: 'inline', marginRight: '4px' }} /> TARGET COMPANIES ARCHITECTURE
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {goal.targetCompanies.map((c) => (
                    <span
                      key={c}
                      className="tech-badge tech-badge-indigo"
                      style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Resume Foundation Section */}
        {(activeTab === 'dashboard' || activeTab === 'resume') && (
          <div
            className="cockpit-panel animate-reveal stagger-3"
            style={{
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                <FileText size={20} color="#059669" /> Resume Cloud Foundation & PDF Inspector
              </h3>

              <Button
                type="button"
                variant="secondary"
                onClick={handleCalculateATS}
                style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
              >
                <Sparkles size={14} style={{ marginRight: '0.4rem', color: '#d97706' }} /> Calculate ATS Score
              </Button>
            </div>

            {isLoadingResume ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Loading resume details...</p>
            ) : resume ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    padding: '1.25rem',
                    background: '#f8fafc',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid #e2e8f0',
                    marginBottom: '1.25rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#059669',
                    }}
                  >
                    <FileText size={24} />
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>{resume.filename}</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Uploaded on {new Date(resume.uploadDate).toLocaleDateString()} • {(resume.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  {/* View File Button -> Opens PDF Modal directly */}
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setIsPdfModalOpen(true)}
                    style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    <Eye size={15} style={{ marginRight: '0.4rem' }} /> View PDF Document
                  </Button>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    id="replace-resume-input"
                    onChange={(e) => handleFileUpload(e, true)}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    isLoading={isUploading}
                    onClick={() => document.getElementById('replace-resume-input')?.click()}
                    style={{ width: 'auto' }}
                  >
                    <RefreshCw size={14} style={{ marginRight: '0.4rem' }} /> Replace Resume
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleDeleteResume}
                    disabled={isUploading}
                    style={{ width: 'auto', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  >
                    <Trash2 size={14} style={{ marginRight: '0.4rem' }} /> Delete Resume
                  </Button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 1rem',
                  background: '#f8fafc',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px dashed #cbd5e1',
                }}
              >
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem', fontSize: '0.95rem' }}>No Resume Uploaded Yet</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  id="upload-resume-input"
                  onChange={(e) => handleFileUpload(e, false)}
                  style={{ display: 'none' }}
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="primary"
                  isLoading={isUploading}
                  onClick={() => document.getElementById('upload-resume-input')?.click()}
                  style={{ width: 'auto' }}
                >
                  <Upload size={16} style={{ marginRight: '0.4rem' }} /> Upload Resume PDF
                </Button>
              </div>
            )}
          </div>
        )}

        {/* PDF Viewer Modal */}
        {resume && (
          <PdfViewerModal
            isOpen={isPdfModalOpen}
            onClose={() => setIsPdfModalOpen(false)}
            pdfUrl={resume.secureUrl}
            filename={resume.filename}
          />
        )}

        {/* ATS Notice Modal */}
        {atsModalMessage && (
          <div className="modal-overlay" onClick={() => setAtsModalMessage(null)}>
            <div
              className="cockpit-panel animate-scale-in"
              style={{ padding: '1.75rem', maxWidth: '480px', width: '100%', background: '#ffffff' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', color: '#0f172a' }}>
                <Sparkles color="#d97706" size={20} /> ATS Score Feature Notice
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', margin: '1rem 0' }}>
                {atsModalMessage}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="button" onClick={() => setAtsModalMessage(null)} style={{ width: 'auto' }}>
                  Got it
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
