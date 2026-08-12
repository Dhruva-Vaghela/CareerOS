import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Dna, Target, FileText, ArrowRight, ShieldCheck, Cpu, Zap, Activity, Radio } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', color: '#0f172a', overflowX: 'hidden' }}>
      {/* Top Navbar */}
      <nav
        style={{
          padding: '1.25rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="sidebar-logo-icon">
            <Sparkles size={22} />
          </div>
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}
          >
            CareerOS <span style={{ color: '#4f46e5' }}>AI</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user ? (
            <Button onClick={() => navigate('/dashboard')} variant="primary" style={{ width: 'auto' }}>
              Launch Cockpit Dashboard <ArrowRight size={16} style={{ marginLeft: '0.4rem' }} />
            </Button>
          ) : (
            <>
              <Button onClick={() => navigate('/login')} variant="secondary" style={{ width: 'auto' }}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/register')} variant="primary" style={{ width: 'auto' }}>
                Get Started <ArrowRight size={16} style={{ marginLeft: '0.4rem' }} />
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Spatial Tech Cockpit Hero Section */}
      <section
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '5rem 1.5rem 4rem 1.5rem',
          textAlign: 'center',
          position: 'relative',
        }}
        className="animate-reveal"
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <span className="glow-pill-cockpit">
            <Activity size={12} className="animate-pulse-glow" /> AUTONOMOUS CAREER DIGITAL TWIN ENGINE
          </span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5.5vw, 4.4rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '1.5rem',
            letterSpacing: '-0.03em',
            color: '#0f172a',
          }}
        >
          Architect Your Future with <br />
          <span style={{ background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Career Digital Twin AI
          </span>
        </h1>

        <p
          style={{
            fontSize: '1.15rem',
            color: 'var(--color-text-secondary)',
            maxWidth: '740px',
            margin: '0 auto 2.5rem auto',
            lineHeight: 1.7,
          }}
        >
          CareerOS AI aggregates developer profiles, career timelines, target companies, and resume evidence into an independent AI graph for context-aware mock interviews and roadmap telemetry.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '4rem' }}>
          <Button
            onClick={() => navigate(user ? '/dashboard' : '/register')}
            variant="primary"
            style={{ width: 'auto', padding: '0.85rem 2.25rem', fontSize: '1rem' }}
          >
            Launch Twin Cockpit <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
          </Button>

          <Button
            onClick={() => navigate('/login')}
            variant="secondary"
            style={{ width: 'auto', padding: '0.85rem 2rem', fontSize: '1rem' }}
          >
            Sign In to Account
          </Button>
        </div>

        {/* Hero Spatial SVG Node Visualization Showcase */}
        <div
          className="cockpit-panel animate-scale-in"
          style={{
            padding: '2rem',
            position: 'relative',
            height: '320px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: 'var(--shadow-light-lg)',
            margin: '0 auto',
          }}
        >
          {/* Symmetrical Connection Lines */}
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <line x1="18%" y1="50%" x2="50%" y2="50%" stroke="#4f46e5" strokeWidth="2" strokeDasharray="6 3" />
            <line x1="50%" y1="50%" x2="82%" y2="50%" stroke="#0891b2" strokeWidth="2" strokeDasharray="6 3" />
            <line x1="50%" y1="18%" x2="50%" y2="50%" stroke="#7c3aed" strokeWidth="2" strokeDasharray="6 3" />
            <line x1="50%" y1="50%" x2="50%" y2="82%" stroke="#059669" strokeWidth="2" strokeDasharray="6 3" />
            <circle cx="50%" cy="50%" r="80" fill="none" stroke="rgba(79, 70, 229, 0.12)" strokeWidth="1" strokeDasharray="4 4" />
          </svg>

          {/* Left Node */}
          <div
            style={{
              position: 'absolute',
              left: '18%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '0.55rem 0.9rem',
              background: '#ffffff',
              border: '1.5px solid #4f46e5',
              borderRadius: '10px',
              color: '#4f46e5',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 700,
              boxShadow: 'var(--shadow-glow-indigo)',
              whiteSpace: 'nowrap',
              zIndex: 5,
            }}
          >
            <Dna size={13} style={{ display: 'inline', marginRight: '6px' }} /> PROFILE NODE
          </div>

          {/* Top Node */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '18%',
              transform: 'translate(-50%, -50%)',
              padding: '0.45rem 0.85rem',
              background: '#ffffff',
              border: '1.5px solid #7c3aed',
              borderRadius: '10px',
              color: '#7c3aed',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              zIndex: 5,
            }}
          >
            <ShieldCheck size={13} style={{ display: 'inline', marginRight: '6px' }} /> TARGET COMPANY
          </div>

          {/* Exact Center AI Engine Hub */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}
          >
            <div
              style={{
                padding: '1.1rem 1.6rem',
                background: 'var(--gradient-hero)',
                borderRadius: '16px',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                fontWeight: 800,
                boxShadow: 'var(--shadow-glow-indigo)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
              className="animate-pulse-glow"
            >
              <Radio size={22} style={{ margin: '0 auto 4px auto', display: 'block' }} />
              AI INTERVIEW ENGINE HUB
            </div>
          </div>

          {/* Bottom Node */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '82%',
              transform: 'translate(-50%, -50%)',
              padding: '0.45rem 0.85rem',
              background: '#ffffff',
              border: '1.5px solid #059669',
              borderRadius: '10px',
              color: '#059669',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              zIndex: 5,
            }}
          >
            <FileText size={13} style={{ display: 'inline', marginRight: '6px' }} /> RESUME EVIDENCE
          </div>

          {/* Right Node */}
          <div
            style={{
              position: 'absolute',
              left: '82%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '0.55rem 0.9rem',
              background: '#ffffff',
              border: '1.5px solid #0891b2',
              borderRadius: '10px',
              color: '#0891b2',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 700,
              boxShadow: 'var(--shadow-glow-cyan)',
              whiteSpace: 'nowrap',
              zIndex: 5,
            }}
          >
            <Target size={13} style={{ display: 'inline', marginRight: '6px' }} /> GOAL TIMELINE
          </div>
        </div>

        {/* Feature Spec Panels Grid */}
        <div
          style={{
            marginTop: '2.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            textAlign: 'left',
          }}
        >
          {/* Panel 1 */}
          <div className="cockpit-panel animate-reveal stagger-1" style={{ padding: '2rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(79, 70, 229, 0.1)',
                border: '1px solid rgba(79, 70, 229, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5',
                marginBottom: '1.25rem',
              }}
            >
              <Dna size={26} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
              Career Digital Twin Graph
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Node-based evidence graph storing independent user nodes (<code style={{ color: '#4f46e5' }}>GOAL</code>, <code style={{ color: '#4f46e5' }}>RESUME</code>, <code style={{ color: '#4f46e5' }}>TARGET_COMPANY</code>) with confidence scoring.
            </p>
          </div>

          {/* Panel 2 */}
          <div className="cockpit-panel animate-reveal stagger-2" style={{ padding: '2rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(8, 145, 178, 0.1)',
                border: '1px solid rgba(8, 145, 178, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0891b2',
                marginBottom: '1.25rem',
              }}
            >
              <Target size={26} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
              Goal & Timeline Architecture
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Select target engineering roles, 3-24 month preparation timelines, and target company tags with active telemetry tracking.
            </p>
          </div>

          {/* Panel 3 */}
          <div className="cockpit-panel animate-reveal stagger-3" style={{ padding: '2rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                marginBottom: '1.25rem',
              }}
            >
              <FileText size={26} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
              Resume PDF Cloud Center
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Cloud Storage integration with MongoDB metadata and inline native PDF document viewer modal.
            </p>
          </div>
        </div>
      </section>

      {/* Enterprise Microservice Architecture Showcase */}
      <section
        style={{
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          padding: '4.5rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: '1040px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '2.5rem', color: '#0f172a' }}>
            Enterprise Microservices Topology
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            <div className="cockpit-panel animate-reveal stagger-1" style={{ padding: '1.5rem', textAlign: 'left' }}>
              <Cpu color="#4f46e5" size={26} style={{ marginBottom: '0.75rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', color: '#0f172a' }}>Microservice Isolation</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Auth (3001), Profile (3002), Goals (3003), Resume (3004), Twin (3005) run independently.</p>
            </div>

            <div className="cockpit-panel animate-reveal stagger-2" style={{ padding: '1.5rem', textAlign: 'left' }}>
              <ShieldCheck color="#059669" size={26} style={{ marginBottom: '0.75rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', color: '#0f172a' }}>MongoDB Schema Isolation</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Mongoose database isolation enforcing clean microservice boundaries.</p>
            </div>

            <div className="cockpit-panel animate-reveal stagger-3" style={{ padding: '1.5rem', textAlign: 'left' }}>
              <Zap color="#7c3aed" size={26} style={{ marginBottom: '0.75rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', color: '#0f172a' }}>AI Context Builder</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Dynamic selective context retrieval engine scoping twin nodes for downstream AI tasks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
        © 2026 CareerOS AI. All rights reserved. Built with React, Vite, Node.js, & MongoDB Microservices.
      </footer>
    </div>
  );
};
