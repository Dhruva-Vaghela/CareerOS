import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Play,
  Compass,
  Target,
  BookOpen,
  TrendingUp,
  Briefcase,
  Zap,
  User,
  CheckCircle2,
  Menu,
  X,
  Radio,
  Cpu,
  Layers,
} from 'lucide-react';
import { CareerOSLogo } from '../components/CareerOSLogo';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Navigation scroll state
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Video walkthrough modal state
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // 3D Parallax state for hero stage
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageTilt, setStageTilt] = useState({ x: 0, y: 0 });

  // Active step highlight in "How It Works"
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Active showcase tab in Dark Career Twin section
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'skills' | 'simulation' | 'milestones'>('skills');

  // Interactive simulation state in dark console
  const [isSimulating, setIsSimulating] = useState(false);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  // Handle window scroll for sticky navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle mouse move for subtle 3D parallax on desktop
  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 1024) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const yRatio = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

    setStageTilt({
      x: -yRatio * 5, // max ±2.5 deg tilt
      y: xRatio * 6,
    });
  };

  const handleStageMouseLeave = () => {
    setStageTilt({ x: 0, y: 0 });
  };

  // Run interactive AI interview simulation test
  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimFeedback(null);
    setTimeout(() => {
      setIsSimulating(false);
      setSimFeedback('✨ Readiness updated to 94.2% (+3.2%). High competence verified in distributed systems & API design.');
    }, 1800);
  };

  // Smooth scroll helper
  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="cos-landing-page">
      {/* --------------------------------------------------------------------
          Minimal Sticky Navigation
          -------------------------------------------------------------------- */}
      <nav className={`cos-navbar ${isScrolled ? 'scrolled' : ''}`} aria-label="Main Navigation">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{ textDecoration: 'none' }}
          >
            <CareerOSLogo size={34} variant="light" />
          </a>
        </div>

        {/* Minimal Nav Links */}
        <ul className="cos-nav-links">
          <li>
            <a
              href="#product"
              className="cos-nav-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('product');
              }}
            >
              Product
            </a>
          </li>
          <li>
            <a
              href="#how-it-works"
              className="cos-nav-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('how-it-works');
              }}
            >
              How It Works
            </a>
          </li>
          <li>
            <a
              href="#features"
              className="cos-nav-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('features');
              }}
            >
              Features
            </a>
          </li>
        </ul>

        {/* Right CTA Actions */}
        <div className="cos-nav-actions">
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="cos-btn-primary"
              aria-label="Launch Dashboard"
            >
              Launch Cockpit <ArrowRight size={16} />
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="cos-btn-ghost"
                aria-label="Sign In"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="cos-btn-primary"
                aria-label="Get Started"
              >
                Get Started <ArrowRight size={16} />
              </button>
            </>
          )}

          {/* Mobile hamburger toggle */}
          <button
            className="cos-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="cos-mobile-menu">
          <a
            href="#product"
            className="cos-nav-link"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('product');
            }}
          >
            Product
          </a>
          <a
            href="#how-it-works"
            className="cos-nav-link"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('how-it-works');
            }}
          >
            How It Works
          </a>
          <a
            href="#features"
            className="cos-nav-link"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('features');
            }}
          >
            Features
          </a>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            {user ? (
              <button onClick={() => navigate('/dashboard')} className="cos-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Launch Cockpit <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="cos-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  Sign In
                </button>
                <button onClick={() => navigate('/register')} className="cos-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Get Started <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          Spacious Cinematic 3D Hero Section
          -------------------------------------------------------------------- */}
      <section id="hero" className="cos-hero-section">
        <div className="cos-hero-container">
          {/* Left Hero Content */}
          <div className="cos-hero-content">
            <div className="cos-pill-tag">
              <Sparkles size={14} style={{ color: '#8b5cf6' }} />
              <span>AI-POWERED CAREER INTELLIGENCE</span>
            </div>

            <h1 className="cos-hero-title">
              Your Career.<br />
              Smarter. Clearer.<br />
              <span className="cos-title-gradient">With Career OS.</span>
            </h1>

            <p className="cos-hero-subtitle">
              Build your career digital twin, discover your skill gaps, and turn your goals into a personalized plan for growth.
            </p>

            <div className="cos-hero-cta-group">
              <button
                onClick={() => navigate(user ? '/dashboard' : '/register')}
                className="cos-btn-primary cos-hero-primary-btn"
                aria-label="Build My Career Twin"
              >
                <span>Build My Career Twin</span>
                <ArrowRight size={18} />
              </button>

              <button
                onClick={() => setVideoModalOpen(true)}
                className="cos-btn-secondary cos-hero-secondary-btn"
                aria-label="Watch Video Tour"
              >
                <Play size={16} style={{ color: '#7c3aed', fill: '#7c3aed' }} />
                <span>Watch Video</span>
              </button>
            </div>
          </div>

          {/* Right Cinematic 3D Panoramic Stage */}
          <div
            className="cos-hero-stage-wrapper"
            onMouseMove={handleStageMouseMove}
            onMouseLeave={handleStageMouseLeave}
          >
            <div
              ref={stageRef}
              className="cos-hero-stage"
              style={{
                transform: `rotateX(${stageTilt.x}deg) rotateY(${stageTilt.y}deg)`,
              }}
            >
              {/* High-Resolution Cinematic Landscape Background */}
              <img
                src="/career-landscape.jpg"
                alt="Cinematic Career Journey Landscape with Illuminated Path and Distant Futuristic City"
                className="cos-landscape-img"
                loading="eager"
              />

              {/* Atmospheric Sunlight & Violet Ambient Vignette */}
              <div className="cos-stage-overlay" />

              {/* Progressive Illuminated Path Reveal (SVG) */}
              <svg className="cos-light-path-svg" viewBox="0 0 1000 625" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cos-path-glow" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                    <stop offset="40%" stopColor="#fbbf24" stopOpacity="1" />
                    <stop offset="75%" stopColor="#c084fc" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.9" />
                  </linearGradient>
                  <filter id="cos-path-bloom" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Glowing Winding Highway Path */}
                <path
                  d="M 380 475 Q 480 440, 580 425 T 670 335 Q 700 295, 780 275 T 840 265"
                  fill="none"
                  stroke="url(#cos-path-glow)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  filter="url(#cos-path-bloom)"
                  className="cos-illuminated-path"
                />

                {/* Subtle Orbital Connected Rays to Celestial Orb */}
                <line x1="495" y1="150" x2="410" y2="90" stroke="rgba(192, 132, 252, 0.45)" strokeWidth="1.5" strokeDasharray="4 3" />
                <line x1="495" y1="150" x2="720" y2="100" stroke="rgba(192, 132, 252, 0.45)" strokeWidth="1.5" strokeDasharray="4 3" />
                <line x1="495" y1="150" x2="380" y2="290" stroke="rgba(192, 132, 252, 0.45)" strokeWidth="1.5" strokeDasharray="4 3" />
                <line x1="495" y1="150" x2="710" y2="270" stroke="rgba(192, 132, 252, 0.45)" strokeWidth="1.5" strokeDasharray="4 3" />
              </svg>

              {/* Floating Career Twin Connected Nodes */}
              {/* Node 1: Skills */}
              <div
                className="cos-node-card cos-node-skills"
                onClick={() => scrollToSection('features')}
                role="button"
                tabIndex={0}
                aria-label="Explore Skills: Grow your strengths"
              >
                <div className="cos-node-icon" style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' }}>
                  <Zap size={18} />
                </div>
                <div>
                  <div className="cos-node-text-title">Skills</div>
                  <div className="cos-node-text-sub">Grow your strengths</div>
                </div>
              </div>

              {/* Node 2: Opportunities */}
              <div
                className="cos-node-card cos-node-opportunities"
                onClick={() => scrollToSection('features')}
                role="button"
                tabIndex={0}
                aria-label="Explore Opportunities: Find your next role"
              >
                <div className="cos-node-icon" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }}>
                  <Briefcase size={18} />
                </div>
                <div>
                  <div className="cos-node-text-title">Opportunities</div>
                  <div className="cos-node-text-sub">Find your next role</div>
                </div>
              </div>

              {/* Node 3: Learning */}
              <div
                className="cos-node-card cos-node-learning"
                onClick={() => scrollToSection('how-it-works')}
                role="button"
                tabIndex={0}
                aria-label="Explore Learning: Build what's next"
              >
                <div className="cos-node-icon" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#9333ea' }}>
                  <BookOpen size={18} />
                </div>
                <div>
                  <div className="cos-node-text-title">Learning</div>
                  <div className="cos-node-text-sub">Build what's next</div>
                </div>
              </div>

              {/* Node 4: Goals */}
              <div
                className="cos-node-card cos-node-goals"
                onClick={() => scrollToSection('how-it-works')}
                role="button"
                tabIndex={0}
                aria-label="Explore Goals: Turn plans into progress"
              >
                <div className="cos-node-icon" style={{ background: 'rgba(236, 72, 153, 0.12)', color: '#db2777' }}>
                  <Target size={18} />
                </div>
                <div>
                  <div className="cos-node-text-title">Goals</div>
                  <div className="cos-node-text-sub">Turn plans into progress</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          Clean Career Journey Section ("HOW IT WORKS")
          -------------------------------------------------------------------- */}
      <section id="how-it-works" className="cos-journey-section">
        <div className="cos-section-header">
          <span className="cos-section-badge">HOW IT WORKS</span>
          <h2 className="cos-section-title">
            Your Career Journey, In 4 Simple Steps
          </h2>
          <p className="cos-section-subtitle">
            From self-discovery to new opportunities, Career OS guides you at every stage.
          </p>
        </div>

        <div className="cos-journey-steps-grid">
          {/* Step 1: Understand */}
          <div
            className="cos-journey-step-card"
            style={{
              borderColor: activeStepIndex === 0 ? 'rgba(124, 58, 237, 0.5)' : undefined,
              boxShadow: activeStepIndex === 0 ? '0 16px 32px -8px rgba(124, 58, 237, 0.15)' : undefined,
            }}
            onClick={() => setActiveStepIndex(0)}
          >
            <div className="cos-step-top">
              <div className="cos-step-icon-wrap" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
                <User size={26} />
              </div>
              <span className="cos-step-number">01</span>
            </div>
            <h3 className="cos-step-title">1. Understand</h3>
            <p className="cos-step-desc">
              Build your profile and create your career twin. Ingest resumes, projects, and target role criteria into a unified graph.
            </p>
            <div className="cos-step-highlight">
              <CheckCircle2 size={15} />
              <span>Digital Twin codification</span>
            </div>
          </div>

          {/* Step 2: Develop */}
          <div
            className="cos-journey-step-card"
            style={{
              borderColor: activeStepIndex === 1 ? 'rgba(16, 185, 129, 0.5)' : undefined,
              boxShadow: activeStepIndex === 1 ? '0 16px 32px -8px rgba(16, 185, 129, 0.15)' : undefined,
            }}
            onClick={() => setActiveStepIndex(1)}
          >
            <div className="cos-step-top">
              <div className="cos-step-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                <BookOpen size={26} />
              </div>
              <span className="cos-step-number">02</span>
            </div>
            <h3 className="cos-step-title">2. Develop</h3>
            <p className="cos-step-desc">
              Find skill gaps and follow personalized learning paths. Bridge competencies with targeted milestones and recommended resources.
            </p>
            <div className="cos-step-highlight" style={{ color: '#059669' }}>
              <CheckCircle2 size={15} />
              <span>Dynamic AI curriculum</span>
            </div>
          </div>

          {/* Step 3: Explore */}
          <div
            className="cos-journey-step-card"
            style={{
              borderColor: activeStepIndex === 2 ? 'rgba(79, 70, 229, 0.5)' : undefined,
              boxShadow: activeStepIndex === 2 ? '0 16px 32px -8px rgba(79, 70, 229, 0.15)' : undefined,
            }}
            onClick={() => setActiveStepIndex(2)}
          >
            <div className="cos-step-top">
              <div className="cos-step-icon-wrap" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
                <Compass size={26} />
              </div>
              <span className="cos-step-number">03</span>
            </div>
            <h3 className="cos-step-title">3. Explore</h3>
            <p className="cos-step-desc">
              Get matched with roles and companies that fit you. Practice simulated technical interviews calibrated to your exact target tier.
            </p>
            <div className="cos-step-highlight" style={{ color: '#4f46e5' }}>
              <CheckCircle2 size={15} />
              <span>Target company calibration</span>
            </div>
          </div>

          {/* Step 4: Grow */}
          <div
            className="cos-journey-step-card"
            style={{
              borderColor: activeStepIndex === 3 ? 'rgba(8, 145, 178, 0.5)' : undefined,
              boxShadow: activeStepIndex === 3 ? '0 16px 32px -8px rgba(8, 145, 178, 0.15)' : undefined,
            }}
            onClick={() => setActiveStepIndex(3)}
          >
            <div className="cos-step-top">
              <div className="cos-step-icon-wrap" style={{ background: 'rgba(8, 145, 178, 0.1)', color: '#0891b2' }}>
                <TrendingUp size={26} />
              </div>
              <span className="cos-step-number">04</span>
            </div>
            <h3 className="cos-step-title">4. Grow</h3>
            <p className="cos-step-desc">
              Track progress and achieve your goals. Benchmark measurable readiness scores and watch your career trajectory advance.
            </p>
            <div className="cos-step-highlight" style={{ color: '#0891b2' }}>
              <CheckCircle2 size={15} />
              <span>Evidence-based readiness</span>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          Dark Career Twin Showcase ("More Than a Platform.")
          -------------------------------------------------------------------- */}
      <section id="features" className="cos-showcase-section">
        <div id="product" className="cos-showcase-container">
          <div className="cos-dark-header">
            <div className="cos-dark-badge">
              <span className="cos-dark-badge-pulse" />
              <span>CAREER TWIN ARCHITECTURE</span>
            </div>

            <h2 className="cos-dark-title">
              More Than a Platform.<br />
              <span style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #c084fc 50%, #f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                A Digital Twin of Your Potential.
              </span>
            </h2>

            <p className="cos-dark-subtitle">
              Traditional job portals store static resumes. Career OS builds an active, evolving intelligence model of your skills, velocity, and readiness.
            </p>
          </div>

          <div className="cos-showcase-grid">
            {/* Interactive Capability Tabs */}
            <div className="cos-showcase-tabs">
              <div
                className={`cos-showcase-tab-item ${activeShowcaseTab === 'skills' ? 'active' : ''}`}
                onClick={() => setActiveShowcaseTab('skills')}
                role="button"
                tabIndex={0}
              >
                <div className="cos-tab-title">
                  <Zap size={20} style={{ color: '#a78bfa' }} />
                  <span>Autonomous Skill Intelligence</span>
                </div>
                <p className="cos-tab-desc">
                  Continuously calculates capability confidence across core languages, system architectures, and engineering patterns.
                </p>
              </div>

              <div
                className={`cos-showcase-tab-item ${activeShowcaseTab === 'simulation' ? 'active' : ''}`}
                onClick={() => setActiveShowcaseTab('simulation')}
                role="button"
                tabIndex={0}
              >
                <div className="cos-tab-title">
                  <Cpu size={20} style={{ color: '#38bdf8' }} />
                  <span>AI Mock Interview Simulation</span>
                </div>
                <p className="cos-tab-desc">
                  Generates realistic interview loops tailored to company standards (e.g. Stripe, OpenAI) with instant code and communication feedback.
                </p>
              </div>

              <div
                className={`cos-showcase-tab-item ${activeShowcaseTab === 'milestones' ? 'active' : ''}`}
                onClick={() => setActiveShowcaseTab('milestones')}
                role="button"
                tabIndex={0}
              >
                <div className="cos-tab-title">
                  <Layers size={20} style={{ color: '#4ade80' }} />
                  <span>Milestone Velocity & Evidence</span>
                </div>
                <p className="cos-tab-desc">
                  Connects resume bullet points, GitHub repositories, and verified assessments into verifiable proof-of-work graphs.
                </p>
              </div>
            </div>

            {/* Right Telemetry Cockpit Console */}
            <div className="cos-telemetry-console">
              <div className="cos-telemetry-header">
                <div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                    DIGITAL TWIN TELEMETRY
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                    Candidate Profile Node #8410
                  </div>
                </div>

                <div className="cos-twin-status-pill">
                  <Radio size={12} style={{ animation: 'pulseDot 1.5s infinite' }} />
                  <span>TWIN ACTIVE</span>
                </div>
              </div>

              {/* Top Key Metrics */}
              <div className="cos-metrics-row">
                <div className="cos-metric-box">
                  <div className="cos-metric-label">Target Role</div>
                  <div className="cos-metric-val" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                    Platform Lead
                  </div>
                  <div className="cos-metric-sub">Tier 1 Tech</div>
                </div>

                <div className="cos-metric-box">
                  <div className="cos-metric-label">Readiness Index</div>
                  <div className="cos-metric-val" style={{ color: '#a78bfa' }}>
                    91%
                  </div>
                  <div className="cos-metric-sub" style={{ color: '#4ade80' }}>
                    +14% this month
                  </div>
                </div>

                <div className="cos-metric-box">
                  <div className="cos-metric-label">Target Window</div>
                  <div className="cos-metric-val" style={{ fontSize: '1.15rem' }}>
                    6 Months
                  </div>
                  <div className="cos-metric-sub">On Track</div>
                </div>
              </div>

              {/* Dynamic Skill Readiness Visualizer */}
              <div className="cos-graph-visual-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                    {activeShowcaseTab === 'skills'
                      ? 'Core Competency Telemetry'
                      : activeShowcaseTab === 'simulation'
                      ? 'Interview Performance Vectors'
                      : 'Milestone Progress Tracker'}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    LIVE BENCHMARK
                  </span>
                </div>

                <div className="cos-skill-bar-row">
                  <span className="cos-skill-bar-label">
                    {activeShowcaseTab === 'skills' ? 'Distributed Systems' : activeShowcaseTab === 'simulation' ? 'System Design Round' : 'System Architecture Repo'}
                  </span>
                  <div className="cos-skill-bar-track">
                    <div className="cos-skill-bar-fill" style={{ width: '92%' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>92%</span>
                </div>

                <div className="cos-skill-bar-row">
                  <span className="cos-skill-bar-label">
                    {activeShowcaseTab === 'skills' ? 'Cloud Infrastructure (AWS/K8s)' : activeShowcaseTab === 'simulation' ? 'Algorithmic Problem Solving' : 'Production Microservices'}
                  </span>
                  <div className="cos-skill-bar-track">
                    <div className="cos-skill-bar-fill" style={{ width: '87%' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>87%</span>
                </div>

                <div className="cos-skill-bar-row">
                  <span className="cos-skill-bar-label">
                    {activeShowcaseTab === 'skills' ? 'API Design & Observability' : activeShowcaseTab === 'simulation' ? 'Behavioral & Leadership' : 'Cloud Native Certification'}
                  </span>
                  <div className="cos-skill-bar-track">
                    <div className="cos-skill-bar-fill" style={{ width: '95%' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>95%</span>
                </div>
              </div>

              {/* Simulation Action Box */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="cos-btn-primary"
                  style={{
                    fontSize: '0.875rem',
                    padding: '0.65rem 1.25rem',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  }}
                  aria-label="Simulate AI Assessment"
                >
                  {isSimulating ? (
                    <>
                      <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                      <span>Simulating Twin Analysis...</span>
                    </>
                  ) : (
                    <>
                      <Cpu size={16} />
                      <span>Run Twin Assessment Loop</span>
                    </>
                  )}
                </button>

                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Model: <span style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>Twin-Graph-v2</span>
                </div>
              </div>

              {/* Live Simulated Feedback Pill */}
              {simFeedback && (
                <div
                  style={{
                    marginTop: '1.25rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(124, 58, 237, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.35)',
                    color: '#e2e8f0',
                    fontSize: '0.825rem',
                    lineHeight: 1.5,
                    animation: 'revealUp 0.3s ease',
                  }}
                >
                  {simFeedback}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          Concise Final CTA Section
          -------------------------------------------------------------------- */}
      <section className="cos-cta-section">
        <div className="cos-cta-card">
          <h2 className="cos-cta-title">
            Ready to Architect Your Career Journey?
          </h2>

          <p className="cos-cta-subtitle">
            Join ambitious engineers, founders, and leaders navigating their growth with the intelligence of Career OS.
          </p>

          <div className="cos-cta-actions">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="cos-btn-primary"
              style={{
                padding: '0.95rem 2.25rem',
                fontSize: '1.05rem',
                boxShadow: '0 8px 30px rgba(124, 58, 237, 0.45)',
              }}
              aria-label="Build My Career Twin Now"
            >
              <span>Build My Career Twin</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="cos-btn-secondary"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                padding: '0.95rem 1.85rem',
                fontSize: '1.05rem',
              }}
              aria-label="Sign In to Cockpit"
            >
              Sign In to Cockpit
            </button>
          </div>

          <div className="cos-cta-highlights">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} style={{ color: '#4ade80' }} /> Free to get started
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} style={{ color: '#4ade80' }} /> Instant profile analysis
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} style={{ color: '#4ade80' }} /> No credit card required
            </span>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          Minimal Footer
          -------------------------------------------------------------------- */}
      <footer className="cos-footer">
        <div className="cos-footer-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <CareerOSLogo size={28} variant="light" />
          </div>

          <ul className="cos-footer-links">
            <li>
              <a
                href="#product"
                className="cos-footer-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('product');
                }}
              >
                Product
              </a>
            </li>
            <li>
              <a
                href="#how-it-works"
                className="cos-footer-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('how-it-works');
                }}
              >
                How It Works
              </a>
            </li>
            <li>
              <a
                href="#features"
                className="cos-footer-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('features');
                }}
              >
                Features
              </a>
            </li>
            <li>
              <button
                onClick={() => navigate('/login')}
                className="cos-footer-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Sign In
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('/register')}
                className="cos-footer-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Register
              </button>
            </li>
          </ul>

          <div className="cos-footer-copy">
            © 2026 Career OS. All rights reserved.
          </div>
        </div>
      </footer>

      {/* --------------------------------------------------------------------
          Guided Video Walkthrough Modal
          -------------------------------------------------------------------- */}
      {videoModalOpen && (
        <div
          className="cos-modal-overlay"
          onClick={() => setVideoModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Career OS Guided Tour"
        >
          <div className="cos-modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              className="cos-modal-close-btn"
              onClick={() => setVideoModalOpen(false)}
              aria-label="Close walkthrough modal"
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'rgba(124, 58, 237, 0.2)',
                  color: '#a78bfa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play size={16} fill="#a78bfa" />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', color: '#a78bfa', textTransform: 'uppercase' }}>
                Product Guided Walkthrough
              </span>
            </div>

            <h3 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: '0.75rem', color: '#ffffff' }}>
              How Career OS Accelerates Your Trajectory
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Watch how our multi-node digital twin model transforms your past projects, resumes, and aspirations into concrete, actionable steps.
            </p>

            {/* Feature Demo Preview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '16px', padding: '1.25rem', border: '1px solid rgba(79, 70, 229, 0.3)' }}>
                <User size={22} color="#818cf8" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>1. Ingest Profile</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Sync GitHub, upload PDF resumes, and select target companies.</div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '16px', padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <Target size={22} color="#34d399" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>2. Detect Gaps</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Benchmark your current abilities against live tier-1 hiring standards.</div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '16px', padding: '1.25rem', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                <Cpu size={22} color="#f472b6" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>3. Practice Mock Loops</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Simulate rigorous technical interviews with instant feedback.</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                onClick={() => setVideoModalOpen(false)}
                className="cos-btn-ghost"
                style={{ color: '#cbd5e1' }}
              >
                Close Tour
              </button>
              <button
                onClick={() => {
                  setVideoModalOpen(false);
                  navigate(user ? '/dashboard' : '/register');
                }}
                className="cos-btn-primary"
              >
                <span>Get Started with Twin</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
