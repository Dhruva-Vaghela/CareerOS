import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Dna, Target, FileText, ArrowRight, ShieldCheck, Cpu, Zap } from 'lucide-react';
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
          <span style={{ fontSize: '1.25rem', fontWeight: 800, background: 'var(--gradient-3d-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CareerOS AI
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user ? (
            <Button onClick={() => navigate('/dashboard')} variant="primary" style={{ width: 'auto' }}>
              Go to Dashboard <ArrowRight size={16} style={{ marginLeft: '0.4rem' }} />
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

      {/* 3D Hero Section */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '5rem 1.5rem 4rem 1.5rem',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div className="glow-pill-3d" style={{ marginBottom: '1.5rem' }}>
          <Sparkles size={14} /> Powered by Autonomous Career Digital Twin
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4.2rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '1.5rem',
            letterSpacing: '-0.03em',
            color: '#0f172a',
          }}
        >
          Architect Your Future with <br />
          <span style={{ background: 'var(--gradient-3d-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Career Digital Twin AI
          </span>
        </h1>

        <p
          style={{
            fontSize: '1.15rem',
            color: '#475569',
            maxWidth: '720px',
            margin: '0 auto 2.5rem auto',
            lineHeight: 1.7,
          }}
        >
          CareerOS AI aggregates your profile, timeline goals, target companies, and resume evidence into an independent 3D evidence graph for context-aware AI roadmap generation and mock interviews.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Button
            onClick={() => navigate(user ? '/dashboard' : '/register')}
            variant="primary"
            style={{ width: 'auto', padding: '0.85rem 2rem', fontSize: '1rem' }}
          >
            Launch Digital Twin <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
          </Button>

          <Button
            onClick={() => navigate('/login')}
            variant="secondary"
            style={{ width: 'auto', padding: '0.85rem 2rem', fontSize: '1rem' }}
          >
            Sign In to Account
          </Button>
        </div>

        {/* Floating 3D Graphic Cards Showcase */}
        <div
          style={{
            marginTop: '4rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            textAlign: 'left',
          }}
          className="perspective-1000"
        >
          {/* Card 1 */}
          <div className="card-3d" style={{ padding: '2rem', background: '#ffffff' }}>
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
              Career Digital Twin
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Node-based evidence graph storing independent user nodes (`GOAL`, `TIMELINE`, `TARGET_COMPANY`, `RESUME`) with confidence scoring.
            </p>
          </div>

          {/* Card 2 */}
          <div className="card-3d" style={{ padding: '2rem', background: '#ffffff' }}>
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
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Define target roles, 3-24 month timelines, and select target companies with multi-tag suggestions and goal tracking.
            </p>
          </div>

          {/* Card 3 */}
          <div className="card-3d" style={{ padding: '2rem', background: '#ffffff' }}>
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
                color: '#10b981',
                marginBottom: '1.25rem',
              }}
            >
              <FileText size={26} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
              Resume Cloud Foundation
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Secure file storage integration with Cloudinary & MongoDB storing resume metadata with inline PDF document preview.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Specs */}
      <section
        style={{
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          padding: '4rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2.5rem', color: '#0f172a' }}>
            Enterprise Microservice Microarchitecture
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <Cpu color="#4f46e5" size={28} style={{ marginBottom: '0.75rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', color: '#0f172a' }}>Isolated Microservices</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Auth, Profile, Goals, Resume, and Digital Twin run on dedicated ports.</p>
            </div>

            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <ShieldCheck color="#10b981" size={28} style={{ marginBottom: '0.75rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', color: '#0f172a' }}>MongoDB & Auth</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Mongoose schema isolation targeting MongoDB database.</p>
            </div>

            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <Zap color="#7c3aed" size={28} style={{ marginBottom: '0.75rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', color: '#0f172a' }}>AI Context Builder</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Dynamic selective node compilation for downstream AI features.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
        © 2026 CareerOS AI. All rights reserved. Built with React, Vite, Node.js, & MongoDB.
      </footer>
    </div>
  );
};
