import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Client } from "node-mailjet";
import { getLinkPreview } from "link-preview-js";
import { getYoutubeVideoId, isYoutubeUrl } from "./utils/youtubeUtils";

admin.initializeApp();

interface LinkData {
  url: string;
  channelId: string;
  createdAt: admin.firestore.Timestamp;
  preview?: LinkPreview;
}

interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  mediaType: string;
  contentType: string;
}

// Add this new interface
interface Link {
  id: string;
  channelId: string;
  userId: string;
  url: string;
  createdAt: number;
  preview?: LinkPreview;
}

const LINK_PREVIEW_TIMEOUT = 10000; // 10 seconds

const apiKey =
  process.env.MJ_APIKEY_PUBLIC || functions.config().mailjet?.api_key;
const apiSecret =
  process.env.MJ_APIKEY_PRIVATE || functions.config().mailjet?.api_secret;

const mailjet = new Client({
  apiKey: apiKey,
  apiSecret: apiSecret,
});

async function sendEmail(
  userEmail: string,
  userName: string,
  subject: string,
  templateContent: Record<string, unknown>,
  templateId: string
) {
  if (!templateId) {
    console.error("Mailjet template ID is not provided");
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Email template ID is not provided"
    );
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

    console.log(`Email sent successfully to ${userEmail}`);
    console.log("Mailjet API response:", JSON.stringify(response.body, null, 2));
    return { success: true };
  } catch (error: unknown) {
    console.error(`Error sending email to ${userEmail}:`, error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    if (typeof error === "object" && error !== null && "response" in error) {
      const mailjetError = error as { response: { body: unknown } };
      console.error("Mailjet API error response:",
        JSON.stringify(mailjetError.response.body, null, 2));
    }

    throw new functions.https.HttpsError(
      "internal",
      `Failed to send email to ${userEmail}`
    );
  }
}

async function generateDigestContent(userId: string, daysAgo: number) {
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

    const digestContent = [];
    for (const channelId of subscribedChannels) {
      const linksSnapshot = await admin
        .firestore()
        .collection("links")
        .where("channelId", "==", channelId)
        .where("createdAt", ">=", cutoffDate)
        .orderBy("createdAt", "desc")
        .get();

      if (!linksSnapshot.empty) {
        const channelDoc = await admin
          .firestore()
          .collection("channels")
          .doc(channelId)
          .get();
        const channelName = channelDoc.data()?.name || "Unknown Channel";

        const channelLinks = linksSnapshot.docs.map((linkDoc) => {
          const link = linkDoc.data();
          return {
            url: link.url,
            title: link.preview?.title || link.url,
            description: link.preview?.description || "",
            image: link.preview?.image || "",
          };
        });

        digestContent.push({
          channelName,
          links: channelLinks,
        });
      }
    }

    return digestContent.length > 0 ? digestContent : null;
  } catch (error) {
    console.error(`Error generating digest content for userId ${userId}:`, error);
    return "";
  }
}

async function sendDigest(frequency: string, daysAgo: number) {
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
          const templateContent = {
            frequency: frequency === "weekly" ? "Weekly" : "Daily",
            digestContent: digestContent,
          };

          const templateId = process.env.MJ_DIGEST_TEMPLATE_ID ||
            functions.config().mailjet.digest_email_template_id;
          await sendEmail(
            user.email,
            user.username || "User",
            `Your ${frequency === "weekly" ? "Weekly" : "Daily"} Share Links Digest`,
            templateContent,
            templateId
          );
          console.log(`Digest sent successfully to user ${userId}`);
        } else {
          console.log(`No digest content for user ${userId}`);
        }
      } catch (error) {
        console.error(`Error sending digest to user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error sending ${frequency} digest:`, error);
  }
}

export const sendWeeklyDigest = functions.pubsub
  .schedule("every monday 09:00")
  .timeZone("America/New_York")
  .onRun(async () => {
    console.log("Starting weekly digest");
    return sendDigest("weekly", 7);
  });

export const sendDailyDigest = functions.pubsub
  .schedule("every day 09:00")
  .timeZone("America/New_York")
  .onRun(async () => {
    console.log("Starting daily digest");
    return sendDigest("daily", 1);
  });

export const sendNewLinkNotification = functions.firestore
  .document("links/{linkId}")
  .onCreate(async (snapshot) => {
    const newLink = snapshot.data() as Link;
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
    const channelName = channelSnapshot.exists ? channelSnapshot.data()?.name : "Unknown Channel";

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      if (user.email && user.emailNotifications !== false) {
        // Prepare the content for the Mailjet template
        const templateContent = {
          channelName: channelName,
          linkUrl: newLink.url,
          linkTitle: newLink.preview?.title || newLink.url,
          linkDescription: newLink.preview?.description || "",
          linkImage: newLink.preview?.image || "",
        };

        const templateId = process.env.MJ_NEW_LINK_TEMPLATE_ID ||
          functions.config().mailjet.new_link_email_template_id;
        // Send email using Mailjet template
        await sendEmail(
          user.email,
          user.username || "User",
          `New Link in ${channelName}`,
          templateContent,
          templateId
        );
        console.log(`Notification sent to ${user.email} for new link in ${channelName}`);
      }
    }
  });

