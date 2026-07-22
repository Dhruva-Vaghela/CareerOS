import { Check } from 'lucide-react';

export interface Step {
  id: number;
  title: string;
  subtitle: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
}

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="step-indicator-container">
      <div className="step-indicator-track">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = onStepClick && isCompleted;

          return (
            <div key={step.id} className="step-item-wrapper">
              <div
                className={`step-item ${isCompleted ? 'completed' : ''} ${
                  isCurrent ? 'active' : ''
                } ${isClickable ? 'clickable' : ''}`}
                onClick={() => isClickable && onStepClick(step.id)}
              >
                <div className="step-badge">
                  {isCompleted ? <Check size={16} /> : <span>{step.id}</span>}
                </div>
                <div className="step-info">
                  <span className="step-title">{step.title}</span>
                  <span className="step-subtitle">{step.subtitle}</span>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`step-connector ${isCompleted ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
