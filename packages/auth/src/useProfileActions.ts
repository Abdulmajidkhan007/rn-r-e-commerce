import { useCallback, useState } from 'react';
import type { UserProfile } from '@kidswear/core';
import { upsertUserProfile } from '@kidswear/firebase';
import { useAppDispatch, useAppSelector, setAuthenticated } from '@kidswear/store';
import { mapAuthError } from './mapAuthError';
import { toProfileInput } from './profileInput';
import type { ProfileValues } from './profileSchemas';

export interface ProfileActions {
  updateProfile: (values: ProfileValues) => Promise<boolean>;
  saving: boolean;
  error: string | null;
}

/** Edits the current user's displayName/phone and syncs Firestore + the store. */
export function useProfileActions(): ProfileActions {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = useAppSelector((s) => s.auth.isAdmin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback(
    async (values: ProfileValues): Promise<boolean> => {
      if (!user) return false;
      setSaving(true);
      setError(null);
      const phone = values.phone ? values.phone : undefined;
      const next: UserProfile = { ...user, displayName: values.displayName, phone };
      try {
        await upsertUserProfile(toProfileInput(next));
        dispatch(setAuthenticated({ user: next, isAdmin }));
        return true;
      } catch (e) {
        setError(mapAuthError(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [user, isAdmin, dispatch],
  );

  return { updateProfile, saving, error };
}
