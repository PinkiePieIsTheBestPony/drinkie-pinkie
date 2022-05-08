import {dbConnect} from './db/db.js';

console.log("----START OF EXECUTION OF update.js----");
let dbCon = dbConnect();
dbCon.querySync("CREATE TABLE IF NOT EXISTS p_permissions (permission_id SERIAL PRIMARY KEY, server_id TEXT NOT NULL, permission_functionality TEXT NOT NULL, permission_value TEXT NOT NULL, role_name TEXT, FOREIGN KEY(server_id) REFERENCES p_server(server_id));");
dbCon.querySync("CREATE TABLE IF NOT EXISTS p_broadcasts (broadcast_id SERIAL PRIMARY KEY, server_id TEXT NOT NULL, broadcast_toggle TEXT NOT NULL, FOREIGN KEY(server_id) REFERENCES p_server(server_id));")
dbCon.querySync("INSERT INTO p_broadcasts(server_id, broadcast_toggle) VALUES ('897559156045803591', '1');");
dbCon.end();
console.log("Action: Create p_permissions + p_broadcasts table.");
console.log("----END OF EXECUTION OF update.js----")