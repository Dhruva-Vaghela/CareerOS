import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary';
}

export function Button({ 
  children, 
  isLoading, 
  variant = 'primary', 
  className = '', 
  disabled, 
  ...props 
}: ButtonProps) {
  return (
    <button 
      className={`btn btn-${variant} ${className}`} 
      disabled={isLoading || disabled} 
      {...props}
    >
      {isLoading && (
        <svg className="spinner" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      )}
      {children}
    </button>
  );
}
