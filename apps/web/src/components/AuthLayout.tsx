import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Dna, Target, ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-background)', overflowX: 'hidden' }}>
      {/* Left 3D Hero Panel (Visible on Desktop/Tablet > 850px) */}
      <div
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.05) 50%, rgba(8, 145, 178, 0.08) 100%)',
          borderRight: '1px solid #e2e8f0',
          padding: '4rem 3.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
        }}
        className="auth-hero-panel"
      >
        <div>
          {/* Top Brand Link */}
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '1.25rem',
              textDecoration: 'none',
              marginBottom: '4rem',
            }}
          >
            <div className="sidebar-logo-icon" style={{ width: '36px', height: '36px' }}>
              <Sparkles size={20} />
            </div>
            <span>CareerOS AI</span>
          </Link>

          <div style={{ maxWidth: '520px' }}>
            <div className="glow-pill-3d" style={{ marginBottom: '1.5rem', fontSize: '0.75rem' }}>
              <Sparkles size={13} /> Platform v1.0 • Autonomous AI
            </div>

            <h2
              style={{
                fontSize: '2.4rem',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.2,
                letterSpacing: '-0.03em',
                marginBottom: '1.25rem',
              }}
            >
              Architect Your Future with <br />
              <span style={{ background: 'var(--gradient-3d-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Career Digital Twin AI
              </span>
            </h2>

            <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>
              Aggregate your profile, timeline goals, target companies, and resume metadata into an independent AI evidence graph.
            </p>

            {/* Feature Bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Dna size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Verified Evidence Graph</h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Store independent user nodes with confidence level scoring.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(8, 145, 178, 0.1)', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Target size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Goal & Timeline Engine</h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Select target roles, 3-24 month timelines, and target companies.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Neon Postgres & Cloud Storage</h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Isolated schema ORM security with native PDF document viewer.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '3rem' }}>
          © 2026 CareerOS AI. All rights reserved.
        </div>
      </div>

      {/* Right Form Panel (Screen Proportional Width) */}
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#ffffff',
          position: 'relative',
        }}
        className="auth-form-panel"
      >
        {/* Top Back Link */}
        <Link
          to="/"
          style={{
            position: 'absolute',
            top: '2rem',
            right: '2.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#64748b',
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 0.4rem 0' }}>
              {title}
            </h1>
            {subtitle && <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>{subtitle}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
