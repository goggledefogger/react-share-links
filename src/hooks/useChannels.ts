import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  where,
  getCountFromServer,
  QueryDocumentSnapshot,
  limit as firestoreLimit,
  startAfter,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  FieldValue,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Channel, Link } from "../types";

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

export function useChannels() {
  const [channelList, setChannelList] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const channelsCollection = collection(db, "channels");
      const q = query(channelsCollection, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const updatedChannels = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Channel)
      );
      setChannelList(updatedChannels);
      setRetryCount(0); // Reset retry count on successful fetch
    } catch (err) {
      console.error("Error fetching channels:", err);
      setError("Failed to fetch channels");

      // Implement retry logic
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        setRetryCount((prevCount) => prevCount + 1);
        setTimeout(() => fetchChannels(), RETRY_DELAY);
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const getChannel = async (channelId: string): Promise<Channel | null> => {
    try {
      const channelDoc = await getDoc(doc(db, "channels", channelId));
      if (channelDoc.exists()) {
        return { id: channelDoc.id, ...channelDoc.data() } as Channel;
      }
      return null;
    } catch (error) {
      console.error("Error fetching channel:", error);
      throw error;
    }
  };

  const getChannelLinks = async (
    channelId: string,
    limitCount = 20,
    lastVisible?: QueryDocumentSnapshot<Link>
  ): Promise<{
    links: Link[];
    lastVisible: QueryDocumentSnapshot<Link> | undefined;
  }> => {
    try {
      const linksCollection = collection(db, "links");
      let q = query(
        linksCollection,
        where("channelId", "==", channelId),
        orderBy("createdAt", "desc"),
        firestoreLimit(limitCount)
      );

      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const querySnapshot = await getDocs(q);
      const links = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Link)
      );

      const lastVisibleDoc = querySnapshot.docs[
        querySnapshot.docs.length - 1
      ] as QueryDocumentSnapshot<Link> | undefined;

      return {
        links,
        lastVisible: lastVisibleDoc,
      };
    } catch (error) {
      console.error("Error fetching channel links:", error);
      throw error;
    }
  };

  const addChannel = async (channelName: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User must be logged in to create a channel");

    try {
      const newChannel = {
        name: channelName.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(), // Use serverTimestamp here
      };
      const docRef = await addDoc(collection(db, "channels"), newChannel);

      // Subscribe the user to the new channel
      await updateDoc(doc(db, "users", user.uid), {
        subscribedChannels: arrayUnion(docRef.id)
      });

      await fetchChannels(); // Refresh the channel list
      return docRef.id;
    } catch (error) {
      console.error("Error adding channel:", error);
      throw error;
    }
  };

  const deleteChannel = async (channelId: string) => {
    try {
      await deleteDoc(doc(db, "channels", channelId));
      await fetchChannels(); // Refresh the channel list
    } catch (error) {
      console.error("Error deleting channel:", error);
      throw error;
    }
  };

  const updateChannel = async (channelId: string, newName: string) => {
    try {
      await updateDoc(doc(db, "channels", channelId), { name: newName.trim() });
      await fetchChannels(); // Refresh the channel list
    } catch (error) {
      console.error("Error updating channel:", error);
      throw error;
    }
  };

  const addLink = async (channelId: string, url: string): Promise<Link> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User must be logged in to add a link");

    try {
      const newLink: Omit<Link, "id"> = {
        channelId,
        userId: user.uid,
        url,
        createdAt: serverTimestamp() as FieldValue, // Use serverTimestamp here
        reactions: [],
        preview: null, // Add a default value for preview
      };
      const docRef = await addDoc(collection(db, "links"), newLink);
      return { id: docRef.id, ...newLink };
    } catch (error) {
      console.error("Error adding link:", error);
      throw error;
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      await deleteDoc(doc(db, "links", linkId));
    } catch (error) {
      console.error("Error deleting link:", error);
      throw error;
    }
  };

  const addEmojiReaction = async (
    linkId: string,
    emoji: string,
    userId: string | undefined
  ) => {
    if (!userId) throw new Error("User must be logged in to add a reaction");
    try {
      const linkRef = doc(db, "links", linkId);
      await updateDoc(linkRef, {
        reactions: arrayUnion({ emoji, userId }),
      });
    } catch (error) {
      console.error("Error adding emoji reaction:", error);
      throw error;
    }
  };

  const removeEmojiReaction = async (
    linkId: string,
    emoji: string,
    userId: string | undefined
  ) => {
    if (!userId) throw new Error("User must be logged in to remove a reaction");
    try {
      const linkRef = doc(db, "links", linkId);
      await updateDoc(linkRef, {
        reactions: arrayRemove({ emoji, userId }),
      });
    } catch (error) {
      console.error("Error removing emoji reaction:", error);
      throw error;
    }
  };

  const getAllChannelLinkCounts = async () => {
    const counts: { [key: string]: number } = {};
    for (const channel of channelList) {
      const linksCollection = collection(db, "links");
      const q = query(linksCollection, where("channelId", "==", channel.id));
      const snapshot = await getCountFromServer(q);
      counts[channel.id] = snapshot.data().count;
    }
    return counts;
  };

  const getUsernameById = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        return userDoc.data().username || "Unknown User";
      }
      return "Unknown User";
    } catch (error) {
      console.error("Error fetching username:", error);
      return "Unknown User";
    }
  };

  return {
    channelList,
    loading,
    error,
    fetchChannels,
    getChannel,
    getChannelLinks,
    addChannel,
    deleteChannel,
    updateChannel,
    addLink,
    deleteLink,
    addEmojiReaction,
    removeEmojiReaction,
    getAllChannelLinkCounts,
    getUsernameById,
  };
}
