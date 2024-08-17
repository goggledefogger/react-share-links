import { useState, useEffect, useRef } from "react";
import {
  query,
  collection,
  where,
  orderBy,
  limit,
  getDocs,
  WhereFilterOp,
  OrderByDirection,
  QuerySnapshot,
  DocumentData,
  CollectionReference,
} from "firebase/firestore";
import { db } from "../lib/firebase"; // adjust this import based on your file structure

interface Condition {
  field: string;
  operator: WhereFilterOp;
  value: any;
}

interface SortBy {
  field: string;
  direction: OrderByDirection;
}

interface FirestoreQueryResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  indexRequired: boolean;
  indexUrl: string | null;
}

// Removed FirestoreQueryOptions interface as it's not needed anymore

export const useFirestoreQuery = <T extends DocumentData>(
  collectionName: string,
  conditions: Condition[],
  sortBy: SortBy,
  limitCount: number
): FirestoreQueryResult<T> => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [indexRequired, setIndexRequired] = useState<boolean>(false);
  const [indexUrl, setIndexUrl] = useState<string | null>(null);
  // Removed retryCount and MAX_RETRIES as we're not retrying anymore
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const collectionRef = collection(
          db,
          collectionName
        ) as CollectionReference<T>;
        const q = query(
          collectionRef,
          ...conditions.map((c) => where(c.field, c.operator, c.value)),
          orderBy(sortBy.field, sortBy.direction),
          limit(limitCount)
        );

        const querySnapshot: QuerySnapshot<T> = await getDocs(q);
        const fetchedData = querySnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));

        if (isMounted.current) {
          setData(fetchedData);
          setLoading(false);
          setError(null);
          setIndexRequired(false);
          setIndexUrl(null);
        }
      } catch (err) {
        console.error("Error fetching data:", err);

        if (isMounted.current) {
          setLoading(false);

          if (
            err instanceof Error &&
            "code" in err &&
            err.code === "failed-precondition"
          ) {
            setIndexRequired(true);
            const match = err.message.match(
              /https:\/\/console\.firebase\.google\.com[^\s]+/
            );
            setIndexUrl(match ? match[0] : null);
            setError(
              new Error(
                "The query requires an index. Please create the index to resolve this issue."
              )
            );
          } else {
            setError(
              err instanceof Error
                ? err
                : new Error("An unknown error occurred")
            );
          }

          // Removed retry logic
        }
      }
    };

    fetchData();
  }, [collectionName, conditions, sortBy, limitCount]);

  return { data, loading, error, indexRequired, indexUrl };
};
