"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDailyDigest = exports.sendWeeklyDigest = exports.sendEmail = exports.testEmailSend = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const node_mailjet_1 = require("node-mailjet");
admin.initializeApp();
// Initialize Mailjet client with API keys stored in Firebase config
const mailjet = new node_mailjet_1.Client({
    apiKey: functions.config().mailjet.api_key,
    apiSecret: functions.config().mailjet.api_secret,
});
exports.testEmailSend = functions.https.onRequest(async (req, res) => {
    try {
        const response = await mailjet.post("send", { version: "v3.1" }).request({
            Messages: [
                {
                    To: [
                        {
                            Email: "dannybauman@gmail.com",
                            Name: "Test Recipient",
                        },
                    ],
                    Subject: "Test email from Firebase Function",
                    TextPart: "This is a test email sent from a Firebase Function using Mailjet.",
                    HTMLPart: "<h3>This is a test email sent from a Firebase Function using Mailjet.</h3>",
                },
            ],
        });
        console.log("Email sent successfully:", response.body);
        res.status(200).send("Test email sent successfully");
    }
    catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send("Failed to send test email");
    }
});
// Helper function to send email
async function sendEmail(userEmail, userName, subject, htmlContent) {
    try {
        const response = await mailjet.post("send", { version: "v3.1" }).request({
            Messages: [
                {
                    From: {
                        Email: functions.config().mailjet.sender_email,
                        Name: "Share Links Digest",
                    },
                    To: [
                        {
                            Email: userEmail,
                            Name: userName,
                        },
                    ],
                    Subject: subject,
                    HTMLPart: htmlContent,
                },
            ],
        });
        console.log("Email sent successfully:", response.body);
        return { success: true };
    }
    catch (error) {
        console.error("Error sending email:", error);
        throw new functions.https.HttpsError("internal", "Failed to send email");
    }
}
exports.sendEmail = sendEmail;
// Helper function to generate digest content
async function generateDigestContent(userId, daysAgo) {
    var _a;
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const user = userDoc.data();
    const subscribedChannels = (user === null || user === void 0 ? void 0 : user.subscribedChannels) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    let digestContent = "";
    for (const channelId of subscribedChannels) {
        const linksSnapshot = await admin
            .firestore()
            .collection("links")
            .where("channelId", "==", channelId)
            .where("createdAt", ">=", cutoffDate)
            .orderBy("createdAt", "desc")
            .limit(5)
            .get();
        if (!linksSnapshot.empty) {
            const channelDoc = await admin
                .firestore()
                .collection("channels")
                .doc(channelId)
                .get();
            const channelName = ((_a = channelDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || "Unknown Channel";
            digestContent += `<h2>${channelName}</h2>`;
            linksSnapshot.forEach((linkDoc) => {
                var _a, _b, _c;
                const link = linkDoc.data();
                digestContent += `
          <div style="margin-bottom: 20px;">
            <h3><a href="${link.url}">${((_a = link.preview) === null || _a === void 0 ? void 0 : _a.title) || link.url}</a></h3>
            ${((_b = link.preview) === null || _b === void 0 ? void 0 : _b.image) ?
                    `<img src="${link.preview.image}" alt="Preview" style="max-width: 200px;">` :
                    ""}
            <p>${((_c = link.preview) === null || _c === void 0 ? void 0 : _c.description) || ""}</p>
          </div>
        `;
            });
        }
    }
    return digestContent;
}
// Function to send digest emails based on frequency
async function sendDigest(frequency, daysAgo) {
    const usersSnapshot = await admin
        .firestore()
        .collection("users")
        .where("digestFrequency", "==", frequency)
        .get();
    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const user = userDoc.data();
        const digestContent = await generateDigestContent(userId, daysAgo);
        if (digestContent) {
            const htmlContent = `
        <html>
          <body>
            <h1>Your ${frequency === "weekly" ? "Weekly" : "Daily"} Digest from Share Links</h1>
            ${digestContent}
          </body>
        </html>
      `;
            await sendEmail((user === null || user === void 0 ? void 0 : user.email) || "", (user === null || user === void 0 ? void 0 : user.username) || "User", `Your ${frequency === "weekly" ? "Weekly" : "Daily"} Share Links Digest`, htmlContent);
        }
    }
    return null;
}
// Scheduled function for weekly digest
exports.sendWeeklyDigest = functions.pubsub
    .schedule("every monday 09:00")
    .timeZone("America/New_York")
    .onRun(async () => {
    return sendDigest("weekly", 7);
});
// Scheduled function for daily digest
exports.sendDailyDigest = functions.pubsub
    .schedule("every day 09:00")
    .timeZone("America/New_York")
    .onRun(async () => {
    return sendDigest("daily", 1);
});
//# sourceMappingURL=index.js.map