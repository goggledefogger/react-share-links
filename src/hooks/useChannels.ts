import { useState, useEffect, useCallback } from 'react';
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
  arrayRemove,
  onSnapshot,
  getCountFromServer,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Channel, Link, User, Reaction } from '../types';
import { isWebUri } from 'valid-url';

const LINK_PREVIEW_API_KEY = process.env.REACT_APP_LINKPREVIEW_API_KEY;

function useChannels() {
  const [channelList, setChannelList] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const channelsCollection = collection(db, 'channels');
    const unsubscribe = onSnapshot(
      query(channelsCollection, orderBy('createdAt', 'desc')),
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

  const getAllChannelLinkCounts = useCallback(async (): Promise<{
    [key: string]: number;
  }> => {
    const counts: { [key: string]: number } = {};

    for (const channel of channelList) {
      const linksCollection = collection(db, 'links');
      const q = query(linksCollection, where('channelId', '==', channel.id));
      const snapshot = await getCountFromServer(q);
      counts[channel.id] = snapshot.data().count;
    }

    return counts;
  }, [channelList]);

  async function addLink(channelId: string, url: string, emoji?: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be logged in to add a link');

    const validatedUrl = validateAndFormatUrl(url);
    if (!validatedUrl) {
      throw new Error('Invalid URL. Please enter a valid web address.');
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data() as User | undefined;

      const username =
        userData?.username ||
        user.displayName ||
        user.email?.split('@')[0] ||
        'Anonymous';

      // Fetch link preview
      const preview = await fetchLinkPreview(validatedUrl);

      const newLink = {
        channelId,
        userId: user.uid,
        username,
        url: validatedUrl,
        emoji: emoji || null,
        createdAt: Date.now(),
        preview,
      };

      const docRef = await addDoc(collection(db, 'links'), newLink);

      return { id: docRef.id, ...newLink } as Link;
    } catch (e) {
      console.error('Error adding link: ', e);
      throw e;
    }
  }

  async function fetchLinkPreview(url: string) {
    if (!LINK_PREVIEW_API_KEY) {
      console.error('LinkPreview API key is not set');
      return null;
    }

    try {
      const response = await fetch(
        `https://api.linkpreview.net/?key=${LINK_PREVIEW_API_KEY}&q=${encodeURIComponent(
          url
        )}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch link preview');
      }
      const data = await response.json();
      return {
        title: data.title || '',
        description: data.description || '',
        image: data.image || '',
        favicon: data.favicon || '',
      };
    } catch (error) {
      console.error('Error fetching link preview:', error);
      // Fall back to extracting information from the URL
      const urlObject = new URL(url);
      return {
        title: urlObject.hostname,
        description: url,
        image: `https://www.google.com/s2/favicons?domain=${urlObject.hostname}&sz=64`,
        favicon: `https://www.google.com/s2/favicons?domain=${urlObject.hostname}`,
      };
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

  async function addChannel(channelName: string, description?: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be logged in to create a channel');

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data() as User | undefined;

      const newChannel: Omit<Channel, 'id'> = {
        name: channelName.trim(),
        createdBy: user.uid,
        creatorUsername:
          userData?.username || user.email?.split('@')[0] || 'Anonymous',
        createdAt: Date.now(),
      };

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
    lastVisible?: QueryDocumentSnapshot<Link>
  ): Promise<{
    links: Link[];
    lastVisible: QueryDocumentSnapshot<Link> | undefined;
  }> {
    try {
      const linksCollection = collection(db, 'links');
      let q = query(
        linksCollection,
        where('channelId', '==', channelId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const querySnapshot = await getDocs(q);
      const links = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Link)
      );

      const lastVisibleDoc = querySnapshot.docs[
        querySnapshot.docs.length - 1
      ] as QueryDocumentSnapshot<Link> | undefined;

      return {
        links,
        lastVisible: lastVisibleDoc,
      };
    } catch (error) {
      console.error('Error fetching channel links:', error);
      throw new Error('Failed to fetch channel links');
    }
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

  async function addEmojiReaction(
    linkId: string,
    emoji: string,
    userId: string | undefined
  ) {
    if (!userId) throw new Error('User must be logged in to add a reaction');

    try {
      const linkRef = doc(db, 'links', linkId);
      await updateDoc(linkRef, {
        reactions: arrayUnion({ emoji, userId }),
      });
      return true;
    } catch (e) {
      console.error('Error adding emoji reaction: ', e);
      throw e;
    }
  }

  async function removeEmojiReaction(
    linkId: string,
    emoji: string,
    userId: string | undefined
  ) {
    if (!userId) throw new Error('User must be logged in to remove a reaction');

    try {
      const linkRef = doc(db, 'links', linkId);
      await updateDoc(linkRef, {
        reactions: arrayRemove({ emoji, userId }),
      });
      return true;
    } catch (e) {
      console.error('Error removing emoji reaction: ', e);
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
    getAllChannelLinkCounts,
    addLink,
    deleteLink,
    addEmojiReaction,
    removeEmojiReaction,
    updateChannel,
  };
}

export { useChannels };
