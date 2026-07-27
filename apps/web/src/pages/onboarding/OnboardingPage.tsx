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
  { id: 1, title: 'Basic Profile', subtitle: 'Personal & academic details' },
  { id: 2, title: 'Career Goal & Timeline', subtitle: 'Target role & timeline (Required)' },
  { id: 3, title: 'Target Companies', subtitle: 'Target organizations (Optional)' },
  { id: 4, title: 'Resume Upload', subtitle: 'Upload resume (Optional)' },
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

const TIMELINE_OPTIONS = [
  { label: '3 Months', value: '3 Months' },
  { label: '6 Months', value: '6 Months' },
  { label: '12 Months', value: '12 Months' },
  { label: '18 Months', value: '18 Months' },
  { label: '24 Months', value: '24 Months' },
  { label: 'Custom', value: 'Custom' },
];

const COMPANY_SUGGESTIONS = [
  'Google',
  'Microsoft',
  'Amazon',
  'Meta',
  'Apple',
  'Netflix',
  'Uber',
  'Stripe',
  'Coinbase',
  'Snowflake',
  'Databricks',
  'Swiggy',
  'Zomato',
  'Razorpay',
  'CRED',
  'Flipkart',
  'TCS',
  'Infosys',
  'Wipro',
  'Accenture',
];

const CURRENT_STATUSES = [
  { label: 'Student', value: 'STUDENT' },
  { label: 'Working Professional', value: 'WORKING_PROFESSIONAL' },
  { label: 'Job Seeker', value: 'JOB_SEEKER' },
  { label: 'Career Switcher', value: 'CAREER_SWITCHER' },
];

