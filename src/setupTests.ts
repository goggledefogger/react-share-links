import '@testing-library/jest-dom';

// Mock Firebase
const mockAuth = {
  onAuthStateChanged: jest.fn((callback) => {
    callback(null); // Simulate no user signed in
    return jest.fn(); // Return a mock unsubscribe function
  }),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
};

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => mockAuth),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
}));

// Provide a global TextDecoder
global.TextDecoder = require('util').TextDecoder;

// Suppress console.log and console.error in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
};
