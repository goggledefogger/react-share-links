import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Client } from "node-mailjet";
import { getLinkPreview } from "link-preview-js";
import { getYoutubeVideoId, isYoutubeUrl } from "./utils/youtubeUtils";
import { getUsernameById } from "./utils/userUtils";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

admin.initializeApp();

interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  mediaType: string;
  contentType: string;
}

interface Link {
  id: string;
  channelId: string;
  userId: string;
  url: string;
  createdAt: Timestamp;
  preview?: LinkPreview;
}

interface MailjetResponse {
  body: {
    Messages?: Array<{
      Status: string;
      To: Array<{ MessageID: string }>;
      Errors?: Array<{ ErrorMessage: string }>;
    }>;
  };
}

const LINK_PREVIEW_TIMEOUT = 10000; // 10 seconds

const apiKey = functions.config().mailjet.api_key;
const apiSecret = functions.config().mailjet.api_secret;

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
          TemplateErrorReporting: {
            Email: "roytownwizard@protonmail.com",
            Name: "Share Links Error Reporter",
          },
        },
      ],
    }) as MailjetResponse;

    console.log("Mailjet API response:", JSON.stringify(response.body, null, 2));
    // check the response to see if it was successful
    if (
      response.body.Messages &&
      response.body.Messages[0].Status === "success"
    ) {
      console.log("Email sent successfully");
      console.log("Message ID:", response.body.Messages[0].To[0].MessageID);
      return { success: true };
    } else {
      console.log("Email sending failed");
      if (response.body.Messages && response.body.Messages[0].Errors) {
        console.log("Error:", response.body.Messages[0].Errors[0].ErrorMessage);
      }
      return { success: false };
    }
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
    console.log(
      `Starting generateDigestContent for userId: ${userId}, daysAgo: ${daysAgo}`
    );

    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    const user = userDoc.data();
    if (!user) {
      console.error(`User data not found for userId: ${userId}`);
      return null;
    }

    const subscribedChannels = user.subscribedChannels || [];
    console.log(`User ${userId} subscribed channels:`, subscribedChannels);

    if (subscribedChannels.length === 0) {
      console.log(`User ${userId} has no subscribed channels`);
      return null;
    }

    const now = Timestamp.now();
    const cutoffDate = Timestamp.fromMillis(now.toMillis() - daysAgo * 24 * 60 * 60 * 1000);
    console.log("Current time:", now.toDate().toISOString());
    console.log("Cutoff date:", cutoffDate.toDate().toISOString());

    const linksQuery = admin
      .firestore()
      .collection("links")
      .where("channelId", "in", subscribedChannels)
      .where("createdAt", ">=", cutoffDate)
      .orderBy("createdAt", "desc")
      .limit(100); // Limit to prevent excessive data retrieval

    const linksSnapshot = await linksQuery.get();
    console.log(
      `Found ${linksSnapshot.size} links across all subscribed channels`
    );

    if (linksSnapshot.empty) {
      console.log(
        `No links found for user ${userId} within the specified time range`
      );
      return null;
    }

    const channelIds = new Set(
      linksSnapshot.docs.map((doc) => doc.data().channelId)
    );
    const channelsSnapshot = await admin
      .firestore()
      .collection("channels")
      .where(
        admin.firestore.FieldPath.documentId(),
        "in",
        Array.from(channelIds)
      )
      .get();

    const channelMap = new Map(
      channelsSnapshot.docs.map((doc) => [
        doc.id,
        doc.data().name || "Unknown Channel",
      ])
    );

    interface DigestItem {
      channelName: string;
      url: string;
      title: string;
      description: string;
      image: string;
      createdAt: string;
      username: string;
    }

    const digestContent: DigestItem[] = [];
    const uniqueUserIds = new Set<string>();

    // First, collect all unique user IDs
    linksSnapshot.docs.forEach((linkDoc) => {
      const link = linkDoc.data();
      uniqueUserIds.add(link.userId);
    });

    console.log(`Unique user IDs found: ${Array.from(uniqueUserIds).join(", ")}`);

    // Fetch all usernames in bulk
    console.log("Starting bulk username fetch");
    const usernames = await Promise.all(
      Array.from(uniqueUserIds).map(async (id) => {
        const username = await getUsernameById(id);
        console.log(`Fetched username for user ${id}: ${username}`);
        return username;
      })
    );

    console.log("Bulk username fetch completed");

    // Create a map of user IDs to usernames
    const usernameMap = new Map(
      Array.from(uniqueUserIds).map((id, index) => [id, usernames[index]])
    );

    console.log("Username map created:", JSON.stringify(Object.fromEntries(usernameMap)));

    // Now process the links using the cached usernames
    for (const linkDoc of linksSnapshot.docs) {
      const link = linkDoc.data();
      const channelName = channelMap.get(link.channelId) || "Unknown Channel";
      const createdAt = link.createdAt instanceof Timestamp ?
        link.createdAt.toDate() :
        new Date(link.createdAt);

      const username = usernameMap.get(link.userId) || "Unknown User";
      console.log(`Using username '${username}' for user ${link.userId}`);

      digestContent.push({
        channelName,
        url: link.url,
        title: link.preview?.title || link.url,
        description: link.preview?.description || "",
        image: link.preview?.image || "",
        createdAt: createdAt.toISOString(),
        username: username,
      });
    }

    console.log(
      `Final digest content for user ${userId}:`,
      JSON.stringify(digestContent, null, 2)
    );
    return digestContent.length > 0 ? digestContent : null;
  } catch (error) {
    console.error(
      `Error generating digest content for userId ${userId}:`,
      error
    );
    return null;
  }
}


