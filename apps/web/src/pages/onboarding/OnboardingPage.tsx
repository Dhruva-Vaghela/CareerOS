import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { StepIndicator } from '../../components/StepIndicator';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import './OnboardingPage.css';

const STEPS = [
  { id: 1, title: 'Personal Info', subtitle: 'Basic profile details' },
  { id: 2, title: 'Education', subtitle: 'Academic background' },
  { id: 3, title: 'Career Path', subtitle: 'Target role & experience' },
];

const TARGET_ROLES = [
  { label: 'Software Engineer', value: 'Software Engineer' },
  { label: 'AI Engineer', value: 'AI Engineer' },
  { label: 'Machine Learning Engineer', value: 'Machine Learning Engineer' },
  { label: 'Data Scientist', value: 'Data Scientist' },
  { label: 'Data Analyst', value: 'Data Analyst' },
  { label: 'Backend Developer', value: 'Backend Developer' },
  { label: 'Frontend Developer', value: 'Frontend Developer' },
  { label: 'Full Stack Developer', value: 'Full Stack Developer' },
  { label: 'DevOps Engineer', value: 'DevOps Engineer' },
  { label: 'Cloud Engineer', value: 'Cloud Engineer' },
  { label: 'Cybersecurity Analyst', value: 'Cybersecurity Analyst' },
  { label: 'Product Manager', value: 'Product Manager' },
  { label: 'UI/UX Designer', value: 'UI/UX Designer' },
  { label: 'Business Analyst', value: 'Business Analyst' },
  { label: 'Other', value: 'Other' },
];

const CURRENT_STATUSES = [
  { label: 'Student', value: 'STUDENT' },
  { label: 'Working Professional', value: 'WORKING_PROFESSIONAL' },
  { label: 'Job Seeker', value: 'JOB_SEEKER' },
  { label: 'Career Switcher', value: 'CAREER_SWITCHER' },
];

const EXPERIENCE_LEVELS = [
  { label: 'Beginner', value: 'BEGINNER' },
  { label: 'Intermediate', value: 'INTERMEDIATE' },
  { label: 'Advanced', value: 'ADVANCED' },
  { label: 'Professional', value: 'PROFESSIONAL' },
];

const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'Hindi', value: 'hi' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
];

