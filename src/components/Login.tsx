// src/components/Login.tsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = formData.email;
    const password = formData.password;

    // const { email, password } = Object.fromEntries(formData);

    const response = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
  };

  return (
    <div>
      <h2>Sign In</h2>
      <div>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            name="email"
            onChange={handleInputChange}
          />
          <input
            type="password"
            placeholder="Password"
            name="password"
            onChange={handleInputChange}
          />
          <button type="submit">Sign In</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
