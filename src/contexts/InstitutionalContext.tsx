// Single source of truth for the institutional (OTC merchant) portal's
// onboarding status. Replaces the previous pattern where InstitutionalRoute
// and Onboarding.tsx each independently called getOtcOnboarding() -- now
// fetched once here and shared by every /otc/* page via useInstitutional().
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { getOtcOnboarding } from '../api/client';

export type OnboardingStatus = 'not_started' | 'under_review' | 'approved' | 'rejected';

interface InstitutionalContextValue {
  onboardingStatus: OnboardingStatus;
  profile: Record<string, any> | null;
  isApproved: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

const InstitutionalContext = createContext<InstitutionalContextValue | undefined>(undefined);

export function InstitutionalProvider({ children }: { children: ReactNode }) {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('not_started');
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await getOtcOnboarding();
      const p = res.data?.profile || null;
      setProfile(p);
      setOnboardingStatus((p?.onboardingStatus || 'not_started') as OnboardingStatus);
    } catch {
      // No profile yet is the common case for a brand-new merchant -- treat
      // as not_started rather than surfacing an error.
      setProfile(null);
      setOnboardingStatus('not_started');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return (
    <InstitutionalContext.Provider value={{
      onboardingStatus,
      profile,
      isApproved: onboardingStatus === 'approved',
      loading,
      refetch,
    }}>
      {children}
    </InstitutionalContext.Provider>
  );
}

export function useInstitutional(): InstitutionalContextValue {
  const ctx = useContext(InstitutionalContext);
  if (!ctx) throw new Error('useInstitutional must be used within an InstitutionalProvider');
  return ctx;
}
