import * as admin from "firebase-admin";

const usernameCache: { [userId: string]: string } = {};

export async function getUsernameById(userId: string): Promise<string> {
  if (usernameCache[userId]) {
    return usernameCache[userId];
  }

  try {
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const userData = userDoc.data();
    const username = userData?.username || "Unknown User";
    usernameCache[userId] = username;
    return username;
  } catch (error) {
    console.error(`Error fetching username for userId ${userId}:`, error);
    return "Unknown User";
  }
}
