import {dbConnect} from './db.js';

/**
 * DB insert query shortcuts
 * @param {string} insertTable Table to insert data into
 * @param {string[]} dbArgs Rest parameter which contains all arguments needed for insert DB statements
 */
export const insertStatementDB = (insertTable, ...dbArgs) => {
    let dbCon = dbConnect();

    let argsNumbered = dbArgs.map((name, i) => "$"+(i+1)).join(",")
    
    dbCon.querySync("INSERT INTO " +  insertTable + " VALUES (" + argsNumbered + ")", dbArgs);

    dbCon.end();
}

/**
 * DB select query shortcuts
 * @param {string} selectColumns The columns you want to select to see information from
 * @param {string} table The specific table that these columns will exist on
 * @param {string} whereColumn Identification clarification to help determine which data will be selected (the specific column where the data is)
 * @param {string} equalsTo Relation between column and answer
 * @param {string} whereAnswer Identification clarification to help determine which data will be selected (the specific data necessary)
 */
export const selectAllStatementDB = (selectColumns, table, whereColumn, equalsTo, whereAnswer) => {
    let allResults = '';
    let statement = '';
    let columnArray = selectColumns.split(", ");
    
    let dbCon = dbConnect();

    if (whereColumn != null) {
        statement = ' WHERE ' + whereColumn.map((column, i) => i === 0 || column.length === 1 ? `${column} ${equalsTo} $${i+1} ` : `AND ${column} ${equalsTo} $${i+1}`).join("")
    }
    let dbResults = dbCon.querySync(`SELECT ${selectColumns} FROM ${table}${statement}`, whereAnswer)

    dbCon.end();

    for (var i = 0; i < dbResults.length; i++) {
        if (columnArray.length > 1) {
            for (let j = 0; j < columnArray.length; j++) {
                let resultColumn = columnArray[j];
                allResults += dbResults[i][resultColumn] + ", ";
            }
            allResults = allResults.slice(0, -2);
            allResults += "\n";
        }
        else {
            if (columnArray.toString().includes("MAX")) {
                allResults = dbResults[0].max;
            } else if (columnArray.toString().includes("COUNT")) {
                allResults = dbResults[0].count;
            } else {
                allResults = dbResults[i][columnArray];
            }
        }
    }

    if (columnArray.length > 1) {
        allResults = allResults.slice(0, -1);
    }

    return allResults;
}

/**
 * Update DB query shortcuts
 * @param {string} table The name of the table to update data from
 * @param {string} setColumn The specific column where data will be updated
 * @param {string} setAnswer The specific new information that will replace the old information
 * @param {string} whereColumn Identification clarification to help determine which data will be selected (the specific column where the data is)
 * @param {string} whereAnswer Identification clarification to help determine which data will be selected (the specific data necessary)
 */
export const updateStatementDB = (table, setColumn, whereColumns, whereAnswers) => {
    let dbCon = dbConnect();

    let statement = whereColumns.map((column, i) => i === (whereColumns.length-1) && i !== 0 ? " AND " + column + " = $" + (i+2) : column + " = $" + (i+2)).join("");
    dbCon.querySync("UPDATE " + table + " SET " + setColumn + " = $1 WHERE " + statement, whereAnswers)
    
    dbCon.end();
}

/**
 * Delete DB query shortcuts
 * @public
 * @param {string} table The name of the table to remove data from.
 * @param {string} whereColumn The specific column where data will be removed from.
 * @param {string} whereAnswer The identifier to help clarify which data will be removed
 */
export const removeStatementDB = (table, whereColumns, whereAnswers) => {
    let dbCon = dbConnect();

    let statement = whereColumns.map((column, i) => i === (whereColumns.length-1) && i !== 0 ? " AND " + column + " = $" + (i+1) : column + " = $" + (i+1)).join("");

    dbCon.querySync("DELETE FROM " + table + " WHERE " + statement, whereAnswers);
    
    dbCon.end();
}

/**
 * Insert DB query shortcuts
 * @public
 * @param {object} guild Represents Discord server (the server that Drinkie tries to initalise herself on)
 */
export const insertGuildDetails = (guild) => {
    let pQuery = "pinkie pie, safe, solo, !webm, score.gte:100";
    let pRotation = "0 0/6 * * *";

    let guildInfo = selectAllStatementDB("server_id", "p_server", ["server_id"], "=", [guild.id]);
    if (guildInfo !== guild.id) {
        insertStatementDB("p_server(server_id, server_name, default_channel)", guild.id, guild.name, 'noChannelFoundForDrinkie');
    }
    let queryInfo = selectAllStatementDB("server_id", "p_queries", ["server_id"], "=", [guild.id]);
    if (queryInfo !== guild.id) {
        insertStatementDB("p_queries(search_query, channel_name, server_id, server_query_id)", pQuery, 'noChannelFoundForDrinkie', guild.id, 0);
    }
    let rotationInfo = selectAllStatementDB("server_id", "p_rotation", ["server_id"], "=", [guild.id]);
    if (rotationInfo !== guild.id) {
        insertStatementDB("p_rotation(rotation, server_id, server_query_id)", pRotation, guild.id, 0);
    }
    let queueInfo = selectAllStatementDB("server_id", "p_queue", ["server_id"], "=", [guild.id]);
    if (queueInfo !== guild.id) {
        insertStatementDB("p_queue(server_id, queue_data)", guild.id, 'noDataFoundInQueue');
    }
    let permissionInfo = selectAllStatementDB("server_id", "p_permissions", ["server_id"], "=", [guild.id]);
    if (permissionInfo !== guild.id) {
        insertStatementDB("p_permissions(server_id, permission_functionality, permission_value)", guild.id, '0', '5');
        insertStatementDB("p_permissions(server_id, permission_functionality, permission_value)", guild.id, '1', '5');
        insertStatementDB("p_permissions(server_id, permission_functionality, permission_value)", guild.id, '2', '2');
    }
    let broadcastInfo = selectAllStatementDB("server_id", "p_broadcasts", ["server_id"], "=", [guild.id]);
    if (broadcastInfo !== guild.id) {
        insertStatementDB("p_broadcasts(server_id, broadcast_toggle, broadcast_valid)", guild.id, '0', '0');
    }
}