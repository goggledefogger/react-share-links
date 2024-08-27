"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.sendNewLinkNotification = exports.sendDailyDigest = exports.sendWeeklyDigest = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const node_mailjet_1 = require("node-mailjet");
const link_preview_js_1 = require("link-preview-js");
const youtubeUtils_1 = require("./utils/youtubeUtils");
admin.initializeApp();
const LINK_PREVIEW_TIMEOUT = 10000; // 10 seconds
const apiKey = functions.config().mailjet.api_key;
const apiSecret = functions.config().mailjet.api_secret;
const mailjet = new node_mailjet_1.Client({
    apiKey: apiKey,
    apiSecret: apiSecret,
});
async function sendEmail(userEmail, userName, subject, templateContent, templateId) {
    if (!templateId) {
        console.error("Mailjet template ID is not provided");
        throw new functions.https.HttpsError("failed-precondition", "Email template ID is not provided");
    }
    try {
        console.log(`Attempting to send email to ${userEmail} with subject: ${subject}`);
        console.log("Template ID:", templateId);
        console.log("Template content:", JSON.stringify(templateContent, null, 2));
        const response = await mailjet.post("send", { version: "v3.1" }).request({
            Messages: [
                {
                    To: [
                        {
                            Email: userEmail,
                            Name: userName,
                        },
                    ],
                    TemplateID: parseInt(templateId),
                    TemplateLanguage: true,
                    Subject: subject,
                    Variables: templateContent,
                },
            ],
        });
        console.log("Mailjet API response:", JSON.stringify(response.body, null, 2));
        // check the response to see if it was successful
        if (response.body.Messages &&
            response.body.Messages[0].Status === "success") {
            console.log("Email sent successfully");
            console.log("Message ID:", response.body.Messages[0].To[0].MessageID);
            return { success: true };
        }
        else {
            console.log("Email sending failed");
            if (response.body.Messages && response.body.Messages[0].Errors) {
                console.log("Error:", response.body.Messages[0].Errors[0].ErrorMessage);
            }
            return { success: false };
        }
    }
    catch (error) {
        console.error(`Error sending email to ${userEmail}:`, error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
        if (typeof error === "object" && error !== null && "response" in error) {
            const mailjetError = error;
            console.error("Mailjet API error response:", JSON.stringify(mailjetError.response.body, null, 2));
        }
        throw new functions.https.HttpsError("internal", `Failed to send email to ${userEmail}`);
    }
}
exports.sendEmail = sendEmail;
async function generateDigestContent(userId, daysAgo) {
    var _a;
    try {
        const userDoc = await admin.firestore().collection("users").doc(userId).get();
        const user = userDoc.data();
        if (!user) {
            console.error(`User data not found for userId: ${userId}`);
            return null;
        }
        const subscribedChannels = user.subscribedChannels || [];
        console.log(`Generating digest for user ${userId}, daysAgo: ${daysAgo}`);
        console.log("Subscribed channels:", subscribedChannels);
        const cutoffDate = admin.firestore.Timestamp.fromDate(new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000));
        console.log("Cutoff date:", cutoffDate.toDate().toISOString());
        const digestContent = [];
        for (const channelId of subscribedChannels) {
            console.log(`Fetching links for channel ${channelId}`);
            const linksSnapshot = await admin
                .firestore()
                .collection("links")
                .where("channelId", "==", channelId)
                .where("createdAt", ">=", cutoffDate)
                .orderBy("createdAt", "desc")
                .get();
            console.log(`Found ${linksSnapshot.size} links for channel ${channelId}`);
            if (!linksSnapshot.empty) {
                const channelDoc = await admin.firestore().collection("channels").doc(channelId).get();
                const channelName = ((_a = channelDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || "Unknown Channel";
                const channelLinks = linksSnapshot.docs.map((linkDoc) => {
                    var _a, _b, _c;
                    const link = linkDoc.data();
                    const createdAt = link.createdAt instanceof admin.firestore.Timestamp ?
                        link.createdAt.toDate() :
                        new Date(link.createdAt);
                    console.log(`Link in channel ${channelId}:`, JSON.stringify(Object.assign(Object.assign({}, link), { createdAt: createdAt.toISOString() })));
                    return {
                        url: link.url,
                        title: ((_a = link.preview) === null || _a === void 0 ? void 0 : _a.title) || link.url,
                        description: ((_b = link.preview) === null || _b === void 0 ? void 0 : _b.description) || "",
                        image: ((_c = link.preview) === null || _c === void 0 ? void 0 : _c.image) || "",
                        createdAt: createdAt.toISOString(),
                    };
                });
                digestContent.push({ channelName, links: channelLinks });
            }
            else {
                console.log(`No links found for channel ${channelId} within the specified time range`);
            }
        }
        console.log("Final digest content:", JSON.stringify(digestContent, null, 2));
        return digestContent.length > 0 ? digestContent : null;
    }
    catch (error) {
        console.error(`Error generating digest content for userId ${userId}:`, error);
        return null;
    }
}
async function sendDigest(frequency, daysAgo) {
    try {
        const usersSnapshot = await admin
            .firestore()
            .collection("users")
            .where("digestFrequency", "==", frequency)
            .get();
        console.log(`Found ${usersSnapshot.size} users for ${frequency} digest`);
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const user = userDoc.data();
            console.log(`Processing digest for user ${userId}`);
            try {
                const digestContent = await generateDigestContent(userId, daysAgo);
                if (digestContent) {
                    console.log(`Digest content generated for user ${userId}, sending email`);
                    const templateContent = {
                        frequency: frequency === "weekly" ? "Weekly" : "Daily",
                        digestContent: digestContent,
                    };
                    const templateId = functions.config().mailjet.digest_email_template_id;
                    await sendEmail(user.email, user.username || "User", `Your ${frequency === "weekly" ? "Weekly" : "Daily"} Share Links Digest`, templateContent, templateId);
                    console.log(`Digest sent successfully to user ${userId}`);
                }
                else {
                    console.log(`No digest content generated for user ${userId}, skipping email`);
                }
            }
            catch (error) {
                console.error(`Error processing digest for user ${userId}:`, error);
            }
        }
    }
    catch (error) {
        console.error(`Error in sendDigest for ${frequency} digest:`, error);
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
exports.sendNewLinkNotification = functions.firestore
    .document("links/{linkId}")
    .onCreate(async (snapshot) => {
    var _a, _b, _c, _d;
    const newLink = snapshot.data();
    const linkId = snapshot.id;
    const channelId = newLink.channelId;
    // Get all users subscribed to this channel
    const usersSnapshot = await admin.firestore()
        .collection("users")
        .where("subscribedChannels", "array-contains", channelId)
        .get();
    const channelSnapshot = await admin.firestore()
        .collection("channels")
        .doc(channelId)
        .get();
    const channelName = channelSnapshot.exists ? (_a = channelSnapshot.data()) === null || _a === void 0 ? void 0 : _a.name : "Unknown Channel";
    // Wait for the link preview to be generated (max 20 seconds)
    const maxWaitTime = 20000; // 20 seconds
    const startTime = Date.now();
    let updatedLink = null;
    while (Date.now() - startTime < maxWaitTime) {
        const updatedLinkSnapshot = await admin.firestore()
            .collection("links")
            .doc(linkId)
            .get();
        updatedLink = updatedLinkSnapshot.data();
        if (updatedLink.preview && updatedLink.preview.title) {
            break; // Preview has been generated, exit the loop
        }
        // Wait for 2 seconds before checking again
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    // If we couldn't get the preview after waiting, use the original link data
    if (!updatedLink || !updatedLink.preview) {
        updatedLink = newLink;
    }
    for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const userId = userDoc.id;
        if (user.email && user.emailNotifications !== false) {
            // Generate digest content for testing
            const dailyDigestContent = await generateDigestContent(userId, 1);
            const weeklyDigestContent = await generateDigestContent(userId, 7);
            // Prepare the content for the Mailjet template
            const templateContent = {
                channelName: channelName,
                linkUrl: updatedLink.url,
                linkTitle: ((_b = updatedLink.preview) === null || _b === void 0 ? void 0 : _b.title) || updatedLink.url,
                linkDescription: ((_c = updatedLink.preview) === null || _c === void 0 ? void 0 : _c.description) || "",
                linkImage: ((_d = updatedLink.preview) === null || _d === void 0 ? void 0 : _d.image) || "",
                // Add digest content for testing, use empty string if null
                dailyDigestContent: dailyDigestContent ? JSON.stringify(dailyDigestContent) : "",
                weeklyDigestContent: weeklyDigestContent ? JSON.stringify(weeklyDigestContent) : "",
            };
            console.log("Template content for new link notification (including digest):", JSON.stringify(templateContent, null, 2));
            const templateId = functions.config().mailjet.new_link_email_template_id;
            // Send email using Mailjet template
            await sendEmail(user.email, user.username || "User", `New Link in ${channelName} (with Digest Test)`, templateContent, templateId);
            console.log(`Notification sent to
          ${user.email} for new link in ${channelName} (with digest test)`);
        }
    }
});
exports.fetchAndSaveLinkPreview = functions.firestore
    .document("links/{linkId}")
    .onCreate(async (snap, context) => {
    const linkData = snap.data();
    const linkId = context.params.linkId;
    functions.logger.info("Fetching link data:", JSON.stringify(snap.data()));
    if (!linkData.url) {
        functions.logger.error("No URL found for link:", linkId);
        return null;
    }
    // Check if it's a YouTube URL first
    if ((0, youtubeUtils_1.isYoutubeUrl)(linkData.url)) {
        functions.logger.info(`YouTube URL detected: ${linkData.url}`);
        return await handleYoutubeLink(linkId, linkData.url);
    }
    // If not a YouTube URL, proceed with the existing link preview logic
    const maxRetries = 3;
    let retryCount = 0;
    let redirectBlocked = false;
    while (retryCount < maxRetries && !redirectBlocked) {
        try {
            functions.logger.info(`Attempt ${retryCount + 1}: Trying manual redirect approach for ${linkData.url}`);
            const preview = await (0, link_preview_js_1.getLinkPreview)(linkData.url, {
                headers: {
                    "user-agent": "googlebot",
                },
                timeout: LINK_PREVIEW_TIMEOUT,
                followRedirects: "manual",
                handleRedirects: (baseURL, forwardedURL) => {
                    functions.logger.info(`Redirect attempt detected from ${baseURL} to ${forwardedURL}`);
                    const urlObj = new URL(baseURL);
                    const forwardedURLObj = new URL(forwardedURL);
                    if (forwardedURLObj.hostname === urlObj.hostname ||
                        forwardedURLObj.hostname === "www." + urlObj.hostname ||
                        "www." + forwardedURLObj.hostname === urlObj.hostname) {
                        functions.logger.info(`Redirect allowed from ${baseURL} to ${forwardedURL}`);
                        return true;
                    }
                    else {
                        functions.logger.warn(`Redirect blocked from ${baseURL} to ${forwardedURL}`);
                        redirectBlocked = true;
                        return false;
                    }
                },
            });
            // If we reach this point, it means the preview was successful
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
            // Check if the error is related to a blocked redirect
            if (error instanceof Error && error.message.includes("redirect")) {
                functions.logger.warn(`Redirect error encountered: ${error.message}`);
                redirectBlocked = true;
            }
            retryCount++;
            if (redirectBlocked || retryCount >= maxRetries) {
                break;
            }
            // Wait before retrying (exponential backoff)
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
    }
    // If all attempts failed, save a minimal preview
    if (redirectBlocked || retryCount >= maxRetries) {
        functions.logger.error(`Failed to fetch link preview for ${linkId} after ${retryCount} attempts`);
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
    }
    return null;
});
async function handleYoutubeLink(linkId, url) {
    try {
        const videoId = (0, youtubeUtils_1.getYoutubeVideoId)(url);
        if (!videoId) {
            functions.logger.error("No video ID found for YouTube link:", url);
            return null;
        }
        const youtubeApiKey = functions.config().youtube.api_key;
        const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeApiKey}`; // eslint-disable-line
        const response = await fetch(youtubeApiUrl);
        const data = await response.json();
        functions.logger.debug("YouTube API response:", JSON.stringify(data));
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
            functions.logger.info("YouTube link preview saved for:", linkId);
            return null;
        }
        else {
            functions.logger.error("No video found for YouTube link:", linkId);
        }
    }
    catch (youtubeError) {
        functions.logger.error("Error fetching YouTube data:", youtubeError);
    }
    // If YouTube API fails, fall back to minimal preview
    await admin.firestore().collection("links").doc(linkId).update({
        preview: {
            title: url,
            mediaType: "text/html",
            contentType: "text/html",
        },
    });
    return null;
}
//# sourceMappingURL=index.js.map