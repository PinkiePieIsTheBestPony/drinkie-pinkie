import {dbConnect} from './db/db.js';

console.log("----START OF EXECUTION OF update.js----");
let dbCon = dbConnect();
dbCon.querySync("UPDATE p_broadcasts SET broadcast_valid = '1';");
console.log("----END OF EXECUTION OF update.js----")