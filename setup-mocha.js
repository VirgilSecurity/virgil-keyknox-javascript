const dotenv = require('dotenv');
const { join } = require('path');

const { version } = require('./package.json');

dotenv.config();

process.env.KEY_ENTRIES_FOLDER = join(__dirname, '.virgil_key_entries');
process.env.PRODUCT_NAME = 'keyknox';
process.env.PRODUCT_VERSION = version;
