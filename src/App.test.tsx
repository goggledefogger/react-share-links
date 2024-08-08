import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { useAuthUser } from './hooks/useAuthUser';

// Mock the entire react-router-dom module
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('./hooks/useAuthUser');
jest.mock('./components/ChannelList/ChannelList', () => () => (
  <div>Channel List</div>
));
jest.mock('./components/Auth/Auth', () => () => <div>Auth Component</div>);

describe('App Component', () => {
  test('shows auth component when user is not logged in', () => {
    (useAuthUser as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<App />);

    expect(screen.getByText('Auth Component')).toBeInTheDocument();
  });

  test('shows channel list when user is logged in', () => {
    (useAuthUser as jest.Mock).mockReturnValue({
      user: { uid: '123', email: 'test@example.com' },
      profile: { username: 'testuser' },
      loading: false,
      signOutUser: jest.fn(),
    });

    render(<App />);

    expect(screen.getByText('Channel List')).toBeInTheDocument();
    expect(screen.getByText('Welcome, testuser')).toBeInTheDocument();
  });

  test('allows user to sign out', () => {
    const mockSignOut = jest.fn();
    (useAuthUser as jest.Mock).mockReturnValue({
      user: { uid: '123', email: 'test@example.com' },
      profile: { username: 'testuser' },
      loading: false,
      signOutUser: mockSignOut,
    });

    render(<App />);

    fireEvent.click(screen.getByText('Sign Out'));
    expect(mockSignOut).toHaveBeenCalled();
  });
});
