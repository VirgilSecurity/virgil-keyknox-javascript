const path = require('path');

const commonjs = require('rollup-plugin-commonjs');
const nodeResolve = require('rollup-plugin-node-resolve');
const replace = require('rollup-plugin-replace');
const { terser } = require('rollup-plugin-terser');
const typescript = require('rollup-plugin-typescript2');

const packageJson = require('./package.json');

const dependencies = Object.keys(packageJson.dependencies);
const peerDependencies = Object.keys(packageJson.peerDependencies);

const PRODUCT_NAME = 'keyknox';

const FORMAT = {
  CJS: 'cjs',
  ES: 'es',
  UMD: 'umd',
};

const sourcePath = path.join(__dirname, 'src');
const outputPath = path.join(__dirname, 'dist');

const createEntry = format => ({
  external: format === FORMAT.UMD ? peerDependencies : dependencies.concat(peerDependencies),
  input: path.join(sourcePath, 'index.ts'),
  output: {
    format,
    file: path.join(outputPath, `keyknox.${format}.js`),
    name: 'Keyknox',
    globals: {
      'virgil-sdk': 'Virgil',
    },
  },
  plugins: [
    replace({
      'process.env.PRODUCT_NAME': JSON.stringify(PRODUCT_NAME),
      'process.env.PRODUCT_VERSION': JSON.stringify(packageJson.version),
    }),
    format === FORMAT.UMD && nodeResolve({ browser: true, preferBuiltins: false }),
    format === FORMAT.UMD && commonjs(),
    typescript({
      exclude: ['**/*.test.ts'],
      useTsconfigDeclarationDir: true,
    }),
    terser(),
  ],
});

module.exports = Object.values(FORMAT).map(createEntry);
