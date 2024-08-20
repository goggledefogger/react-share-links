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
  htmlContent: string
) {
  const senderEmail =
    process.env.MJ_SENDER_EMAIL || functions.config().mailjet.sender_email;

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
  } catch (error) {
    console.error(`Error sending email to ${userEmail}:`, error);
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
          const channelName = channelDoc.data()?.name || "Unknown Channel";

          digestContent += `
            <h2 style="color: #5b8cb7; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
              ${channelName}
            </h2>
          `;

          linksSnapshot.forEach((linkDoc) => {
            const link = linkDoc.data();
            const title = link.preview?.title || link.url;
            const image = link.preview?.image ?
              `<img src="${link.preview.image}" alt="Preview"
                  style="max-width: 100%; height: auto; margin-bottom: 10px;">` :
              "";
            const description = link.preview?.description || "";

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
      } catch (error) {
        console.error(`Error processing channel ${channelId}:`, error);
      }
    }

    return digestContent;
  } catch (error) {
    console.error(
      `Error generating digest content for userId ${userId}:`,
      error
    );
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
          const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${
  frequency === "weekly" ? "Weekly" : "Daily"
} Share Links Digest</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;
                max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #5b8cb7;">
                Your ${
  frequency === "weekly" ? "Weekly" : "Daily"
} Share Links Digest
              </h1>
              ${digestContent}
              <p style="margin-top: 30px; font-size: 0.9em; color: #888;">
                You're receiving this email because you've subscribed to
                ${
  frequency === "weekly" ? "weekly" : "daily"
} digests from Share Links.
                <a href="#" style="color: #5b8cb7;">Manage your preferences</a>
              </p>
            </body>
            </html>
          `;

          await sendEmail(
            user.email,
            user.username || "User",
            `Your ${
              frequency === "weekly" ? "Weekly" : "Daily"
            } Share Links Digest`,
            htmlContent
          );
          console.log(`Digest sent successfully to user ${userId}`);
        } else {
          console.log(`No digest content for user ${userId}`);
        }
      } catch (error) {
        console.error(`Error processing digest for user ${userId}:`, error);
      }
    }

    console.log(`Finished sending ${frequency} digests`);
    return null;
  } catch (error) {
    console.error(
      `Error in sendDigest function for ${frequency} digest:`,
      error
    );
    throw new functions.https.HttpsError(
      "internal",
      `Failed to send ${frequency} digests`
    );
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
