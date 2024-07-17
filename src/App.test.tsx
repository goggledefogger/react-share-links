import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./hooks/useAuthUser', () => ({
  useAuthUser: () => ({
    user: null,
    profile: null,
    loading: false,
    error: null,
  }),
}));

test('renders without crashing', async () => {
  render(<App />);

  // Check for the main content
  expect(screen.getByText(/Share Links/i)).toBeInTheDocument();
});
