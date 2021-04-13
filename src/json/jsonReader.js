const fs = require('fs');
const { env_state } = require('../config');

/**
 * Parses JSON files on filesystem
 * Use dotenv to determine whether system is on PROD or not, and change filesystem path from that
 * @public
 * @param {String} name JSON file name to grab
 */
const getJSONFile = (name) => {
    return JSON.parse(fs.readFileSync(__dirname + '/' + name));
}

exports.getJSONFile = getJSONFile;