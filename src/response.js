import {createEmbeddedHelp} from './external-libs/discord.js';
import {getDerpibooruImage} from './external-libs/derpi.js';
import {send} from './post.js';
import {botGames} from './games.js';
import {randomNumber, decision, getPrompts} from './talk.js';
import {botPonkSearch} from './dailyponk.js';
import {join, leave, addToQueue, addPlaylistToQueue, removeFromQueue, clearQueue, showList, pause, next, prev} from './sound.js';
import {randomEdit, rotationEdit, rotationList, queryNew, queryList, queryRemove, queryEdit, channelEdit, channelDefaultEdit, filterEdit} from './rotationQuery.js';
import { prefix } from './config.js';
import {selectAllStatementDB, insertStatementDB} from './db/dbQuery.js';

/**
 * This will check every message that Drinkie is sent and will terminate once either a valid message has been sent or 2 minutes has passed.
 * @private
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 * @param {object} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 */
function botMessage(msg, client) {
    msg.type.reply("Depreciated command! Try using the function through `/talk`. Thanks!")
}

function botNewTalk(msg, client) {
    let msgScope = msg.content[0];
    let msgPrompt = msg.content[1];
    let IdRegx = /[0-9]{17,}/
    if (msgScope !== "all" && msgScope !== "this") {
        if (msgScope.includes(",")) {
            let serverIDArr = msgScope.split(",");
            for (let j = 0; j < serverIDArr.length; j++) {
                if (serverIDArr[j].match(IdRegx) == null) {
                    msg.type.reply({ephemeral: true, content: "Invalid message scope - valid scopes are `all`, `this` or server IDs."});
                    return;
                }
            }
        } else {
            msg.type.reply({ephemeral: true, content: "Invalid message scope - valid scopes are `all`, `this` or server IDs."});
            return;
        }
    }
    let jsonDBPrompts = selectAllStatementDB("query_id, json_prompt", "p_prompts", null, null, null);
    let allCurrentPrompts = jsonDBPrompts.split(",")[1].split('\n');
    for (let x = 0; x < allCurrentPrompts.length; x++) {
        if (allCurrentPrompts[x].toLowerCase().includes(msgPrompt.toLowerCase())) {
            msg.type.reply({ephemeral: true, content: "Exact prompt already exists!"});
            return;
        }
    }
    let valueMax = selectAllStatementDB("MAX(QUERY_ID)", "p_prompts", null, null, null);
    
    valueMax++;
    let jsonPrompt = '"' + valueMax + '":"' + msgPrompt + '"';
    let jsonResponse = '"' + valueMax + '":{';
    let i = 2;
    while (i < msg.content.length) {
        if (msg.content[i] !== null && msg.content[i+1] !== null) {
            if (msg.content[i] !== "everyone" && msg.content[i] != "user" && msg.content[i] !== "bot") {
                if (msg.content[i].includes(",")) {
                    let userIDArr = msg.content[i].split(",");
                    for (let k = 0; k < userIDArr.length; k++) {
                        if (msg.content[i].match(IdRegx) == null) {
                            msg.type.reply({ephemeral: true, content: "Invalid trigger scope - valid scopes are `everyone`, `user`, `bot` or user IDs."});
                            return;
                        } 
                    }
                    jsonResponse += '"' + msg.content[i] + '":' + '"' + msg.content[i+1] + '",';
                } else {
                    msg.type.reply({ephemeral: true, content: "Invalid trigger scope - valid scopes are `everyone`, `user`, `bot` or user IDs."});
                    return;
                }
            } else {
                jsonResponse += '"' + msg.content[i] + '":' + '"' + msg.content[i+1] + '",';
            }
        }
        i+=2;
    }
    if (msgScope === "this") {
        msgScope = msg.guild.id;
    }
    jsonResponse += '"msgForServer":"' + msgScope + '"}';
    insertStatementDB("p_prompts(query_id, json_prompt, json_response, submitted_by)", valueMax, jsonPrompt, jsonResponse, msg.author.id);
    msg.type.reply({ephemeral: true, content: "Message submitted!"});
}

