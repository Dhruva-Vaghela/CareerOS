import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { ArrowLeft } from 'lucide-react';

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

export function EditProfilePage() {
  const { accessToken } = useAuth();
  const { profile, updateLocalProfile } = useProfile();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form State initialized from current profile
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [profilePictureUrl, setProfilePictureUrl] = useState(profile?.profilePictureUrl || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [timezone, setTimezone] = useState(profile?.timezone || '');
  const [preferredLanguage, setPreferredLanguage] = useState(profile?.preferredLanguage || 'en');

  const [college, setCollege] = useState(profile?.college || '');
  const [degree, setDegree] = useState(profile?.degree || '');
  const [branch, setBranch] = useState(profile?.branch || '');
  const [currentSemester, setCurrentSemester] = useState(profile?.currentSemester ? String(profile.currentSemester) : '');
  const [graduationYear, setGraduationYear] = useState(profile?.graduationYear ? String(profile.graduationYear) : '');
  const [currentStatus, setCurrentStatus] = useState(profile?.currentStatus || '');

  const knownRole = TARGET_ROLES.some((r) => r.value === profile?.targetRole);
  const [targetRole, setTargetRole] = useState(knownRole ? profile?.targetRole || '' : 'Other');
  const [customTargetRole, setCustomTargetRole] = useState(!knownRole ? profile?.targetRole || '' : '');
  const [experienceLevel, setExperienceLevel] = useState(profile?.experienceLevel || '');

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setProfilePictureUrl(profile.profilePictureUrl || '');
      setCountry(profile.country || '');
      setTimezone(profile.timezone || '');
      setPreferredLanguage(profile.preferredLanguage || 'en');

      setCollege(profile.college || '');
      setDegree(profile.degree || '');
      setBranch(profile.branch || '');
      setCurrentSemester(profile.currentSemester ? String(profile.currentSemester) : '');
      setGraduationYear(profile.graduationYear ? String(profile.graduationYear) : '');
      setCurrentStatus(profile.currentStatus || '');

      const isKnown = TARGET_ROLES.some((r) => r.value === profile.targetRole);
      setTargetRole(isKnown ? profile.targetRole : 'Other');
      setCustomTargetRole(!isKnown ? profile.targetRole : '');
      setExperienceLevel(profile.experienceLevel || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim()) {
      setError('Full Name cannot be empty');
      return;
    }

    const finalTargetRole = targetRole === 'Other' ? customTargetRole.trim() : targetRole;
    if (!finalTargetRole) {
      setError('Target Job Role cannot be empty');
      return;
    }

    setIsLoading(true);

    const payload = {
      fullName: fullName.trim(),
      profilePictureUrl: profilePictureUrl.trim() || null,
      country: country.trim() || null,
      timezone: timezone.trim() || null,
      preferredLanguage: preferredLanguage || 'en',
      college: college.trim() || null,
      degree: degree.trim() || null,
      branch: branch.trim() || null,
      currentSemester: currentSemester ? parseInt(currentSemester, 10) : null,
      graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
      currentStatus: currentStatus || null,
      targetRole: finalTargetRole,
      experienceLevel: experienceLevel || null,
    };

    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update profile');
      }

      updateLocalProfile(data.data.profile, data.data.completion);
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <button
        onClick={() => navigate('/profile')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'none',
          border: 'none',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
        }}
      >
        <ArrowLeft size={18} /> Cancel & Back to Profile
      </button>

      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '2rem',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Edit Profile</h1>

        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        <form onSubmit={handleSubmit}>
          {/* Section: Personal Info */}
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '1rem' }}>
            Personal Information
          </h2>
          <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="form-grid-full">
              <Input
                label="Full Name *"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <Input
              label="Country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
            <Input
              label="Time Zone"
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
            <Select
              label="Preferred Language"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              options={LANGUAGES}
            />
            <Input
              label="Profile Picture URL"
              type="url"
              value={profilePictureUrl}
              onChange={(e) => setProfilePictureUrl(e.target.value)}
            />
          </div>

          {/* Section: Education */}
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '1rem' }}>
            Education & Status
          </h2>
          <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="form-grid-full">
              <Input
                label="College / University"
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
              />
            </div>
            <Input
              label="Degree"
              type="text"
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
            />
            <Input
              label="Branch / Specialization"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
            <Input
              label="Current Semester"
              type="number"
              value={currentSemester}
              onChange={(e) => setCurrentSemester(e.target.value)}
            />
            <Input
              label="Graduation Year"
              type="number"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
            />
            <div className="form-grid-full">
              <Select
                label="Current Status"
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value)}
                options={CURRENT_STATUSES}
                placeholder="Select current status..."
              />
            </div>
          </div>

          {/* Section: Target Role */}
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '1rem' }}>
            Career Goals & Personalization
          </h2>
          <div className="form-grid" style={{ marginBottom: '2rem' }}>
            <div className="form-grid-full">
              <Select
                label="Target Job Role *"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                options={TARGET_ROLES}
              />
            </div>

            {targetRole === 'Other' && (
              <div className="form-grid-full">
                <Input
                  label="Custom Target Role *"
                  type="text"
                  value={customTargetRole}
                  onChange={(e) => setCustomTargetRole(e.target.value)}
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
                placeholder="Select experience level..."
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => navigate('/profile')}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} style={{ width: 'auto' }}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
