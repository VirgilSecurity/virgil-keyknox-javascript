const path = require('path');
const typescript = require('rollup-plugin-typescript2');

const packageJson = require('./package.json');

const env = process.env.NODE_ENV;

module.exports = {
  input: path.join(__dirname, 'src', 'index.ts'),
  external: Object.keys(packageJson.dependencies),
  output: {
    file: `${packageJson.name}.${env}.js`,
    format: env,
    dir: path.join(__dirname, 'dist'),
  },
  plugins: [
    typescript({ useTsconfigDeclarationDir: true }),
  ],
};