/**
 * Calls function to get random Derpibooru image, depending on search parameters inputted by user. Will either send just a link or will download the image and send that.
 * @private
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 * @param {object} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 */
async function botGetImg(msg, client) {
    msg.channel.sendTyping();
    if (msg.content.includes("/") || msg.content.includes("\\") || msg.content.includes(";")) {
        msg.reply("GO AWAY")
    }
    else {
        try {
            let returnedImage = await getDerpibooruImage(msg.content, null, msg.channel.nsfw)
            if (returnedImage !== undefined) {
                send(returnedImage, true, msg, client, '', null, null);
            }
            else {
                msg.reply("Your query did not yield any results.");
            }
        } catch (response) {
            if (response == undefined) {
                msg.reply("Unknown error...")
            } else {
                msg.reply("Error! The network returned the following error code: " + response.status + " - " + response.statusText);
                console.log(response);
            }
        }
    }
}

/**
 * Replies with the relevant help embeded value
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
function botGetHelp(msg) {
    msg.type.reply({embeds: [createEmbeddedHelp(msg.content)]});
}

/**
 * Checks if user inputted value number, and will generate random number which is then sent to be decided on.
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
function botGetRndNum(msg) {
    let number = msg.content.replace(prefix + ' random ', '');
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
 * Checks input from user regarding settings for Drinkie and will call relevant function
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
function botSettingsEdit(msg) {
    const settingsKeyPair = new Map([
        ["random edit", randomEdit],
        ["rotation edit", rotationEdit],
        ["rotation list", rotationList],
        ["query new", queryNew],
        ["query list", queryList],
        ["query remove", queryRemove],
        ["query edit", queryEdit],
        ["channel edit", channelEdit],
        ["channel default", channelDefaultEdit],
        ["filter edit", filterEdit]
    ]);

    let functionName = settingsKeyPair.get(msg.content.split(' ').slice(0, 2).join(' '));
    msg.content = msg.content.split(' ').slice(2).join(' ');

    if (functionName) {
        functionName(msg);
    }
}

/**
 * Posts a response linking to the GitHub page for this bot. (very meta!!)
 * @private
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
function botSource(msg) {
    msg.type.reply("Here is the GitHub link! https://github.com/PinkiePieIsTheBestPony/drinkie-pinkie")
}

/**
 * Interesting algorithm which will take n arguments, and will assign each argument a random percentage value
 * @param {number} length Length of below array
 * @param {object} array Array that contains all the different arguments
 */
function randomStuff(length, array) {
    let totalRandom = 0;
    let arrayOfValues = [];
    for (let i = 0; i < length; i++) {
        let num = randomNumber(0, 101);
        totalRandom += num;
        arrayOfValues.push(num / length);
    }
    let c = ((length * 100) - totalRandom) / length / length;
    for (let j = 0; j < length; j++) {
        arrayOfValues[j] += c
    }
    return array.map((x, y) => "- " + x.trim() + ": " + +arrayOfValues[y].toFixed(3) + "%\n" )
}

