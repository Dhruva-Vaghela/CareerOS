import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './Input';
import type { InputProps } from './Input';

export const PasswordField = forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="form-group" style={{ position: 'relative', marginBottom: props.error ? '1.5rem' : '1rem' }}>
        <Input
          {...props}
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={props.className}
        />
        <button
          type="button"
          className="input-icon-right"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    );
  }
);
PasswordField.displayName = 'PasswordField';
