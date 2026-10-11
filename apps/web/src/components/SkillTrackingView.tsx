import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface SkillPerformance {
  skillId: string;
  skillName?: string;
  percentage?: number;
}

interface AssessmentAttempt {
  _id: string;
  assessmentId: string;
  status: string;
  startedAt?: string;
  submittedAt?: string;
  attemptNumber?: number;
  percentage?: number;
  score?: number;
  skillPerformance?: SkillPerformance[];
}

export interface AssessmentQuizMetadata {
  roadmapId?: string;
  roadmapVersion?: number;
  moduleId?: string;
  topicId?: string;
  type?: string;
}

const hasCompleteQuizIdentity = (metadata?: AssessmentQuizMetadata): metadata is Required<AssessmentQuizMetadata> =>
  typeof metadata?.roadmapId === 'string' && metadata.roadmapId.length > 0
  && typeof metadata.roadmapVersion === 'number' && Number.isFinite(metadata.roadmapVersion)
  && typeof metadata.moduleId === 'string' && metadata.moduleId.length > 0
  && typeof metadata.topicId === 'string' && metadata.topicId.length > 0
  && typeof metadata.type === 'string' && metadata.type.length > 0;

const quizIdentityKey = (metadata: Required<AssessmentQuizMetadata>) => JSON.stringify([
  metadata.roadmapId,
  metadata.roadmapVersion,
  metadata.moduleId,
  metadata.topicId,
  metadata.type,
]);

/** Assigns display numbers without mutating backend records or depending on presentation order. */
export function getSkillTrackingAttemptNumbers(
  attempts: AssessmentAttempt[],
  assessmentsById: Record<string, AssessmentQuizMetadata>,
): Map<string, number | undefined> {
  const groups = new Map<string, AssessmentAttempt[]>();
  const displayNumbers = new Map<string, number | undefined>();

  for (const attempt of attempts) {
    const metadata = assessmentsById[attempt.assessmentId];
    if (!hasCompleteQuizIdentity(metadata)) {
      displayNumbers.set(attempt._id, attempt.attemptNumber);
      continue;
    }
    const key = quizIdentityKey(metadata);
    const group = groups.get(key) ?? [];
    group.push(attempt);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    // Without valid timestamps the relative order cannot be established safely;
    // keep the backend's per-record value for those entries.
    const dated = group.filter((attempt) => Number.isFinite(Date.parse(attempt.startedAt ?? '')));
    for (const attempt of group) {
      if (!Number.isFinite(Date.parse(attempt.startedAt ?? ''))) {
        displayNumbers.set(attempt._id, attempt.attemptNumber);
      }
    }
    dated.sort((left, right) => {
      const timeDifference = Date.parse(left.startedAt!) - Date.parse(right.startedAt!);
      if (timeDifference !== 0) return timeDifference;
      const assessmentDifference = left.assessmentId.localeCompare(right.assessmentId);
      if (assessmentDifference !== 0) return assessmentDifference;
      const numberDifference = (left.attemptNumber ?? Number.MAX_SAFE_INTEGER)
        - (right.attemptNumber ?? Number.MAX_SAFE_INTEGER);
      if (numberDifference !== 0) return numberDifference;
      return left._id.localeCompare(right._id);
    });
    dated.forEach((attempt, index) => displayNumbers.set(attempt._id, index + 1));
  }

  return displayNumbers;
}

interface RoadmapChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
}

interface RoadmapSubtopic {
  id: string;
  title: string;
  checklist: RoadmapChecklistItem[];
}

interface RoadmapData {
  id: string;
  targetRole?: string;
  completedItemsCount: number;
  totalItemsCount: number;
  modules: Array<{
    title: string;
    topics: Array<{
      title: string;
      subtopics: RoadmapSubtopic[];
    }>;
  }>;
}

interface SkillTrackingViewProps {
  accessToken: string | null;
}

function unwrapData(body: any): any {
  return body?.data ?? body;
}

function formatDate(value?: string): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString();
}

function formatAttemptStatus(status: string): string {
  if (status === 'IN_PROGRESS') return 'In progress';
  if (status === 'SUBMITTED') return 'Submitted';
  if (status === 'ABANDONED') return 'Abandoned';
  return 'Status unavailable';
}

function getRoadmapSubtopics(roadmap: RoadmapData | null): RoadmapSubtopic[] {
  return (roadmap?.modules ?? []).flatMap((module) =>
    (module.topics ?? []).flatMap((topic) => topic.subtopics ?? []),
  );
}

