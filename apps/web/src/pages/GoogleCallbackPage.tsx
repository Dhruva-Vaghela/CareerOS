import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from '../components/GoogleIcon';
import { RefreshCw, AlertCircle } from 'lucide-react';

export const GoogleCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const oauthError = searchParams.get('error_description') || searchParams.get('error');
    if (oauthError) {
      setError(oauthError);
      return;
    }

    // Pattern A: Backend redirect with single-use temporary ticket (most secure flow)
    const ticket = searchParams.get('ticket');
    if (ticket) {
      processedRef.current = true;

      const exchangeTicket = async () => {
        try {
          const res = await fetch('/api/v1/auth/google/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error?.message || 'Failed to exchange authentication ticket');
          }

          login(data.data.accessToken, data.data.refreshToken, data.data.user);
          if (data.data.name) {
            navigate('/onboarding', { state: { fullName: data.data.name }, replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } catch (err: any) {
          setError(err.message || 'Error completing Google sign-in');
        }
      };

      exchangeTicket();
      return;
    }

    // Pattern B: Google redirected directly with authorization code
    const code = searchParams.get('code');
    if (code) {
      processedRef.current = true;

      const exchangeCode = async () => {
        try {
          const res = await fetch('/api/v1/auth/google/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error?.message || 'Failed to authenticate with Google');
          }

          login(data.data.accessToken, data.data.refreshToken, data.data.user);
          if (data.data.name) {
            navigate('/onboarding', { state: { fullName: data.data.name }, replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } catch (err: any) {
          setError(err.message || 'Error completing Google sign-in');
        }
      };

      exchangeCode();
      return;
    }

    // Pattern C: Legacy query token fallback (sanitized immediately from browser history)
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email') || undefined;
    const fullName = searchParams.get('fullName') || undefined;

    if (accessToken && refreshToken && userId) {
      processedRef.current = true;
      // Immediately wipe tokens from browser URL history to prevent leakage
      window.history.replaceState({}, document.title, window.location.pathname);
      login(accessToken, refreshToken, { id: userId, email });
      if (fullName) {
        navigate('/onboarding', { state: { fullName }, replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
      return;
    }

    // Neither ticket, code, nor tokens found
    setError('No valid authentication credentials received from Google.');
  }, [searchParams, login, navigate]);

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#090d16',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '1.25rem',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}
          >
            <AlertCircle size={32} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Google Sign-In Failed
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.925rem', lineHeight: 1.5, marginBottom: '1.75rem' }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            style={{
              width: '100%',
              padding: '0.8rem 1.5rem',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              fontWeight: 650,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#090d16',
        color: '#ffffff',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          backgroundColor: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.75rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
      >
        <GoogleIcon size={34} />
      </div>
      <RefreshCw size={26} className="animate-spin" style={{ color: '#818cf8', marginBottom: '1.25rem' }} />
      <h3 style={{ fontSize: '1.25rem', fontWeight: 650, marginBottom: '0.35rem' }}>
        Signing in with Google...
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '0.925rem' }}>
        Verifying your Google session and establishing your digital twin workspace.
      </p>
    </div>
  );
};
