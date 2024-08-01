import { useState, useEffect } from 'react';
import { User, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
            // If the profile doesn't exist, create a default one
            const defaultProfile: UserProfile = {
              username: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
            };
            await setDoc(doc(db, 'users', user.uid), defaultProfile);
            setAuthUser({
              user,
              profile: defaultProfile,
              loading: false,
              error: null,
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

    return () => unsubscribe();
  }, []);

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setAuthUser({
        user: null,
        profile: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error signing out:', error);
      setAuthUser((prev) => ({
        ...prev,
        error: 'Failed to sign out',
      }));
    }
  };

  const updateUserProfile = async (newProfile: Partial<UserProfile>) => {
    if (!authUser.user) {
      throw new Error('No user logged in');
    }

    try {
      const userRef = doc(db, 'users', authUser.user.uid);
      await setDoc(userRef, newProfile, { merge: true });

      if (newProfile.username) {
        await updateProfile(authUser.user, {
          displayName: newProfile.username,
        });
      }

      setAuthUser((prev) => ({
        ...prev,
        profile: { ...prev.profile, ...newProfile } as UserProfile,
      }));
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  };

  return { ...authUser, signOutUser, updateUserProfile };
}
