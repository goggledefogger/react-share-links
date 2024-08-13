// src/components/LinkItem/LinkItem.test.tsx

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import LinkItem from "./LinkItem";
import { getFunctions, httpsCallable } from "firebase/functions";

jest.mock("firebase/functions");

describe("LinkItem Component", () => {
  const mockPreviewData = {
    title: "Test Title",
    description: "Test Description",
    image: "https://example.com/image.jpg",
    favicon: "https://example.com/favicon.ico",
  };

  const link = {
    id: "test-id",
    channelId: "test-channel-id",
    userId: "test-user-id",
    url: "https://example.com",
    createdAt: Date.now(),
    reactions: [],
    username: "test-username",
    preview: null, // Start with null preview
  };

  beforeEach(() => {
    (getFunctions as jest.Mock).mockReturnValue({
      httpsCallable: jest.fn((functionName) => {
        if (functionName === "fetchLinkPreview") {
          return jest.fn().mockResolvedValue({ data: mockPreviewData });
        }
        return jest.fn();
      }),
    });
  });

  it("fetches and displays link preview", async () => {
    render(
      <LinkItem
        link={link}
        onDelete={jest.fn()}
        onReact={jest.fn()}
        onRemoveReaction={jest.fn()}
      />
    );

    // Initially, the preview should be loading
    expect(screen.getByText("Preview not available")).toBeInTheDocument();

    // Wait for the preview data to be fetched and displayed
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Test Title" })
      ).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Link preview" })).toHaveAttribute(
        "src",
        "https://example.com/image.jpg"
      );
      expect(screen.getByRole("img", { name: "Favicon" })).toHaveAttribute(
        "src",
        "https://example.com/favicon.ico"
      );
    });
  });

});
