import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { GithubIcon } from './GithubIcon';
import {
  RefreshCw,
  Search,
  ExternalLink,
  FolderGit2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Unlink,
  Star,
  GitFork,
} from 'lucide-react';

export interface ProjectData {
  _id: string;
  id?: string;
  userId: string;
  githubRepoId?: number;
  name: string;
  fullName?: string;
  description: string;
  repositoryUrl: string;
  language?: string | null;
  topics: string[];
  stars: number;
  forks: number;
  status: 'Completed' | 'In Progress' | 'Active' | 'Archived';
  isPublic: boolean;
  defaultBranch?: string;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GithubAccountData {
  _id?: string;
  userId: string;
  githubUsername: string;
  githubUserId?: number;
  avatarUrl?: string;
  profileUrl?: string;
  publicRepoCount: number;
  connectedAt: string;
  lastSyncedAt: string;
}

export const ProjectIntelligenceView: React.FC = () => {
  const { accessToken } = useAuth();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [account, setAccount] = useState<GithubAccountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editing state for custom description/status
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'Completed' | 'In Progress' | 'Active' | 'Archived'>('Completed');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchProjectsAndAccount = async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch connected GitHub account
      const accRes = await fetch('/api/v1/projects/account', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      let connectedAcc = null;
      if (accRes.ok) {
        const accData = await accRes.json();
        connectedAcc = accData.data || null;
        setAccount(connectedAcc);
        if (connectedAcc?.githubUsername) {
          setUsernameInput(connectedAcc.githubUsername);
        }
      }

      // If no account is connected, clear projects immediately
      if (!connectedAcc) {
        setProjects([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch projects
      const projRes = await fetch('/api/v1/projects', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData.data || []);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to load project intelligence:', err);
        setError('Failed to load projects. Please try refreshing.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (accessToken) {
      fetchProjectsAndAccount(controller.signal);
    }
    return () => controller.abort();
  }, [accessToken]);

  // Connect via Username
  const handleConnectByUsername = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!usernameInput.trim()) {
      setError('Please enter a GitHub username');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/v1/projects/github/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ username: usernameInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to connect GitHub user');
      }

      setAccount(data.data.account);
      setProjects(data.data.projects);
      setSuccessMessage(`Successfully connected GitHub user @${data.data.account.githubUsername} and imported ${data.data.projects.length} public repositories!`);
    } catch (err: any) {
      setError(err.message || 'Error connecting GitHub account');
    } finally {
      setIsConnecting(false);
    }
  };

  // Re-sync repositories
  const handleSyncRepositories = async () => {
    if (!account) return;
    setIsSyncing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/v1/projects/github/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to refresh repositories');
      }

