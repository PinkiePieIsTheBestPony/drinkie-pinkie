const db = require('./db');

/**
 * DB insert query shortcuts
 * @param {string} insertTable Table to insert data into
 * @param {string[]} dbArgs Rest parameter which contains all arguments needed for insert DB statements
 */
const insertStatementDB = (insertTable, ...dbArgs) => {
    let dbCon = db.dbConnect();

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
const selectAllStatementDB = (selectColumns, table, whereColumn, equalsTo, whereAnswer) => {
    let allResults = '';
    let statement = '';
    let columnArray = selectColumns.split(", ");
    
    let dbCon = db.dbConnect();

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
const updateStatementDB = (table, setColumn, whereColumns, whereAnswers) => {
    let dbCon = db.dbConnect();

    statement = whereColumns.map((column, i) => i === (whereColumns.length-1) && i !== 0 ? " AND " + column + " = $" + (i+2) : column + " = $" + (i+2)).join("");
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
const removeStatementDB = (table, whereColumns, whereAnswers) => {
    let dbCon = db.dbConnect();

    let statement = whereColumns.map((column, i) => i === (whereColumns.length-1) && i !== 0 ? " AND " + column + " = $" + (i+1) : column + " = $" + (i+1)).join("");

    dbCon.querySync("DELETE FROM " + table + " WHERE " + statement, whereAnswers);
    
    dbCon.end();
}

/**
 * Insert DB query shortcuts
 * @public
 * @param {object} guild Represents Discord server (the server that Drinkie tries to initalise herself on)
 */
const insertGuildDetails = (guild) => {
    pQuery = "pinkie pie, safe, solo, !webm, score.gte:100";
    pRotation = "0 0/6 * * *";

    insertStatementDB("p_server(server_id, server_name, default_channel)", guild.id, guild.name, 'noChannelFoundForDrinkie');
    insertStatementDB("p_queries(search_query, channel_name, server_id, server_query_id)", pQuery, 'noChannelFoundForDrinkie', guild.id, 0);
    insertStatementDB("p_rotation(rotation, server_id, server_query_id)", pRotation, guild.id, 0);
}

exports.selectAllStatementDB = selectAllStatementDB;
exports.insertStatementDB = insertStatementDB;
exports.removeStatementDB = removeStatementDB;
exports.updateStatementDB = updateStatementDB;
exports.insertGuildDetails = insertGuildDetails;