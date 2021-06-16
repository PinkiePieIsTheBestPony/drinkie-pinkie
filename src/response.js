const discord = require('./external-libs/discord.js')
const derpi = require('./external-libs/derpi');
const dbQuery = require('./db/dbQuery');
const cron = require('./cron');
const post = require('./post');
const game = require('./games');
const jsonRead = require('./json/jsonReader.js');

/**
 * Returns a random user object from within server Drinkie was triggered within
 * @private
 * @param {Message} msg [Discord.js] Message object, generated based on message by user
 * @param {Client} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 */
function getRandomUser(msg, client) {
    let guild = client.guilds.cache.get(msg.guild.id);
    return guild.members.cache.get([...guild.members.cache.keys()][Math.floor(Math.random() * guild.members.cache.size)])
}

/**
 * Responds to whoever triggered the prompt, which may be different for certain users for certain prompts
 * @private
 * @param {Message} msg [Discord.js] Message object, generated based on message by user
 * @param {Client} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 * @param {JSON} receivedMsg Contains all responses to a prompt
 * @param {int} counter Index value (+1) of proper response string in JSON object
 * @param {String} clientPos Records where Drinkie was mentioned in message and will respond in the same format
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

function randomNumber(min, max) {
    return Math.floor(Math.random() * max) + min;
}

/**
 * Determines if guessed number equals Drinkie's randomly generated number. Users are checked through information in a DB table to determine if their guess is valid.
 * Will return a random prompt to trigger from the DB if they are equal.
 * Will otherwise update table values with the epoch time of when it was guessed (as well as setting 4 hour time limit.)
 * @private
 * @param {int} userNum User's number that was guessed
 * @param {int} botNum Drinkie's number that was randomly generated (through randomNumber() function above)
 * @param {Message} msg [Discord.js] Message object, generated based on message by user
 */
