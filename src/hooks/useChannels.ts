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
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Channel, Link, User } from '../types';

function useChannels() {
  const [channelList, setChannelList] = useState<Channel[]>([]);

  useEffect(() => {
    const fetchChannels = async () => {
      const channelsCollection = collection(db, 'channels');
      const channelSnapshot = await getDocs(channelsCollection);
      const channelList = channelSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Channel)
      );
      setChannelList(channelList);
    };

    fetchChannels();
  }, []);

  async function addChannel(channelName: string, description?: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be logged in to create a channel');

    try {
      const newChannel = {
        name: channelName.trim(),
        description: description?.trim(),
        createdBy: user.uid,
        createdAt: Date.now(),
      };
      const docRef = await addDoc(collection(db, 'channels'), newChannel);
      const createdChannel: Channel = { id: docRef.id, ...newChannel };
      setChannelList((prevList) => [...prevList, createdChannel]);
      return createdChannel;
    } catch (e) {
      console.error('Error adding channel: ', e);
      throw e;
    }
  }

  async function deleteChannel(channelId: string) {
    try {
      await deleteDoc(doc(db, 'channels', channelId));
      setChannelList((prevList) =>
        prevList.filter((channel) => channel.id !== channelId)
      );
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
  }

  async function addLink(channelId: string, url: string, emoji?: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be logged in to add a link');

    try {
      // Fetch the user's profile to get the username
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
        url: url.trim(),
        emoji,
        createdAt: Date.now(),
      };
      const docRef = await addDoc(collection(db, 'links'), newLink);
      return { id: docRef.id, ...newLink } as Link;
    } catch (e) {
      console.error('Error adding link: ', e);
      throw e;
    }
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

  return {
    channelList,
    addChannel,
    deleteChannel,
    getChannel,
    getChannelLinks,
    addLink,
    deleteLink,
  };
}

export { useChannels };
