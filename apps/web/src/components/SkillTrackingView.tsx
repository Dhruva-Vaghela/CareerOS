import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface SkillPerformance {
  skillId: string;
  skillName?: string;
  percentage?: number;
}

export interface AssessmentAttempt {
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

export interface AttemptStatusCounts {
  total: number;
  submitted: number;
  inProgress: number;
  abandoned: number;
  unknown: number;
}

export interface ScoreHistoryPoint {
  attemptId: string;
  assessmentId: string;
  title: string;
  attemptNumber?: number;
  score: number;
  submittedAt: string;
}

export interface ScoreHistoryGroup {
  key: string;
  label: string;
  points: ScoreHistoryPoint[];
  assessmentIds: string[];
}

export interface SkillImprovement {
  key: string;
  skillId: string;
  skillName: string;
  assessmentId: string;
  assessmentTitle: string;
  earlierScore: number;
  laterScore: number;
  changePoints: number;
  earlierDate: string;
  laterDate: string;
}

export function getScorePointDateLabels(point: ScoreHistoryPoint): { date: string; detail: string } {
  const submittedAt = new Date(point.submittedAt);
  return {
    date: submittedAt.toLocaleDateString(),
    detail: point.attemptNumber === undefined ? submittedAt.toLocaleTimeString() : `Attempt ${point.attemptNumber}`,
  };
}

export function getScorePointAccessibleLabel(point: ScoreHistoryPoint): string {
  const attempt = point.attemptNumber === undefined ? '' : `, attempt ${point.attemptNumber}`;
  return `${point.title}${attempt}, ${point.score} percent, submitted ${new Date(point.submittedAt).toLocaleString()}`;
}

export function getRadarAxisLabel(skillName: string): string {
  const label = skillName.trim();
  return label.length > 14 ? `${label.slice(0, 13).trimEnd()}…` : label;
}

export function getAttemptStatusCounts(attempts: AssessmentAttempt[]): AttemptStatusCounts {
  return attempts.reduce<AttemptStatusCounts>((counts, attempt) => {
    counts.total += 1;
    if (attempt.status === 'SUBMITTED') counts.submitted += 1;
    else if (attempt.status === 'IN_PROGRESS') counts.inProgress += 1;
    else if (attempt.status === 'ABANDONED') counts.abandoned += 1;
    else counts.unknown += 1;
    return counts;
  }, { total: 0, submitted: 0, inProgress: 0, abandoned: 0, unknown: 0 });
}

const getAttemptPercentage = (attempt: AssessmentAttempt): number | undefined => {
  const value = typeof attempt.percentage === 'number' ? attempt.percentage : attempt.score;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : undefined;
};

const getValidTimestamp = (value?: string): number | undefined => {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
};

function getLogicalQuizKey(assessmentId: string, metadata?: AssessmentQuizMetadata): string {
  return hasCompleteQuizIdentity(metadata)
    ? `quiz:${quizIdentityKey(metadata)}`
    : `assessment:${assessmentId}`;
}

export function getScoreHistoryGroups(
  attempts: AssessmentAttempt[],
  assessmentsById: Record<string, AssessmentQuizMetadata>,
  titlesById: Record<string, string>,
  attemptNumbers: Map<string, number | undefined>,
): ScoreHistoryGroup[] {
  const groups = new Map<string, ScoreHistoryPoint[]>();
  const titles = new Map<string, string>();
  const assessmentIdsByKey = new Map<string, Set<string>>();

  for (const attempt of attempts) {
    if (attempt.status !== 'SUBMITTED') continue;
    const score = getAttemptPercentage(attempt);
    const submittedAt = attempt.submittedAt;
    if (score === undefined || getValidTimestamp(submittedAt) === undefined) continue;

    const key = getLogicalQuizKey(attempt.assessmentId, assessmentsById[attempt.assessmentId]);
    const assessmentTitle = titlesById[attempt.assessmentId] || 'Assessment attempt';
    const points = groups.get(key) ?? [];
    points.push({
      attemptId: attempt._id,
      assessmentId: attempt.assessmentId,
      title: assessmentTitle,
      attemptNumber: attemptNumbers.get(attempt._id),
      score,
      submittedAt: submittedAt!,
    });
    groups.set(key, points);
    if (!titles.has(key)) titles.set(key, assessmentTitle);
    const ids = assessmentIdsByKey.get(key) ?? new Set<string>();
    ids.add(attempt.assessmentId);
    assessmentIdsByKey.set(key, ids);
  }

  return Array.from(groups, ([key, points]) => ({
    key,
    label: titles.get(key) ?? 'Assessment attempt',
    points: points.sort((left, right) =>
      Date.parse(left.submittedAt) - Date.parse(right.submittedAt)
      || left.assessmentId.localeCompare(right.assessmentId)
      || (left.attemptNumber ?? Number.MAX_SAFE_INTEGER) - (right.attemptNumber ?? Number.MAX_SAFE_INTEGER)
      || left.attemptId.localeCompare(right.attemptId),
    ),
    assessmentIds: Array.from(assessmentIdsByKey.get(key) ?? []).sort(),
  })).sort((left, right) => left.label.localeCompare(right.label) || left.key.localeCompare(right.key));
}

export function getAttemptSkillScores(attempt: AssessmentAttempt | undefined): SkillPerformance[] {
  if (!attempt || attempt.status !== 'SUBMITTED') return [];
  const unique = new Map<string, SkillPerformance>();
  for (const skill of attempt.skillPerformance ?? []) {
    if (!skill.skillId || typeof skill.percentage !== 'number'
      || !Number.isFinite(skill.percentage) || skill.percentage < 0 || skill.percentage > 100) continue;
    if (!unique.has(skill.skillId)) unique.set(skill.skillId, skill);
  }
  return Array.from(unique.values());
}

export function getRadarChartSkills(attempt: AssessmentAttempt | undefined): SkillPerformance[] {
  return getAttemptSkillScores(attempt);
}

export function canRenderRadarChart(skills: SkillPerformance[]): boolean {
  return skills.length >= 3;
}

export function getSkillImprovements(
  attempts: AssessmentAttempt[],
  titlesById: Record<string, string>,
): SkillImprovement[] {
  const comparisons = new Map<string, Array<{
    attempt: AssessmentAttempt;
    score: number;
    skillName: string;
    timestamp: number;
  }>>();

  for (const attempt of attempts) {
    const timestamp = getValidTimestamp(attempt.submittedAt);
    if (attempt.status !== 'SUBMITTED' || timestamp === undefined) continue;
    for (const result of attempt.skillPerformance ?? []) {
      if (!result.skillId || typeof result.percentage !== 'number'
        || !Number.isFinite(result.percentage) || result.percentage < 0 || result.percentage > 100) continue;
      const key = JSON.stringify([attempt.assessmentId, result.skillId]);
      const entries = comparisons.get(key) ?? [];
      if (entries.some((entry) => entry.attempt._id === attempt._id)) continue;
      entries.push({ attempt, score: result.percentage, skillName: result.skillName || result.skillId, timestamp });
      comparisons.set(key, entries);
    }
  }

  const improvements: SkillImprovement[] = [];
  for (const [key, entries] of comparisons) {
    if (entries.length < 2) continue;
    const [assessmentId, skillId] = JSON.parse(key) as [string, string];
    entries.sort((left, right) => left.timestamp - right.timestamp
      || (left.attempt.attemptNumber ?? Number.MAX_SAFE_INTEGER) - (right.attempt.attemptNumber ?? Number.MAX_SAFE_INTEGER)
      || left.attempt._id.localeCompare(right.attempt._id));
    const earlier = entries.at(-2)!;
    const later = entries.at(-1)!;
    improvements.push({
      key,
      skillId,
      skillName: later.skillName,
      assessmentId,
      assessmentTitle: titlesById[assessmentId] || 'Assessment attempt',
      earlierScore: earlier.score,
      laterScore: later.score,
      changePoints: later.score - earlier.score,
      earlierDate: earlier.attempt.submittedAt!,
      laterDate: later.attempt.submittedAt!,
    });
  }
  return improvements.sort((left, right) => left.assessmentTitle.localeCompare(right.assessmentTitle)
    || left.skillName.localeCompare(right.skillName));
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

const chartPanelStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--border-radius-lg)',
  boxShadow: 'var(--shadow-light-sm)',
  padding: '1.25rem',
  minWidth: 0,
};

