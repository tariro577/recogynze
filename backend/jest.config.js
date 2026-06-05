/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  clearMocks: true,
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }]
  }
};
