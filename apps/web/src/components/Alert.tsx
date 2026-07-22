import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AlertProps {
  type: 'success' | 'error';
  message: string;
}

export function Alert({ type, message }: AlertProps) {
  return (
    <div className={`alert alert-${type}`}>
      {type === 'error' ? (
        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
      ) : (
        <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
      )}
      <span>{message}</span>
    </div>
  );
}
