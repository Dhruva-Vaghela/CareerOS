import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className={`form-group ${className}`}>
        <label className="form-label">{label}</label>
        <div className="form-input-container">
          <input
            ref={ref}
            className={`form-input ${error ? 'error' : ''}`}
            {...props}
          />
        </div>
        {error && <span className="form-error">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
