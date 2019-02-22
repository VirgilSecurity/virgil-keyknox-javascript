# Virgil Keyknox JavaScript SDK

[![npm](https://img.shields.io/npm/v/@virgilsecurity/keyknox.svg)](https://www.npmjs.com/package/@virgilsecurity/keyknox)
[![Build Status](https://img.shields.io/travis/VirgilSecurity/virgil-keyknox-javascript.svg)](https://travis-ci.org/VirgilSecurity/virgil-keyknox-javascript)
[![GitHub license](https://img.shields.io/badge/license-BSD%203--Clause-blue.svg)](https://github.com/VirgilSecurity/virgil-keyknox-javascript/blob/master/LICENSE)

[Introduction](#introduction) | [SDK Features](#sdk-features) | [Installation](#installation) | [Usage Example](#usage-example) | [Docs](#docs) | [Support](#support)

## Introduction
<a href="https://developer.virgilsecurity.com/docs"><img width="230px" src="https://cdn.virgilsecurity.com/assets/images/github/logos/virgil-logo-red.png" align="left" hspace="10" vspace="6"></a>[Virgil Security](https://virgilsecurity.com) provides an SDK which allows you to communicate with Virgil Keyknox Service.
Virgil Keyknox Service allows users to store their sensitive data (such as Private Key) encrypted (with end-to-end encryption) for using and sharing it between different devices.

## SDK Features
- use [Virgil Crypto library](https://github.com/VirgilSecurity/virgil-crypto-javascript)
- use [Virgil SDK](https://github.com/VirgilSecurity/virgil-sdk-javascript)
- upload encrypted sensitive data to Virgil Keyknox Service
- download the data from Virgil Keyknox Service
- update and synchronize the data

## Installation
You can install this module from npm. Another option is to add it via `script` tag in browser.

### npm
You will need to install `@virgilsecurity/keyknox`.
```sh
npm install @virgilsecurity/keyknox
```

You will also need to install `virgil-crypto` and `virgil-sdk` from npm.
```sh
npm install virgil-crypto virgil-sdk
```
> Note that minimum supported version of `virgil-crypto` is `3.0.0` and minimum supported version of `virgil-sdk` is `5.0.0`.

### In browser via `script` tag
You will need to add `@virgilsecurity/keyknox` script.
```html
<script src="https://unpkg.com/@virgilsecurity/keyknox/dist/keyknox.browser.umd.min.js"></script>
```

You will also need to add `virgil-crypto` and `virgil-sdk` scripts.
```html
<script src="https://unpkg.com/virgil-crypto/dist/virgil-crypto.browser.umd.min.js"></script>
<script src="https://unpkg.com/virgil-sdk/dist/virgil-sdk.browser.umd.min.js"></script>
```

Now you can use global variables `Keyknox`, `Virgil` and `VirgilCrypto` as namespace objects, containing all of `@virgilsecurity/keyknox`, `virgil-sdk` and `virgil-crypto` exports as properties.

## Usage Example
To begin using Virgil Keyknox SDK you'll need to initialize `SyncKeyStorage` class. This class is responsible for synchronization between device storage - IndexedDB in a browser or file system in Node.js - and Keyknox Cloud. In order to initialize `SyncKeyStorage` class you'll need the following values:
- `identity` of the user
- `accessTokenProvider` to provide access token for Virgil services
- `keyEntryStorage` to store data locally
- `privateKey` of current device/user
- `publicKeys` of all devices/users that should have access to data

```js
const { SyncKeyStorage } = require('@virgilsecurity/keyknox');

// Identity of the user
const identity = ...;

// Setup Access Token provider to provide access token for Virgil services
// Check https://github.com/VirgilSecurity/virgil-sdk-javascript
const accessTokenProvider = ...;

// Setup Key Entry Storage to store data locally
// Check https://github.com/VirgilSecurity/virgil-sdk-javascript
const keyEntryStorage = ...;

// Public keys of users that should have access to data
const publicKeys = ...;

// Private key of current user
const privateKey = ...;

const syncKeyStorage = SyncKeyStorage.create({
  identity,
  accessTokenProvider,
  keyEntryStorage,
  privateKey,
  publicKeys,
});
```
You can find a complete example of simple client-server application [here](example).

### What if I lost my private key?

If you lost your private key, you are not able to decrypt saved data anymore. So you need to reset your stored data in the Virgil Keyknox Service and start over.

```js
import { KeyknoxClient } from '@virgilsecurity/keyknox';

const tokenPromise = accessTokenProvider.getToken({ operation: 'delete' });
const resetPromise = tokenPromise.then(token => new KeyknoxClient().resetValue(token.toString()));
const syncKeyStorage = SyncKeyStorage.create(...);

resetPromise.then(() => syncKeyStorage.sync());
```

## Docs
Virgil Security has a powerful set of APIs, and the documentation below can get you started today.

* [Virgil Security Documentation](https://developer.virgilsecurity.com)

## License
This library is released under the [BSD 3-Clause License](LICENSE).

## Support
Our developer support team is here to help you. Find out more information on our [Help Center](https://help.virgilsecurity.com).

You can find us on [Twitter](https://twitter.com/VirgilSecurity) or send us email support@VirgilSecurity.com.

Also, get extra help from our support team on [Slack](https://virgilsecurity.com/join-community).
