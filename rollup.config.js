const path = require('path');
const typescript = require('rollup-plugin-typescript2');

const packageJson = require('./package.json');

const env = process.env.NODE_ENV;

module.exports = {
  input: path.join(__dirname, 'src', 'index.ts'),
  external: Array.prototype.concat(
    Object.keys(packageJson.dependencies),
    Object.keys(packageJson.peerDependencies),
  ),
  output: {
    file: `${packageJson.name}.${env}.js`,
    format: env,
    dir: path.join(__dirname, 'dist'),
  },
  plugins: [
    typescript({
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/__mocks__/*.ts'],
      useTsconfigDeclarationDir: true,
    }),
  ],
};
