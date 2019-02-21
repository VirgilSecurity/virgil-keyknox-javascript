const { join } = require('path');

module.exports = {
  preset: 'ts-jest',
  setupFilesAfterEnv: [join(__dirname, 'jest.setup.js')],
  testEnvironment: 'node',
};