export function OnboardingPage() {
  const { accessToken } = useAuth();
  const { updateLocalProfile } = useProfile();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  const [preferredLanguage, setPreferredLanguage] = useState('en');

  const [college, setCollege] = useState('');
  const [degree, setDegree] = useState('');
  const [branch, setBranch] = useState('');
  const [currentSemester, setCurrentSemester] = useState<string>('');
  const [graduationYear, setGraduationYear] = useState<string>('');
  const [currentStatus, setCurrentStatus] = useState('');

  const [targetRole, setTargetRole] = useState('');
  const [customTargetRole, setCustomTargetRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');

  // Step 1 Validation
  const validateStep1 = () => {
    if (!fullName.trim()) {
      setError('Full Name is required');
      return false;
    }
    setError('');
    return true;
  };

  // Step 2 Validation (Optional step)
  const validateStep2 = () => {
    setError('');
    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    const selectedRole = targetRole === 'Other' ? customTargetRole : targetRole;
    if (!selectedRole.trim()) {
      setError('Target Job Role is required to personalize your CareerOS experience');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateStep3()) return;

    setIsLoading(true);
    setError('');

    const finalTargetRole = targetRole === 'Other' ? customTargetRole.trim() : targetRole;

    const payload = {
      fullName: fullName.trim(),
      profilePictureUrl: profilePictureUrl.trim() || undefined,
      country: country.trim() || undefined,
      timezone: timezone.trim() || undefined,
      preferredLanguage: preferredLanguage || 'en',
      college: college.trim() || undefined,
      degree: degree.trim() || undefined,
      branch: branch.trim() || undefined,
      currentSemester: currentSemester ? parseInt(currentSemester, 10) : undefined,
      graduationYear: graduationYear ? parseInt(graduationYear, 10) : undefined,
      currentStatus: currentStatus || undefined,
      targetRole: finalTargetRole,
      experienceLevel: experienceLevel || undefined,
    };

    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to save profile');
      }

      updateLocalProfile(data.data.profile, data.data.completion);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while saving profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="onboarding-layout">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <h1 className="onboarding-title">Welcome to CareerOS</h1>
          <p className="onboarding-subtitle">
            Let's personalize your career copilot experience in just a few quick steps
          </p>
        </div>

        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={(stepId) => setCurrentStep(stepId)}
        />

        {error && <Alert type="error" message={error} />}

        <form onSubmit={(e) => e.preventDefault()}>
          {/* STEP 1: Personal Information */}
          {currentStep === 1 && (
            <div className="form-grid">
              <div className="form-grid-full">
                <Input
                  label="Full Name *"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  required
                />
              </div>

              <Input
                label="Country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States, India"
              />

              <Input
                label="Time Zone"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. America/New_York"
              />

              <Select
                label="Preferred Language"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                options={LANGUAGES}
              />

              <Input
                label="Profile Picture URL (Optional)"
                type="url"
                value={profilePictureUrl}
                onChange={(e) => setProfilePictureUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          )}

          {/* STEP 2: Education & Professional Information */}
          {currentStep === 2 && (
            <div className="form-grid">
              <div className="form-grid-full">
                <Input
                  label="College / University"
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. Stanford University"
                />
              </div>

              <Input
                label="Degree"
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. Bachelor of Science"
              />

              <Input
                label="Branch / Specialization"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. Computer Science"
              />

              <Input
                label="Current Semester"
                type="number"
                min="1"
                max="12"
                value={currentSemester}
                onChange={(e) => setCurrentSemester(e.target.value)}
                placeholder="e.g. 6"
              />

              <Input
                label="Graduation Year"
                type="number"
                min="2000"
                max="2040"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="e.g. 2026"
              />

              <div className="form-grid-full">
                <Select
                  label="Current Status"
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                  options={CURRENT_STATUSES}
                  placeholder="Select your current status..."
                />
              </div>
            </div>
          )}

          {/* STEP 3: Career Information */}
          {currentStep === 3 && (
            <div className="form-grid">
              <div className="form-grid-full">
                <Select
                  label="Target Job Role * (Required)"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  options={TARGET_ROLES}
                  placeholder="Select your primary target role..."
                />
              </div>

              {targetRole === 'Other' && (
                <div className="form-grid-full">
                  <Input
                    label="Custom Target Role *"
                    type="text"
                    value={customTargetRole}
                    onChange={(e) => setCustomTargetRole(e.target.value)}
                    placeholder="e.g. Blockchain Developer, Robotics Engineer"
                    required
                  />
                </div>
              )}

              <div className="form-grid-full">
                <Select
                  label="Experience Level"
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  options={EXPERIENCE_LEVELS}
                  placeholder="Select your current experience level..."
                />
              </div>
            </div>
          )}

          {/* ONBOARDING ACTIONS */}
          <div className="onboarding-actions">
            {currentStep > 1 ? (
              <Button type="button" variant="secondary" onClick={handleBack} disabled={isLoading}>
                Back
              </Button>
            ) : (
              <div />
            )}

            <div className="actions-right">
              {currentStep < 3 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    if (currentStep === 1 && !fullName.trim()) {
                      setError('Full Name is required before proceeding');
                      return;
                    }
                    setError('');
                    setCurrentStep(currentStep + 1);
                  }}
                >
                  Skip optional fields
                </button>
              )}

              {currentStep < 3 ? (
                <Button type="button" onClick={handleNext}>
                  Continue
                </Button>
              ) : (
                <Button type="button" onClick={() => handleSubmit()} isLoading={isLoading}>
                  Complete Onboarding
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
