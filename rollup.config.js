const path = require('path');
const commonjs = require('rollup-plugin-commonjs');
const inject = require('rollup-plugin-inject');
const nodeGlobals = require('rollup-plugin-node-globals');
const resolve = require('rollup-plugin-node-resolve');
const typescript = require('rollup-plugin-typescript2');

const packageJson = require('./package.json');

const env = process.env.ENV;
const format = process.env.FORMAT;

const browser = 'browser';
const node = 'node';
const cjs = 'cjs';
const es = 'es';
const umd = 'umd';
const environment = {
  [browser]: {
    [cjs]: cjs,
    [es]: es,
    [umd]: umd,
  },
  [node]: {
    [cjs]: cjs,
    [es]: es,
  },
};

if (!environment[env]) {
  throw new TypeError(`'${env}' is not a valid environment`);
} else if (!environment[env][format]) {
  throw new TypeError(`'${format}' is not a valid module format for '${env}' environment`);
}

let external = Object.keys(packageJson.peerDependencies);
if (env !== umd) {
  external = external.concat(Object.keys(packageJson.dependencies));
}

module.exports = {
  external,
  input: path.join(__dirname, 'src', 'index.ts'),
  output: {
    format,
    file: `${packageJson.name}.${env}.${format}.js`,
    dir: path.join(__dirname, 'dist'),
    name: 'Keyknox',
    globals: {
      ['virgil-crypto']: 'VirgilCrypto',
      ['virgil-sdk']: 'Virgil',
    },
  },
  plugins: [
    format === umd && resolve({ browser: true }),
    typescript({
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/__mocks__/*.ts'],
      useTsconfigDeclarationDir: true,
    }),
    env === browser && nodeGlobals(),
    env === browser && inject({
      modules: {
        Buffer: ['buffer-es6', 'Buffer'],
      },
    }),
    format === umd && commonjs(),
  ],
};
