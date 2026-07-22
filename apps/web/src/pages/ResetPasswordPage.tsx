import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/PasswordField';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    
    // Mocking the API call
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    }, 1000);
  };

  return (
    <AuthLayout title="Set new password" subtitle="Please enter your new password below">
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message="Password has been reset successfully. Redirecting..." />}
      
      <form onSubmit={handleSubmit}>
        <PasswordField 
          label="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        <PasswordField 
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        <Button type="submit" isLoading={isLoading} disabled={success} style={{ marginTop: '0.5rem' }}>
          Reset password
        </Button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
        Back to <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
