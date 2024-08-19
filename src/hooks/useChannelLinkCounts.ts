import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export function useChannelLinkCounts(channelIds: string[]) {
  const [linkCounts, setLinkCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLinkCounts = async () => {
      setLoading(true);
      setError(null);
      try {
        const counts: Record<string, number> = {};
        for (const channelId of channelIds) {
          const q = query(
            collection(db, "links"),
            where("channelId", "==", channelId)
          );
          const snapshot = await getCountFromServer(q);
          counts[channelId] = snapshot.data().count;
        }
        setLinkCounts(counts);
      } catch (err) {
        console.error("Error fetching link counts:", err);
        setError(
          err instanceof Error ? err : new Error("An unknown error occurred")
        );
      } finally {
        setLoading(false);
      }
    };

    if (channelIds.length > 0) {
      fetchLinkCounts();
    }
  }, [channelIds]);

  return { linkCounts, loading, error };
}
