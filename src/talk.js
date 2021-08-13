const dbQuery = require('./db/dbQuery');

/**
 * Returns a random user object from within server Drinkie was triggered within
 * @private
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 * @param {object} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 */
 function getRandomUser(msg, client) {
    let guild = client.guilds.cache.get(msg.guild.id);
    return guild.members.cache.get([...guild.members.cache.keys()][Math.floor(Math.random() * guild.members.cache.size)])
}

/**
 * Responds to whoever triggered the prompt, which may be different for certain users for certain prompts
 * @private
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 * @param {object} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 * @param {JSON} receivedMsg Contains all responses to a prompt
 * @param {number} counter Index value (+1) of proper response string in JSON object
 * @param {string} clientPos Records where Drinkie was mentioned in message and will respond in the same format
 */
function botResponse(msg, client, receivedMsg, counter, clientPos) {
    user = 'user';
    responser = "<@!" + msg.author.id + ">";
    identifier = msg.author.id
    if (receivedMsg[counter+1]["msgForServer"] == "all" || receivedMsg[counter+1]["msgForServer"].includes(msg.guild.id)) {
        if (msg.author.bot) {
            user = 'bot';
            responser = identifier = msg.author.username;
        }
        if (receivedMsg[counter+1]["random"]) {
            let member = getRandomUser(msg, client);
            responser = "<@!" + member.id + ">"
            if (clientPos == "start") {
                msg.channel.send(responser + ", " + receivedMsg[counter+1]["random"]);
            } else {
                msg.channel.send(receivedMsg[counter+1]["random"] + ": " + responser);
            }
        } else if (receivedMsg[counter+1][identifier]) {
            if (clientPos == "start") {
                msg.channel.send(responser + " " + receivedMsg[counter+1][identifier]);
            } else {
                msg.channel.send(receivedMsg[counter+1][identifier] + " " + responser);
            }
        }
        else {
            if (receivedMsg[counter+1][user]) {
                if (clientPos == "start") {
                    msg.channel.send(responser + " " + receivedMsg[counter+1][user]);
                } else {
                    msg.channel.send(receivedMsg[counter+1][user] + " " + responser);
                }
            } else {
                if (clientPos == "start") {
                    msg.channel.send(responser + " " + receivedMsg[counter+1]["everyone"]);
                } else {
                    msg.channel.send(receivedMsg[counter+1]["everyone"] + " " + responser);
                }
            }
        }
    }
}

/**
 * Returns random number between min and max variables
 * @param {number} min Number to start randomly going from
 * @param {number} max Number to end randomly going to
 * @returns 
 */
const randomNumber = (min, max) => {
    return Math.floor(Math.random() * max) + min;
}

