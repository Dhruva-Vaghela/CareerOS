import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { Button } from '../components/Button';
import { Briefcase, GraduationCap, Globe, Edit3, ArrowLeft, ShieldCheck } from 'lucide-react';

export function ProfilePage() {
  const { profile, completion, isLoading } = useProfile();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: 'var(--color-background)' }}>
        Loading developer profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }} className="cockpit-panel">
        <h2>No profile data found</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          You haven't completed your profile onboarding yet.
        </p>
        <Button onClick={() => navigate('/onboarding')}>Complete Profile Onboarding</Button>
      </div>
    );
  }

  const completionPercentage = completion?.percentage || 0;

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-reveal">
      {/* Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          <ArrowLeft size={18} /> Back to Cockpit Dashboard
        </button>
        <Button onClick={() => navigate('/profile/edit')} variant="secondary" style={{ width: 'auto' }}>
          <Edit3 size={16} style={{ marginRight: '0.5rem' }} /> Edit Developer Spec
        </Button>
      </div>

      {/* Main Profile Header Specification Card */}
      <div className="cockpit-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '12px',
              background: 'var(--gradient-hero)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: '800',
              flexShrink: 0,
              boxShadow: 'var(--shadow-glow-indigo)',
              overflow: 'hidden',
            }}
          >
            {profile.profilePictureUrl ? (
              <img
                src={profile.profilePictureUrl}
                alt={profile.fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              profile.fullName.charAt(0).toUpperCase()
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {profile.fullName}
              </h1>
              <span className="tech-badge tech-badge-indigo">
                <ShieldCheck size={12} /> VERIFIED DEVELOPER
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.95rem' }}>
              <Briefcase size={16} />
              <span>Target Role: {profile.targetRole}</span>
            </div>
            {profile.currentStatus && (
              <span className="tech-badge tech-badge-cyan" style={{ marginTop: '0.5rem' }}>
                {profile.currentStatus.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Profile Completeness Telemetry Bar */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Profile Spec Completeness</span>
            <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{completionPercentage}%</span>
          </div>
          <div
            style={{
              height: '8px',
              borderRadius: '4px',
              backgroundColor: '#f1f5f9',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${completionPercentage}%`,
                background: completionPercentage >= 100 ? '#10b981' : 'var(--gradient-hero)',
                transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Details Specifications Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Education & Background */}
        <div className="cockpit-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
            <GraduationCap size={18} style={{ color: 'var(--color-primary)' }} /> Academic & Background Spec
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'block' }}>COLLEGE / UNIVERSITY:</span>
              <strong style={{ color: '#0f172a' }}>{profile.college || 'Not specified'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'block' }}>DEGREE:</span>
              <strong style={{ color: '#0f172a' }}>{profile.degree || 'Not specified'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'block' }}>BRANCH / SPECIALIZATION:</span>
              <strong style={{ color: '#0f172a' }}>{profile.branch || 'Not specified'}</strong>
            </div>
            {profile.currentSemester && (
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'block' }}>CURRENT SEMESTER:</span>
                <strong style={{ color: '#0f172a' }}>{profile.currentSemester}</strong>
              </div>
            )}
            {profile.graduationYear && (
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'block' }}>GRADUATION YEAR:</span>
                <strong style={{ color: '#0f172a' }}>{profile.graduationYear}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Location & Preferences */}
        <div className="cockpit-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
            <Globe size={18} style={{ color: '#0891b2' }} /> Location & Preferences Spec
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'block' }}>COUNTRY:</span>
              <strong style={{ color: '#0f172a' }}>{profile.country || 'Not specified'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'block' }}>TIME ZONE:</span>
              <strong style={{ color: '#0f172a' }}>{profile.timezone || 'Not specified'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'block' }}>PREFERRED LANGUAGE:</span>
              <strong style={{ color: '#0f172a' }}>{profile.preferredLanguage?.toUpperCase() || 'EN'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'block' }}>EXPERIENCE LEVEL:</span>
              <strong style={{ color: '#0f172a' }}>{profile.experienceLevel || 'Not specified'}</strong>
            </div>
            {profile.availabilityHours && (
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'block' }}>AVAILABILITY TELEMETRY:</span>
                <strong style={{ color: 'var(--color-primary)' }}>
                  {profile.availabilityHours} hours / {profile.availabilityTimeframe === 'PER_WEEK' ? 'week' : 'day'}
                </strong>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
