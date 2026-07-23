import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface ProfileData {
  userId: string;
  fullName: string;
  profilePictureUrl?: string;
  country?: string;
  timezone?: string;
  preferredLanguage: string;
  college?: string;
  degree?: string;
  branch?: string;
  currentSemester?: number;
  graduationYear?: number;
  currentStatus?: string;
  targetRole: string;
  experienceLevel?: string;
  availabilityHours?: number;
  availabilityTimeframe?: 'PER_DAY' | 'PER_WEEK';
  interests: string[];
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileCompletion {
  percentage: number;
  missingFields: string[];
  isComplete: boolean;
}

interface ProfileContextType {
  profile: ProfileData | null;
  completion: ProfileCompletion | null;
  isLoading: boolean;
  isProfileComplete: boolean;
  refetchProfile: () => Promise<void>;
  updateLocalProfile: (data: ProfileData, completion: ProfileCompletion) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async () => {
    if (!user || !accessToken) {
      setProfile(null);
      setCompletion(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/profile', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProfile(data.data.profile);
          setCompletion(data.data.completion);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, accessToken]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateLocalProfile = (data: ProfileData, comp: ProfileCompletion) => {
    setProfile(data);
    setCompletion(comp);
  };

  const isProfileComplete = !!(profile && profile.profileCompleted && completion?.isComplete);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        completion,
        isLoading,
        isProfileComplete,
        refetchProfile: fetchProfile,
        updateLocalProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