function decision(userNum, botNum, msg) {
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
                    let authorID = dbQuery.selectAllStatementDB("submitted_by", "p_prompts", "query_id", "=", indexPromptNum);
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
 * @param {String} message Content of the message that had been sent
 * @param {Message} messObj [Discord.js] Message object, generated based on message by user
 */
function jsonConvertor(message, messObj) {
    let regx = /p:\[all\] [? "[a-zA-Z0-9.,?!#$%\\/' ]+";( r\|"[a-zA-Z0-9 ]+": "[a-zA-Z0-9.,?!#$%\\/' ]+"(,,){0,}){1,}|\[(\d{16,},{0,}){1,}\] [? "[a-zA-Z0-9.,?!#$%\\/' ]+";( r\|"[a-zA-Z0-9 ]+": "[a-zA-Z0-9.,?!#$%\\/' ]+"(,,){0,}){1,}/;
    if (regx.test(message)) {
        //check if message is directed to all
        let promptStatus = '';
        if (message.includes("p:[")) {
            promptStatus = message.substring(3, message.indexOf("]"));
        } else {
            promptStatus = messObj.guild.id;
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
 * @param {Message} msg [Discord.js] Message object, generated based on message by user
 * @param {Client} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 */
function getPrompts(msg, client) {
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

/**
 * This will check every message that Drinkie is sent and will terminate once either a valid message has been sent or 2 minutes has passed.
 * @private
 * @param {Message} msg [Discord.js] Message object, generated based on message by user
 * @param {Client} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 */
function botMessage(msg, client) {
    msg.author.send("Hi! Drinkie here, please enter your prompt...I'll be waiting :)").then(privateMsg => {
        let filter = m => (m.author.id != client.user.id);
        let collector = privateMsg.channel.createMessageCollector(filter, { time: 120000 } );
        let validResponse = false;

        collector.on('collect', m => {
            let response = jsonConvertor(m.content, msg);
            if (response) {
                validResponse = true;
                collector.stop();
            }
            else {
                m.channel.send("Invalid prompt! Try again?")
            }
        });

        collector.on('end', collected => {
            if (collected.size == 0) {
                msg.author.send("Timeout. Retrigger me to try again.");
            }
            else {
                if (validResponse) {
                    msg.author.send("Your prompt has been submitted!")
                }
                else {
                    msg.author.send("Unfortunately your inputs were invalid. Please retrigger me again.")
                }
            }
        });
    });
}

/**
 * Calls function to get random Derpibooru image, depending on search parameters inputted by user. Will either send just a link or will download the image and send that.
 * @private
 * @param {Message} msg [Discord.js] Message object, generated based on message by user
 * @param {Client} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 */
function botGetImg(msg, client) {
    msg.channel.startTyping();
    if (msg.content.includes("/") || msg.content.includes("\\") || msg.content.includes(";")) {
        msg.reply("GO AWAY")
    }
    else {
        derpi.getDerpibooruImage(msg.content, msg.channel.nsfw).then(({images}) => {
            if (Array.isArray(images) && images.length) {
                post.send(null, images[0], true, msg, client, '', null, null);
            }
            else {
                msg.reply("Your query did not yield any results.");
            }
        }).catch(({response}) => {
            if (response == undefined) {
                msg.channel.send("Unknown error...")
            } else {
                msg.channel.send("Error! The network returned the following error code: " + response.status + " - " + response.statusText);
            }
        });
    }
    msg.channel.stopTyping();
}

function botGetHelp(msg) {
    msg.reply(discord.createEmbeddedHelp(msg.content));
}

/**
 * Checks if user inputted value number, and will generate random number which is then sent to be decided on.
 * @private
 * @param {Message} msg Message object, generated based on message by user
 */
function botGetRndNum(msg) {
    let number = msg.content.replace('!dpi random ', '');
    if (!isNaN(number)) {
        if (number >= 1 && number <= 10) {
            botNum = randomNumber(1, 10);
            decision(number, botNum, msg);
        }
        else {
            msg.reply("Needs to be between 1 and 10. Please try command again with a valid number.")
        }
    }
    else {
        msg.reply("Not a number input. Please try command again with a valid number between 1 and 10.");
    }
}

/**
 * Editing of cooldown time for users.
 * @private
 * @param {Message} msg Message object, generated based on message by user
 */
function randomEdit(msg) {
    if (msg.author.id == "113460834692268032") {
        let remainingArguments = msg.content.replace('!dpi settings random ', '');
        let numberEnforce = remainingArguments.split(" ")[0];
        let userID = msg.mentions.users.first().id;
        dbQuery.updateStatementDB("p_guesses", "cooldown_time", ["user_id"], [numberEnforce, "user_id", userID]);
        msg.reply("Hi creator! I have changed the cooldown period for <@!" + userID + "> to " + numberEnforce + " hours.");
    } else {
        msg.reply("You are not the creator!")
    }
}

/**
 * Editing the timing of when images are posted by Drinkie (per server).
 * @private
 * @param {Message} msg Message object, generated based on message by user
 */
function rotationEdit(msg) {
    let remainingArguments = msg.content.replace('!dpi settings rotation edit ', '');
    let number = remainingArguments.substr(0, remainingArguments.indexOf(" "));
    let cronArguments = remainingArguments.substr(remainingArguments.indexOf(" ") + 1);
    if (!isNaN(number)) {
        let queryID = dbQuery.selectAllStatementDB("server_query_id", "p_queries", "server_query_id", "=", number);
        if (queryID !== '') {
            cronStatus = cron.cronValidator(cronArguments);
            if (cronStatus) {
                dbQuery.updateStatementDB("p_rotation", "rotation", ["server_id", "server_query_id"], [cronArguments, msg.guild.id, number]);
                msg.reply(cronStatus);
            }
            else {
                msg.reply("Invalid rotation syntax...")
            }
        }
        else {
            msg.reply("Rotation ID cannot be found.")
        }
    }
    else {
        msg.reply("ID is not a valid number.")
    }
}

/**
 * Displays the timing of when images are posted by Drinkie (per server).
 * @private
 * @param {Message} msg Message object, generated based on message by user
 */
function rotationList(msg) {
    let allValues = dbQuery.selectAllStatementDB("server_query_id, rotation", "p_rotation", "server_id", "=", msg.guild.id);
    let arrayRotation = allValues.split('\n');
    let messageResponse = '';

    if (allValues == '') {
        messageResponse = 'There are current no queries in this server.'
    } else {
        for (let i = 0; i < arrayRotation.length; i++) {
            let rotationID = arrayRotation[i].split(', ')[0];
            let rotation = arrayRotation[i].split(', ').slice(1).join(', ');
            messageResponse += "query_id: " + rotationID + ", QUERY_STRING: " + rotation + "\n";
        }
    }

    msg.channel.send(messageResponse);
}

/**
 * Add an entirely new query that drinkie will periodically post, based on derpi arguments added by user. By default sent every 6 hours.
 * @private
 * @param {Message} msg Message object, generated based on message by user
 */
function queryNew(msg) {
    let query = msg.content.replace('!dpi settings query new ', '');

    let maxNumber = dbQuery.selectAllStatementDB("MAX(server_query_id)", "p_queries", null, null, null);
    let botChannel = msg.guild.channels.cache.find(channel => channel.name.includes("bot"));
    if (botChannel === undefined) {
        botChannel = "noChannelFoundForDrinkie"
    }
    
    dbQuery.insertStatementDB("p_queries(search_query, channel_name, server_id, server_query_id)", query, botChannel, msg.guild.id, Number(maxNumber) + 1);
    dbQuery.insertStatementDB("p_rotation(rotation, server_id, server_query_id)", "0 0/6 * * *", msg.guild.id, Number(maxNumber) + 1);

    msg.reply("Query has been added!")
}

/**
 * Displays all queries that are currently being posted on the server (per server).
 * @private
 * @param {Message} msg Message object, generated based on message by user
 */
function queryList(msg) {
    let allValues = dbQuery.selectAllStatementDB("server_query_id, channel_name, search_query", "p_queries", "server_id", "=", msg.guild.id);
    let arrayQuery = allValues.split('\n');
    let messageResponse = '';

    if (allValues == '') {
        messageResponse = 'There are currently no queries in this server.'
    } else {
        for (let i = 0; i < arrayQuery.length; i++) {
            let queryID = arrayQuery[i].split(', ')[0];
            let channelName = arrayQuery[i].split(', ')[1];
            let query = arrayQuery[i].split(', ').splice(2).join(', ');
            messageResponse += "query_id: " + queryID + ", QUERY_STRING: " + query + ", QUERY_CHANNEL: " + channelName + "\n";
        }
    }

    msg.channel.send(messageResponse);
}

/**
 * Removes a query that you specify. This will also delete the associated rotation timing data (per server).
 * @private
 * @param {Message} msg Message object, generated based on message by user
 */
function queryRemove(msg) {
    let number = msg.content.replace('!dpi settings query remove ', '');
    if (!isNaN(number)) {
        let queryID = dbQuery.selectAllStatementDB("server_query_id", "p_queries", "server_query_id", "=", number);
        if (queryID !== '') {
            dbQuery.removeStatementDB("p_queries", ["server_id", "server_query_id"], [msg.guild.id, number]);
            dbQuery.removeStatementDB("p_rotation", ["server_id", "server_query_id"], [msg.guild.id, number]);
            msg.reply("Query schedule has been removed.")
        }
        else {
            msg.reply("Query ID cannot be found.")
        }
    }
    else {
        msg.reply("ID is not a valid number.")
    }
}

/**
 * Edit the query that drinkie uses to fetch an image (per server).
 * @private
 * @param {Message} msg Message object, generated based on message by user
 */
function queryEdit(msg) {
    let remainingArgs = msg.content.replace('!dpi settings query edit ', '');
    let number = remainingArgs.substr(0, remainingArgs.indexOf(" "));
    let queryList = remainingArgs.substr(remainingArgs.indexOf(" ") + 1).split(",");
    if (!isNaN(number)) {
        let numberExists = dbQuery.selectAllStatementDB("server_query_id", "p_queries", "server_query_id", "=", number);
        if (numberExists !== false) {
            dbQuery.updateStatementDB("p_queries", "search_query", ["server_id", "server_query_id"], [queryList, msg.guild.id, number]);
            msg.reply("Image schedule ID:" + number + " query has been updated.")
        }
        else {
            msg.reply("Query ID cannot be found.")
        }
    }
    else {
        msg.reply("ID is not a valid number.")
    }
}

function channelEdit(msg) {
    let remainingArgs = msg.content.replace('!dpi settings channel edit ', '');
    let number = remainingArgs.substr(0, remainingArgs.indexOf(" "));
    let channelName = remainingArgs.substr(remainingArgs.indexOf(" ") + 1);
    if (!isNaN(number)) {
        let numberExists = dbQuery.selectAllStatementDB("server_query_id", "p_queries", "server_query_id", "=", number);
        if (numberExists !== false) {
            let channelId = msg.guild.channels.cache.find(channel => channel.name === channelName);
            if (channelId !== undefined) {
                dbQuery.updateStatementDB("p_queries", "channel_name", ["server_id", "server_query_id"], [channelId, msg.guild.id, number]);
                msg.reply("Image schedule ID:" + number + " channel has been updated.")
            } else {
                msg.reply("Channel name cannot be found.")
            }
        }
        else {
            msg.reply("Query ID cannot be found.")
        }
    }
    else {
        msg.reply("ID is not a valid number.")
    }
}

function searchForDrinkie(searchType, searchValue, msg) {
    let fileJSON = jsonRead.getJSONFile("dailyponk.json");
    if (!isNaN(searchValue)) {
        let d = new Date("2019-08-12");
        d.setDate(d.getDate() + parseInt(searchValue));
        searchValue = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();  
    }
    let jsonResult = fileJSON["drinkiepic"][searchType][searchValue];
    msg.reply(jsonResult["link"]);
}

function drinkieCount(msg) {
    let driValQuery = msg.content.replace('!dpi dailyponk ', '');
    let driValArr = driValQuery.split(" ");
    if (driValArr.length == 2) {
        let driValType = driValArr[0];
        let driValString = driValArr[1];
        if (driValString.includes("-")) {
            let splitVals = driValString.split("-");
            if (splitVals.length == 3) {
                let dateDri = new Date(driValString);
                const firstDay = new Date("2019-08-13")
                const lastDay = new Date("2020-08-12");
                const bonusDays = [new Date("2019-10-11"), new Date("2019-10-12"), new Date("2019-10-31"), new Date("2019-11-02"), new Date("2019-11-08"), new Date("2019-11-09"), new Date("2019-28-10"), new Date("2020-03-21")] 
                if (firstDay <= dateDri && lastDay >= dateDri) {
                    if (Boolean(+dateDri) && dateDri.getFullYear() == splitVals[0] && driValType == "day") {
                        searchForDrinkie(driValType, dateDri, msg);
                    }
                    else if (driValType == "bonuses" && bonusDays.find(bonusDay => { return bonusDay.getTime() == dateDri.getTime() })) {
                        searchForDrinkie(driValType, dateDri, msg);
                    }
                    else {
                        msg.reply("Invalid date range...")
                    }
                }
                else {
                    msg.reply("Invalid date range...")
                }
            }
            else {
                msg.reply("Invalid date...")
            }
        }
        else if (driValString == "random") {
            let indexDri;
            if (driValType == "day") {
                indexDri = Math.floor(Math.random() * 366 + 1);
                searchForDrinkie(driValType, indexDri, msg);
            } else if (driValType == "bonuses") {
                indexDri = Math.floor(Math.random() * 8);
                const vals = [60, 61, 77, 80, 82, 88, 89, 222];
                indexDri = vals[indexDri];
                searchForDrinkie(driValType, indexDri, msg);
            } else {
                msg.reply("Invalid type of value!")
            }
        } 
        else {
            if (!isNaN(driValString)) {
                const vals = [60, 61, 77, 80, 82, 88, 89, 222];
                if (driValString <= 366 && driValType == "day") {
                    searchForDrinkie(driValType, driValString, msg);
                }
                else if (vals.indexOf(parseInt(driValString)) != -1 && driValType == "bonuses") {
                    searchForDrinkie(driValType, driValString, msg);
                }
                else {
                    msg.reply("Invalid index number!")
                }
            }
            else {
                msg.reply("Number you have entered is not a number!")
            }
        }
    }
    else {
        msg.reply("Number of arguments is wrong!")
    }
}

/**
 * Checks input from user regarding settings for Drinkie and will call relevant function
 * @private
 * @param {Message} msg Message object, generated based on message by user
 */
function botSettingsEdit(msg) {
    settingsKeyPair = new Map([
        ["random edit", randomEdit],
        ["rotation edit", rotationEdit],
        ["rotation list", rotationList],
        ["query new", queryNew],
        ["query list", queryList],
        ["query remove", queryRemove],
        ["query edit", queryEdit],
        ["channel edit", channelEdit]
    ]);

    let functionName = settingsKeyPair.get(msg.content.split(' ').slice(2, 4).join(' '));
    if (functionName) {
        functionName(msg)
    }
}

/**
 * Checks input from user regarding games that Drinkie can play and will attempt to play it.
 * @private
 * @param {Message} msg Message object, generated based on message by user
 */
function botGames(msg) {
    let remainingArgs = msg.content.replace('!dpi game ', '');
    //!dpi game tictactoe <user>
    if (remainingArgs.startsWith("tictactoe <")) {
        let player1 = msg.author.id;
        let player2 = msg.mentions.users.first().id;
        let gameState = false;
        //message
        if (!msg.author.bot && !msg.mentions.users.first().bot) {
            msg.channel.send("<@!" + player1 + "> has issued a tic-tac-toe game with <@!" + player2 + ">. Do you accept this match? Y/N")
            const player2Filter = m => m.author.id == player2
            const collector = msg.channel.createMessageCollector(player2Filter, { time: 60000 });

            collector.on('collect', m => {
                if (m.content.toLowerCase() == "y") {
                    gameState = true;
                    collector.stop();
                }
                else if (m.content.toLowerCase() == "n") {
                    collector.stop();
                }
            });

            collector.on('end', m => {
                if (gameState) {
                    msg.channel.send("Matchup accepted!").then(() => game.init("tictactoe", [player1,player2], msg));
                }
                else {
                    msg.channel.send("Matchup declined!");
                }
            });
        }
        else {
            msg.reply("Sorry, no bots or tups are allowed to play (Discord Limitations).")
        }
    }
}

function botSource(msg) {
    msg.reply("Here is the GitHub link! https://github.com/PinkiePieIsTheBestPony/drinkie-pinkie")
}

/**
 * Checks input from user regarding commands for Drinkie and will call relevant function
 * @public
 * @param {Message} msg Message object, generated based on message by user
 */
const possibleResponses = (msg, client) => {
    responsesKeyPair = new Map([
        ["!dpi msg ", botMessage],
        ["!dpi img ", botGetImg],
        ["!dpi help ", botGetHelp],
        ["!dpi random ", botGetRndNum],
        ["!dpi settings ", botSettingsEdit],
        ["!dpi game ", botGames],
        ["!dpi dailyponk ", drinkieCount],
        ["!dpi source ", botSource]
    ]);

    if (msg.mentions.has(client.user)) {
        getPrompts(msg, client);
    } else if (msg.author.bot) {return}

    //gets first two words of message to check which command it is trying to check
    let msgArr = msg.content.split(' ').slice(0, 3);
    let command = msg.content;
    if (msgArr.length > 2) {
        msgArr.splice(-1, 1, "")
        command = msgArr.join(' ')
    } else {
        command = command + " ";
    }
    
    let functionName = responsesKeyPair.get(command);
    if (functionName) {
        functionName(msg, client);
    }
}

exports.possibleResponses = possibleResponses;