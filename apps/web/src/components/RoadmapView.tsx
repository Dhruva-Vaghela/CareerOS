import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Layers,
  ShieldCheck,
  Zap,
  Award,
} from 'lucide-react';
import { Alert } from './Alert';
import { Button } from './Button';

interface ChecklistItem {
  id: string;
  subtopicId: string;
  topicId?: string;
  moduleId?: string;
  order: number;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  resourceRef?: string;
  userNote?: string;
}

interface Subtopic {
  id: string;
  topicId: string;
  order: number;
  title: string;
  type: 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL';
  checklist: ChecklistItem[];
}

interface Topic {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  description?: string;
  type: 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL';
  subtopics: Subtopic[];
}

interface Module {
  id: string;
  roadmapId: string;
  order: number;
  title: string;
  description?: string;
  type: 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL';
  estimatedHours?: number;
  topics: Topic[];
}

interface RoadmapData {
  id: string;
  userId: string;
  goalId: string;
  targetRole?: string;
  status: string;
  version: number;
  modulesCount: number;
  totalItemsCount: number;
  completedItemsCount: number;
  generatedAt: string;
  modules: Module[];
}

interface ActiveCareerGoal {
  id: string;
  targetRole: string;
  targetCompanies?: string[];
  targetTimeline?: string;
  customTimeline?: string;
  updatedAt: string;
}

