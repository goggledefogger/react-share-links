import functionsTest from "firebase-functions-test";
import { fetchLinkPreview } from "../src/index";
import axios from "axios";

const test = functionsTest();

jest.mock("axios");

describe("fetchLinkPreview Firebase Function", () => {
  let wrapped: any;

  beforeAll(() => {
    wrapped = test.wrap(fetchLinkPreview);
  });

  afterAll(() => {
    test.cleanup();
  });

  it("fetches link preview successfully", async () => {
    const mockHtml = `
      <html>
        <head>
          <title>Test Title</title>
          <meta name="description" content="Test Description">
          <meta property="og:image" content="https://example.com/image.jpg">
          <link rel="icon" href="https://example.com/favicon.ico">
        </head>
        <body></body>
      </html>
    `;

    (axios.get as jest.Mock).mockResolvedValue({ data: mockHtml });

    const result = await wrapped({ url: "https://example.com" }, { auth: {} });

    expect(result).toEqual({
      title: "Test Title",
      description: "Test Description",
      image: "https://example.com/image.jpg",
      favicon: "https://example.com/favicon.ico",
    });
  });

  it("handles errors when fetching fails", async () => {
    (axios.get as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    await expect(
      wrapped({ url: "https://example.com" }, { auth: {} })
    ).rejects.toThrow("Failed to fetch link preview");
  });

  it("throws error for unauthenticated users", async () => {
    await expect(
      wrapped({ url: "https://example.com" }, { auth: null })
    ).rejects.toThrow("User must be authenticated to fetch link previews");
  });
});
