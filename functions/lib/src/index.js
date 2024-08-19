"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.sendDailyDigest = exports.sendWeeklyDigest = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const node_mailjet_1 = require("node-mailjet");
const link_preview_js_1 = require("link-preview-js");
const youtubeUtils_1 = require("./utils/youtubeUtils");
admin.initializeApp();
const LINK_PREVIEW_TIMEOUT = 10000; // 10 seconds
const apiKey = process.env.MJ_APIKEY_PUBLIC || ((_a = functions.config().mailjet) === null || _a === void 0 ? void 0 : _a.api_key);
const apiSecret = process.env.MJ_APIKEY_PRIVATE || ((_b = functions.config().mailjet) === null || _b === void 0 ? void 0 : _b.api_secret);
const mailjet = new node_mailjet_1.Client({
    apiKey: apiKey,
    apiSecret: apiSecret,
});
async function sendEmail(userEmail, userName, subject, htmlContent) {
    const senderEmail = process.env.MJ_SENDER_EMAIL || functions.config().mailjet.sender_email;
    try {
        await mailjet.post("send", { version: "v3.1" }).request({
            Messages: [
                {
                    From: {
                        Email: senderEmail,
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
        console.log(`Email sent successfully to ${userEmail}`);
        return { success: true };
    }
    catch (error) {
        console.error(`Error sending email to ${userEmail}:`, error);
        throw new functions.https.HttpsError("internal", `Failed to send email to ${userEmail}`);
    }
}
exports.sendEmail = sendEmail;
async function generateDigestContent(userId, daysAgo) {
    var _a;
    try {
        const userDoc = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .get();
        const user = userDoc.data();
        if (!user) {
            console.error(`User data not found for userId: ${userId}`);
            return "";
        }
        const subscribedChannels = user.subscribedChannels || [];
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        let digestContent = "";
        for (const channelId of subscribedChannels) {
            try {
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
                    digestContent += `
            <h2 style="color: #5b8cb7; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
              ${channelName}
            </h2>
          `;
                    linksSnapshot.forEach((linkDoc) => {
                        var _a, _b, _c;
                        const link = linkDoc.data();
                        const title = ((_a = link.preview) === null || _a === void 0 ? void 0 : _a.title) || link.url;
                        const image = ((_b = link.preview) === null || _b === void 0 ? void 0 : _b.image) ?
                            `<img src="${link.preview.image}" alt="Preview"
                  style="max-width: 100%; height: auto; margin-bottom: 10px;">` :
                            "";
                        const description = ((_c = link.preview) === null || _c === void 0 ? void 0 : _c.description) || "";
                        digestContent += `
              <div style="margin-bottom: 20px; background-color: #f9f9f9;
                  padding: 15px; border-radius: 5px;">
                <h3 style="margin-top: 0;">
                  <a href="${link.url}" style="color: #3a6ea5; text-decoration: none;">
                    ${title}
                  </a>
                </h3>
                ${image}
                <p style="color: #666; margin-bottom: 0;">${description}</p>
              </div>
            `;
                    });
                }
            }
            catch (error) {
                console.error(`Error processing channel ${channelId}:`, error);
            }
        }
        return digestContent;
    }
    catch (error) {
        console.error(`Error generating digest content for userId ${userId}:`, error);
        return "";
    }
}
async function sendDigest(frequency, daysAgo) {
    try {
        const usersSnapshot = await admin
            .firestore()
            .collection("users")
            .where("digestFrequency", "==", frequency)
            .get();
        console.log(`Sending ${frequency} digest to ${usersSnapshot.size} users`);
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const user = userDoc.data();
            try {
                const digestContent = await generateDigestContent(userId, daysAgo);
                if (digestContent) {
                    const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${frequency === "weekly" ? "Weekly" : "Daily"} Share Links Digest</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;
                max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #5b8cb7;">
                Your ${frequency === "weekly" ? "Weekly" : "Daily"} Share Links Digest
              </h1>
              ${digestContent}
              <p style="margin-top: 30px; font-size: 0.9em; color: #888;">
                You're receiving this email because you've subscribed to
                ${frequency === "weekly" ? "weekly" : "daily"} digests from Share Links.
                <a href="#" style="color: #5b8cb7;">Manage your preferences</a>
              </p>
            </body>
            </html>
          `;
                    await sendEmail(user.email, user.username || "User", `Your ${frequency === "weekly" ? "Weekly" : "Daily"} Share Links Digest`, htmlContent);
                    console.log(`Digest sent successfully to user ${userId}`);
                }
                else {
                    console.log(`No digest content for user ${userId}`);
                }
            }
            catch (error) {
                console.error(`Error processing digest for user ${userId}:`, error);
            }
        }
        console.log(`Finished sending ${frequency} digests`);
        return null;
    }
    catch (error) {
        console.error(`Error in sendDigest function for ${frequency} digest:`, error);
        throw new functions.https.HttpsError("internal", `Failed to send ${frequency} digests`);
    }
}
exports.sendWeeklyDigest = functions.pubsub
    .schedule("every monday 09:00")
    .timeZone("America/New_York")
    .onRun(async () => {
    console.log("Starting weekly digest");
    return sendDigest("weekly", 7);
});
exports.sendDailyDigest = functions.pubsub
    .schedule("every day 09:00")
    .timeZone("America/New_York")
    .onRun(async () => {
    console.log("Starting daily digest");
    return sendDigest("daily", 1);
});
exports.fetchAndSaveLinkPreview = functions.firestore
    .document("links/{linkId}")
    .onCreate(async (snap, context) => {
    const linkData = snap.data();
    const linkId = context.params.linkId;
    functions.logger.info("Fetching link preview for:", linkId);
    functions.logger.info("Fetching link data:", JSON.stringify(snap.data()));
    if (!linkData.url) {
        functions.logger.error("No URL found for link:", linkId);
        return null;
    }
    // if the linkData.url is from either youtube.com or youtu.be, case insensitive
    if ((0, youtubeUtils_1.isYoutubeUrl)(linkData.url)) {
        // extract video ID from YouTube URL, considering a null value
        const videoId = (0, youtubeUtils_1.getYoutubeVideoId)(linkData.url);
        if (!videoId) {
            functions.logger.error("No video ID found for YouTube link:", linkData.url);
            return null;
        }
        const youtubeApiKey = functions.config().youtube.api_key;
        const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeApiKey}`; // eslint-disable-line
        const response = await fetch(youtubeApiUrl);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const video = data.items[0];
            const previewData = {
                title: video.snippet.title,
                description: video.snippet.description,
                image: video.snippet.thumbnails.high.url,
                mediaType: "video",
                contentType: "text/html",
            };
            await admin.firestore().collection("links").doc(linkId).update({
                preview: previewData,
            });
            functions.logger.info("Link preview saved for:", linkId);
            return null;
        }
        else {
            functions.logger.error("No video found for YouTube link:", linkId);
            return null;
        }
    }
    const maxRetries = 3;
    let retryCount = 0;
    while (retryCount < maxRetries) {
        try {
            const preview = await (0, link_preview_js_1.getLinkPreview)(linkData.url, {
                timeout: LINK_PREVIEW_TIMEOUT,
                followRedirects: "error",
            });
            functions.logger.info("Raw preview data:", JSON.stringify(preview, null, 2));
            const previewData = {
                mediaType: preview.mediaType,
                contentType: preview.contentType || "text/html",
            };
            if ("title" in preview) {
                // This is for HTML content
                previewData.title = preview.title || "";
                previewData.description = preview.description || "";
                if (preview.images && preview.images.length > 0) {
                    previewData.image = preview.images[0];
                }
                if (preview.favicons && preview.favicons.length > 0) {
                    previewData.favicon = preview.favicons[0];
                }
            }
            else {
                // This is for non-HTML content (images, audio, video, application)
                previewData.title = preview.url;
                if (preview.favicons && preview.favicons.length > 0) {
                    previewData.favicon = preview.favicons[0];
                }
            }
            // Log which fields are undefined
            Object.keys(previewData).forEach((key) => {
                if (previewData[key] === undefined) {
                    functions.logger.warn(`Field ${key} is undefined for link ${linkId}`);
                }
            });
            // Remove any undefined fields
            Object.keys(previewData).forEach((key) => previewData[key] === undefined &&
                delete previewData[key]);
            await admin.firestore().collection("links").doc(linkId).update({
                preview: previewData,
            });
            functions.logger.info("Link preview saved for:", linkId);
            return null;
        }
        catch (error) {
            functions.logger.error(`Error fetching link preview for ${linkId} (Attempt ${retryCount + 1}):`, error);
            retryCount++;
            if (retryCount >= maxRetries) {
                functions.logger.error(`Failed to fetch link preview for ${linkId} after ${maxRetries} attempts`);
                // Save a minimal preview to avoid future retries
                await admin
                    .firestore()
                    .collection("links")
                    .doc(linkId)
                    .update({
                    preview: {
                        title: linkData.url,
                        mediaType: "text/html",
                        contentType: "text/html",
                    },
                });
                return null;
            }
            // Wait before retrying (exponential backoff)
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
    }
    // This line ensures that all code paths return a value
    return null;
});
//# sourceMappingURL=index.js.map