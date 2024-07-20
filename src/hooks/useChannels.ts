import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Channel, Link, User } from '../types';
import { isWebUri } from 'valid-url';

function useChannels() {
  const [channelList, setChannelList] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const channelsCollection = collection(db, 'channels');
    const unsubscribe = onSnapshot(
      query(channelsCollection),
      (snapshot) => {
        const updatedChannels = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Channel)
        );
        setChannelList(updatedChannels);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching channels:', err);
        setError('Failed to fetch channels');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function addChannel(channelName: string, description?: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be logged in to create a channel');

    try {
      const newChannel: Omit<Channel, 'id'> = {
        name: channelName.trim(),
        createdBy: user.uid,
        createdAt: Date.now(),
      };

      // Only add the description field if it's provided and not empty
      if (description && description.trim() !== '') {
        newChannel.description = description.trim();
      }

      const docRef = await addDoc(collection(db, 'channels'), newChannel);
      const createdChannel: Channel = { id: docRef.id, ...newChannel };

      return createdChannel;
    } catch (e) {
      console.error('Error adding channel: ', e);
      throw e;
    }
  }

  async function deleteChannel(channelId: string) {
    try {
      await deleteDoc(doc(db, 'channels', channelId));
      // We don't need to update the state here, as the onSnapshot listener will do it for us
    } catch (e) {
      console.error('Error removing channel: ', e);
      throw e;
    }
  }

  async function getChannel(channelId: string) {
    const docRef = doc(db, 'channels', channelId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Channel;
    } else {
      console.log('No such channel!');
      return null;
    }
  }

  async function getChannelLinks(
    channelId: string,
    limitCount = 20,
    lastTimestamp?: number
  ) {
    try {
      const linksCollection = collection(db, 'links');
      let q = query(
        linksCollection,
        where('channelId', '==', channelId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (lastTimestamp) {
        q = query(q, startAfter(lastTimestamp));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Link)
      );
    } catch (error) {
      console.error('Error fetching channel links:', error);
      throw new Error('Failed to fetch channel links');
    }
  }

  async function addLink(channelId: string, url: string, emoji?: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be logged in to add a link');

    // Validate URL
    const validatedUrl = validateAndFormatUrl(url);
    if (!validatedUrl) {
      throw new Error('Invalid URL provided');
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data() as User | undefined;

      const username =
        userData?.username ||
        user.displayName ||
        user.email?.split('@')[0] ||
        'Anonymous';

      const newLink = {
        channelId,
        userId: user.uid,
        username,
        url: validatedUrl,
        emoji: emoji || null,
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, 'links'), newLink);
      return { id: docRef.id, ...newLink } as Link;
    } catch (e) {
      console.error('Error adding link: ', e);
      throw e;
    }
  }

  function validateAndFormatUrl(url: string): string | null {
    // Ensure the URL starts with a protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Use valid-url library to check if it's a valid web URI
    if (isWebUri(url)) {
      return url;
    }

    return null;
  }

  function isValidEmoji(emoji: string): boolean {
    // Basic emoji validation (you might want to use a library for more comprehensive validation)
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u;
    return emojiRegex.test(emoji) && emoji.length === 1;
  }

  async function deleteLink(linkId: string) {
    try {
      await deleteDoc(doc(db, 'links', linkId));
      return true;
    } catch (error) {
      console.error('Error deleting link:', error);
      return false;
    }
  }

  async function addEmojiReaction(linkId: string, emoji: string) {
    try {
      const linkRef = doc(db, 'links', linkId);
      await updateDoc(linkRef, {
        reactions: arrayUnion(emoji),
      });
      return true;
    } catch (e) {
      console.error('Error adding emoji reaction: ', e);
      throw e;
    }
  }

  async function updateChannel(channelId: string, newName: string) {
    try {
      const channelRef = doc(db, 'channels', channelId);
      await updateDoc(channelRef, { name: newName.trim() });
      // We don't need to update the state here, as the onSnapshot listener will do it for us
    } catch (error) {
      console.error('Error updating channel:', error);
      throw error;
    }
  }

  return {
    channelList,
    loading,
    error,
    addChannel,
    deleteChannel,
    getChannel,
    getChannelLinks,
    addLink,
    deleteLink,
    addEmojiReaction,
    updateChannel,
  };
}

export { useChannels };
