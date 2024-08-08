import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Auth from './Auth';
import { ToastProvider } from '../../contexts/ToastContext';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

jest.mock('firebase/auth');
jest.mock('../../lib/firebase', () => ({
  auth: {},
  db: {},
}));

// Mock ToastContext
const mockShowToast = jest.fn();
jest.mock('../../contexts/ToastContext', () => ({
  ...jest.requireActual('../../contexts/ToastContext'),
  useToast: () => ({ showToast: mockShowToast }),
}));

const renderAuth = () => {
  return render(
    <ToastProvider>
      <Auth />
    </ToastProvider>
  );
};

describe('Auth Component', () => {
  test('allows user to sign in', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: { uid: '123' },
    });

    renderAuth();

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
    });
  });

  test('allows user to switch to sign up mode and create account', async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: { uid: '123' },
    });

    renderAuth();

    fireEvent.click(screen.getByText("Don't have an account? Sign Up"));

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'newuser@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Username (optional)'), {
      target: { value: 'newuser' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'newuser@example.com',
        'newpassword123'
      );
    });
  });
});
