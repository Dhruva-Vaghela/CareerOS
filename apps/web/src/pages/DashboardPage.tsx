import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>CareerOS Dashboard</h1>
        <Button onClick={handleLogout} variant="secondary" style={{ width: 'auto' }}>
          Logout
        </Button>
      </header>
      
      <div style={{ padding: '2rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Welcome back!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          You have successfully authenticated. Your User ID is <strong>{user?.id}</strong>.
        </p>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
          This is a protected route. If you log out or clear your token, you will be redirected to the login page.
        </p>
      </div>
    </div>
  );
}