/**
 * Determines if guessed number equals Drinkie's randomly generated number. Users are checked through information in a DB table to determine if their guess is valid.
 * Will return a random prompt to trigger from the DB if they are equal.
 * Will otherwise update table values with the epoch time of when it was guessed (as well as setting 4 hour time limit.)
 * @private
 * @param {number} userNum User's number that was guessed
 * @param {number} botNum Drinkie's number that was randomly generated (through randomNumber() function above)
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
const decision = (userNum, botNum, msg) => {
    let users = dbQuery.selectAllStatementDB("user_id, date_guessed, cooldown_time", "p_guesses", null, null, null);
    let jsonDB = dbQuery.selectAllStatementDB("query_id, json_prompt", "p_prompts", null, null, null);
    let jsonDBResp = dbQuery.selectAllStatementDB("query_id, json_response", "p_prompts", null, null, null);
    let jsonDBArray = jsonDB.split('\n');
    let jsonDBArrayResp = jsonDBResp.split('\n').filter(a => a[1].includes(msg.guild.id) || a[1].includes("all"));
    let a = jsonDBArrayResp.length;
    let jsonResponse = '';
    for (let i = 0; i < jsonDBArray.length; i++) {
        let resultArray = jsonDBArray[i].replace(",", "¬").split("¬");
        jsonResponse += resultArray[1] + ", ";
    }
    jsonResponse = jsonResponse.slice(0, -2);
    let json = '{ "response": { "msgLookFor": {' + jsonResponse + ' } } }';
    let jsonObject = JSON.parse(json);
    let usersArray = users.split('\n');
    let sentMsg = jsonObject["response"]["msgLookFor"];
    //let numOfResp = Object.keys(sentMsg).length;
    let userExist = false;
    for (i = 0; i < usersArray.length; i++) {
        let usersArraySplit = usersArray[i].split(",");
        if (usersArraySplit[0] == msg.author.id) {
            userExist = true;
            let currentTime = Date.now();
            let cooldownMS = 3600000*usersArraySplit[2];
            if (currentTime - usersArraySplit[1] > cooldownMS) {
                let response = 'Your number was: "' + userNum + '" while mine was "' + botNum + '". \n';
                if (userNum == botNum) {
                    //promptNum = randomNumber(1, numOfResp);
                    promptNum = randomNumber(1, a)
                    let indexPromptNum = jsonDBArrayResp[0][a];
                    let authorID = dbQuery.selectAllStatementDB("submitted_by", "p_prompts", ["query_id"], "=", [indexPromptNum]);
                    msg.reply(response + "The number that you said or generated was the same as mine! Here is your random prompt: \"" + sentMsg[promptNum] + "\" which was provided by: <@!" + authorID + ">");
                }
                else {
                    msg.reply(response + "Too bad...the numbers were different. Try again in 4 hours.");
                    dbQuery.updateStatementDB("p_guesses", "date_guessed", ["user_id"], [currentTime, msg.author.id]);
                    dbQuery.updateStatementDB("p_guesses", "cooldown_time", ["user_id"], ["4", msg.author.id]);
                }
                
            }
            else {
                let totalTimeLeft = Number(usersArraySplit[1]) + Number(cooldownMS) - Number(currentTime);
                msg.reply("Your cooldown period has not ended yet. There are currently " + totalTimeLeft + " milliseconds left until you can use it again.");
            }
        }
    }
    if (!userExist) {
        dbQuery.insertStatementDB("p_guesses", msg.author.id, Date.now()-14400000, "4");
        let response = 'Your number was: "' + userNum + '" while mine was "' + botNum + '". \n';
        if (userNum == botNum) {
            promptNum = randomNumber(1, numOfResp);
            msg.reply(response + "The number that you said or generated was the same as mine! Here is your random prompt: " + sentMsg[promptNum]);
        }
        else {
            msg.reply(response + "Too bad...the numbers were different. Try again in 4 hours.");
            dbQuery.updateStatementDB("p_guesses", "date_guessed", ["user_id"], [Date.now(), msg.author.id]);
        }
    }
}

/**
 * Checks to determine if the message that was sent to Drinkie matches the valid syntax, and converts it into a JSON format to be inserted into the DB.
 * @private
 * @param {string} message Content of the message that had been sent
 * @param {object} messObj [Discord.js] Message object, generated based on message by user
 */
