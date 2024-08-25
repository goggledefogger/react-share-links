"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = require("path");
// Load environment variables from .env file
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, "../.env") });
const functionsTest = require("firebase-functions-test");
const myFunctions = require("../src/index");
const functions = require("firebase-functions");
const testEnv = functionsTest();
describe("Cloud Functions", () => {
    beforeAll(() => {
        // Log the environment variables to verify they're loaded
        console.log("MJ_APIKEY_PUBLIC:", process.env.MJ_APIKEY_PUBLIC);
        console.log("MJ_APIKEY_PRIVATE:", process.env.MJ_APIKEY_PRIVATE);
    });
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
            const templateId = process.env.MJ_TEST_TEMPLATE_ID || "your_test_template_id";
            try {
                const result = await myFunctions.sendEmail(testEmail, testName, subject, templateContent, templateId);
                expect(result).toEqual({ success: true });
            }
            catch (error) {
                fail(`Failed to send email: ${error}`);
            }
        }, 30000); // Increase timeout to 30 seconds as API calls might take longer
        it("should throw an error for invalid email", async () => {
            const invalidEmail = "invalid-email";
            const templateContent = {
                heading: "Test Subject",
                content: "Test Content",
            };
            const templateId = process.env.MJ_TEST_TEMPLATE_ID || "your_test_template_id";
            await expect(myFunctions.sendEmail(invalidEmail, "Test User", "Test Subject", templateContent, templateId)).rejects.toThrow(functions.https.HttpsError);
        });
    });
});
//# sourceMappingURL=index.test.js.map