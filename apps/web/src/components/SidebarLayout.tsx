import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import {
  LayoutDashboard,
  Dna,
  FileText,
  Target,
  User,
  LogOut,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  Activity,
} from 'lucide-react';

interface SidebarLayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'digital-twin' | 'resume' | 'career-goals' | 'profile';
  onTabChange?: (tab: 'dashboard' | 'digital-twin' | 'resume' | 'career-goals' | 'profile') => void;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
}) => {
  const { logout } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'digital-twin', label: 'Career Digital Twin', icon: Dna, path: '/dashboard?tab=digital-twin' },
    { id: 'resume', label: 'Resume Center', icon: FileText, path: '/dashboard?tab=resume' },
    { id: 'career-goals', label: 'Career Goals', icon: Target, path: '/dashboard?tab=career-goals' },
    { id: 'profile', label: 'Profile & Settings', icon: User, path: '/profile' },
  ] as const;

  const handleNavClick = (item: (typeof navItems)[number]) => {
    setIsMobileOpen(false);
    if (onTabChange) {
      onTabChange(item.id);
    }
    if (item.id === 'profile') {
      navigate('/profile');
    } else {
      navigate(item.path);
    }
  };

  return (
    <div className="app-shell">
      {/* Mobile Top Bar */}
      <div
        style={{
          display: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--color-border)',
          zIndex: 90,
          padding: '0 1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        className="mobile-header"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="sidebar-logo-icon" style={{ width: '32px', height: '32px' }}>
            <Sparkles size={16} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>CareerOS AI</span>
        </div>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer' }}
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              CareerOS AI
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
              <span className="tech-badge tech-badge-indigo" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                <Activity size={10} className="animate-pulse-glow" /> COCKPIT ONLINE
              </span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} style={{ color: isActive ? '#4f46e5' : '#64748b', transition: 'color 0.25s ease' }} />
                <span style={{ flex: 1, color: isActive ? '#4f46e5' : '#334155', transition: 'color 0.25s ease' }}>{item.label}</span>
                {isActive && <ChevronRight size={14} style={{ color: '#4f46e5' }} />}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--gradient-hero)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: '#fff',
                fontSize: '0.85rem',
                flexShrink: 0,
                boxShadow: 'var(--shadow-glow-indigo)',
              }}
            >
              {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.fullName || 'CareerOS User'}
              </strong>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.targetRole || 'Software Engineer'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              flexShrink: 0,
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Body */}
      <main className="main-content animate-reveal">{children}</main>
    </div>
  );
};
