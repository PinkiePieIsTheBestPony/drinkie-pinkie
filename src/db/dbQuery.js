const db = require('./db');

/**
 * DB insert query shortcuts
 * @param {String} insertTable Table to insert data into
 * @param {Array} dbArgs Rest parameter which contains all arguments needed for insert DB statements
 */
const insertStatementDB = (insertTable, ...dbArgs) => {
    let dbCon = db.dbConnect();

    let varCounter = 1;
    let argsNumbered = dbArgs.map(function(name, i) {  
        return '$'+(i+varCounter);
    }).join(",")
    
    dbCon.querySync("INSERT INTO " +  insertTable + " VALUES (" + argsNumbered + ")", dbArgs);

    dbCon.end();
}

/**
 * DB select query shortcuts
 * @param {String} selectColumns The columns you want to select to see information from
 * @param {String} table The specific table that these columns will exist on
 * @param {String} whereColumn Identification clarification to help determine which data will be selected (the specific column where the data is)
 * @param {String} equalsTo Relation between column and answer
 * @param {String} whereAnswer Identification clarification to help determine which data will be selected (the specific data necessary)
 */
const selectAllStatementDB = (selectColumns, table, whereColumn, equalsTo, whereAnswer) => {
    let allResults = '';
    let whereArray = '';
    let columnArray = selectColumns.split(", ");

    if (whereColumn != null) {
        whereArray = whereColumn.split(", ");
    }
    
    let dbCon = db.dbConnect();
    let dbResults = '';
    
    if (whereArray.length == 1) {
        dbResults = dbCon.querySync("SELECT " + selectColumns + " FROM " + table + " WHERE " + whereColumn + " " + equalsTo + " $1", [whereAnswer])
    }
    else if (whereColumn != null) {
        dbResults = dbCon.querySync("SELECT " + selectColumns + " FROM " + table + " WHERE " + whereArray[0] + " " + equalsTo + " $1 AND " + whereArray[1] + " " + equalsTo + " $2", [whereAnswer[0], whereAnswer[1]])
    }
    else {
        dbResults = dbCon.querySync("SELECT " + selectColumns + " FROM " + table);
    }

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
 * @param {String} table The name of the table to update data from
 * @param {String} setColumn The specific column where data will be updated
 * @param {String} setAnswer The specific new information that will replace the old information
 * @param {String} whereColumn Identification clarification to help determine which data will be selected (the specific column where the data is)
 * @param {String} whereAnswer Identification clarification to help determine which data will be selected (the specific data necessary)
 */
const updateStatementDB = (table, setColumn, setAnswer, whereColumn, whereAnswer) => {
    let dbCon = db.dbConnect();

    if (Array.isArray(whereAnswer)) {
        let whereArray = whereColumn.split(", ");
        dbCon.querySync("UPDATE " + table + " SET " + setColumn + " = $1 WHERE " + whereArray[0] + " = $2 AND " + whereArray[1] + " = $3", [setAnswer, whereAnswer[0], whereAnswer[1]]);
    }
    else {
        dbCon.querySync("UPDATE " + table + " SET " + setColumn + " = $1 WHERE " + whereColumn + " = $2", [setAnswer, whereAnswer]);
    }
    
    dbCon.end();
}

/**
 * Delete DB query shortcuts
 * @public
 * @param {String} table The name of the table to remove data from
 * @param {String} whereColumn The specific column where data will be removed from
 * @param {String} whereAnswer The identifier to help clarify which data will be removed
 */
const removeStatementDB = (table, whereColumn, whereAnswer) => {
    let dbCon = db.dbConnect();

    let whereArray = whereColumn.split(", ");

    dbCon.querySync("DELETE FROM " + table + " WHERE " + whereArray[0] + " = $1 AND " + whereArray[1] + " = $2", [whereAnswer[0], whereAnswer[1]]);
    
    dbCon.end();
}

/**
 * Insert DB query shortcuts
 * @public
 * @param {Guild} guild Represents Discord server (the server that Drinkie tries to initalise herself on)
 */
const insertGuildDetails = (guild) => {
    pQuery = "pinkie pie, safe, solo, !webm, score.gte:100";
    pRotation = "0 0/6 * * *";

    insertStatementDB("p_server(server_id, server_name)", guild.id, guild.name);
    insertStatementDB("p_queries(search_query, server_id, server_query_id)", pQuery, guild.id, 0);
    insertStatementDB("p_rotation(rotation, server_id, server_query_id)", pRotation, guild.id, 0);
}

exports.selectAllStatementDB = selectAllStatementDB;
exports.insertStatementDB = insertStatementDB;
exports.removeStatementDB = removeStatementDB;
exports.updateStatementDB = updateStatementDB;
exports.insertGuildDetails = insertGuildDetails;