import React, { useState, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
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
import { GoogleIcon } from '../components/GoogleIcon';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Parallax tilt state for abstract 3D orbital element
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const message = location.state?.message;
  const oauthError = searchParams.get('error');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setError('');
    setIsGoogleLoading(true);
    // Redirect user to backend Google OAuth initiation route
    window.location.href = '/api/v1/auth/google';
  };

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

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      login(data.data.accessToken, data.data.refreshToken, data.data.user);
      navigate('/dashboard');
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
          <span className="cos-signin-tag">SAME YOU. A BRIGHTER TOMORROW.</span>

          <h1 className="cos-signin-headline">
            Sign in to<br />
            <span className="cos-signin-gradient-word">continue</span><br />
            your journey.
          </h1>

          <p className="cos-signin-subtext">
            Access your career digital twin, track your progress, and unlock personalized opportunities.
          </p>

          <div className="cos-features-list">
            {/* Feature 1: Personalized Insights */}
            <div className="cos-feature-row">
              <div
                className="cos-feature-icon-box"
                style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed' }}
              >
                <BarChart3 size={20} />
              </div>
              <div>
                <h2 className="cos-feature-title">Personalized Insights</h2>
                <p className="cos-feature-desc">Understand your strengths and skill gaps.</p>
              </div>
            </div>

            {/* Feature 2: Structured Learning */}
            <div className="cos-feature-row">
              <div
                className="cos-feature-icon-box"
                style={{ background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' }}
              >
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="cos-feature-title">Structured Learning</h2>
                <p className="cos-feature-desc">Follow learning paths tailored to your goals.</p>
              </div>
            </div>

            {/* Feature 3: Real Opportunities */}
            <div className="cos-feature-row">
              <div
                className="cos-feature-icon-box"
                style={{ background: 'rgba(219, 39, 119, 0.08)', color: '#db2777' }}
              >
                <Target size={20} />
              </div>
              <div>
                <h2 className="cos-feature-title">Real Opportunities</h2>
                <p className="cos-feature-desc">Get matched with roles and companies that fit you.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            Abstract 3D Orbital Element (Beside & Behind Left Content)
            ------------------------------------------------------------------ */}
        <AuthOrbitalStage tilt={tilt} />

        {/* ------------------------------------------------------------------
            Right Side: Simple Elevated White Sign-In Card Panel
            ------------------------------------------------------------------ */}
        <section className="cos-signin-card" aria-label="Sign-in form card">
          <div className="cos-card-header">
            <h2 className="cos-card-title">Welcome back</h2>
            <p className="cos-card-subtitle">Sign in to continue your career journey.</p>
          </div>

          {message && !oauthError && !error && <Alert type="success" message={message} />}
          {(oauthError || error) && <Alert type="error" message={oauthError || error} />}

          <form onSubmit={handleSubmit} className="cos-form" noValidate>
            {/* Email Field */}
            <div className="cos-field-group">
              <label htmlFor="signin-email" className="cos-field-label">
                Email address
              </label>
              <div className="cos-input-box">
                <span className="cos-input-leading-icon" aria-hidden="true">
                  <Mail size={18} />
                </span>
                <input
                  id="signin-email"
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
              <label htmlFor="signin-password" className="cos-field-label">
                Password
              </label>
              <div className="cos-input-box">
                <span className="cos-input-leading-icon" aria-hidden="true">
                  <Lock size={18} />
                </span>
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
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

              <div className="cos-forgot-link-wrap">
                <Link to="/forgot-password" className="cos-forgot-link">
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="cos-submit-btn"
              aria-label="Sign in"
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* OAuth Separator */}
          <div className="cos-oauth-divider" role="separator" aria-label="Or continue with">
            <span>Or continue with</span>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
            className="cos-google-btn"
            aria-label="Continue with Google"
          >
            {isGoogleLoading ? (
              <>
                <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon size={20} />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Create Account Link */}
          <div className="cos-card-footer">
            <span>Don't have an account?</span>
            <Link to="/register" className="cos-create-link">
              Create account
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
