import {dbConnect} from './db/db.js';

console.log("----START OF EXECUTION OF update.js----");
let dbCon = dbConnect();
await dbCon.query("UPDATE p_broadcasts SET broadcast_valid = '1';");
await dbCon.end();
console.log("----END OF EXECUTION OF update.js----")