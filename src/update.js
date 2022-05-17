import {dbConnect} from './db/db.js';

console.log("----START OF EXECUTION OF update.js----");
let dbCon = dbConnect();
dbCon.querySync("ALTER TABLE p_broadcasts ADD COLUMN broadcast_valid TEXT NOT NULL default '1'");
console.log("----END OF EXECUTION OF update.js----")