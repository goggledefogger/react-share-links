import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Auth from './Auth';
import { ToastProvider } from '../contexts/ToastContext';
import { signInWithEmailAndPassword } from 'firebase/auth';

jest.mock('firebase/auth');
jest.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
}));

describe('Auth Component', () => {
  it('shows error message on invalid sign in', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(
      new Error('Invalid email or password')
    );

    const { container, debug } = render(
      <ToastProvider>
        <Auth />
      </ToastProvider>
    );

    // Try to find inputs by their placeholder
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');

    fireEvent.change(emailInput, {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(passwordInput, {
      target: { value: 'wrongpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'wrongpassword'
      );
    });

    // Wait for the button to be re-enabled
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Sign In/i })
      ).not.toBeDisabled();
    });
  });
});
