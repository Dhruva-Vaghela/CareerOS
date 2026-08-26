import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to process request');
      }

      setSuccess(true);
      if (data.data?.resetToken) {
        setResetToken(data.data.resetToken);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while requesting reset link');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Password Reset Request" subtitle="Follow the instructions below to reset your password.">
        <Alert type="success" message="Password reset link generated successfully." />
        
        {resetToken && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#0f172a' }}>Reset Token Link:</p>
            <Button
              type="button"
              variant="primary"
              onClick={() => navigate(`/reset-password?token=${resetToken}`)}
              style={{ width: '100%' }}
            >
              Proceed to Reset Password Page
            </Button>
          </div>
        )}

        <Button variant="secondary" onClick={() => navigate('/login')} style={{ marginTop: '1rem' }}>
          Return to Login
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email to receive a reset link">
      {error && <Alert type="error" message={error} />}
      <form onSubmit={handleSubmit}>
        <Input 
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <Button type="submit" isLoading={isLoading} style={{ marginTop: '0.5rem' }}>
          Send reset link
        </Button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
        Remember your password? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

