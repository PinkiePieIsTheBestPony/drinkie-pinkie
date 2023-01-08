import {dbConnect} from './db.js';
import {selectAllStatementDB, insertStatementDB} from './dbQuery.js';
import {getJSONFile} from '../json/jsonReader.js';

/**
 * Initialisation DB queries that need to be run, to ensure the necessary tables have been created.
 * @public
 */
export async function initialiseDB() {
    const dbStatements = getJSONFile('db.json');
    let statements = dbStatements["db"]["queries"]["create"];
    let numOfInit = Object.keys(statements).length;

    let dbCon = dbConnect();

    for (let i = 0; i < numOfInit; i++) {
        //dbCon.querySync(statements[i+1]);
        await dbCon.query(statements[i+1]);
    }

    const jsonCommands = getJSONFile('responses.json');
    let triggerMes = jsonCommands["response"]["msgLookFor"];
    let triggerMesStr = JSON.stringify(jsonCommands["response"]["msgLookFor"]);
    let responseMesStr = JSON.stringify(jsonCommands["response"]["msgRespondWith"]);
    triggerMesStr = triggerMesStr.substring(1, triggerMesStr.length-1);
    responseMesStr = responseMesStr.substring(1, responseMesStr.length-1);
    let getCounts = await selectAllStatementDB("COUNT(query_id)", "p_prompts", null, null, null);
    if (getCounts == 0) {
        let numOfResp = Object.keys(triggerMes).length;
        let triggerMesArr = triggerMesStr.split("\",")
        let responseMesArr = responseMesStr.split("},");
        for (let i = 0; i < numOfResp; i++) {
            await insertStatementDB("p_prompts(json_prompt, json_response, submitted_by)", triggerMesArr[i], responseMesArr[i], '113460834692268032');
        }
    }
    
    dbCon.end();
}