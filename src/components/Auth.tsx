import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useToast } from '../contexts/ToastContext';

const Auth: React.FC = () => {
  console.log('Auth render');

  const { showToast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
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

      await setDoc(
        doc(db, 'users', user.uid),
        {
          username: username || email.split('@')[0],
          email: user.email,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleInputChange}
          required
        />
        {isSignUp && (
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleInputChange}
            required
          />
        )}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>
      <button onClick={() => setIsSignUp(!isSignUp)} disabled={isLoading}>
        {isSignUp
          ? 'Already have an account? Sign In'
          : "Don't have an account? Sign Up"}
      </button>
    </div>
  );
};

export default Auth;