/**
 * Checks input for a message and a variable number of options, and will return a message which will choice from one of these options.
 * @public
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
function botPredict(msg) {
    //let remainingArgs = msg.content.replace(prefix + ' predict ', '');
    let splitArgs = msg.content.trim().split(' ');
    let removedArgs = splitArgs.slice(1).join(' ').split("''");
    switch (splitArgs[0]) {
        case 'percentage': {
            if (splitArgs[1] === undefined) {
                msg.type.reply("You need the following argument:`''<question>''`");
            }
            else if (splitArgs[1].substr(0, 2) === "''") {
                if (removedArgs[1] !== undefined) {
                    msg.type.reply("Query: `" + removedArgs[1] + "`\n Drinkie has estimated there is a " + randomNumber(0, 101) + "% chance!" )
                } else {
                    msg.type.reply("Invalid syntax. Use 2 apostrophes independently `''` (not quotation mark) for the end of your message.")
                }
            } else {
                msg.type.reply("Invalid syntax. Use 2 apostrophes independently `''` (not quotation mark) for the start of your message.")
            }
            break;
        }
        case 'percentage-multiple': {
            if (splitArgs[1] === undefined || splitArgs[2] === undefined) {
                msg.type.reply("You need the following arguments:`''<question>'' <option1, option2>`");
            }
            else if (splitArgs[1].substr(0, 2) === "''") {
                if (removedArgs[2] !== undefined) {
                    let matchups = removedArgs[2].trim().split(",");
                    let arrayPercentages = randomStuff(matchups.length, matchups);
                    msg.type.reply("Question: `" + removedArgs[1] + "`\n Each of your options will be presented with a percentage:\n" + arrayPercentages.join(''))
                } else {
                    msg.type.reply("Invalid syntax. Use 2 apostrophes independently `''` (not quotation mark) for the end of your message.")
                }
            } else {
                msg.type.reply("Invalid syntax. Use 2 apostrophes independently `''` (not quotation mark) for the start of your message.")
            }
            break;
        }
        case 'option': {
            if (splitArgs[1] === undefined || splitArgs[2] === undefined) {
                msg.type.reply("You need the following arguments:`''<question>'' <option1, option2>`");
            }
            else if (splitArgs[1].substr(0, 2) === "''") {
                if (removedArgs[2] !== undefined) {
                    let matchups = removedArgs[2].trim().split(",");
                    msg.type.reply("Question: `" + removedArgs[1] + "`\n Choices are:\n" + matchups.map(x => "- " + x.trim() + "\n").join('') + "Drinkie has chosen: `" + matchups[randomNumber(0, matchups.length)].trim() + "`");
                } else {
                    msg.type.reply("Invalid syntax. Use 2 apostrophes independently `''` (not quotation mark) for the end of your message.")
                }
            } else {
                msg.type.reply("Invalid syntax. Use 2 apostrophes independently `''` (not quotation mark) for the start of your message.")
            }
            break;
        }
        default: {
            msg.type.reply("You have not selected a prediction mode! Choose between the following: `option, percentage, percentage-multiple`");
        }
    }
}

function botBroadcast(msg, client) {
    if (msg.channel.type === "DM") {
        if (msg.author.id === "113460834692268032") {
            let remainingArgs = msg.content.replace(prefix + ' broadcast ', '');
            let serverType = remainingArgs.trim().split(' ')[0];
            let message = remainingArgs.substr(remainingArgs.indexOf(' ')+1);
            if (serverType === "all") {
                send(null, false, null, client, message, null, null)
            } else if (/\d/.test(serverType)) {
                let servers = serverType.split(',');
                let server = [...client.guilds.cache.values()].filter((guild) => {
                    for (let i = 0; i < servers.length; i++) {
                        let server = servers[i];
                        if (guild.id === server) {
                            return guild.id;
                        }
                    }
                });
                if (server.length > 0) {
                    send(null, false, null, client, message, server, null)
                } else {
                    msg.reply("Invalid input.")
                }
            } else {
                msg.reply("Invalid input.")
            }
        } else {
            msg.reply("Not authorised!");
        }
    }
}

function botSounds(msg) {
    const optionKeyPair = new Map([
        ["queue join", join],
        ["queue leave", leave],
        ["queue add", addToQueue],
        ["queue addplaylist", addPlaylistToQueue],
        ["queue remove", removeFromQueue],
        ["queue clear", clearQueue],
        ["queue list", showList],
        ["queue pause", pause],
        ["queue next", next],
        ["queue prev", prev],
    ]);

    const optArgsList = ['notif'];
    const optionalArgs = {'notif': true};

    msg.content = msg.content.replace(/ --(.*?)=(true|false)/g, (matchedOpt, $1, $2) => {
        for (let i = 0; i < optArgsList.length; i++) {
            if (optArgsList[i]==$1 && ($2 === 'true' || $2 === 'false')) {
                switch ($1) {
                    case "notif": {
                        optionalArgs.notif = ($2 === 'true')
                        break;
                    }
                }
            };
        }
        return '';
    });

    let functionName = optionKeyPair.get(msg.content.split(' ').slice(0, 2).join(' '));
    msg.content = msg.content.split(' ').slice(2).join(' ');

    if (functionName) {
        functionName(msg, optionalArgs);
    }
}

/**
 * Checks input from user regarding commands for Drinkie and will call relevant function
 * @public
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
export const possibleResponses = (msg, client) => {
    const responsesKeyPair = new Map([
        [prefix + " msg ", botMessage],
        [prefix + " img ", botGetImg],
        [prefix + " help ", botGetHelp],
        [prefix + " random ", botGetRndNum],
        [prefix + " settings ", botSettingsEdit],
        [prefix + " game ", botGames],
        [prefix + " dailyponk ", botPonkSearch],
        [prefix + " source ", botSource],
        [prefix + " predict ", botPredict],
        [prefix + " broadcast ", botBroadcast],
        [prefix + " sounds ", botSounds]
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
        functionName({content: msg.content.split(' ').slice(2).join(' ') === '' ? null : msg.content.split(' ').slice(2).join(' '), channel: msg.channel, guild: msg.guild, author: msg.author, type: msg, member: msg.member, client: msg.client}, client);
    }
}

/**
 * Checks input from user regarding commands for Drinkie and will call relevant function
 * @public
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
export const possibleResponsesSlash = (interaction, client) => {
    const responsesKeyPair = new Map([
        ["msg", botMessage],
        ["img", botGetImg],
        ["help", botGetHelp],
        ["random", botGetRndNum],
        ["settings", botSettingsEdit],
        ["game", botGames],
        ["dailyponk", botPonkSearch],
        ["source", botSource],
        ["predict", botPredict],
        ["sounds", botSounds],
        ["talk", botNewTalk]
    ]);

    const optionNameKeyPair = new Map([
        ["msg", null],
        ["img", "query"],
        ["help", "help_choice"],
        ["random", "number"],
        ["settings", "setting_choice"],
        ["game", "game_choice"],
        ["dailyponk", "search"],
        ["source", null],
        ["predict", "predict"],
        ["sounds", "sounds_choice"],
        ["talk", "scope"]
    ]);

    const settings = new Map([
        ["query", {'list': null, 'new': 'args', 'edit': ['query_id', 'edited_query'], 'remove': 'id'}],
        ["rotation", {'list': null, 'edit': ['rotation_id', 'edited_rotation']}],
        ["channel", {'edit': ['query_id', 'channel_name'], 'default': 'default_channel'}],
        ["filter", {'edit': ['filter_query_id', 'filter_derpi_id']}],
    ]);

    const predict = new Map([
        ["percentage", ['question_percentage']],
        ["percentage-multiple", ['question_percentage_multiple', 'list_percentage']],
        ['option', ["question_option", "list_option"]]
    ]);

    const certainChoices = new Map([
        ["game_choice", ['game_choice', 'mention']],
        ["search", ['search', 'day']],
        ["scope", ['scope', 'prompt', 'who1', 'response1', 'who2', 'response2', 'who3', 'response3', 'who4', 'response4', 'who5', 'response5']]
    ]);
    
    const sounds = new Map([
        ["queue", {"join": "args", "leave": "args", "add": ["url", "args"], "addplaylist": ["playlistid", "args"], "remove": ["index", "args"], "clear": "args", "list": "args", "pause": "args", "next": "args", "prev": "args"}]
    ]);
    
    let functionName = responsesKeyPair.get(interaction.commandName);
    let name = optionNameKeyPair.get(interaction.commandName);
    let values = '';
    if (name == 'sounds_choice') {
        values = [];
        let soundsDict = sounds.get(interaction.options.getSubcommandGroup());
        let specificArgs = soundsDict[interaction.options.getSubcommand()];
        values.push(interaction.options.getSubcommandGroup(), interaction.options.getSubcommand());
        if (specificArgs !== null) {
            if (Array.isArray(specificArgs)) {
                for (let i = 0; i < specificArgs.length; i++) {
                    values.push(interaction.options.getString(specificArgs[i]));
                }
            } else {
                values.push(interaction.options.getString(specificArgs));
            }
        }
        values = values.join(' ')
    } else if (name == 'setting_choice') {
        values = [];
        let settingsDict = settings.get(interaction.options.getSubcommandGroup());
        let specificArgs = settingsDict[interaction.options.getSubcommand()];
        values.push(interaction.options.getSubcommandGroup(), interaction.options.getSubcommand());
        if (specificArgs !== null) {
            if (Array.isArray(specificArgs)) {
                for (let i = 0; i < specificArgs.length; i++) {
                    values.push(interaction.options.getString(specificArgs[i]));
                }
            } else {
                values.push(interaction.options.getString(specificArgs));
            }
        }
        values = values.join(' ')
    } else if (name == 'predict') {
        values = [];
        let predictDict = predict.get(interaction.options.getSubcommand());
        values.push(interaction.options.getSubcommand());
        for (let i = 0; i < predictDict.length; i++) {
            if (i === 0) {
                values.push("''" + interaction.options.getString(predictDict[i]) + "''");
            } else {
                values.push(interaction.options.getString(predictDict[i]));
            }
        }
        values = values.join(' ');
    } else if (name == 'game_choice' || name == 'search' || name == 'scope') {
        values = [];
        let choicesDict = certainChoices.get(name);
        for (let i = 0; i < choicesDict.length; i++) {
            values.push(interaction.options.getString(choicesDict[i]));
        }
        if (name != 'scope') {values = values.join(' ');}
    } else if (name !== null) {
        values = interaction.options.getString(name);
    } 
    
    if (functionName) {
        functionName({content: values, channel: interaction.channel, type: interaction, author: interaction.member, guild: interaction.guild, member: interaction.member, client: interaction.client}, client);
    }
}