exports.fetchAndSaveLinkPreview = functions.firestore
  .document("links/{linkId}")
  .onCreate(async (snap, context) => {
    const linkData = snap.data() as LinkData;
    const linkId = context.params.linkId;

    functions.logger.info("Fetching link data:", JSON.stringify(snap.data()));

    if (!linkData.url) {
      functions.logger.error("No URL found for link:", linkId);
      return null;
    }

    const maxRetries = 3;
    let retryCount = 0;
    let redirectBlocked = false;

    while (retryCount < maxRetries && !redirectBlocked) {
      try {
        functions.logger.info(
          `Attempt ${retryCount + 1}: Trying manual redirect approach for ${linkData.url}`
        );

        const preview = await getLinkPreview(linkData.url, {
          headers: {
            "user-agent": "googlebot",
          },
          timeout: LINK_PREVIEW_TIMEOUT,
          followRedirects: "manual",
          handleRedirects: (baseURL: string, forwardedURL: string) => {
            functions.logger.info(
              `Redirect attempt detected from ${baseURL} to ${forwardedURL}`
            );

            const urlObj = new URL(baseURL);
            const forwardedURLObj = new URL(forwardedURL);
            if (
              forwardedURLObj.hostname === urlObj.hostname ||
              forwardedURLObj.hostname === "www." + urlObj.hostname ||
              "www." + forwardedURLObj.hostname === urlObj.hostname
            ) {
              functions.logger.info(
                `Redirect allowed from ${baseURL} to ${forwardedURL}`
              );
              return true;
            } else {
              functions.logger.warn(
                `Redirect blocked from ${baseURL} to ${forwardedURL}`
              );
              redirectBlocked = true;
              return false;
            }
          },
        });

        // If we reach this point, it means the preview was successful
        functions.logger.info(
          "Raw preview data:",
          JSON.stringify(preview, null, 2)
        );

        const previewData: Partial<LinkPreview> = {
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
        } else {
          // This is for non-HTML content (images, audio, video, application)
          previewData.title = preview.url;
          if (preview.favicons && preview.favicons.length > 0) {
            previewData.favicon = preview.favicons[0];
          }
        }

        // Log which fields are undefined
        Object.keys(previewData).forEach((key) => {
          if (previewData[key as keyof LinkPreview] === undefined) {
            functions.logger.warn(
              `Field ${key} is undefined for link ${linkId}`
            );
          }
        });

        // Remove any undefined fields
        Object.keys(previewData).forEach(
          (key) =>
            previewData[key as keyof LinkPreview] === undefined &&
            delete previewData[key as keyof LinkPreview]
        );

        await admin.firestore().collection("links").doc(linkId).update({
          preview: previewData,
        });

        functions.logger.info("Link preview saved for:", linkId);
        return null;
      } catch (error) {
        functions.logger.error(
          `Error fetching link preview for ${linkId} (Attempt ${
            retryCount + 1
          }):`,
          error
        );

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
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retryCount))
        );
      }
    }

    // If all retries failed or redirect was blocked, try YouTube API for YouTube URLs
    if ((redirectBlocked || retryCount >= maxRetries) && isYoutubeUrl(linkData.url)) {
      functions.logger.info(
        `Manual redirect failed for YouTube URL. Attempting YouTube Data API for ${linkData.url}`
      );

      try {
        const videoId = getYoutubeVideoId(linkData.url);
        if (!videoId) {
          functions.logger.error(
            "No video ID found for YouTube link:",
            linkData.url
          );
          return null;
        }

        const youtubeApiKey = functions.config().youtube.api_key;
        const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeApiKey}`; // eslint-disable-line
        const response = await fetch(youtubeApiUrl);
        const data = await response.json();
        functions.logger.debug("YouTube API response:", JSON.stringify(data));

        if (data.items && data.items.length > 0) {
          const video = data.items[0];
          const previewData: Partial<LinkPreview> = {
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
        } else {
          functions.logger.error("No video found for YouTube link:", linkId);
        }
      } catch (youtubeError) {
        functions.logger.error("Error fetching YouTube data:", youtubeError);
      }
    }

    // If all attempts failed, save a minimal preview
    if (redirectBlocked || retryCount >= maxRetries) {
      functions.logger.error(
        `Failed to fetch link preview for ${linkId} after ${retryCount} attempts`
      );
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

export { sendEmail };
