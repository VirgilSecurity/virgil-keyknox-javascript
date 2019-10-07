const path = require('path');

const commonjs = require('rollup-plugin-commonjs');
const json = require('rollup-plugin-json');
const nodeResolve = require('rollup-plugin-node-resolve');
const { terser } = require('rollup-plugin-terser');
const typescript = require('rollup-plugin-typescript2');

const packageJson = require('./package.json');

const dependencies = Object.keys(packageJson.dependencies);
const peerDependencies = Object.keys(packageJson.peerDependencies);

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
    json({ compact: true }),
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
