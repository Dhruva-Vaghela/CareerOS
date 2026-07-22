import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { Button } from '../components/Button';
import { User as UserIcon, Briefcase, CheckCircle } from 'lucide-react';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const { profile, completion } = useProfile();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>CareerOS Dashboard</h1>
          {profile?.targetRole && (
            <p style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
              <Briefcase size={16} /> Target: {profile.targetRole}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Button onClick={() => navigate('/profile')} variant="secondary" style={{ width: 'auto' }}>
            <UserIcon size={16} style={{ marginRight: '0.5rem' }} /> Profile
          </Button>
          <Button onClick={handleLogout} variant="secondary" style={{ width: 'auto' }}>
            Logout
          </Button>
        </div>
      </header>

      {/* Welcome Card */}
      <div
        style={{
          padding: '2rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Welcome back, {profile?.fullName || 'User'}!
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Your profile is fully configured. CareerOS will personalize your goals, learning roadmaps, AI mock interviews, and career readiness based on your target role as <strong>{profile?.targetRole}</strong>.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981', fontWeight: 600, fontSize: '0.9rem' }}>
          <CheckCircle size={18} />
          <span>Profile Onboarding Completed ({completion?.percentage || 100}%)</span>
        </div>
      </div>

      {/* User Info Details */}
      <div
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>User Context</h3>
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div>User ID: <code style={{ color: 'var(--color-text-primary)' }}>{user?.id}</code></div>
          {profile?.college && <div>College: {profile.college}</div>}
          {profile?.currentStatus && <div>Status: {profile.currentStatus}</div>}
          {profile?.experienceLevel && <div>Experience Level: {profile.experienceLevel}</div>}
        </div>
      </div>
    </div>
  );
}
