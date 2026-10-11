import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GithubIcon } from '../components/GithubIcon';
import { RefreshCw, AlertCircle } from 'lucide-react';

export const GithubCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const oauthError = searchParams.get('error_description') || searchParams.get('error');

    if (oauthError) {
      setError(oauthError);
      return;
    }

    if (!code) {
      setError('No authorization code received from GitHub.');
      return;
    }

    if (!accessToken) {
      // Waiting for auth session
      return;
    }

    const exchangeCode = async () => {
      try {
        const res = await fetch('/api/v1/projects/github/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ code }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to authorize with GitHub');
        }

        // Navigate to project intelligence tab
        navigate('/dashboard?tab=projects', { replace: true });
      } catch (err: any) {
        setError(err.message || 'Error completing GitHub authorization');
      }
    };

    exchangeCode();
  }, [searchParams, accessToken, navigate]);

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#090d16',
          padding: '1rem',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            backgroundColor: '#ffffff',
            borderRadius: '1rem',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          }}
        >
          <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            GitHub Connection Failed
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
          <button
            onClick={() => navigate('/dashboard?tab=projects', { replace: true })}
            style={{
              padding: '0.65rem 1.25rem',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
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
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          backgroundColor: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <GithubIcon size={32} color="#ffffff" />
      </div>
      <RefreshCw size={24} className="animate-spin" style={{ color: '#38bdf8', marginBottom: '1rem' }} />
      <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.25rem' }}>
        Connecting GitHub Account...
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
        Fetching public repositories and building your Project Intelligence.
      </p>
    </div>
  );
};
