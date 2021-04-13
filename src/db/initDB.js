const db = require('./db');
const dbQuery = require('./dbQuery');
const reader = require('../json/jsonReader');

/**
 * Initialisation DB queries that need to be run, to ensure the necessary tables have been created.
 * @public
 */
const initialiseDB = () => {
    const dbStatements = reader.getJSONFile('db.json');
    let statements = dbStatements["db"]["queries"]["create"];
    numOfInit = Object.keys(statements).length;

    let dbCon = db.dbConnect();

    for (let i = 0; i < numOfInit; i++) {
        dbCon.querySync(statements[i+1]);
    }

    const jsonCommands = reader.getJSONFile('responses.json');
    let triggerMes = jsonCommands["response"]["msgLookFor"];
    let triggerMesStr = JSON.stringify(jsonCommands["response"]["msgLookFor"]);
    let responseMesStr = JSON.stringify(jsonCommands["response"]["msgRespondWith"]);
    triggerMesStr = triggerMesStr.substring(1, triggerMesStr.length-1);
    responseMesStr = responseMesStr.substring(1, responseMesStr.length-1);
    let getCounts = dbQuery.selectAllStatementDB("COUNT(query_id)", "p_prompts", null, null, null);
    if (getCounts == 0) {
        let numOfResp = Object.keys(triggerMes).length;
        let triggerMesArr = triggerMesStr.split("\",")
        let responseMesArr = responseMesStr.split("},");
        for (let i = 0; i < numOfResp; i++) {
            dbQuery.insertStatementDB("p_prompts(json_prompt, json_response, submitted_by)", triggerMesArr[i], responseMesArr[i], '113460834692268032');
        }
    }
    
    dbCon.end();
}

exports.initialiseDB = initialiseDB;