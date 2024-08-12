import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LinkItem from './LinkItem';
import { getFunctions, httpsCallable } from 'firebase/functions';

jest.mock('firebase/functions');

describe('LinkItem Component', () => {
  const mockFetchLinkPreview = jest.fn();

  beforeEach(() => {
    (getFunctions as jest.Mock).mockReturnValue({});
    (httpsCallable as jest.Mock).mockReturnValue(mockFetchLinkPreview);
  });

  it('fetches and displays link preview', async () => {
    const mockPreviewData = {
      title: 'Test Title',
      description: 'Test Description',
      image: 'https://example.com/image.jpg',
      favicon: 'https://example.com/favicon.ico',
    };

    mockFetchLinkPreview.mockResolvedValue({ data: mockPreviewData });

    render(<LinkItem url="https://example.com" />);

    expect(screen.getByText('Loading preview...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByAltText('Preview')).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(screen.getByAltText('Favicon')).toHaveAttribute('src', 'https://example.com/favicon.ico');
    });
  });

  it('handles errors when fetching link preview', async () => {
    mockFetchLinkPreview.mockRejectedValue(new Error('Failed to fetch preview'));

    render(<LinkItem url="https://example.com" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load preview')).toBeInTheDocument();
    });
  });
});
