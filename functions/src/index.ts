import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Client } from "node-mailjet";
import axios from "axios";

admin.initializeApp();

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

export { sendEmail };


function extractMetadata(html: string, metaName: string): string {
  const metaTag = `<meta name="${metaName}" content="`;
  const startIndex = html.indexOf(metaTag) + metaTag.length;
  if (startIndex === -1 + metaTag.length) {
    return ""; // Meta tag not found
  }
  const endIndex = html.indexOf("\"", startIndex);
  return html.substring(startIndex, endIndex);
}

function extractOgMetadata(html: string, propertyName: string): string {
  const ogTag = `<meta property="og:${propertyName}" content="`;
  const startIndex = html.indexOf(ogTag) + ogTag.length;
  if (startIndex === -1 + ogTag.length) {
    return ""; // Meta tag not found
  }
  const endIndex = html.indexOf("\"", startIndex);
  return html.substring(startIndex, endIndex);
}

function extractLinkTag(html: string, relAttribute: string): string {
  const linkTag = `<link rel="${relAttribute}" href="`;
  const startIndex = html.indexOf(linkTag) + linkTag.length;
  if (startIndex === -1 + linkTag.length) {
    return ""; // Link tag not found
  }
  const endIndex = html.indexOf("\"", startIndex);
  return html.substring(startIndex, endIndex);
}

export const fetchLinkPreview = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to fetch link previews"
    );
  }

  const { url } = data;

  try {
    const response = await axios.get(url);
    const html = response.data;

    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : "";

    const descriptionMatch = html.match(/<meta name="description" content="(.*?)">/);
    const ogDescriptionMatch = html.match(/<meta property="og:description" content="(.*?)">/);
    const description = (descriptionMatch ? descriptionMatch[1] : "") ||
      (ogDescriptionMatch ? ogDescriptionMatch[1] : "");

    const imageMatch = html.match(/<meta property="og:image" content="(.*?)">/);
    const twitterImageMatch = html.match(/<meta name="twitter:image" content="(.*?)">/);
    const image = (imageMatch ? imageMatch[1] : "") ||
      (twitterImageMatch ? twitterImageMatch[1] : "");

    const faviconMatch = html.match(/<link rel="(icon|shortcut icon)" href="(.*?)">/);
    const favicon = faviconMatch ? faviconMatch[2] : "";

    return {
      title,
      description,
      image,
      favicon,
    };
  } catch (error) {
    console.error("Error fetching link preview:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to fetch link preview"
    );
  }
});
