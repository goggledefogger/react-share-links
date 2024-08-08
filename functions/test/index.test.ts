import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env file
config({ path: resolve(__dirname, "../.env") });

import * as functionsTest from "firebase-functions-test";
import * as myFunctions from "../src/index";
import * as functions from "firebase-functions";

const testEnv = functionsTest();

describe("Cloud Functions", () => {
  beforeAll(() => {
    // Log the environment variables to verify they're loaded
    console.log("MJ_APIKEY_PUBLIC:", process.env.MJ_APIKEY_PUBLIC);
    console.log("MJ_APIKEY_PRIVATE:", process.env.MJ_APIKEY_PRIVATE);
    console.log("MJ_SENDER_EMAIL:", process.env.MJ_SENDER_EMAIL);
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  describe("sendEmail", () => {
    it("should send an email successfully", async () => {
      const testEmail = "dannybauman@gmail.com";
      const testName = "Test User";
      const subject = "Test Email from Firebase Function";
      const htmlContent =
        "<h1>This is a test email sent from a Firebase Function using Mailjet.</h1>";

      try {
        const result = await myFunctions.sendEmail(
          testEmail,
          testName,
          subject,
          htmlContent
        );
        expect(result).toEqual({ success: true });
      } catch (error) {
        fail(`Failed to send email: ${error}`);
      }
    }, 30000); // Increase timeout to 30 seconds as API calls might take longer

    it("should throw an error for invalid email", async () => {
      const invalidEmail = "invalid-email";
      await expect(
        myFunctions.sendEmail(
          invalidEmail,
          "Test User",
          "Test Subject",
          "<p>Test Content</p>"
        )
      ).rejects.toThrow(functions.https.HttpsError);
    });
  });
});
