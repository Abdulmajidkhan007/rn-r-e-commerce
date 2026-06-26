import { useCallback, useState } from 'react';
import type { Address, UserProfile } from '@kidswear/core';
import { upsertUserProfile } from '@kidswear/firebase';
import { genId } from '@kidswear/utils';
import { useAppDispatch, useAppSelector, setAuthenticated } from '@kidswear/store';
import { mapAuthError } from './mapAuthError';
import { toProfileInput } from './profileInput';
import type { AddressFormValues } from './profileSchemas';

export interface AddressActions {
  addAddress: (values: AddressFormValues) => Promise<boolean>;
  updateAddress: (id: string, values: AddressFormValues) => Promise<boolean>;
  removeAddress: (id: string) => Promise<boolean>;
  saving: boolean;
  error: string | null;
}

function toAddress(values: AddressFormValues, id: string): Address {
  return {
    id,
    fullName: values.fullName,
    phone: values.phone,
    region: values.region,
    district: values.district,
    street: values.street,
    ...(values.note ? { note: values.note } : {}),
  };
}

/** Add/edit/delete saved addresses (embedded in the user doc — no new collection). */
export function useAddressActions(): AddressActions {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = useAppSelector((s) => s.auth.isAdmin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(
    async (addresses: Address[]): Promise<boolean> => {
      if (!user) return false;
      setSaving(true);
      setError(null);
      const next: UserProfile = { ...user, addresses };
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

  const addAddress = useCallback(
    (values: AddressFormValues): Promise<boolean> => {
      if (!user) return Promise.resolve(false);
      return persist([...user.addresses, toAddress(values, genId())]);
    },
    [user, persist],
  );

  const updateAddress = useCallback(
    (id: string, values: AddressFormValues): Promise<boolean> => {
      if (!user) return Promise.resolve(false);
      const addresses = user.addresses.map((a) => (a.id === id ? toAddress(values, id) : a));
      return persist(addresses);
    },
    [user, persist],
  );

  const removeAddress = useCallback(
    (id: string): Promise<boolean> => {
      if (!user) return Promise.resolve(false);
      return persist(user.addresses.filter((a) => a.id !== id));
    },
    [user, persist],
  );

  return { addAddress, updateAddress, removeAddress, saving, error };
}
