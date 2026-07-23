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

const TIMEFRAME_OPTIONS = [
  { label: 'Hours per day', value: 'PER_DAY' },
  { label: 'Hours per week', value: 'PER_WEEK' },
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
  const [imagePreview, setImagePreview] = useState<string | null>(profile?.profilePictureUrl || null);
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
  const [availabilityHours, setAvailabilityHours] = useState(profile?.availabilityHours ? String(profile.availabilityHours) : '');
  const [availabilityTimeframe, setAvailabilityTimeframe] = useState<'PER_DAY' | 'PER_WEEK'>(profile?.availabilityTimeframe || 'PER_DAY');

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setProfilePictureUrl(profile.profilePictureUrl || '');
      setImagePreview(profile.profilePictureUrl || null);
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
      setAvailabilityHours(profile.availabilityHours ? String(profile.availabilityHours) : '');
      setAvailabilityTimeframe(profile.availabilityTimeframe || 'PER_DAY');
    }
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!allowedExtensions.includes(fileExtension) || !file.type.startsWith('image/')) {
      setError('Invalid file format. Only image extensions (.png, .jpg, .jpeg, .webp, .gif) are allowed.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setProfilePictureUrl(base64String);
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

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

    if (availabilityHours) {
      const hoursNum = parseInt(availabilityHours, 10);
      const maxHours = availabilityTimeframe === 'PER_DAY' ? 24 : 168;
      if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > maxHours) {
        setError(`Availability hours must be between 1 and ${maxHours} for ${availabilityTimeframe === 'PER_DAY' ? 'per day' : 'per week'}`);
        return;
      }
    }

    setIsLoading(true);

    const payload = {
      fullName: fullName.trim(),
      profilePictureUrl: profilePictureUrl || null,
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
      availabilityHours: availabilityHours ? parseInt(availabilityHours, 10) : null,
      availabilityTimeframe: availabilityHours ? availabilityTimeframe : null,
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

            {/* Profile Picture Upload - Image files only */}
            <div className="form-group form-grid-full">
              <label className="form-label">Profile Picture (Image File Only)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                <div className="avatar-preview-box">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Avatar Preview" className="avatar-img" />
                  ) : (
                    <span className="avatar-placeholder">No image</span>
                  )}
                </div>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="form-input"
                  style={{ padding: '0.5rem' }}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                Allowed image formats: PNG, JPG, JPEG, WEBP, GIF
              </span>
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
            <div className="form-grid-full">
              <Select
                label="Preferred Language"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                options={LANGUAGES}
              />
            </div>
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

          {/* Section: Target Role & Availability */}
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '1rem' }}>
            Career Goals & Availability
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
                  placeholder="Type your custom target role..."
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

            {/* Availability Hours & Timeframe Selector (2 Options) */}
            <Input
              label="Availability Hours"
              type="number"
              min="1"
              max={availabilityTimeframe === 'PER_DAY' ? 24 : 168}
              value={availabilityHours}
              onChange={(e) => setAvailabilityHours(e.target.value)}
              placeholder={availabilityTimeframe === 'PER_DAY' ? 'e.g. 4 hours/day' : 'e.g. 20 hours/week'}
            />

            <Select
              label="Availability Timeframe Mode"
              value={availabilityTimeframe}
              onChange={(e) => setAvailabilityTimeframe(e.target.value as 'PER_DAY' | 'PER_WEEK')}
              options={TIMEFRAME_OPTIONS}
            />
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