export const RoadmapView: React.FC = () => {
  const { accessToken } = useAuth();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  const fetchActiveGoal = async (signal?: AbortSignal): Promise<ActiveCareerGoal | null> => {
    const res = await fetch('/api/v1/career-goals/active', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    });
    if (!res.ok) throw new Error('Failed to load your active career goal.');
    const json = await res.json();
    if (json.goal) return json.goal;

    const profileResponse = await fetch('/api/v1/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    });
    if (!profileResponse.ok) throw new Error('Failed to load your profile target role.');
    const profileJson = await profileResponse.json();
    const targetRole = profileJson.data?.profile?.targetRole;
    if (!targetRole) return null;

    const createGoalResponse = await fetch('/api/v1/career-goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ targetRole }),
      signal,
    });
    const createdGoalJson = await createGoalResponse.json();
    if (!createGoalResponse.ok) {
      throw new Error(createdGoalJson.error?.message || 'Failed to create a career goal from your profile.');
    }
    return createdGoalJson.goal || null;
  };

  const requestRoadmap = async (goal: ActiveCareerGoal, signal?: AbortSignal): Promise<RoadmapData> => {
    const res = await fetch('/api/v1/roadmaps/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        goalId: goal.id,
        targetRole: goal.targetRole,
        targetCompanies: goal.targetCompanies || [],
        targetTimeline: goal.customTimeline || goal.targetTimeline,
      }),
      signal,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Failed to generate roadmap');
    return json.data?.roadmap || json.roadmap;
  };

  const applyRoadmap = (data: RoadmapData | null) => {
    setRoadmap(data);
    if (!data?.modules?.length) return;

    const expanded: Record<string, boolean> = {};
    const expandedTopics: Record<string, boolean> = {};
    data.modules.forEach((module, index) => {
      expanded[module.id] = index < 2;
      module.topics.forEach((topic) => {
        expandedTopics[topic.id] = true;
      });
    });
    setExpandedModules(expanded);
    setExpandedTopics(expandedTopics);
  };

  const fetchActiveRoadmap = async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/roadmaps/active', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data?.roadmap || json.roadmap || null;
        setRoadmap(data);

        // Auto-expand first 2 modules by default
        if (data && data.modules?.length > 0) {
          const initExp: Record<string, boolean> = {};
          data.modules.forEach((m: Module, idx: number) => {
            initExp[m.id] = idx < 2;
          });
          setExpandedModules(initExp);

          // Auto-expand all topics in expanded modules
          const initTopExp: Record<string, boolean> = {};
          data.modules.forEach((m: Module) => {
            m.topics.forEach((t: Topic) => {
              initTopExp[t.id] = true;
            });
          });
          setExpandedTopics(initTopExp);
        }
      } else {
        setRoadmap(null);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Failed to load roadmap. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (!accessToken) return () => controller.abort();

    const synchronizeRoadmap = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [roadmapResponse, goal] = await Promise.all([
          fetch('/api/v1/roadmaps/active', {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          }),
          fetchActiveGoal(controller.signal),
        ]);
        if (!roadmapResponse.ok) throw new Error('Failed to load your roadmap.');

        const roadmapJson = await roadmapResponse.json();
        let activeRoadmap = roadmapJson.data?.roadmap || roadmapJson.roadmap || null;
        const goalIsNewer = activeRoadmap && goal
          && new Date(goal.updatedAt).getTime() > new Date(activeRoadmap.generatedAt).getTime();
        const goalDoesNotMatch = activeRoadmap && goal
          && (activeRoadmap.goalId !== goal.id
            || activeRoadmap.targetRole?.trim().toLowerCase() !== goal.targetRole.trim().toLowerCase());

        if (goal && (!activeRoadmap || goalIsNewer || goalDoesNotMatch)) {
          setIsGenerating(true);
          activeRoadmap = await requestRoadmap(goal, controller.signal);
        }

        applyRoadmap(activeRoadmap);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load roadmap. Please try again.');
        }
      } finally {
        setIsGenerating(false);
        setIsLoading(false);
      }
    };

    const startupTimer = window.setTimeout(() => void synchronizeRoadmap(), 0);
    return () => {
      window.clearTimeout(startupTimer);
      controller.abort();
    };
  }, [accessToken]);

  const handleGenerateRoadmap = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const goal = await fetchActiveGoal();
      if (!goal) throw new Error('Choose a career goal before generating a roadmap.');
      const newRoadmap = await requestRoadmap(goal);
      applyRoadmap(newRoadmap);
      setSuccess(`Generated roadmap v${newRoadmap.version} for ${goal.targetRole}.`);
    } catch (err: any) {
      setError(err.message || 'Error occurred while generating roadmap.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleChecklist = async (itemId: string, currentCompleted: boolean) => {
    if (!roadmap) return;
    setTogglingItemId(itemId);

    // Optimistic UI update
    const nextCompleted = !currentCompleted;
    setRoadmap((prev) => {
      if (!prev) return null;
      let added = 0;

      const updatedModules = prev.modules.map((mod) => ({
        ...mod,
        topics: mod.topics.map((top) => ({
          ...top,
          subtopics: top.subtopics.map((sub) => ({
            ...sub,
            checklist: sub.checklist.map((item) => {
              if (item.id === itemId) {
                if (nextCompleted && !item.completed) added = 1;
                if (!nextCompleted && item.completed) added = -1;
                return { ...item, completed: nextCompleted };
              }
              return item;
            }),
          })),
        })),
      }));

      return {
        ...prev,
        completedItemsCount: Math.max(0, prev.completedItemsCount + added),
        modules: updatedModules,
      };
    });

    try {
      const res = await fetch(`/api/v1/roadmaps/${roadmap.id}/checklist/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ completed: nextCompleted }),
      });

      if (!res.ok) {
        throw new Error('Failed to update item on server');
      }
    } catch (err) {
      console.error('Error updating checklist:', err);
      // Revert on error
      fetchActiveRoadmap();
    } finally {
      setTogglingItemId(null);
    }
  };

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const toggleTopic = (topId: string) => {
    setExpandedTopics((prev) => ({ ...prev, [topId]: !prev[topId] }));
  };

  const parseResource = (resourceRef?: string) => {
    if (!resourceRef) return null;
    try {
      const parsed = JSON.parse(resourceRef);
      return parsed;
    } catch {
      return { title: resourceRef, url: '', type: 'LINK' };
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'MANDATORY':
        return {
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          label: 'Core Mandatory',
          icon: ShieldCheck,
        };
      case 'RECOMMENDED':
        return {
          background: 'rgba(56, 189, 248, 0.1)',
          color: '#0284c7',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          label: 'Recommended',
          icon: Zap,
        };
      default:
        return {
          background: 'rgba(168, 85, 247, 0.1)',
          color: '#9333ea',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          label: 'Elective',
          icon: Award,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: '#4f46e5', margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Loading AI Roadmap...</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Retrieving your curriculum and progress milestones</p>
      </div>
    );
  }

  // Empty State: No active roadmap yet
  if (!roadmap) {
    return (
      <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', maxWidth: '720px', margin: '0 auto' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(79, 70, 229, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: '#4f46e5',
          }}
        >
          <Sparkles size={32} />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
          Personalized AI Learning Roadmap
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
          Generate a dynamic, structured learning path tailored to your career goals, target companies, and current skillset using AI.
        </p>

        {error && (
          <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <Alert type="error" message={error} />
          </div>
        )}

        <Button
          onClick={handleGenerateRoadmap}
          isLoading={isGenerating}
          style={{ padding: '0.85rem 2rem', fontSize: '1rem', margin: '0 auto' }}
        >
          <Sparkles size={18} style={{ marginRight: '0.5rem' }} />
          {isGenerating ? 'AI is Crafting Your Curriculum...' : 'Generate My AI Roadmap'}
        </Button>
      </div>
    );
  }

  // Active Roadmap View
  const progressPercent =
    roadmap.totalItemsCount > 0
      ? Math.round((roadmap.completedItemsCount / roadmap.totalItemsCount) * 100)
      : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Header & Progress Card */}
      <div className="card" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="tech-badge tech-badge-indigo" style={{ fontSize: '0.75rem' }}>
                <Sparkles size={12} /> AI ROADMAP v{roadmap.version}
              </span>
              <span className="tech-badge tech-badge-emerald" style={{ fontSize: '0.75rem' }}>
                ACTIVE CURRICULUM
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {roadmap.targetRole || 'Software Engineering'} Roadmap
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              variant="secondary"
              style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
              onClick={handleGenerateRoadmap}
              isLoading={isGenerating}
              title="Regenerate with AI"
            >
              <RefreshCw size={14} style={{ marginRight: '0.4rem' }} className={isGenerating ? 'animate-spin' : ''} />
              {isGenerating ? 'Regenerating...' : 'Regenerate'}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 600, color: '#334155' }}>Curriculum Completion</span>
            <span style={{ fontWeight: 700, color: '#4f46e5' }}>
              {progressPercent}% ({roadmap.completedItemsCount} of {roadmap.totalItemsCount} items completed)
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4f46e5, #06b6d4)',
                borderRadius: '4px',
                transition: 'width 0.4s ease-out',
              }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '2rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Layers size={16} style={{ color: '#4f46e5' }} />
            <span><strong>{roadmap.modules?.length || 0}</strong> Modules</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <BookOpen size={16} style={{ color: '#0284c7' }} />
            <span><strong>{roadmap.totalItemsCount}</strong> Actionable Tasks</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={16} style={{ color: '#10b981' }} />
            <span><strong>~{roadmap.modules?.reduce((acc, m) => acc + (m.estimatedHours || 10), 0)}</strong> Est. Study Hours</span>
          </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Modules List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {roadmap.modules?.map((mod, modIdx) => {
          const isExpanded = !!expandedModules[mod.id];
          const badge = getBadgeStyle(mod.type);
          const BadgeIcon = badge.icon;

          // Calculate completed items for this module
          let modTotal = 0;
          let modCompleted = 0;
          mod.topics.forEach((t) =>
            t.subtopics.forEach((s) =>
              s.checklist.forEach((c) => {
                modTotal++;
                if (c.completed) modCompleted++;
              })
            )
          );
          const modPercent = modTotal > 0 ? Math.round((modCompleted / modTotal) * 100) : 0;

          return (
            <div
              key={mod.id}
              className="card"
              style={{
                padding: '0',
                overflow: 'hidden',
                border: isExpanded ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.04)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Module Header Bar */}
              <div
                onClick={() => toggleModule(mod.id)}
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: isExpanded ? '#fafafa' : '#fff',
                  borderBottom: isExpanded ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: modPercent === 100 ? '#10b981' : '#4f46e5',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      flexShrink: 0,
                    }}
                  >
                    {modPercent === 100 ? <CheckCircle2 size={18} /> : modIdx + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {mod.title}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: badge.background,
                          color: badge.color,
                          border: badge.border,
                        }}
                      >
                        <BadgeIcon size={11} /> {badge.label}
                      </span>
                    </div>

                    {mod.description && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>
                        {mod.description}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginLeft: '1rem' }}>
                  <div style={{ textAlign: 'right', display: 'none' }} className="desktop-mod-stat">
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                      {modCompleted}/{modTotal} done
                    </span>
                  </div>

                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                </div>
              </div>

              {/* Module Content (Topics & Checklists) */}
              {isExpanded && (
                <div style={{ padding: '1.25rem 1.5rem', background: '#fff' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {mod.topics.map((topic, topIdx) => {
                      const isTopicOpen = expandedTopics[topic.id] !== false;

                      return (
                        <div
                          key={topic.id}
                          style={{
                            border: '1px solid #f1f5f9',
                            borderRadius: '10px',
                            padding: '1rem 1.25rem',
                            background: '#f8fafc',
                          }}
                        >
                          {/* Topic Title */}
                          <div
                            onClick={() => toggleTopic(topic.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              marginBottom: isTopicOpen ? '0.75rem' : 0,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5' }}>
                                {modIdx + 1}.{topIdx + 1}
                              </span>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                {topic.title}
                              </h4>
                            </div>
                            <span style={{ color: '#94a3b8' }}>
                              {isTopicOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </span>
                          </div>

                          {/* Subtopics and Checklist */}
                          {isTopicOpen && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {topic.subtopics.map((subtopic) => (
                                <div key={subtopic.id}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    {subtopic.title}
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {subtopic.checklist.map((item) => {
                                      const resRef = parseResource(item.resourceRef);
                                      const isToggling = togglingItemId === item.id;

                                      return (
                                        <div
                                          key={item.id}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.75rem',
                                            padding: '0.65rem 0.85rem',
                                            borderRadius: '8px',
                                            background: item.completed ? 'rgba(241, 245, 249, 0.6)' : '#fff',
                                            border: item.completed ? '1px solid #e2e8f0' : '1px solid #cbd5e1',
                                            transition: 'all 0.15s ease',
                                          }}
                                        >
                                          {/* Checkbox */}
                                          <button
                                            onClick={() => handleToggleChecklist(item.id, item.completed)}
                                            disabled={isToggling}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              padding: 0,
                                              cursor: 'pointer',
                                              color: item.completed ? '#10b981' : '#cbd5e1',
                                              display: 'flex',
                                              alignItems: 'center',
                                              marginTop: '0.15rem',
                                            }}
                                          >
                                            {item.completed ? (
                                              <CheckCircle2 size={18} />
                                            ) : (
                                              <Circle size={18} style={{ color: '#94a3b8' }} />
                                            )}
                                          </button>

                                          {/* Item Details */}
                                          <div style={{ flex: 1 }}>
                                            <span
                                              style={{
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                color: item.completed ? '#64748b' : '#0f172a',
                                                textDecoration: item.completed ? 'line-through' : 'none',
                                                display: 'block',
                                              }}
                                            >
                                              {item.title}
                                            </span>

                                            {item.description && (
                                              <p
                                                style={{
                                                  fontSize: '0.8rem',
                                                  color: '#64748b',
                                                  margin: '0.2rem 0 0',
                                                  lineHeight: 1.4,
                                                }}
                                              >
                                                {item.description}
                                              </p>
                                            )}

                                            {/* Resource link */}
                                            {resRef && resRef.title && (
                                              <div style={{ marginTop: '0.35rem' }}>
                                                {resRef.url ? (
                                                  <a
                                                    href={resRef.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                      fontSize: '0.75rem',
                                                      color: '#4f46e5',
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '0.25rem',
                                                      textDecoration: 'none',
                                                      fontWeight: 500,
                                                    }}
                                                  >
                                                    <ExternalLink size={12} /> {resRef.title}
                                                  </a>
                                                ) : (
                                                  <span
                                                    style={{
                                                      fontSize: '0.75rem',
                                                      color: '#64748b',
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '0.25rem',
                                                    }}
                                                  >
                                                    <BookOpen size={12} /> {resRef.title}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
