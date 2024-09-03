import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useToast } from '../../contexts/ToastContext';
import Form from '../common/Form';
import './Auth.css';

const Auth: React.FC = () => {
  const { showToast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (formData: { [key: string]: string }) => {
    const { email, password, username } = formData;

    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
      } else {
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      }

      const user = userCredential.user;

      if (isSignUp) {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            username: username || email.split('@')[0],
            email: user.email,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      showToast({
        message: isSignUp
          ? 'User registered successfully'
          : 'User signed in successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Authentication error:', error);
      showToast({
        message: `Authentication failed: ${(error as Error).message}`,
        type: 'error',
      });
    }
  };

  const fields = [
    { name: 'email', type: 'email', placeholder: 'Email', required: true },
    {
      name: 'password',
      type: 'password',
      placeholder: 'Password',
      required: true,
    },
    ...(isSignUp
      ? [{ name: 'username', type: 'text', placeholder: 'Username' }]
      : []),
  ];

  return (
    <div className="auth-container">
      <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
      <Form
        fields={fields}
        onSubmit={handleSubmit}
        submitButtonText={isSignUp ? 'Sign Up' : 'Sign In'}
        submitButtonClass="btn btn-primary"
      />
      <button className="auth-toggle" onClick={() => setIsSignUp(!isSignUp)}>
        {isSignUp
          ? 'Already have an account? Sign In'
          : "Don't have an account? Sign Up"}
      </button>
    </div>
  );
};

export default Auth;