const jsonConvertor = (message, messObj) => {
    let regx = /p:\[all\] [? "[a-zA-Z0-9.,?!#$%\\/' ]+";( r\|"[a-zA-Z0-9 ]+": "[a-zA-Z0-9.,?!#$%\\/' ]+"(,,){0,}){1,}|p:\[this\] [? "[a-zA-Z0-9.,?!#$%\\/' ]+";( r\|"[a-zA-Z0-9 ]+": "[a-zA-Z0-9.,?!#$%\\/' ]+"(,,){0,}){1,}|\[(\d{16,},{0,}){1,}\] [? "[a-zA-Z0-9.,?!#$%\\/' ]+";( r\|"[a-zA-Z0-9 ]+": "[a-zA-Z0-9.,?!#$%\\/' ]+"(,,){0,}){1,}/;
    if (regx.test(message)) {
        //check if message is directed to all
        let promptStatus = '';
        if (message.includes("p:[this]")) {
            promptStatus = messObj.guild.id;
        } else {
            promptStatus = message.substring(3, message.indexOf("]"));
        }

        //get prompt
        let promptMes = message.split(';')[0];
        let valueMax = dbQuery.selectAllStatementDB("MAX(QUERY_ID)", "p_prompts", null, null, null);
        valueMax++;
        let prompt = '';
        if (message.includes("p:[")) {
            prompt = promptMes.substring(promptMes.indexOf("]") + 1).toLowerCase();
        }
        else {
            prompt = promptMes.substring(3).toLowerCase();
        }

        //get responses
        let responseMes = message.split(';')[1];
        let responses = responseMes.split(",,");
        let totalResponse = '';
        for (let i = 0; i < responses.length; i++) {
            user = responses[i].split(": ")[0].substring(3);
            message = responses[i].split(": ")[1]
            totalResponse += user + ":" + message + ",";
        }
        totalResponse += '"msgForServer": "' + promptStatus + '"';
        indexVal = "\"" + valueMax + "\":";
        // { "response": { "msgLookFor": { "1": "test" }, "msgRespondTo": { "1": "test", "2": test2 } } }
        let jsonPrompt = indexVal + prompt 
        let jsonResponse = indexVal + "{" + totalResponse + "}"
        dbQuery.insertStatementDB("p_prompts(query_id, json_prompt, json_response, submitted_by)", valueMax, jsonPrompt, jsonResponse, messObj.author.id);
        return true;
    } else {
        return false;
    }
}

/**
 * This loads all the prompts and will ensure that a user has entered a valid prompt in which Drinkie has a relevant response
 * @private
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 * @param {object} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 */
const getPrompts = (msg, client) => {
    //tupper comments are triggered by certain characters from their hosts, which are typically non alphabetic/numerical.
    //the regex checks if a comment mentioning drinkie has one of these "trigger" characters. drinkie will ignore the trigger comment and only respond to the tupper.
    regx = /^[a-zA-Z0-9]/;
    let jsonDB = dbQuery.selectAllStatementDB("json_prompt, json_response", "p_prompts", null, null, null);
    let jsonDBArray = jsonDB.split('\n');
    let jsonPrompt = '';
    let jsonResponse = '';
    
    //builds JSON object from values within DB
    for (let i = 0; i < jsonDBArray.length; i++) {
        let resultArray = jsonDBArray[i].split('", ');
        jsonPrompt += resultArray[0] + "\", ";
        jsonResponse += resultArray[1] + ", ";
    }
    jsonPrompt = jsonPrompt.slice(0, -2);
    jsonResponse = jsonResponse.slice(0, -2);
    let json = '{ "response": { "msgLookFor": {' + jsonPrompt + '}, "msgRespondWith": {' + jsonResponse + ' } } }';
    let jsonObject = JSON.parse(json);
    sentMsg = jsonObject["response"]["msgLookFor"];
    receivedMsg = jsonObject["response"]["msgRespondWith"];
    numOfResp = Object.keys(sentMsg).length;

    if (regx.test(msg.content) || msg.content.startsWith('<@')) {
        for (let i = 0; i < numOfResp; i++) {
            if (msg.content.toLowerCase().includes(sentMsg[i+1] + " <@!" + client.user.id + ">") || msg.content.toLowerCase().includes(sentMsg[i+1] + " <@" + client.user.id + ">")) {
                botResponse(msg, client, receivedMsg, i, "end");
            } else if (msg.content.toLowerCase().includes("<@!" + client.user.id + "> " + sentMsg[i+1]) || msg.content.toLowerCase().includes("<@" + client.user.id + "> " + sentMsg[i+1])) {
                botResponse(msg, client, receivedMsg, i, "start");
            }
            if (i == numOfResp-1) {
                match = false;
            }
        }
    }
}

exports.randomNumber = randomNumber;
exports.decision = decision;
exports.jsonConvertor = jsonConvertor;
exports.getPrompts = getPrompts;