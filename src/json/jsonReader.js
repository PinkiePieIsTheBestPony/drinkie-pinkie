import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Parses JSON files on filesystem
 * Use dotenv to determine whether system is on PROD or not, and change filesystem path from that
 * @public
 * @param {String} name JSON file name to grab
 */
export const getJSONFile = (name) => {
    return JSON.parse(fs.readFileSync(dirname(fileURLToPath(import.meta.url)) + '/' + name));
}