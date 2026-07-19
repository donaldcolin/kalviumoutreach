/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^test-renderer$': 'react-test-renderer',
  },
  // Don't try to transform native modules
  transformIgnorePatterns: [
    'node_modules/(?!(expo|expo-.*|@expo/.*|react-native.*|@react-native.*)/)',
  ],
};