async function sendDigest(frequency: string, daysAgo: number) {
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
          await sendEmail(
            user.email,
            user.username || "User",
            `Your ${frequency === "weekly" ? "Weekly" : "Daily"} Share Links Digest`,
            templateContent,
            templateId
          );
          console.log(`Digest sent successfully to user ${userId}`);
        } else {
          console.log(`No digest content generated for user ${userId}, skipping email`);
        }
      } catch (error) {
        console.error(`Error processing digest for user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error in sendDigest for ${frequency} digest:`, error);
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
    const linkId = snapshot.id;
    const channelId = newLink.channelId;

    console.log("New link created:", JSON.stringify({
      linkId,
      channelId,
      createdAt: newLink.createdAt instanceof Timestamp ?
        newLink.createdAt.toDate().toISOString() :
        new Date(newLink.createdAt).toISOString(),
    }));

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

    // Wait for the link preview to be generated (max 20 seconds)
    const maxWaitTime = 20000; // 20 seconds
    const startTime = Date.now();
    let updatedLink: Link | null = null;

    while (Date.now() - startTime < maxWaitTime) {
      const updatedLinkSnapshot = await admin.firestore()
        .collection("links")
        .doc(linkId)
        .get();
      updatedLink = updatedLinkSnapshot.data() as Link;

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

    const linkUsername = await getUsernameById(newLink.userId);

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      if (user.email && user.emailNotifications !== false) {
        // Prepare the content for the Mailjet template
        const templateContent = {
          channelName: channelName,
          linkUrl: updatedLink.url,
          linkTitle: updatedLink.preview?.title || updatedLink.url,
          linkDescription: updatedLink.preview?.description || "",
          linkImage: updatedLink.preview?.image || "",
          linkUsername: linkUsername,
        };

        console.log("Template content for new link notification:",
          JSON.stringify(templateContent, null, 2));

        const templateId = functions.config().mailjet.new_link_email_template_id;
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
    const linkData = snap.data() as Link;
    const linkId = context.params.linkId;

    functions.logger.info("Fetching link data:", JSON.stringify(snap.data()));

    if (!linkData.url) {
      functions.logger.error("No URL found for link:", linkId);
      return null;
    }

    // Check if it's a YouTube URL first
    if (isYoutubeUrl(linkData.url)) {
      functions.logger.info(`YouTube URL detected: ${linkData.url}`);
      return await handleYoutubeLink(linkId, linkData.url);
    }

    // If not a YouTube URL, proceed with the existing link preview logic
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

async function handleYoutubeLink(linkId: string, url: string) {
  try {
    const videoId = getYoutubeVideoId(url);
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

export const deleteChannel = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    console.log("Unauthenticated delete attempt");
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { channelId } = data;
  const userId = context.auth.uid;

  console.log(`Attempt to delete channel ${channelId} by user ${userId}`);

  try {
    const db = admin.firestore();
    const channelRef = db.collection("channels").doc(channelId);
    const channelDoc = await channelRef.get();

    if (!channelDoc.exists) {
      console.log(`Channel ${channelId} not found`);
      throw new functions.https.HttpsError("not-found", "Channel not found");
    }

    const channelData = channelDoc.data();

    // Check if the user is the creator of the channel
    if (channelData?.createdBy !== userId) {
      console.log(`Unauthorized delete attempt for channel
        ${channelId} by user ${userId}. Channel creator: ${channelData?.createdBy}`);
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the channel creator can delete the channel"
      );
    }

    console.log(`Authorized delete for channel ${channelId} by user ${userId}`);

    // Get all users subscribed to this channel
    const usersSnapshot = await admin.firestore().collection("users")
      .where("subscribedChannels", "array-contains", channelId).get();

    // Create an array of user IDs who were subscribed to the channel
    const subscribedUserIds = usersSnapshot.docs.map((doc) => doc.id);

    // Soft delete: Move the channel to the deletedChannels collection with subscribed users
    await db.collection("deletedChannels").doc(channelId).set({
      ...channelData,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: userId,
      subscribedUsersAtDeletion: subscribedUserIds, // Add this new field
    });

    console.log(`Channel ${channelId} moved to deletedChannels collection with
      ${subscribedUserIds.length} subscribed users`);

    // Remove the channel from all users' subscriptions
    const batch = admin.firestore().batch();
    usersSnapshot.docs.forEach((userDoc) => {
      batch.update(userDoc.ref, {
        subscribedChannels: FieldValue.arrayRemove(channelId),
      });
    });
    await batch.commit();

    console.log(`Channel ${channelId} removed from all users' subscriptions`);

    // Delete the channel from the original collection
    await channelRef.delete();

    console.log(`Channel ${channelId} deleted from channels collection`);

    return { success: true };
  } catch (error) {
    console.error(`Error in deleteChannel for channel ${channelId}:`, error);
    throw new functions.https.HttpsError("internal",
      "An error occurred while deleting the channel");
  }
});

export const shareLinkViaEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { linkId, recipientEmail } = data;
  const userId = context.auth.uid;

  try {
    const db = admin.firestore();

    // Fetch the link data
    const linkDoc = await db.collection("links").doc(linkId).get();
    if (!linkDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Link not found");
    }
    const linkData = linkDoc.data() as Link;

    // Fetch the sender's username
    const senderUsername = await getUsernameById(userId);

    // Fetch the user document to get the email
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }
    const userData = userDoc.data();
    const senderEmail = userData?.email;

    if (!senderEmail) {
      throw new functions.https.HttpsError("internal", "Sender email not found");
    }

    const sharedLinkUrl = `${functions.config().app.url}/sharedLink/${linkId}`;

    // Prepare the email content
    const templateContent = {
      senderUsername,
      senderEmail,
      recipientEmail,
      linkUrl: sharedLinkUrl, // Use the new shared link URL
      linkTitle: linkData.preview?.title || linkData.url,
      linkDescription: linkData.preview?.description || "",
      linkImage: linkData.preview?.image || "",
    };

    const templateId = functions.config().mailjet.share_with_email_template_id;
    const subject = `${senderUsername} shared a link with you`;

    // Send the email
    await sendEmail(recipientEmail, recipientEmail, subject, templateContent, templateId);

    return { success: true };
  } catch (error) {
    console.error("Error in shareLinkViaEmail:", error);
    throw new functions.https.HttpsError("internal", "An error occurred while sharing the link");
  }
});

export { sendEmail };