export function OnboardingPage() {
  const { accessToken } = useAuth();
  const { updateLocalProfile } = useProfile();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Basic Profile
  const [fullName, setFullName] = useState('');
  const [college, setCollege] = useState('');
  const [degree, setDegree] = useState('');
  const [branch, setBranch] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');

  // Step 2: Career Goal & Timeline (Required)
  const [targetRole, setTargetRole] = useState('');
  const [customTargetRole, setCustomTargetRole] = useState('');
  const [timeline, setTimeline] = useState('');
  const [customTimeline, setCustomTimeline] = useState('');

  // Step 3: Target Companies (Optional)
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState('');

  // Step 4: Resume Upload (Optional)
  const [_resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeMetadata, setResumeMetadata] = useState<{
    publicId: string;
    secureUrl: string;
    filename: string;
    mimeType: string;
    size: number;
    uploadDate: string;
  } | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  const handleAddCompany = (company: string) => {
    const trimmed = company.trim();
    if (trimmed && !targetCompanies.includes(trimmed)) {
      setTargetCompanies([...targetCompanies, trimmed]);
      setCompanyInput('');
    }
  };

  const handleRemoveCompany = (company: string) => {
    setTargetCompanies(targetCompanies.filter((c) => c !== company));
  };

  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    setIsUploadingResume(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/resume/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to upload resume');
      }

      setResumeMetadata(data.resume);
    } catch (err: any) {
      setError(err.message || 'Error uploading resume. You can skip and try again later.');
    } finally {
      setIsUploadingResume(false);
    }
  };

  // Validation routines
  const validateStep1 = () => {
    if (!fullName.trim()) {
      setError('Full Name is required');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    const selectedRole = targetRole === 'Other' ? customTargetRole : targetRole;
    if (!selectedRole.trim()) {
      setError('Target Job Role is required');
      return false;
    }
    if (!timeline) {
      setError('Timeline is required. Please select your target timeline.');
      return false;
    }
    if (timeline === 'Custom' && !customTimeline.trim()) {
      setError('Please specify your custom timeline');
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
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!validateStep1() || !validateStep2()) {
      return;
    }

    setIsLoading(true);
    setError('');

    const finalTargetRole = targetRole === 'Other' ? customTargetRole.trim() : targetRole;
    const finalTimeline = timeline === 'Custom' ? customTimeline.trim() : timeline;

    try {
      // 1. Save Basic Profile
      const profileRes = await fetch('/api/v1/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          college: college.trim() || undefined,
          degree: degree.trim() || undefined,
          branch: branch.trim() || undefined,
          graduationYear: graduationYear ? parseInt(graduationYear, 10) : undefined,
          currentStatus: currentStatus || undefined,
          targetRole: finalTargetRole,
        }),
      });

      const profileData = await profileRes.json();
      if (!profileRes.ok) {
        throw new Error(profileData.error?.message || 'Failed to save profile');
      }

      // 2. Save Career Goal
      const goalRes = await fetch('/api/v1/career-goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          targetRole: finalTargetRole,
          targetCompanies,
          timeline: finalTimeline,
          customTimeline: timeline === 'Custom' ? customTimeline.trim() : undefined,
        }),
      });

      if (!goalRes.ok) {
        const goalErr = await goalRes.json();
        throw new Error(goalErr.error?.message || 'Failed to save career goal');
      }

      // 3. Create Initial Career Digital Twin
      await fetch('/api/v1/digital-twin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          profile: {
            fullName: fullName.trim(),
            college: college.trim() || undefined,
            degree: degree.trim() || undefined,
            branch: branch.trim() || undefined,
            graduationYear: graduationYear ? parseInt(graduationYear, 10) : undefined,
          },
          goal: { targetRole: finalTargetRole },
          timeline: { timeline: finalTimeline, customTimeline },
          targetCompanies: { companies: targetCompanies },
          resumeMetadata: resumeMetadata
            ? {
                filename: resumeMetadata.filename,
                secureUrl: resumeMetadata.secureUrl,
                publicId: resumeMetadata.publicId,
                size: resumeMetadata.size,
                uploadDate: resumeMetadata.uploadDate,
              }
            : undefined,
        }),
      });

      updateLocalProfile(profileData.data.profile, profileData.data.completion);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'An error occurred while completing onboarding');
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
            Set up your career goal, timeline, and digital twin context
          </p>
        </div>

        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={(stepId) => {
            if (stepId <= currentStep) setCurrentStep(stepId);
          }}
        />

        {error && <Alert type="error" message={error} />}

        <form onSubmit={(e) => e.preventDefault()}>
          {/* STEP 1: Basic Profile */}
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

              <div className="form-grid-full">
                <Input
                  label="College / University"
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. Stanford University / IIT Bombay"
                />
              </div>

              <Input
                label="Degree"
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.Tech / B.S."
              />

              <Input
                label="Branch / Specialization"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. Computer Science"
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

          {/* STEP 2: Career Goal & Timeline (Required) */}
          {currentStep === 2 && (
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
                    placeholder="Specify your custom target role..."
                    required
                  />
                </div>
              )}

              <div className="form-grid-full">
                <Select
                  label="Timeline * (Required)"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  options={TIMELINE_OPTIONS}
                  placeholder="Select target timeline..."
                />
              </div>

              {timeline === 'Custom' && (
                <div className="form-grid-full">
                  <Input
                    label="Specify Custom Timeline *"
                    type="text"
                    value={customTimeline}
                    onChange={(e) => setCustomTimeline(e.target.value)}
                    placeholder="e.g. 9 Months or Dec 2026"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Target Companies (Optional) */}
          {currentStep === 3 && (
            <div className="form-grid">
              <div className="form-grid-full">
                <label className="form-label">Target Companies (Optional)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type company name and press Add..."
                    value={companyInput}
                    onChange={(e) => setCompanyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCompany(companyInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleAddCompany(companyInput)}
                  >
                    Add
                  </Button>
                </div>

                {/* Selected Tags */}
                {targetCompanies.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    {targetCompanies.map((comp) => (
                      <span
                        key={comp}
                        style={{
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#818cf8',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.875rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                        }}
                      >
                        {comp}
                        <button
                          type="button"
                          onClick={() => handleRemoveCompany(comp)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#818cf8',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                  Popular Suggestions:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {COMPANY_SUGGESTIONS.map((comp) => (
                    <button
                      key={comp}
                      type="button"
                      onClick={() => handleAddCompany(comp)}
                      style={{
                        background: targetCompanies.includes(comp) ? '#6366f1' : 'var(--color-surface)',
                        color: targetCompanies.includes(comp) ? '#fff' : 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      + {comp}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Resume Upload (Optional) */}
          {currentStep === 4 && (
            <div className="form-grid">
              <div className="form-grid-full" style={{ textAlign: 'center', padding: '2rem 1rem', border: '2px dashed var(--color-border)', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text)' }}>Upload Your Resume (Optional)</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Upload your existing resume to store metadata in your Career Digital Twin. Skipping this will never block onboarding.
                </p>

                {resumeMetadata ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <p style={{ color: '#10b981', fontWeight: 600, margin: 0 }}>
                      ✓ Resume Uploaded: {resumeMetadata.filename}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      Size: {(resumeMetadata.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      id="resume-input"
                      onChange={handleResumeFileSelect}
                      style={{ display: 'none' }}
                      disabled={isUploadingResume}
                    />
                    <label htmlFor="resume-input">
                      <Button type="button" variant="secondary" isLoading={isUploadingResume} onClick={() => document.getElementById('resume-input')?.click()}>
                        {isUploadingResume ? 'Uploading...' : 'Choose Resume File (PDF / DOCX)'}
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ONBOARDING ACTIONS */}
          <div className="onboarding-actions" style={{ marginTop: '2rem' }}>
            {currentStep > 1 ? (
              <Button type="button" variant="secondary" onClick={handleBack} disabled={isLoading}>
                Back
              </Button>
            ) : (
              <div />
            )}

            <div className="actions-right" style={{ display: 'flex', gap: '0.75rem' }}>
              {currentStep === 4 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleCompleteOnboarding}
                  disabled={isLoading}
                >
                  Skip Resume & Finish
                </button>
              )}

              {currentStep < 4 ? (
                <Button type="button" onClick={handleNext}>
                  Continue
                </Button>
              ) : (
                <Button type="button" onClick={handleCompleteOnboarding} isLoading={isLoading}>
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
