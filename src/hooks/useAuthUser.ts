import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserProfile {
  username: string;
  email: string;
}

interface AuthUser {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export function useAuthUser() {
  const [authUser, setAuthUser] = useState<AuthUser>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userProfileDoc = await getDoc(doc(db, 'users', user.uid));
          if (userProfileDoc.exists()) {
            const profile = userProfileDoc.data() as UserProfile;
            setAuthUser({
              user,
              profile,
              loading: false,
              error: null,
            });
          } else {
            setAuthUser({
              user,
              profile: null,
              loading: false,
              error: 'User profile not found',
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setAuthUser({
            user,
            profile: null,
            loading: false,
            error: 'Failed to load user data',
          });
        }
      } else {
        setAuthUser({
          user: null,
          profile: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return authUser;
}
