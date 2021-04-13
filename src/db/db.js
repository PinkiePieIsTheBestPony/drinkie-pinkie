const pg = require('pg-native');
const { db_url } = require('../config');

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
const dbConnect = () => {
    let dbCon = openDB();
    dbCon.connectSync(db_url);
    return dbCon;
}

exports.dbConnect = dbConnect;