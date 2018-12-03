/* eslint-disable import/no-extraneous-dependencies */
/* eslint-env jest */

const dotenv = require('dotenv');
const { join } = require('path');

dotenv.config();
process.env.KEY_ENTRIES_FOLDER = join(__dirname, '.virgil_key_entries');

jest.setTimeout(30000);
