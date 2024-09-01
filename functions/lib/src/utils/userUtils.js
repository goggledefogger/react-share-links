"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsernameById = void 0;
const admin = require("firebase-admin");
const usernameCache = {};
async function getUsernameById(userId) {
    if (usernameCache[userId]) {
        return usernameCache[userId];
    }
    try {
        const userDoc = await admin.firestore().collection("users").doc(userId).get();
        const userData = userDoc.data();
        const username = (userData === null || userData === void 0 ? void 0 : userData.username) || "Unknown User";
        usernameCache[userId] = username;
        return username;
    }
    catch (error) {
        console.error(`Error fetching username for userId ${userId}:`, error);
        return "Unknown User";
    }
}
exports.getUsernameById = getUsernameById;
//# sourceMappingURL=userUtils.js.map