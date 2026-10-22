import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { SidebarLayout } from '../components/SidebarLayout';
import { DigitalTwinGraph } from '../components/DigitalTwinGraph';
import { ResumeCenter } from '../components/ResumeCenter';
import { RoadmapView } from '../components/RoadmapView';
import { CompanyInterviewView } from '../components/CompanyInterviewView';
import { RoadmapAssessmentExperience } from '../components/RoadmapAssessmentExperience';
import { SkillTrackingView } from '../components/SkillTrackingView';
import { ProjectIntelligenceView } from '../components/ProjectIntelligenceView';
import {
  Briefcase,
  Sparkles,
  Calendar,
  Building,
  Compass,
  Building2,
  FolderGit2,
} from 'lucide-react';

interface GoalData {
  targetRole: string;
  targetTimeline?: string;
  targetCompanies: string[];
}

export function DashboardPage() {
  const { accessToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = (searchParams.get('tab') as 'dashboard' | 'assessment' | 'roadmap' | 'interview' | 'digital-twin' | 'resume' | 'career-goals' | 'skill-tracking' | 'projects') || 'dashboard';
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assessment' | 'roadmap' | 'interview' | 'digital-twin' | 'resume' | 'career-goals' | 'skill-tracking' | 'projects' | 'profile'>(tabParam);

  const [goal, setGoal] = useState<GoalData | null>(null);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'dashboard' | 'assessment' | 'roadmap' | 'interview' | 'digital-twin' | 'resume' | 'career-goals' | 'skill-tracking' | 'projects' | 'profile') => {
    setActiveTab(tab);
    if (tab !== 'profile') {
      setSearchParams({ tab });
    }
  };

  const fetchDashboardData = async (signal?: AbortSignal) => {
    try {
      // Fetch Goal
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
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (accessToken) {
      fetchDashboardData(controller.signal);
    }
    return () => controller.abort();
  }, [accessToken]);

  return (
    <SidebarLayout activeTab={activeTab} onTabChange={handleTabChange}>
      <div style={{ maxWidth: '1140px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {activeTab === 'assessment' && (
          <RoadmapAssessmentExperience />
        )}



        {activeTab === 'skill-tracking' && <SkillTrackingView accessToken={accessToken} />}

        {/* Tab: Project Intelligence View */}
        {activeTab === 'projects' && (
          <div className="animate-reveal stagger-1">
            <ProjectIntelligenceView />
          </div>
        )}

        {/* AI Learning Roadmap CTA Banner (Visible on Dashboard Overview) */}
        {activeTab === 'dashboard' && (
          <div
            style={{
              padding: '1.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.25rem',
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span className="alex-pill alex-pill-blue" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                  <Sparkles size={11} style={{ display: 'inline', marginRight: '4px' }} /> AI LEARNING ENGINE
                </span>
                <span className="alex-pill alex-pill-slate" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                  STEP-BY-STEP CURRICULUM
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Personalized Learning Roadmap & Milestone Tracker
              </h3>
              <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
                Follow your tailored step-by-step curriculum, complete hands-on checklist items, and test your mastery.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Button onClick={() => handleTabChange('projects')} variant="secondary" style={{ width: 'auto' }}>
                <FolderGit2 size={16} style={{ marginRight: '0.4rem' }} /> Project Intelligence
              </Button>
              <Button onClick={() => handleTabChange('interview')} variant="secondary" style={{ width: 'auto' }}>
                <Building2 size={16} style={{ marginRight: '0.4rem' }} /> Company Simulation
              </Button>
              <Button onClick={() => handleTabChange('roadmap')} style={{ width: 'auto' }}>
                <Compass size={16} style={{ marginRight: '0.4rem' }} /> Open Learning Roadmap
              </Button>
            </div>
          </div>
        )}

        {/* Tab: AI Roadmap View */}
        {activeTab === 'roadmap' && (
          <div className="animate-reveal stagger-1">
            <RoadmapView />
          </div>
        )}

        {/* Tab: Company Mock Interview View */}
        {activeTab === 'interview' && (
          <div className="animate-reveal stagger-1">
            <CompanyInterviewView />
          </div>
        )}

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
                <strong style={{ fontSize: '1.15rem', color: '#4f46e5', display: 'block', marginTop: '0.2rem' }}>{goal.targetTimeline || 'Not set'}</strong>
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

        {activeTab === 'resume' && <ResumeCenter accessToken={accessToken} />}
      </div>
    </SidebarLayout>
  );
}
