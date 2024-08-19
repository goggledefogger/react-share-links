import { useState, useEffect, useMemo, useCallback } from "react";
import {
  query,
  collection,
  where,
  orderBy,
  limit,
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
  CollectionReference,
  Query,
  WhereFilterOp,
  OrderByDirection,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export function useFirestoreQuery<T extends DocumentData>(
  config: QueryConfig | null
): FirestoreQueryResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<T> | null>(null);

  const memoizedQuery = useMemo(() => {
    if (!config) return null;

    const collectionRef = collection(
      db,
      config.collectionName
    ) as CollectionReference<T>;
    let q: Query<T> = query(collectionRef);

    config.conditions.forEach((condition) => {
      q = query(q, where(condition.field, condition.operator, condition.value));
    });

    q = query(q, orderBy(config.sortBy.field, config.sortBy.direction));
    q = query(q, limit(config.limitCount));

    return q;
  }, [config]);

  const updateData = useCallback((newData: T[]) => {
    setData((prevData) => [...prevData, ...newData]);
  }, []);

  useEffect(() => {
    if (!memoizedQuery) {
      setLoading(false);
      setError(null);
      setData([]);
      setHasMore(false);
      setLastDoc(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedQuery,
      (querySnapshot) => {
        const newData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];

        updateData(newData);
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
        setHasMore(querySnapshot.docs.length === config?.limitCount);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching data:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery, config?.limitCount, updateData]);

  return { data, loading, error, hasMore, lastDoc };
}

export interface QueryConfig {
  collectionName: string;
  conditions: { field: string; operator: WhereFilterOp; value: any }[];
  sortBy: { field: string; direction: OrderByDirection };
  limitCount: number;
}

export interface FirestoreQueryResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  lastDoc: QueryDocumentSnapshot<T> | null;
}