export function SkillTrackingView({ accessToken }: SkillTrackingViewProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [assessmentTitles, setAssessmentTitles] = useState<Record<string, string>>({});
  const [assessmentMetadata, setAssessmentMetadata] = useState<Record<string, AssessmentQuizMetadata>>({});
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [goal, setGoal] = useState<{ targetRole: string } | null>(null);
  const [assessmentState, setAssessmentState] = useState({ loading: true, error: '' });
  const [roadmapState, setRoadmapState] = useState({ loading: true, error: '' });
  const [goalState, setGoalState] = useState({ loading: true, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    const headers = { Authorization: `Bearer ${accessToken ?? ''}` };

    const loadAttempts = async () => {
      setAssessmentState({ loading: true, error: '' });
      setAssessmentTitles({});
      setAssessmentMetadata({});
      try {
        const response = await fetch('/api/v1/assessments/attempts/me', { headers, signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error?.message || 'Could not load assessment history.');
        const data = unwrapData(body);
        if (!Array.isArray(data?.attempts)) throw new Error('Assessment history response was unavailable.');

        // Keep only score and skill evidence; answer content is not used or stored in component state.
        const scoreHistory: AssessmentAttempt[] = data.attempts.map((attempt: any) => ({
          _id: String(attempt._id),
          assessmentId: String(attempt.assessmentId),
          status: String(attempt.status ?? 'UNKNOWN'),
          startedAt: typeof attempt.startedAt === 'string' ? attempt.startedAt : undefined,
          submittedAt: typeof attempt.submittedAt === 'string' ? attempt.submittedAt : undefined,
          attemptNumber: typeof attempt.attemptNumber === 'number' ? attempt.attemptNumber : undefined,
          percentage: typeof attempt.percentage === 'number' ? attempt.percentage : undefined,
          score: typeof attempt.score === 'number' ? attempt.score : undefined,
          skillPerformance: Array.isArray(attempt.skillPerformance)
            ? attempt.skillPerformance.map((skill: any) => ({
                skillId: String(skill.skillId ?? ''),
                skillName: typeof skill.skillName === 'string' ? skill.skillName : undefined,
                percentage: typeof skill.percentage === 'number' ? skill.percentage : undefined,
              })).filter((skill: SkillPerformance) => skill.skillId.length > 0)
            : [],
        }));
        setAttempts(scoreHistory);
        setAssessmentState({ loading: false, error: '' });

        if (scoreHistory.length > 0) {
          try {
            const assessmentsResponse = await fetch('/api/v1/assessments', { headers, signal: controller.signal });
            if (assessmentsResponse.ok) {
              const assessmentsBody = await assessmentsResponse.json();
              const assessments = unwrapData(assessmentsBody)?.assessments;
              if (Array.isArray(assessments)) {
                const titles: Record<string, string> = {};
                const metadataById: Record<string, AssessmentQuizMetadata> = {};
                for (const assessment of assessments) {
                  const id = typeof assessment?._id === 'string' ? assessment._id : assessment?.id;
                  const title = typeof assessment?.title === 'string' ? assessment.title.trim() : '';
                  if (typeof id === 'string' && id) {
                    if (title) titles[id] = title;
                    metadataById[id] = {
                      roadmapId: typeof assessment?.roadmapId === 'string' ? assessment.roadmapId : undefined,
                      roadmapVersion: typeof assessment?.roadmapVersion === 'number' ? assessment.roadmapVersion : undefined,
                      moduleId: typeof assessment?.moduleId === 'string' ? assessment.moduleId : undefined,
                      topicId: typeof assessment?.topicId === 'string' ? assessment.topicId : undefined,
                      type: typeof assessment?.type === 'string' ? assessment.type : undefined,
                    };
                  }
                }
                setAssessmentTitles(titles);
                setAssessmentMetadata(metadataById);
              }
            }
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return;
            // Attempt history remains useful when title lookup is unavailable.
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setAssessmentState({ loading: false, error: error instanceof Error ? error.message : 'Could not load assessment history.' });
      }
    };

    const loadRoadmap = async () => {
      setRoadmapState({ loading: true, error: '' });
      try {
        const response = await fetch('/api/v1/roadmaps/active', { headers, signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error?.message || 'Could not load roadmap progress.');
        const data = unwrapData(body);
        setRoadmap(data?.roadmap ?? null);
        setRoadmapState({ loading: false, error: '' });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setRoadmapState({ loading: false, error: error instanceof Error ? error.message : 'Could not load roadmap progress.' });
      }
    };

    const loadGoal = async () => {
      setGoalState({ loading: true, error: '' });
      try {
        const response = await fetch('/api/v1/career-goals/active', { headers, signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error?.message || 'Could not load your career goal.');
        setGoal(unwrapData(body)?.goal ?? null);
        setGoalState({ loading: false, error: '' });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setGoalState({ loading: false, error: error instanceof Error ? error.message : 'Could not load your career goal.' });
      }
    };

    if (!accessToken) {
      setAssessmentState({ loading: false, error: 'Sign in to view assessment history.' });
      setRoadmapState({ loading: false, error: 'Sign in to view roadmap progress.' });
      setGoalState({ loading: false, error: 'Sign in to view your career goal.' });
      return () => controller.abort();
    }

    void loadAttempts();
    void loadRoadmap();
    void loadGoal();
    return () => controller.abort();
  }, [accessToken, refreshKey]);

  const subtopics = useMemo(() => getRoadmapSubtopics(roadmap), [roadmap]);
  const subtopicsById = useMemo(() => new Map(subtopics.map((subtopic) => [subtopic.id, subtopic])), [subtopics]);
  const skillHistory = useMemo(() => {
    const grouped = new Map<string, Array<{ attempt: AssessmentAttempt; result: SkillPerformance }>>();
    for (const attempt of attempts) {
      if (attempt.status !== 'SUBMITTED') continue;
      for (const result of attempt.skillPerformance ?? []) {
        const entries = grouped.get(result.skillId) ?? [];
        entries.push({ attempt, result });
        grouped.set(result.skillId, entries);
      }
    }
    return Array.from(grouped.entries()).map(([skillId, entries]) => ({
      skillId,
      entries: entries.sort((left, right) =>
        new Date(right.attempt.submittedAt ?? right.attempt.startedAt ?? 0).getTime()
        - new Date(left.attempt.submittedAt ?? left.attempt.startedAt ?? 0).getTime(),
      ),
    }));
  }, [attempts]);

  const attemptHistory = useMemo(() => [...attempts]
    .sort((left, right) =>
      new Date(right.submittedAt ?? right.startedAt ?? 0).getTime()
      - new Date(left.submittedAt ?? left.startedAt ?? 0).getTime(),
    ), [attempts]);
  const attemptNumbers = useMemo(
    () => getSkillTrackingAttemptNumbers(attempts, assessmentMetadata),
    [attempts, assessmentMetadata],
  );

  const completedCount = roadmap?.completedItemsCount ?? 0;
  const totalCount = roadmap?.totalItemsCount ?? 0;
  const completion = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : null;

  const sectionStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 'var(--border-radius-md)', padding: '1.25rem' };
  const mutedStyle = { color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <section className="cockpit-panel" style={{ ...sectionStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: '#0f172a', fontSize: '1.2rem', margin: '0 0 0.35rem' }}>Your skill evidence</h2>
          <p style={mutedStyle}>
            {goalState.loading ? 'Loading career goal…' : goalState.error ? 'Career goal unavailable.' : goal?.targetRole ? `Target role: ${goal.targetRole}` : 'No active career goal is set.'}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setRefreshKey((key) => key + 1)} style={{ width: 'auto' }}>
          <RefreshCw size={15} style={{ marginRight: '0.4rem' }} /> Refresh
        </Button>
      </section>

      <section className="cockpit-panel" style={sectionStyle}>
        <h2 style={{ color: '#0f172a', fontSize: '1.1rem', margin: '0 0 1rem' }}>Assessment results by skill</h2>
        {assessmentState.loading ? <p style={mutedStyle}>Loading assessment scores…</p>
          : assessmentState.error ? <p role="alert" style={{ ...mutedStyle, color: '#b91c1c' }}>{assessmentState.error}</p>
          : skillHistory.length === 0 ? <p style={mutedStyle}>No submitted skill-specific assessment results yet.</p>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.8rem' }}>
            {skillHistory.map(({ skillId, entries }) => {
              const latest = entries[0];
              const mappedSubtopic = subtopicsById.get(skillId);
              const label = latest.result.skillName || mappedSubtopic?.title || 'Unnamed assessment skill';
              return (
                <article key={skillId} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <strong style={{ color: '#0f172a' }}>{label}</strong>
                    <span className={`tech-badge ${mappedSubtopic ? 'tech-badge-emerald' : 'tech-badge-indigo'}`} style={{ flexShrink: 0 }}>
                      {mappedSubtopic ? 'Roadmap match' : 'Unmapped'}
                    </span>
                  </div>
                  {mappedSubtopic && <p style={{ ...mutedStyle, marginTop: '0.4rem' }}>Roadmap activity: {mappedSubtopic.title}</p>}
                  <p style={{ color: '#4f46e5', fontSize: '1.5rem', fontWeight: 800, margin: '0.75rem 0 0.2rem' }}>
                    {typeof latest.result.percentage === 'number' ? `${latest.result.percentage}%` : 'Score unavailable'}
                  </p>
                  <p style={mutedStyle}>Latest submitted result · {formatDate(latest.attempt.submittedAt)}</p>
                  {entries.length > 1 && <p style={{ ...mutedStyle, marginTop: '0.5rem' }}>{entries.length} submitted results in history</p>}
                </article>
              );
            })}
          </div>}
      </section>

      <section className="cockpit-panel" style={sectionStyle}>
        <h2 style={{ color: '#0f172a', fontSize: '1.1rem', margin: '0 0 1rem' }}>Roadmap completion</h2>
        {roadmapState.loading ? <p style={mutedStyle}>Loading roadmap progress…</p>
          : roadmapState.error ? <p role="alert" style={{ ...mutedStyle, color: '#b91c1c' }}>{roadmapState.error}</p>
          : !roadmap ? <p style={mutedStyle}>No active roadmap is available yet.</p>
          : <>
            <p style={{ color: '#0f172a', margin: '0 0 0.5rem' }}>{roadmap.targetRole || goal?.targetRole || 'Active roadmap'}</p>
            <p style={{ ...mutedStyle, marginBottom: '0.75rem' }}>
              {completion === null ? 'No checklist activities in this roadmap.' : `${completedCount} of ${totalCount} activities completed (${completion}%).`}
            </p>
            {completion !== null && <div role="progressbar" aria-label="Roadmap completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion} style={{ height: '8px', background: '#e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${completion}%`, height: '100%', background: '#4f46e5' }} />
            </div>}
            {subtopics.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.7rem', marginTop: '1rem' }}>
              {subtopics.map((subtopic) => {
                const count = subtopic.checklist.length;
                const done = subtopic.checklist.filter((item) => item.completed).length;
                return <div key={subtopic.id} style={{ padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{subtopic.title}</strong>
                  <p style={{ ...mutedStyle, marginTop: '0.3rem' }}>{count === 0 ? 'No checklist activities' : `${done} of ${count} activities completed`}</p>
                </div>;
              })}
            </div>}
          </>}
      </section>

      <section className="cockpit-panel" style={sectionStyle}>
        <h2 style={{ color: '#0f172a', fontSize: '1.1rem', margin: '0 0 1rem' }}>Assessment attempt history</h2>
        {assessmentState.loading ? <p style={mutedStyle}>Loading attempt history…</p>
          : assessmentState.error ? <p role="alert" style={{ ...mutedStyle, color: '#b91c1c' }}>{assessmentState.error}</p>
          : attemptHistory.length === 0 ? <p style={mutedStyle}>No assessment attempts yet.</p>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {attemptHistory.map((attempt) => {
              const score = typeof attempt.percentage === 'number' ? attempt.percentage : attempt.score;
              return <div key={attempt._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                <div>
                  <strong style={{ color: '#0f172a' }}>{assessmentTitles[attempt.assessmentId] || 'Assessment attempt'} · attempt {attemptNumbers.get(attempt._id) ?? ''}</strong>
                  <p style={{ ...mutedStyle, marginTop: '0.2rem' }}>{formatAttemptStatus(attempt.status)} · {formatDate(attempt.submittedAt ?? attempt.startedAt)}</p>
                </div>
                <strong style={{ color: '#4f46e5' }}>{attempt.status !== 'SUBMITTED' ? 'No submitted score' : typeof score === 'number' ? `${score}% overall` : 'Overall score unavailable'}</strong>
                {attempt.status === 'SUBMITTED' && !!attempt.skillPerformance?.length && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', width: '100%' }}>
                  {attempt.skillPerformance.map((result) => {
                    const mappedSubtopic = subtopicsById.get(result.skillId);
                    return <span key={result.skillId} style={{ border: '1px solid #e2e8f0', borderRadius: '999px', padding: '0.3rem 0.65rem', color: '#334155', fontSize: '0.8rem', background: '#fff' }}>
                      {mappedSubtopic?.title || result.skillName || 'Unnamed skill'} · {typeof result.percentage === 'number' ? `${result.percentage}%` : 'score unavailable'}{mappedSubtopic ? '' : ' · unmapped'}
                    </span>;
                  })}
                </div>}
              </div>;
            })}
          </div>}
      </section>
    </div>
  );
}
