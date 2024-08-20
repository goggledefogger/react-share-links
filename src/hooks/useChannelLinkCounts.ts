import { useState, useEffect } from "react";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "../lib/firebase";

export function useChannelLinkCounts(channelIds: string[]) {
  const [linkCounts, setLinkCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLinkCounts = async () => {
      if (channelIds.length === 0) {
        setLinkCounts({});
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const linksCollection = collection(db, "links");
        const counts: Record<string, number> = {};

        // Fetch counts for each channel individually
        for (const channelId of channelIds) {
          const q = query(linksCollection, where("channelId", "==", channelId));
          const snapshot = await getCountFromServer(q);
          counts[channelId] = snapshot.data().count;
        }

        setLinkCounts(counts);
      } catch (err) {
        console.error("Error fetching link counts:", err);
        setError(err instanceof Error ? err : new Error("An unknown error occurred"));
      } finally {
        setLoading(false);
      }
    };

    fetchLinkCounts();
  }, [channelIds]);

  return { linkCounts, loading, error };
}
