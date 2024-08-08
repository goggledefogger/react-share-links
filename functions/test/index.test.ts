import * as myFunctions from '../src';
import * as functions from 'firebase-functions';
import { Client } from 'node-mailjet';

jest.mock('node-mailjet', () => ({
  Client: jest.fn(() => ({
    post: jest.fn(() => ({
      request: jest.fn(() => Promise.resolve({ body: {} })),
    })),
  })),
}));

describe('Send Email', () => {
  it('should successfully call the Mailjet API', async () => {
    const userEmail = 'test@example.com';
    const userName = 'Test User';
    const subject = 'Test Email';
    const htmlContent = '<p>This is a test email</p>';

    await myFunctions.sendEmail(userEmail, userName, subject, htmlContent);

    // Simplified assertion using mocked Mailjet
    expect(Client.mock.instances[0].post).toHaveBeenCalledWith('send', {
      version: 'v3.1',
    });
    expect(Client.mock.instances[0].post().request).toHaveBeenCalledWith(
      expect.objectContaining({
        Messages: expect.arrayContaining([
          expect.objectContaining({
            To: expect.arrayContaining([{ Email: userEmail, Name: userName }]),
            Subject: subject,
            HTMLPart: htmlContent,
          }),
        ]),
      })
    );
  });

  it('should throw an error for invalid email', async () => {
    const userEmail = 'invalid-email';
    // ... other data

    await expect(
      myFunctions.sendEmail(userEmail, '...', '...', '...')
    ).rejects.toThrow(functions.https.HttpsError);
  });
});
