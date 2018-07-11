const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
    'node'
  ],
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
};
