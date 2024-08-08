import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Client } from 'node-mailjet';

admin.initializeApp();

const mailjet = new Client({
  apiKey: functions.config().mailjet.api_key,
  apiSecret: functions.config().mailjet.api_secret,
});

export async function sendEmail(
  userEmail: string,
  userName: string,
  subject: string,
  htmlContent: string
) {
  try {
    const response = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: functions.config().mailjet.sender_email,
            Name: 'Share Links Digest',
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

    console.log('Email sent successfully:', response.body);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
}

// Reusable function to generate digest content
async function generateDigestContent(userId: string, daysAgo: number) {
  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  const user = userDoc.data();

  const subscribedChannels = user?.subscribedChannels || [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

  let digestContent = '';

  for (const channelId of subscribedChannels) {
    const linksSnapshot = await admin
      .firestore()
      .collection('links')
      .where('channelId', '==', channelId)
      .where('createdAt', '>=', cutoffDate)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    if (!linksSnapshot.empty) {
      const channelDoc = await admin
        .firestore()
        .collection('channels')
        .doc(channelId)
        .get();
      const channelName = channelDoc.data()?.name || 'Unknown Channel';

      digestContent += `<h2>${channelName}</h2>`;

      linksSnapshot.forEach((linkDoc) => {
        const link = linkDoc.data();
        digestContent += `
          <div style="margin-bottom: 20px;">
            <h3><a href="${link.url}">${link.preview?.title || link.url}</a></h3>
            ${
  link.preview?.image ?
    `<img src="${link.preview.image}" alt="Preview" style="max-width: 200px;">` :
    ''
}
            <p>${link.preview?.description || ''}</p>
          </div>
        `;
      });
    }
  }

  return digestContent;
}

// Function to send digest emails based on frequency
async function sendDigest(frequency: string, daysAgo: number) {
  const usersSnapshot = await admin
    .firestore()
    .collection('users')
    .where('digestFrequency', '==', frequency)
    .get();

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const user = userDoc.data();

    const digestContent = await generateDigestContent(userId, daysAgo);

    if (digestContent) {
      const htmlContent = `
        <html>
          <body>
            <h1>Your ${
  frequency === 'weekly' ? 'Weekly' : 'Daily'
} Digest from Share Links</h1>
            ${digestContent}
          </body>
        </html>
      `;

      await sendEmail(
        user?.email || '',
        user?.username || 'User',
        `Your ${frequency === 'weekly' ? 'Weekly' : 'Daily'} Share Links Digest`,
        htmlContent
      );
    }
  }

  return null;
}

export const sendWeeklyDigest = functions.pubsub
  .schedule('every monday 09:00')
  .timeZone('America/New_York')
  .onRun(async () => {
    return sendDigest('weekly', 7);
  });

export const sendDailyDigest = functions.pubsub
  .schedule('every day 09:00')
  .timeZone('America/New_York')
  .onRun(async () => {
    return sendDigest('daily', 1);
  });
