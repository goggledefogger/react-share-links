import * as functionsTest from "firebase-functions-test";
import * as myFunctions from "../src/index";
import * as functions from "firebase-functions";

const testEnv = functionsTest();

describe("Cloud Functions", () => {
  afterAll(() => {
    testEnv.cleanup();
  });

  describe("sendEmail", () => {
    it("should send an email successfully", async () => {
      const testEmail = "dannybauman@gmail.com";
      const testName = "Test User";
      const subject = "Test Email from Firebase Function";
      const templateContent = {
        heading: "This is a test email sent from a Firebase Function using Mailjet.",
        content: "This is the content of the test email.",
      };
      const templateId = functions.config().mailjet.test_template_id;

      try {
        const result = await myFunctions.sendEmail(
          testEmail,
          testName,
          subject,
          templateContent,
          templateId
        );
        expect(result).toEqual({ success: true });
      } catch (error) {
        fail(`Failed to send email: ${error}`);
      }
    }, 30000); // Increase timeout to 30 seconds as API calls might take longer

    it("should throw an error for invalid email", async () => {
      const invalidEmail = "invalid-email";
      const templateContent = {
        heading: "Test Subject",
        content: "Test Content",
      };
      const templateId = functions.config().mailjet.test_template_id;

      await expect(
        myFunctions.sendEmail(
          invalidEmail,
          "Test User",
          "Test Subject",
          templateContent,
          templateId
        )
      ).rejects.toThrow(functions.https.HttpsError);
    });
  });
});
