// Point-of-action onboarding gate for the institutional portal. Mirrors the
// backend's own gating boundary: routes/otc_merchant.py only enforces
// get_verified_institutional_user (onboardingStatus == "approved") on RFQ
// create + accept, not on browsing -- so this hook is called from those two
// action handlers, not from route guards, keeping the frontend gate exactly
// as strict as the API and no stricter.
import { useCallback } from 'react';
import { useInstitutional } from '../contexts/InstitutionalContext';
import { notify } from '../utils/pushNotifications';

export default function useRequireOnboarding() {
  const { isApproved } = useInstitutional();

  return useCallback((actionLabel: string): boolean => {
    if (isApproved) return true;
    notify({
      title: 'Onboarding required',
      message: `Complete onboarding before you can ${actionLabel}.`,
      severity: 'warning',
    });
    return false;
  }, [isApproved]);
}
