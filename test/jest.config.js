/** Jest config for monibase (unit + e2e). Run test/setup.ts before any tests. */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['**/test/unit/**/*.spec.ts', '**/test/e2e/**/*.e2e-spec.ts'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!**/*.module.ts', '!**/index.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
