import pg from 'pg-native';
import { db_url } from '../config.js';

/**
 * Opens a new DB connection object
 * @private
 */
function openDB() {
    return new pg();
}

/**
 * Creates and connects the connection to the database
 * @public
 */
export const dbConnect = () => {
    let dbCon = openDB();
    dbCon.connectSync(db_url);
    return dbCon;
}