      setAccount(data.data.account);
      setProjects(data.data.projects);
      setSuccessMessage('Repositories synced successfully from GitHub!');
    } catch (err: any) {
      setError(err.message || 'Error syncing repositories');
    } finally {
      setIsSyncing(false);
    }
  };

  // Disconnect GitHub account
  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect GitHub account from Project Intelligence?')) return;
    setError(null);
    try {
      const res = await fetch('/api/v1/projects/github/disconnect', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        setAccount(null);
        setProjects([]);
        setUsernameInput('');
        setSuccessMessage('GitHub account disconnected and repositories removed.');
      }
    } catch (err: any) {
      setError(err.message || 'Error disconnecting account');
    }
  };

  // Save edited project description / status
  const handleSaveEdit = async (projectId: string) => {
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          description: editDescription,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update project');

      setProjects((prev) =>
        prev.map((p) => (p._id === projectId ? { ...p, description: editDescription, status: editStatus } : p)),
      );
      setEditingProjectId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update project');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Languages list
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    projects.forEach((p) => {
      if (p.language) langs.add(p.language);
    });
    return Array.from(langs).sort();
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Language filter
      if (selectedLanguage !== 'ALL' && project.language !== selectedLanguage) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'ALL' && project.status !== selectedStatus) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = project.name.toLowerCase().includes(query);
        const descMatch = (project.description || '').toLowerCase().includes(query);
        const langMatch = (project.language || '').toLowerCase().includes(query);
        return nameMatch || descMatch || langMatch;
      }
      return true;
    });
  }, [projects, selectedLanguage, selectedStatus, searchQuery]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <FolderGit2 size={20} />
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                Project Intelligence
              </h1>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: 0 }}>
              Live synchronization with GitHub repositories, technical stack extraction, and portfolio evidence.
            </p>
          </div>

          {account && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={handleSyncRepositories}
                disabled={isSyncing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.6rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease',
                }}
              >
                <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing...' : 'Sync Repositories'}
              </button>

              <button
                onClick={handleDisconnect}
                title="Disconnect GitHub account"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.85rem',
                  backgroundColor: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '0.6rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#e11d48',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Unlink size={15} />
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.75rem',
            color: '#b91c1c',
            fontSize: '0.9rem',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.75rem',
            color: '#15803d',
            fontSize: '0.9rem',
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {/* GitHub Account Connection Card */}
      {!account ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid var(--color-border)',
            borderRadius: '1.25rem',
            padding: '2.25rem 2rem',
            marginBottom: '2.5rem',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              opacity: 0.05,
              pointerEvents: 'none',
            }}
          >
            <GithubIcon size={240} />
          </div>

          <div style={{ maxWidth: '680px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.3rem 0.75rem',
                  backgroundColor: '#eef2ff',
                  border: '1px solid #c7d2fe',
                  borderRadius: '9999px',
                  color: '#4338ca',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <Sparkles size={13} />
                GitHub Integration
              </span>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Connect Your GitHub Account
            </h2>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Import your public GitHub repositories in one click. Project Intelligence automatically tracks your code repositories, displays descriptions and languages, and integrates them into your CareerOS profile.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Option A: Quick Username Import */}
              <form onSubmit={handleConnectByUsername} style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 280px' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#94a3b8',
                    }}
                  >
                    <GithubIcon size={17} color="#64748b" />
                  </div>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Enter GitHub username (e.g. Yesha0405)"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.5rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.65rem',
                      fontSize: '0.92rem',
                      backgroundColor: '#ffffff',
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isConnecting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.4rem',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.65rem',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    cursor: isConnecting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Fetching Repos...
                    </>
                  ) : (
                    <>
                      <FolderGit2 size={16} />
                      Fetch Repositories
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Connected Account Banner */
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--color-border)',
            borderRadius: '1rem',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt={account.githubUsername}
                style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #e2e8f0' }}
              />
            ) : (
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GithubIcon size={24} color="#0f172a" />
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                  @{account.githubUsername}
                </span>
                <a
                  href={account.profileUrl || `https://github.com/${account.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}
                  title="Open GitHub Profile"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.15rem 0 0 0' }}>
                Connected Account • {projects.length} public {projects.length === 1 ? 'repository' : 'repositories'} synced
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>
                Last Synced
              </span>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleDateString() : 'Just now'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Repositories Controls & Filters - ONLY SHOWN WHEN ACCOUNT IS CONNECTED */}
      {account && (
        <>
          {projects.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repositories..."
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.25rem',
                border: '1px solid var(--color-border)',
                borderRadius: '0.6rem',
                fontSize: '0.88rem',
                backgroundColor: '#ffffff',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Language filter */}
            {availableLanguages.length > 0 && (
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                style={{
                  padding: '0.55rem 0.85rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.6rem',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Languages ({projects.length})</option>
                {availableLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            )}

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                border: '1px solid var(--color-border)',
                borderRadius: '0.6rem',
                backgroundColor: '#ffffff',
                fontSize: '0.85rem',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem auto' }} />
          <p style={{ fontSize: '0.95rem' }}>Loading project intelligence...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px dashed var(--color-border)',
            borderRadius: '1rem',
            padding: '3rem 2rem',
            textAlign: 'center',
          }}
        >
          <FolderGit2 size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            {projects.length === 0 ? 'No repositories synced yet' : 'No matching repositories found'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto' }}>
            {projects.length === 0
              ? 'Connect your GitHub account or enter your username above to load your public repositories.'
              : 'Try adjusting your search query or language filter.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredProjects.map((project) => {
            const isEditing = editingProjectId === project._id;

            return (
              <div
                key={project._id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div>
                  {/* Top Row: Github Icon + Project Title + Status Badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                      <GithubIcon size={20} color="#0f172a" />
                      <span
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          letterSpacing: '-0.01em',
                        }}
                        title={project.name}
                      >
                        {project.name}
                      </span>
                    </div>

                    {/* Status Pill Badge */}
                    <span
                      style={{
                        backgroundColor: '#02638f',
                        color: '#ffffff',
                        borderRadius: '9999px',
                        padding: '0.28rem 0.9rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        letterSpacing: '0.01em',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {project.status || 'Completed'}
                    </span>
                  </div>

                  {/* Description */}
                  {isEditing ? (
                    <div style={{ marginBottom: '1rem' }}>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Enter project description..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0.5rem',
                          fontSize: '0.88rem',
                          color: '#0f172a',
                          outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as any)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '0.4rem',
                            fontSize: '0.82rem',
                          }}
                        >
                          <option value="Completed">Completed</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Active">Active</option>
                          <option value="Archived">Archived</option>
                        </select>
                        <button
                          onClick={() => handleSaveEdit(project._id)}
                          disabled={isSavingEdit}
                          style={{
                            padding: '0.35rem 0.75rem',
                            backgroundColor: '#0f172a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '0.4rem',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {isSavingEdit ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingProjectId(null)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: 'none',
                            borderRadius: '0.4rem',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      style={{
                        color: project.description ? '#475569' : '#64748b',
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        margin: '0.25rem 0 1rem 0',
                        minHeight: '2.8rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {project.description || 'No description provided.'}
                    </p>
                  )}

                  {/* Language and Tag badges */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '1.25rem' }}>
                    {project.language && (
                      <span
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.5rem',
                          padding: '0.22rem 0.65rem',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                        }}
                      >
                        {project.language}
                      </span>
                    )}

                    {project.stars > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fef3c7',
                          borderRadius: '0.5rem',
                          padding: '0.22rem 0.55rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <Star size={12} fill="#f59e0b" color="#f59e0b" />
                        {project.stars}
                      </span>
                    )}

                    {project.forks > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          backgroundColor: '#f8fafc',
                          color: '#64748b',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.5rem',
                          padding: '0.22rem 0.55rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}
                      >
                        <GitFork size={12} />
                        {project.forks}
                      </span>
                    )}
                  </div>
                </div>

                {/* Horizontal Divider Line */}
                <div>
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: '#f1f5f9',
                      margin: '0.25rem 0 1rem 0',
                    }}
                  />

                  {/* Bottom Row: Github icon + Repository link */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <a
                      href={project.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#475569',
                        textDecoration: 'none',
                        fontWeight: 500,
                        fontSize: '0.92rem',
                        transition: 'color 0.2s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
                    >
                      <GithubIcon size={17} color="currentColor" />
                      <span>Repository</span>
                    </a>

                    {/* Quick action: Edit description */}
                    <button
                      onClick={() => {
                        setEditingProjectId(project._id);
                        setEditDescription(project.description || '');
                        setEditStatus(project.status || 'Completed');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '0.3rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                      title="Edit description or status"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
};