const chartTitleStyle = {
  color: 'var(--color-text-primary)',
  fontSize: '1.05rem',
  fontWeight: 700,
  margin: '0 0 0.35rem',
};

const chartMutedStyle = {
  color: 'var(--color-text-muted)',
  fontSize: '0.85rem',
  margin: '0 0 1rem',
};

function ScoreTrendChart({ points }: { points: ScoreHistoryPoint[] }) {
  if (points.length === 0) {
    return <p style={{ ...chartMutedStyle, margin: 0 }}>No submitted scores with reliable submission dates are available for this quiz.</p>;
  }

  const width = 640;
  const height = 270;
  const left = 42;
  const right = 18;
  const top = 16;
  const bottom = 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const labelStride = Math.max(1, Math.ceil(points.length / 8));
  const positions = points.map((point, index) => ({
    point,
    x: points.length === 1 ? left + plotWidth / 2 : left + (index / (points.length - 1)) * plotWidth,
    y: top + (1 - point.score / 100) * plotHeight,
  }));
  const path = positions.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const area = `${path} L ${positions.at(-1)!.x} ${top + plotHeight} L ${positions[0].x} ${top + plotHeight} Z`;

  return <div>
    <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Submitted assessment score history, shown as percentages over submission dates" style={{ display: 'block', width: '100%', overflow: 'visible' }}>
      <title>Submitted score history</title>
      <desc>Only submitted assessment scores with valid submission dates are plotted. The vertical scale is percentage from zero to one hundred.</desc>
      {[0, 25, 50, 75, 100].map((tick) => {
        const y = top + (1 - tick / 100) * plotHeight;
        return <g key={tick}>
          <line x1={left} x2={width - right} y1={y} y2={y} stroke="var(--color-border-subtle)" />
          <text x={left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--color-text-muted)">{tick}%</text>
        </g>;
      })}
      <path d={area} fill="var(--color-primary)" opacity="0.09" />
      {positions.length > 1 && <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {positions.map(({ point, x, y }, index) => <g key={point.attemptId}>
        <circle
          cx={x}
          cy={y}
          r="5"
          fill="var(--color-primary)"
          stroke="var(--color-surface)"
          strokeWidth="2"
          tabIndex={0}
          role="img"
          aria-label={getScorePointAccessibleLabel(point)}
        >
          <title>{getScorePointAccessibleLabel(point)}</title>
        </circle>
        {(index % labelStride === 0 || index === points.length - 1) && <text x={x} y={top + plotHeight + 14} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">
          <tspan x={x} dy="0">{getScorePointDateLabels(point).date}</tspan>
          <tspan x={x} dy="12">{getScorePointDateLabels(point).detail}</tspan>
        </text>}
      </g>)}
    </svg>
    <div aria-label="Plotted score results" style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
      {points.map((point) => <div key={point.attemptId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{point.attemptNumber === undefined ? 'Attempt number unavailable' : `Attempt ${point.attemptNumber}`} · {point.title} · {new Date(point.submittedAt).toLocaleString()}</span>
        <strong style={{ color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>{point.score}%</strong>
      </div>)}
    </div>
  </div>;
}

function SkillRadarChart({ skills }: { skills: SkillPerformance[] }) {
  const validSkills = skills;
  if (!canRenderRadarChart(validSkills)) {
    return <div role="status" style={{ border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-primary)', borderRadius: 'var(--border-radius-md)', padding: '0.85rem 1rem', background: 'var(--color-surface-hover)' }}>
      <strong style={{ display: 'block', color: 'var(--color-text-primary)', fontSize: '0.88rem', marginBottom: '0.25rem' }}>Not enough skill scores for a radar chart</strong>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', margin: 0 }}>A radar comparison needs at least three valid skill percentages from this one submitted attempt. This attempt has {validSkills.length}; any available scores are still shown in the bar chart.</p>
    </div>;
  }

  const width = 400;
  const height = 330;
  const centerX = width / 2;
  const centerY = 154;
  const radius = 94;
  const pointAt = (index: number, value: number, extraRadius = 0) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / validSkills.length;
    const distance = (radius + extraRadius) * value;
    return { x: centerX + Math.cos(angle) * distance, y: centerY + Math.sin(angle) * distance, angle };
  };
  const polygon = validSkills.map((skill, index) => {
    const point = pointAt(index, skill.percentage!);
    return `${point.x},${point.y}`;
  }).join(' ');
  const axisPolygon = (scale: number) => validSkills.map((_, index) => {
    const point = pointAt(index, scale);
    return `${point.x},${point.y}`;
  }).join(' ');

  return <div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Radar chart comparing skill score percentages within one submitted assessment attempt" style={{ display: 'block', width: '100%', maxHeight: '330px' }}>
      <title>Skill scores in this assessment attempt</title>
      <desc>Each axis shows one skill percentage from this attempt on a zero to one hundred scale.</desc>
      {[0.25, 0.5, 0.75, 1].map((scale) => <polygon key={scale} points={axisPolygon(scale)} fill="none" stroke="var(--color-border)" strokeWidth="1" />)}
      {validSkills.map((skill, index) => {
        const point = pointAt(index, 1);
        const label = pointAt(index, 1, 18);
        const anchor = Math.abs(Math.cos(label.angle)) < 0.25 ? 'middle' : Math.cos(label.angle) > 0 ? 'start' : 'end';
        return <g key={skill.skillId}>
          <line x1={centerX} y1={centerY} x2={point.x} y2={point.y} stroke="var(--color-border)" />
          <text x={label.x} y={label.y} textAnchor={anchor} dominantBaseline="middle" fontSize="10" fill="var(--color-text-secondary)">
            <title>{skill.skillName || skill.skillId}</title>
            {getRadarAxisLabel(skill.skillName || skill.skillId)}
          </text>
        </g>;
      })}
      <polygon points={polygon} fill="var(--color-primary)" fillOpacity="0.18" stroke="var(--color-primary)" strokeWidth="2.5" />
      {validSkills.map((skill, index) => {
        const point = pointAt(index, skill.percentage!);
        return <circle key={skill.skillId} cx={point.x} cy={point.y} r="4" fill="var(--color-primary)"><title>{`${skill.skillName || skill.skillId}: ${skill.percentage}%`}</title></circle>;
      })}
    </svg>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem 0.8rem', marginTop: '0.25rem' }}>
      {validSkills.map((skill) => <span key={skill.skillId} style={{ minWidth: 0, overflowWrap: 'anywhere', color: 'var(--color-text-secondary)', fontSize: '0.78rem' }}>{skill.skillName || skill.skillId}: <strong>{skill.percentage}%</strong></span>)}
    </div>
  </div>;
}

function SkillScoreBars({ skills }: { skills: SkillPerformance[] }) {
  if (skills.length === 0) return <p style={{ ...chartMutedStyle, margin: 0 }}>This submitted attempt has no valid per-skill percentages to compare.</p>;
  return <div style={{ display: 'grid', gap: '0.85rem' }}>
    {skills.map((skill) => <div key={skill.skillId}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.3rem', color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{skill.skillName || skill.skillId}</span><strong style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{skill.percentage}%</strong>
      </div>
      <div role="progressbar" aria-label={`${skill.skillName || skill.skillId} score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={skill.percentage} style={{ height: '9px', borderRadius: '99px', overflow: 'hidden', background: 'var(--color-bg-alt)' }}>
        <div style={{ height: '100%', width: `${skill.percentage}%`, background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))', borderRadius: 'inherit' }} />
      </div>
    </div>)}
  </div>;
}

function AttemptStatusDonut({ counts }: { counts: AttemptStatusCounts }) {
  const segments = [
    { label: 'Submitted', value: counts.submitted, color: 'var(--color-success)' },
    { label: 'In progress', value: counts.inProgress, color: 'var(--color-primary)' },
    { label: 'Abandoned', value: counts.abandoned, color: 'var(--color-warning)' },
    { label: 'Unknown status', value: counts.unknown, color: 'var(--color-text-muted)' },
  ].filter((segment) => segment.value > 0);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total === 0) return <p style={{ ...chartMutedStyle, margin: 0 }}>No assessment attempts are available yet.</p>;

  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;
  const arcs = segments.map((segment) => {
    const length = (segment.value / total) * circumference;
    const offset = accumulated;
    accumulated += length;
    return { ...segment, length, offset };
  });

  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
    <svg viewBox="0 0 120 120" role="img" aria-label={`Attempt status distribution across ${total} attempts`} style={{ width: '150px', maxWidth: '45%', transform: 'rotate(-90deg)' }}>
      <title>Assessment attempt status distribution</title>
      <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--color-bg-alt)" strokeWidth="16" />
      {arcs.map((arc) => <circle key={arc.label} cx="60" cy="60" r={radius} fill="none" stroke={arc.color} strokeWidth="16" strokeDasharray={`${arc.length} ${circumference - arc.length}`} strokeDashoffset={-arc.offset}>
        <title>{`${arc.label}: ${arc.value}`}</title>
      </circle>)}
    </svg>
    <ul aria-label="Attempt status legend" style={{ listStyle: 'none', display: 'grid', gap: '0.55rem', padding: 0, margin: 0 }}>
      {[
        { label: 'Submitted', value: counts.submitted, color: 'var(--color-success)' },
        { label: 'In progress', value: counts.inProgress, color: 'var(--color-primary)' },
        { label: 'Abandoned', value: counts.abandoned, color: 'var(--color-warning)' },
        { label: 'Unknown status', value: counts.unknown, color: 'var(--color-text-muted)' },
      ].map((item) => <li key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
        <span aria-hidden="true" style={{ width: '0.65rem', height: '0.65rem', borderRadius: '50%', background: item.color }} />
        {item.label}<strong style={{ color: 'var(--color-text-primary)', marginLeft: 'auto' }}>{item.value}</strong>
      </li>)}
    </ul>
  </div>;
}

export function SkillTrackingView({ accessToken }: SkillTrackingViewProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedScoreGroupKey, setSelectedScoreGroupKey] = useState('');
  const [selectedSkillAttemptId, setSelectedSkillAttemptId] = useState('');
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
  const statusCounts = useMemo(() => getAttemptStatusCounts(attempts), [attempts]);
  const scoreHistoryGroups = useMemo(
    () => getScoreHistoryGroups(attempts, assessmentMetadata, assessmentTitles, attemptNumbers),
    [attempts, assessmentMetadata, assessmentTitles, attemptNumbers],
  );
  const selectedScoreGroup = scoreHistoryGroups.find((group) => group.key === selectedScoreGroupKey)
    ?? scoreHistoryGroups[0];
  const submittedAttempts = attemptHistory.filter((attempt) => attempt.status === 'SUBMITTED');
  const selectedSkillAttempt = submittedAttempts.find((attempt) => attempt._id === selectedSkillAttemptId)
    ?? submittedAttempts[0];
  const selectedAttemptSkills = useMemo(() => getAttemptSkillScores(selectedSkillAttempt), [selectedSkillAttempt]);
  const selectedRadarSkills = useMemo(() => getRadarChartSkills(selectedSkillAttempt), [selectedSkillAttempt]);
  const skillsWithResults = useMemo(() => new Set(
    attempts.filter((attempt) => attempt.status === 'SUBMITTED')
      .flatMap((attempt) => getAttemptSkillScores(attempt).map((skill) => skill.skillId)),
  ).size, [attempts]);
  const improvements = useMemo(() => getSkillImprovements(attempts, assessmentTitles), [attempts, assessmentTitles]);

  const completedCount = roadmap?.completedItemsCount ?? 0;
  const totalCount = roadmap?.totalItemsCount ?? 0;
  const completion = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : null;

  const sectionStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 'var(--border-radius-md)', padding: '1.25rem' };
  const mutedStyle = { color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 };
  const summaryCards = [
    { label: 'Total attempts', value: statusCounts.total, accent: 'var(--color-primary)' },
    { label: 'Submitted', value: statusCounts.submitted, accent: 'var(--color-success)' },
    { label: 'In progress', value: statusCounts.inProgress, accent: 'var(--color-primary)' },
    { label: 'Abandoned', value: statusCounts.abandoned, accent: 'var(--color-warning)' },
    { label: 'Skills with results', value: skillsWithResults, accent: 'var(--color-accent)' },
  ];

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

      <section aria-label="Assessment summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 145px), 1fr))', gap: '0.75rem' }}>
        {summaryCards.map((card) => <article key={card.label} className="cockpit-panel" style={{ ...chartPanelStyle, padding: '1rem 1.1rem' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', fontWeight: 600, margin: '0 0 0.35rem' }}>{card.label}</p>
          <strong style={{ color: card.accent, fontSize: '1.7rem', lineHeight: 1.2 }}>{assessmentState.loading || assessmentState.error ? '—' : card.value}</strong>
        </article>)}
      </section>

      <section aria-label="Assessment analytics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1rem', alignItems: 'stretch' }}>
        <article className="cockpit-panel" style={chartPanelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={chartTitleStyle}>Score history</h2>
              <p style={chartMutedStyle}>Submitted scores over time · percentages are assessment results, not proficiency levels.</p>
            </div>
            {scoreHistoryGroups.length > 1 && <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
              Quiz&nbsp;
              <select aria-label="Choose quiz score history" value={selectedScoreGroup?.key ?? ''} onChange={(event) => setSelectedScoreGroupKey(event.target.value)} style={{ maxWidth: '220px', padding: '0.45rem', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)', color: 'var(--color-text-primary)', background: 'var(--color-surface)' }}>
                {scoreHistoryGroups.map((group) => <option key={group.key} value={group.key}>{group.label}</option>)}
              </select>
            </label>}
          </div>
          {assessmentState.loading ? <p style={chartMutedStyle}>Loading score history…</p>
            : assessmentState.error ? <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>{assessmentState.error}</p>
            : !selectedScoreGroup ? <p style={{ ...chartMutedStyle, margin: 0 }}>Score history will appear after a submitted assessment with a score and submission date.</p>
            : <>
              {selectedScoreGroup.assessmentIds.length > 1 && <p style={{ color: 'var(--color-warning)', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>Recorded scores from regenerated versions of this quiz. The versions may differ, so this is not evidence of improvement.</p>}
              <ScoreTrendChart points={selectedScoreGroup.points} />
            </>}
        </article>
        <article className="cockpit-panel" style={chartPanelStyle}>
          <h2 style={chartTitleStyle}>Attempt status</h2>
          <p style={chartMutedStyle}>Each attempt is counted once using its returned status.</p>
          {assessmentState.loading ? <p style={chartMutedStyle}>Loading attempt statuses…</p>
            : assessmentState.error ? <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>{assessmentState.error}</p>
            : <AttemptStatusDonut counts={statusCounts} />}
        </article>
      </section>

      <section aria-label="Assessment skill comparisons" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1rem', alignItems: 'stretch' }}>
        <article className="cockpit-panel" style={chartPanelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={chartTitleStyle}>Skill comparison</h2>
              <p style={chartMutedStyle}>All values come from the same submitted attempt.</p>
            </div>
            {submittedAttempts.length > 1 && <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
              Attempt&nbsp;
              <select aria-label="Choose submitted attempt for skill comparison" value={selectedSkillAttempt?._id ?? ''} onChange={(event) => setSelectedSkillAttemptId(event.target.value)} style={{ maxWidth: '220px', padding: '0.45rem', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)', color: 'var(--color-text-primary)', background: 'var(--color-surface)' }}>
                {submittedAttempts.map((attempt) => <option key={attempt._id} value={attempt._id}>{assessmentTitles[attempt.assessmentId] || 'Assessment attempt'} · {formatDate(attempt.submittedAt)}</option>)}
              </select>
            </label>}
          </div>
          {assessmentState.loading ? <p style={chartMutedStyle}>Loading skill results…</p>
            : assessmentState.error ? <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>{assessmentState.error}</p>
            : !selectedSkillAttempt ? <p style={{ ...chartMutedStyle, margin: 0 }}>Submit an assessment with skill-specific results to compare skills.</p>
            : <>
              <p style={{ color: 'var(--color-text-primary)', fontSize: '0.82rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{assessmentTitles[selectedSkillAttempt.assessmentId] || 'Assessment attempt'} · attempt {attemptNumbers.get(selectedSkillAttempt._id) ?? 'number unavailable'}</p>
              <SkillRadarChart skills={selectedRadarSkills} />
            </>}
        </article>
        <article className="cockpit-panel" style={chartPanelStyle}>
          <h2 style={chartTitleStyle}>Scores by skill</h2>
          <p style={chartMutedStyle}>A direct comparison within the selected attempt shown beside the radar chart.</p>
          {assessmentState.loading ? <p style={chartMutedStyle}>Loading skill scores…</p>
            : assessmentState.error ? <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>{assessmentState.error}</p>
            : <>
              {selectedSkillAttempt && <p style={{ color: 'var(--color-text-primary)', fontSize: '0.82rem', fontWeight: 700, margin: '0 0 0.8rem' }}>{assessmentTitles[selectedSkillAttempt.assessmentId] || 'Assessment attempt'} · attempt {attemptNumbers.get(selectedSkillAttempt._id) ?? 'number unavailable'} · {formatDate(selectedSkillAttempt.submittedAt)}</p>}
              <SkillScoreBars skills={selectedAttemptSkills} />
            </>}
        </article>
      </section>

      <section aria-label="Recent assessment activity and improvement" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1rem' }}>
        <article className="cockpit-panel" style={chartPanelStyle}>
          <h2 style={chartTitleStyle}>Recent assessment activity</h2>
          <p style={chartMutedStyle}>Most recent attempts, including unfinished attempts.</p>
          {assessmentState.loading ? <p style={chartMutedStyle}>Loading recent activity…</p>
            : assessmentState.error ? <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>{assessmentState.error}</p>
            : attemptHistory.length === 0 ? <p style={{ ...chartMutedStyle, margin: 0 }}>No assessment activity yet.</p>
            : <div style={{ display: 'grid', gap: '0.7rem' }}>
              {attemptHistory.slice(0, 4).map((attempt) => <div key={attempt._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.8rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--color-border-subtle)' }}>
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <strong style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem', overflowWrap: 'anywhere' }}>{assessmentTitles[attempt.assessmentId] || 'Assessment attempt'}</strong>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', margin: '0.15rem 0 0' }}>{formatAttemptStatus(attempt.status)} · {formatDate(attempt.submittedAt ?? attempt.startedAt)}</p>
                </div>
                <span style={{ color: 'var(--color-primary)', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{attempt.status === 'SUBMITTED' && getAttemptPercentage(attempt) !== undefined ? `${getAttemptPercentage(attempt)}%` : '—'}</span>
              </div>)}
            </div>}
        </article>
        <article className="cockpit-panel" style={chartPanelStyle}>
          <h2 style={chartTitleStyle}>Improvement between attempts</h2>
          <p style={chartMutedStyle}>Percentage-point change for the same assessment record and skill only.</p>
          {assessmentState.loading ? <p style={chartMutedStyle}>Loading comparable results…</p>
            : assessmentState.error ? <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>{assessmentState.error}</p>
            : improvements.length === 0 ? <p style={{ ...chartMutedStyle, margin: 0 }}>No repeated, dated submitted results for the same assessment and skill are available yet.</p>
            : <div style={{ display: 'grid', gap: '0.7rem' }}>
              {improvements.map((improvement) => <div key={improvement.key} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-surface-hover)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <strong style={{ color: 'var(--color-text-primary)', fontSize: '0.84rem' }}>{improvement.skillName}</strong>
                  <strong aria-label={`${improvement.changePoints > 0 ? 'Increase' : improvement.changePoints < 0 ? 'Decrease' : 'No change'} of ${Math.abs(improvement.changePoints)} percentage points`} style={{ color: improvement.changePoints > 0 ? 'var(--color-success)' : improvement.changePoints < 0 ? 'var(--color-error)' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {improvement.changePoints > 0 ? '+' : ''}{improvement.changePoints} pp
                  </strong>
                </div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.76rem', margin: '0.25rem 0 0' }}>{improvement.assessmentTitle}: {improvement.earlierScore}% → {improvement.laterScore}% · {formatDate(improvement.earlierDate)} to {formatDate(improvement.laterDate)}</p>
              </div>)}
            </div>}
        </article>
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
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {attemptHistory.map((attempt) => {
              const score = typeof attempt.percentage === 'number' ? attempt.percentage : attempt.score;
              return <div key={attempt._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.45rem', padding: '0.65rem 0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ minWidth: 0, flex: '1 1 250px' }}>
                  <strong style={{ color: '#0f172a', overflowWrap: 'anywhere' }}>{assessmentTitles[attempt.assessmentId] || 'Assessment attempt'} · attempt {attemptNumbers.get(attempt._id) ?? ''}</strong>
                  <p style={{ ...mutedStyle, marginTop: '0.2rem' }}>{formatAttemptStatus(attempt.status)} · {formatDate(attempt.submittedAt ?? attempt.startedAt)}</p>
                </div>
                <strong style={{ color: '#4f46e5' }}>{attempt.status !== 'SUBMITTED' ? 'No submitted score' : typeof score === 'number' ? `${score}% overall` : 'Overall score unavailable'}</strong>
                {attempt.status === 'SUBMITTED' && !!attempt.skillPerformance?.length && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', width: '100%' }}>
                  {attempt.skillPerformance.map((result) => {
                    const mappedSubtopic = subtopicsById.get(result.skillId);
                    return <span key={result.skillId} style={{ minWidth: 0, overflowWrap: 'anywhere', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '0.25rem 0.65rem', color: '#334155', fontSize: '0.8rem', background: '#fff' }}>
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
