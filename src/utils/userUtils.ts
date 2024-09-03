import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfile } from "../types"; // Import the UserProfile type

export const updateUserProfile = async (userId: string, data: Partial<UserProfile>) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, data);
};
