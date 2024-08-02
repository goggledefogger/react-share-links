// firestoreLogger.ts

const isDebugMode = process.env.REACT_APP_DEBUG_FIRESTORE === 'true';

export const logFirestoreOperation = (
  operation: 'read' | 'write',
  details: string
) => {
  if (isDebugMode) {
    console.log(`Firestore ${operation.toUpperCase()}: ${details}`);
  }
};
