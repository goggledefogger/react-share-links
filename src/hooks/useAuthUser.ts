import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserProfile {
  username: string;
  email: string;
  // Add other profile fields as needed
}

interface Link {
  id: string;
  url: string;
  title: string;
  addedBy: string;
  addedAt: Date;
}

interface Channel {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
}

interface AppData {
  channels: {
    [channelId: string]: Channel;
  };
  subscriptions: string[];
  links: {
    [channelId: string]: Link[];
  };
}

interface AuthUser {
  user: User | null;
  profile: UserProfile | null;
  appData: AppData | null;
  loading: boolean;
  error: string | null;
}

export function useAuthUser() {
  const [authUser, setAuthUser] = useState<AuthUser>({
    user: null,
    profile: null,
    appData: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Fetch user profile
          const userProfileDoc = await getDoc(doc(db, 'users', user.uid));
          const profile = userProfileDoc.data() as UserProfile;

          // Fetch app data
          const appDataDoc = await getDoc(doc(db, 'appData', user.uid));
          const appData = appDataDoc.data() as AppData;

          setAuthUser({
            user,
            profile,
            appData,
            loading: false,
            error: null,
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
          setAuthUser({
            user,
            profile: null,
            appData: null,
            loading: false,
            error: 'Failed to load user data',
          });
        }
      } else {
        // User is signed out
        setAuthUser({
          user: null,
          profile: null,
          appData: null,
          loading: false,
          error: null,
        });
      }
    });

    // Cleanup function to unsubscribe from the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  return authUser;
}
