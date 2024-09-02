import * as admin from "firebase-admin";

const usernameCache: { [userId: string]: string } = {};

export async function getUsernameById(userId: string): Promise<string> {
  console.log(`Fetching username for userId: ${userId}`);

  if (usernameCache[userId]) {
    console.log(`Username found in cache for userId ${userId}: ${usernameCache[userId]}`);
    return usernameCache[userId];
  }

  try {
    console.log(`Username not in cache, fetching from Firestore for userId: ${userId}`);
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const userData = userDoc.data();
    const username = userData?.username || "Unknown User";
    usernameCache[userId] = username;
    console.log(`Username fetched and cached for userId ${userId}: ${username}`);
    return username;
  } catch (error) {
    console.error(`Error fetching username for userId ${userId}:`, error);
    return "Unknown User";
  }
}
