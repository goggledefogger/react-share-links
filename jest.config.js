// jest.config.js
module.exports = {
  roots: ['<rootDir>/src', '<rootDir>/functions/test'],
  // transform: {
  //   '^.+\\.tsx?$': 'ts-jest',
  // },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$', // Adjust if your test files use a different naming convention
  // moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Tell Jest to recognize TypeScript files
};
