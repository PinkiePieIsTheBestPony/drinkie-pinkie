//import pg from 'pg-native';
import pkg from 'pg';
import { db_url } from '../config.js';
import url from 'url';

const { Pool } = pkg;

const params = url.parse(db_url);
const auth = params.auth.split(':');

const config = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1],
};

/**
 * Opens a new DB connection object
 * @private
 */
function openDB() {
    //return new pg();
    return new Pool(config);
}

/**
 * Creates and connects the connection to the database
 * @public
 */
export const dbConnect = () => {
    let dbCon = openDB();
    //dbCon.connectSync(db_url);
    return dbCon;
}
