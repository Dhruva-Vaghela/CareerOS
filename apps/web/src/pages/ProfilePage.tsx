import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { Button } from '../components/Button';
import { Briefcase, GraduationCap, MapPin, Globe, Award, Edit3, ArrowLeft, Clock } from 'lucide-react';

export function ProfilePage() {
  const { profile, completion, isLoading } = useProfile();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <h2>No profile found</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          You haven't completed your profile onboarding yet.
        </p>
        <Button onClick={() => navigate('/onboarding')}>Complete Profile Onboarding</Button>
      </div>
    );
  }

  const completionPercentage = completion?.percentage || 0;

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
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
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <Button onClick={() => navigate('/profile/edit')} variant="secondary" style={{ width: 'auto' }}>
          <Edit3 size={16} style={{ marginRight: '0.5rem' }} /> Edit Profile
        </Button>
      </div>

      {/* Main Profile Header Card */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '2rem',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: '700',
              flexShrink: 0,
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
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>
              {profile.fullName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: '600' }}>
              <Briefcase size={16} />
              <span>Target Role: {profile.targetRole}</span>
            </div>
            {profile.currentStatus && (
              <span
                style={{
                  display: 'inline-block',
                  marginTop: '0.5rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '1rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: 'rgba(79, 70, 229, 0.1)',
                  color: 'var(--color-primary)',
                }}
              >
                {profile.currentStatus.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Completion Progress Bar */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: '600' }}>Profile Completeness</span>
            <span style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{completionPercentage}%</span>
          </div>
          <div
            style={{
              height: '8px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-background)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${completionPercentage}%`,
                backgroundColor: completionPercentage >= 100 ? '#10B981' : 'var(--color-primary)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Education & Background */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GraduationCap size={18} style={{ color: 'var(--color-primary)' }} /> Academic & Education
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>College / University:</span>{' '}
              <strong>{profile.college || 'Not specified'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Degree:</span>{' '}
              <strong>{profile.degree || 'Not specified'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Branch / Specialization:</span>{' '}
              <strong>{profile.branch || 'Not specified'}</strong>
            </div>
            {profile.currentSemester && (
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Current Semester:</span>{' '}
                <strong>{profile.currentSemester}</strong>
              </div>
            )}
            {profile.graduationYear && (
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Graduation Year:</span>{' '}
                <strong>{profile.graduationYear}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Location & Language */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={18} style={{ color: 'var(--color-primary)' }} /> Location & Preferences
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={16} style={{ color: 'var(--color-text-secondary)' }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>Country:</span>{' '}
              <strong>{profile.country || 'Not specified'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Time Zone:</span>{' '}
              <strong>{profile.timezone || 'Not specified'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Preferred Language:</span>{' '}
              <strong>{profile.preferredLanguage?.toUpperCase() || 'EN'}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Award size={16} style={{ color: 'var(--color-text-secondary)' }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>Experience Level:</span>{' '}
              <strong>{profile.experienceLevel || 'Not specified'}</strong>
            </div>
            {profile.availabilityHours && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <Clock size={16} style={{ color: 'var(--color-primary)' }} />
                <span style={{ color: 'var(--color-text-secondary)' }}>Availability:</span>{' '}
                <strong>
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
