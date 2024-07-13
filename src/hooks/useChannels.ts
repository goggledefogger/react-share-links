import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Channel } from '../types';

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
            name: doc.data().name,
          } as Channel)
      );
      setChannelList(channelList);
    };

    fetchChannels();
  }, []);

  async function addChannel(newChannelName: string) {
    try {
      const docRef = await addDoc(collection(db, 'channels'), {
        name: newChannelName.trim(),
      });
      const newChannel: Channel = {
        id: docRef.id,
        name: newChannelName.trim(),
      };
      setChannelList((prevList) => [...prevList, newChannel]);
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  }

  async function deleteChannel(channelId: string) {
    try {
      await deleteDoc(doc(db, 'channels', channelId));
      setChannelList((prevList) =>
        prevList.filter((channel) => channel.id !== channelId)
      );
    } catch (e) {
      console.error('Error removing document: ', e);
    }
  }

  async function getChannel(channelId: string) {
    const docRef = doc(db, 'channels', channelId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Channel;
    } else {
      console.log('No such document!');
      return null;
    }
  }

  return { channelList, addChannel, deleteChannel, getChannel };
}

export { useChannels };
