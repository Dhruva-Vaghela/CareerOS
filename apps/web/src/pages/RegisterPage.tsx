import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  BarChart3,
  BookOpen,
  Target,
} from 'lucide-react';
import { CareerOSLogo } from '../components/CareerOSLogo';
import { AuthOrbitalStage } from '../components/AuthOrbitalStage';
import { Alert } from '../components/Alert';
import './LoginPage.css';

export function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Parallax tilt state for abstract 3D orbital element
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  // Subtle mouse parallax on desktop
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 1024) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width - 0.5;
    const yRatio = (e.clientY - rect.top) / rect.height - 0.5;

    setTilt({
      x: -yRatio * 4,
      y: xRatio * 5,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Registration failed');
      }

      navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="cos-signin-page"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* --------------------------------------------------------------------
          Top Header: Single Logo on Left & Back to Home on Right
          -------------------------------------------------------------------- */}
      <header className="cos-signin-header">
        <Link to="/" style={{ textDecoration: 'none' }} aria-label="Career OS Home">
          <CareerOSLogo size={34} variant="light" />
        </Link>

        <Link to="/" className="cos-back-home-link" aria-label="Back to Home">
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* --------------------------------------------------------------------
          Split-Screen Layout Container
          -------------------------------------------------------------------- */}
      <main className="cos-signin-container">
        {/* Left Side: Brand Narrative & Feature Highlights */}
        <section className="cos-signin-left">
          <span className="cos-signin-tag">START YOUR JOURNEY</span>

          <h1 className="cos-signin-headline">
            Build your career,<br />
            <span className="cos-signin-gradient-word">one step</span><br />
            <span style={{ whiteSpace: 'nowrap' }}>at a time.</span>
          </h1>

          <p className="cos-signin-subtext">
            Access your career digital twin, track your progress, and unlock personalized opportunities.
          </p>

          <div className="cos-features-list">
            {/* Benefit 1: Personalized Career Insights */}
            <div className="cos-feature-row">
              <div
                className="cos-feature-icon-box"
                style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed' }}
              >
                <BarChart3 size={20} />
              </div>
              <div>
                <h2 className="cos-feature-title">Personalized Career Insights</h2>
                <p className="cos-feature-desc">Understand your strengths, velocity, and skill gaps.</p>
              </div>
            </div>

            {/* Benefit 2: Guided Learning Paths */}
            <div className="cos-feature-row">
              <div
                className="cos-feature-icon-box"
                style={{ background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' }}
              >
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="cos-feature-title">Guided Learning Paths</h2>
                <p className="cos-feature-desc">Follow structured milestones tailored to your target roles.</p>
              </div>
            </div>

            {/* Benefit 3: Opportunity Matching */}
            <div className="cos-feature-row">
              <div
                className="cos-feature-icon-box"
                style={{ background: 'rgba(219, 39, 119, 0.08)', color: '#db2777' }}
              >
                <Target size={20} />
              </div>
              <div>
                <h2 className="cos-feature-title">Opportunity Matching</h2>
                <p className="cos-feature-desc">Get matched with verified roles and companies that fit you.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            Abstract 3D Orbital Element (Beside & Behind Left Content)
            ------------------------------------------------------------------ */}
        <AuthOrbitalStage tilt={tilt} />

        {/* ------------------------------------------------------------------
            Right Side: Simple Elevated White Registration Card Panel
            ------------------------------------------------------------------ */}
        <section className="cos-signin-card" aria-label="Create account registration form">
          <div className="cos-card-header">
            <h2 className="cos-card-title">Create your account</h2>
            <p className="cos-card-subtitle">Start your career journey with your digital twin.</p>
          </div>

          {error && <Alert type="error" message={error} />}

          <form onSubmit={handleSubmit} className="cos-form" noValidate>
            {/* Full Name Field */}
            <div className="cos-field-group">
              <label htmlFor="register-name" className="cos-field-label">
                Full Name
              </label>
              <div className="cos-input-box">
                <span className="cos-input-leading-icon" aria-hidden="true">
                  <User size={18} />
                </span>
                <input
                  id="register-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  autoComplete="name"
                  className="cos-text-input"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="cos-field-group">
              <label htmlFor="register-email" className="cos-field-label">
                Email address
              </label>
              <div className="cos-input-box">
                <span className="cos-input-leading-icon" aria-hidden="true">
                  <Mail size={18} />
                </span>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="cos-text-input"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="cos-field-group">
              <label htmlFor="register-password" className="cos-field-label">
                Password
              </label>
              <div className="cos-input-box">
                <span className="cos-input-leading-icon" aria-hidden="true">
                  <Lock size={18} />
                </span>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                  className="cos-text-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="cos-pw-toggle-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="cos-field-group">
              <label htmlFor="register-confirm-password" className="cos-field-label">
                Confirm Password
              </label>
              <div className="cos-input-box">
                <span className="cos-input-leading-icon" aria-hidden="true">
                  <Lock size={18} />
                </span>
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="cos-text-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="cos-pw-toggle-btn"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  tabIndex={0}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="cos-submit-btn"
              aria-label="Create Account"
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="cos-card-footer">
            <span>Already have an account?</span>
            <Link to="/login" className="cos-create-link">
              Sign in
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
