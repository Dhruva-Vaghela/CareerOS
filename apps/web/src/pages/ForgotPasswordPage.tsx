import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Mocking the API call as it wasn't built in the backend phase
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
    }, 1000);
  };

  if (success) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent a password reset link to your email.">
        <Alert type="success" message="Reset link sent successfully." />
        <Button onClick={() => window.location.href = '/login'} style={{ marginTop: '1rem' }}>
          Return to login
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email to receive a reset link">
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
