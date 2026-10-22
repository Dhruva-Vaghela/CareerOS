import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Archive, CheckCircle2, Eye, FileText, Plus, RefreshCw, Sparkles, Trash2, Upload } from 'lucide-react';
import { Button } from './Button';
import { PdfViewerModal } from './PdfViewerModal';

type ResumeItem = { id: string; name?: string; filename: string; secureUrl: string; mimeType: string; size: number; version: number; status: 'ACTIVE' | 'ARCHIVED'; uploadDate: string };
type Version = { id: string; version: number; filename: string; secureUrl: string; mimeType: string; size: number; createdAt: string };
type Extraction = { status: 'COMPLETED' | 'FAILED'; parsedContent?: { wordCount?: number; pageCount?: number; source?: 'TEXT' | 'OCR'; warnings?: string[] }; errorMessage?: string } | null;
type Feedback = { status: string; summary?: string; strengths?: Array<{ title: string; evidence: string; whyItMatters: string }>; weaknesses?: Array<{ title: string; evidence: string; whyItMatters: string }>; suggestions?: Array<{ priority: string; issue: string; action: string; exampleRewrite?: string }>; recruiterFeedback?: { firstImpression: string; concerns: string[]; recommendation: string }; errorMessage?: string };
type Evaluation = { score: number; targetRole?: string; jobDescription?: string; hasJobDescription: boolean; breakdown: { matchedKeywords: string[]; missingKeywords: string[]; simulation?: { stages: Array<{ id: string; label: string; status: 'PASS' | 'REVIEW' | 'FAIL'; detail: string }>; decision: 'LIKELY_ADVANCE' | 'NEEDS_REVIEW' | 'LIKELY_FILTERED'; confidence: 'LOW' | 'MEDIUM'; requiredMatches: string[]; requiredGaps: string[]; preferredMatches: string[]; preferredGaps: string[]; explicitRules: Array<{ label: string; status: 'PASS' | 'REVIEW' | 'FAIL'; detail: string }>; requirements: { requiredSkills: string[]; minimumYearsExperience?: number; requiredEducation?: string; requiredLocation?: string }; ranking: { required: { matched: number; total: number; percentage: number }; preferred: { matched: number; total: number; percentage: number }; general: { matched: number; total: number; percentage: number }; role: { matched: number; total: number; percentage: number }; weightedPercentage: number } }; categories: Array<{ id: string; label: string; score: number; maxScore: number; findings: string[] }> }; interpretation?: string };
const panel: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 3px rgba(15,23,42,.04)' };
const label: CSSProperties = { display: 'block', fontSize: '.78rem', color: '#475569', fontWeight: 700, marginBottom: '.35rem' };
const input: CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '.65rem .75rem', font: 'inherit', boxSizing: 'border-box' };

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
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [minimumYearsExperience, setMinimumYearsExperience] = useState('');
  const [requiredEducation, setRequiredEducation] = useState('');
  const [requiredLocation, setRequiredLocation] = useState('');
  const [preview, setPreview] = useState(false);
  const auth = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const request = useCallback(async (url: string, init: RequestInit = {}) => {
    const response = await fetch(url, { ...init, headers: { ...auth, ...init.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error?.message || body.message || 'Request failed');
    return body;
  }, [auth]);

  const loadResumes = useCallback(async (preferredId?: string) => {
    const data = await request('/api/v1/resume/');
    const items: ResumeItem[] = data.resumes || [];
    setResumes(items);
    const next = preferredId && items.some((item) => item.id === preferredId) ? preferredId : (items.find((item) => item.status === 'ACTIVE') || items[0])?.id || '';
    setSelectedId(next);
    if (!next) { setVersions([]); setSelectedVersion(0); setEvaluation(null); setFeedback(null); }
    return next;
  }, [request]);

  const loadDetail = useCallback(async (resumeId: string) => {
    if (!resumeId) return;
    const data = await request(`/api/v1/resume/${resumeId}/versions`);
    const list: Version[] = data.versions || [];
    setVersions(list);
    const latest = list[0]?.version || 0;
    setSelectedVersion(latest);
  }, [request]);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    (async () => { try { const id = await loadResumes(); if (active && id) await loadDetail(id); } catch (e) { if (active) setError((e as Error).message); } finally { if (active) setLoading(false); } })();
    return () => { active = false; };
  }, [accessToken, loadResumes, loadDetail]);

  useEffect(() => {
    if (!selectedId || !selectedVersion) { setEvaluation(null); setFeedback(null); return; }
    let active = true;
    Promise.all([
      request(`/api/v1/resume/${selectedId}/versions/${selectedVersion}/ats`),
      request(`/api/v1/resume/${selectedId}/versions/${selectedVersion}/feedback`),
      request(`/api/v1/resume/${selectedId}/versions/${selectedVersion}/extraction`),
    ]).then(([ats, ai, parsed]) => { if (active) { const latest: Evaluation | null = ats.evaluation; setEvaluation(latest); setFeedback(ai.feedback); setExtraction(parsed.extraction); if (latest) { setTargetRole(latest.targetRole || ''); setJobDescription(latest.jobDescription || ''); const configured = latest.breakdown.simulation?.requirements; if (configured) { setRequiredSkills(configured.requiredSkills.join(', ')); setMinimumYearsExperience(configured.minimumYearsExperience?.toString() || ''); setRequiredEducation(configured.requiredEducation || ''); setRequiredLocation(configured.requiredLocation || ''); } } } }).catch((e) => { if (active) setError((e as Error).message); });
    return () => { active = false; };
  }, [selectedId, selectedVersion, request]);

  const upload = async (file?: File, append = false) => {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const body = new FormData(); body.append('file', file); body.append('targetRole', targetRole); body.append('jobDescription', jobDescription); body.append('requirements', JSON.stringify(requirements));
      if (!append && name.trim()) body.append('name', name.trim());
      const url = append ? `/api/v1/resume/${selectedId}/versions` : '/api/v1/resume/upload';
      const result = await request(url, { method: 'POST', body });
      await loadResumes(result.resume.id); await loadDetail(result.resume.id); setSelectedVersion(result.resume.version); setName('');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const runAnalysis = async (kind: 'ats' | 'feedback') => {
    if (!selectedId || !selectedVersion) return;
    setBusy(true); setError('');
    try { const data = await request(`/api/v1/resume/${selectedId}/versions/${selectedVersion}/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetRole, jobDescription, requirements }) }); if (kind === 'ats') setEvaluation(data.evaluation); else setFeedback(data.feedback); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const updateResume = async (changes: Record<string, string>) => { if (!selectedId) return; setBusy(true); setError(''); try { await request(`/api/v1/resume/${selectedId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) }); await loadResumes(selectedId); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const deleteResume = async () => { if (!selectedId || !window.confirm('Delete this resume and all of its versions and analysis?')) return; setBusy(true); try { await request(`/api/v1/resume/${selectedId}`, { method: 'DELETE' }); await loadResumes(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const current = resumes.find((item) => item.id === selectedId);
  const currentVersion = versions.find((item) => item.version === selectedVersion);
  const requirements = {
    requiredSkills: requiredSkills.split(',').map((skill) => skill.trim()).filter(Boolean),
    ...(minimumYearsExperience === '' ? {} : { minimumYearsExperience: Number(minimumYearsExperience) }),
    ...(requiredEducation.trim() ? { requiredEducation: requiredEducation.trim() } : {}),
    ...(requiredLocation.trim() ? { requiredLocation: requiredLocation.trim() } : {}),
  };

  return <div className="animate-reveal stagger-1" style={{ display: 'grid', gap: '1rem' }}>
    <header style={{ ...panel, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
      <div><span style={{ color: '#059669', fontWeight: 800, fontSize: '.75rem', letterSpacing: '.08em' }}>CAREER TOOLKIT</span><h2 style={{ margin: '.25rem 0', color: '#0f172a' }}>Resume Center</h2><p style={{ margin: 0, color: '#64748b' }}>Run a configurable ATS-style screen across parsing, minimum criteria, experience, education, and keyword ranking.</p></div>
      <label className="btn btn-primary" style={{ width: 'auto', cursor: busy ? 'wait' : 'pointer' }}><Upload size={16} style={{ marginRight: 6 }} /> Upload resume<input type="file" accept=".pdf,.docx" hidden disabled={busy} onChange={(e) => { void upload(e.target.files?.[0], false); e.currentTarget.value = ''; }} /></label>
    </header>
    {error && <div role="alert" style={{ ...panel, borderColor: '#fecaca', color: '#b91c1c', background: '#fef2f2' }}>{error}</div>}
    {loading ? <div style={panel}>Loading your resumes…</div> : <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 290px) minmax(0, 1fr)', gap: '1rem', alignItems: 'start' }}>
      <section style={{ ...panel, padding: '.75rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.35rem .4rem .75rem' }}><strong>Your resumes ({resumes.length})</strong><FileText size={18} color="#059669" /></div>
        {resumes.map((item) => <button key={item.id} onClick={() => { setSelectedId(item.id); setSelectedVersion(item.version); void loadDetail(item.id); }} style={{ display: 'block', width: '100%', textAlign: 'left', border: item.id === selectedId ? '1px solid #a7f3d0' : '1px solid transparent', borderRadius: 10, padding: '.75rem', background: item.id === selectedId ? '#ecfdf5' : '#fff', cursor: 'pointer', marginBottom: '.35rem' }}><strong style={{ display: 'block', color: '#0f172a' }}>{item.name || item.filename}</strong><span style={{ color: '#64748b', fontSize: '.8rem' }}>v{item.version} · {item.status.toLowerCase()}</span></button>)}
        {!resumes.length && <p style={{ color: '#64748b', padding: '.4rem' }}>Upload a resume to start your library.</p>}
      </section>
      {current ? <main style={{ display: 'grid', gap: '1rem', minWidth: 0 }}>
        <section style={{ ...panel, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}><div><input key={current.id} aria-label="Resume name" defaultValue={current.name || currentVersion?.filename.replace(/\.[^.]+$/, '') || ''} onBlur={(e) => { const value = e.target.value.trim(); if (value && value !== current.name) void updateResume({ name: value }); }} style={{ ...input, fontWeight: 800, fontSize: '1.1rem', maxWidth: 360 }} /><div style={{ color: '#64748b', fontSize: '.83rem', marginTop: '.3rem' }}>File: {currentVersion?.filename || current.filename} · {Math.ceil((currentVersion?.size ?? current.size) / 1024)} KB</div></div><div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {currentVersion?.mimeType === 'application/pdf' && <Button variant="secondary" style={{ width: 'auto' }} onClick={() => setPreview(true)}><Eye size={15} style={{ marginRight: 5 }} /> Preview</Button>}
          <label className="btn btn-secondary" style={{ width: 'auto', cursor: busy ? 'wait' : 'pointer' }}><Plus size={15} style={{ marginRight: 5 }} /> Add version<input type="file" accept=".pdf,.docx" hidden disabled={busy} onChange={(e) => { void upload(e.target.files?.[0], true); e.currentTarget.value = ''; }} /></label>
          <Button variant="secondary" disabled={busy} style={{ width: 'auto' }} onClick={() => void updateResume({ status: current.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' })}>{current.status === 'ACTIVE' ? <Archive size={15} style={{ marginRight: 5 }} /> : <CheckCircle2 size={15} style={{ marginRight: 5 }} />}{current.status === 'ACTIVE' ? 'Archive' : 'Reactivate'}</Button>
          <Button variant="secondary" disabled={busy} style={{ width: 'auto', color: '#b91c1c' }} onClick={() => void deleteResume()}><Trash2 size={15} style={{ marginRight: 5 }} /> Delete</Button>
        </div></section>
        <section style={{ ...panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '.8rem', alignItems: 'end' }}><div><label style={label} htmlFor="resume-version">Version</label><select id="resume-version" value={selectedVersion} onChange={(e) => setSelectedVersion(Number(e.target.value))} style={input}>{versions.map((v) => <option key={v.version} value={v.version}>Version {v.version} · {new Date(v.createdAt).toLocaleDateString()}</option>)}</select></div><div><label style={label} htmlFor="resume-target-role">Target role (optional)</label><input id="resume-target-role" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Product Designer" style={input} /></div><div style={{ gridColumn: '1 / -1' }}><label style={label} htmlFor="resume-job-description">Job description (optional)</label><textarea id="resume-job-description" rows={3} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste a job description for targeted keyword coverage" style={{ ...input, resize: 'vertical' }} /></div><div><label style={label} htmlFor="ats-skills">Required skills (comma separated)</label><input id="ats-skills" value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)} placeholder="React, SQL, Figma" style={input} /></div><div><label style={label} htmlFor="ats-years">Minimum years of experience</label><input id="ats-years" type="number" min="0" max="60" value={minimumYearsExperience} onChange={(e) => setMinimumYearsExperience(e.target.value)} placeholder="Optional" style={input} /></div><div><label style={label} htmlFor="ats-education">Required credential</label><input id="ats-education" value={requiredEducation} onChange={(e) => setRequiredEducation(e.target.value)} placeholder="e.g. Bachelor's degree" style={input} /></div><div><label style={label} htmlFor="ats-location">Required location phrase</label><input id="ats-location" value={requiredLocation} onChange={(e) => setRequiredLocation(e.target.value)} placeholder="e.g. New York" style={input} /></div><div style={{ gridColumn: '1 / -1', color: '#64748b', fontSize: '.8rem' }}>Explicit rule checks use resume text. Missing location or ambiguous dates are sent for review; they cannot verify real eligibility.</div></section>
        {extraction && <div role={extraction.status === 'FAILED' ? 'alert' : undefined} style={{ ...panel, padding: '.85rem 1rem', color: extraction.status === 'FAILED' ? '#b91c1c' : '#475569', background: extraction.status === 'FAILED' ? '#fef2f2' : '#f8fafc' }}><b>Parsing:</b> {extraction.status === 'FAILED' ? extraction.errorMessage : `${extraction.parsedContent?.source === 'OCR' ? 'OCR' : 'Selectable text'} · ${extraction.parsedContent?.wordCount ?? 0} words${extraction.parsedContent?.pageCount ? ` · ${extraction.parsedContent.pageCount} pages` : ''}`}{extraction.parsedContent?.warnings?.map((warning) => <div key={warning} style={{ fontSize: '.82rem', marginTop: '.25rem' }}>{warning}</div>)}</div>}
        <section style={{ ...panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '1rem' }}><div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0 }}>ATS screening simulation</h3><Button variant="secondary" disabled={busy} style={{ width: 'auto', padding: '.4rem .55rem' }} onClick={() => void runAnalysis('ats')}><RefreshCw size={14} /></Button></div>{evaluation ? <><div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#059669', margin: '.35rem 0' }}>{evaluation.score}<small style={{ fontSize: '1rem', color: '#64748b' }}>/100</small></div>{evaluation.breakdown.simulation && <><div style={{ padding: '.75rem', borderRadius: 10, background: evaluation.breakdown.simulation.decision === 'LIKELY_ADVANCE' ? '#ecfdf5' : evaluation.breakdown.simulation.decision === 'LIKELY_FILTERED' ? '#fef2f2' : '#fffbeb', color: evaluation.breakdown.simulation.decision === 'LIKELY_ADVANCE' ? '#047857' : evaluation.breakdown.simulation.decision === 'LIKELY_FILTERED' ? '#b91c1c' : '#a16207', fontWeight: 800 }}>{evaluation.breakdown.simulation.decision.replaceAll('_', ' ')} <small>· {evaluation.breakdown.simulation.confidence.toLowerCase()} confidence</small></div><p style={{ color: '#64748b', fontSize: '.8rem', lineHeight: 1.5 }}>{evaluation.interpretation}</p><div style={{ display: 'grid', gap: '.5rem' }}>{evaluation.breakdown.simulation.stages.map((stage) => <div key={stage.id} style={{ border: '1px solid #e2e8f0', borderRadius: 9, padding: '.65rem' }}><b style={{ color: stage.status === 'PASS' ? '#047857' : stage.status === 'FAIL' ? '#b91c1c' : '#a16207' }}>{stage.status}</b> · <b>{stage.label}</b><div style={{ color: '#64748b', fontSize: '.82rem', marginTop: '.25rem' }}>{stage.detail}</div></div>)}</div><p style={{ fontSize: '.85rem' }}><b>Required criteria found:</b> {evaluation.breakdown.simulation.requiredMatches.join(', ') || 'None identified'}<br /><b>Potential gaps:</b> {evaluation.breakdown.simulation.requiredGaps.join(', ') || 'None inferred'}<br /><b>Preferred matches:</b> {evaluation.breakdown.simulation.preferredMatches.join(', ') || 'None identified'}</p><b>Configured screening rules</b>{evaluation.breakdown.simulation.explicitRules.map((rule) => <div key={rule.label} style={{ padding: '.45rem 0', fontSize: '.85rem' }}><strong>{rule.status}</strong> · {rule.label}: {rule.detail}</div>)}</>}{evaluation.targetRole && <p style={{ margin: '.5rem 0', fontSize: '.85rem' }}>Target: {evaluation.targetRole}</p>}<p style={{ fontSize: '.85rem' }}><b>Matched terms:</b> {evaluation.breakdown.matchedKeywords?.slice(0, 12).join(', ') || 'No matched keywords'}<br /><b>Missing terms:</b> {evaluation.breakdown.missingKeywords?.slice(0, 12).join(', ') || 'None identified'}</p></> : <p style={{ color: '#64748b' }}>No screening simulation for this version yet. Add the job description and run the simulation to evaluate it against stated criteria.</p>}</div>
          <div><h3 style={{ margin: 0, display: 'flex', gap: 6, alignItems: 'center' }}><Sparkles size={17} color="#7c3aed" /> AI feedback</h3>{feedback?.status === 'COMPLETED' ? <><p style={{ lineHeight: 1.55 }}>{feedback.summary}</p><b>Strengths</b><ul>{feedback.strengths?.slice(0, 4).map((x, i) => <li key={i}>{x.title} — {x.whyItMatters}</li>)}</ul><b>Areas to improve</b><ul>{feedback.weaknesses?.slice(0, 4).map((x, i) => <li key={i}>{x.title} — {x.evidence}</li>)}</ul>{feedback.suggestions?.slice(0, 3).map((x, i) => <p key={i} style={{ padding: '.65rem', background: '#f8fafc', borderRadius: 8 }}><b>{x.priority}:</b> {x.action}{x.exampleRewrite && <><br /><i>{x.exampleRewrite}</i></>}</p>)}{feedback.recruiterFeedback && <div style={{ borderLeft: '3px solid #a78bfa', paddingLeft: '.7rem' }}><b>Recruiter view</b><p>{feedback.recruiterFeedback.firstImpression}</p><p>{feedback.recruiterFeedback.recommendation}</p></div>}</> : <p style={{ color: feedback?.status === 'FAILED' ? '#b91c1c' : '#64748b' }}>{feedback?.status === 'FAILED' ? feedback.errorMessage || 'Analysis failed. Retry when ready.' : 'Feedback has not been generated for this version yet.'}</p>}<Button disabled={busy} variant="secondary" style={{ width: 'auto' }} onClick={() => void runAnalysis('feedback')}><Sparkles size={14} style={{ marginRight: 5 }} /> Refresh feedback</Button></div>
        </section>
      </main> : <section style={{ ...panel, textAlign: 'center', padding: '3rem 1rem' }}><FileText size={36} color="#94a3b8" /><h3>No resumes yet</h3><p style={{ color: '#64748b' }}>Upload a PDF or DOCX to create your first resume version.</p><div style={{ maxWidth: 420, margin: '1.2rem auto', textAlign: 'left' }}><label style={label} htmlFor="new-resume-name">Resume name (optional)</label><input id="new-resume-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Product design roles" style={input} /></div><label className="btn btn-primary" style={{ width: 'auto', cursor: 'pointer' }}><Upload size={15} style={{ marginRight: 5 }} /> Choose resume<input type="file" accept=".pdf,.docx" hidden disabled={busy} onChange={(e) => { void upload(e.target.files?.[0], false); e.currentTarget.value = ''; }} /></label></section>}
    </div>}
    {currentVersion?.mimeType === 'application/pdf' && <PdfViewerModal isOpen={preview} onClose={() => setPreview(false)} pdfUrl={currentVersion.secureUrl} filename={currentVersion.filename} accessToken={accessToken} />}
  </div>;
}
