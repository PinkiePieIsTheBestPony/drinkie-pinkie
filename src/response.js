import {createEmbeddedHelp} from './external-libs/discord.js';
import {getDerpibooruImage} from './external-libs/derpi.js';
import {send} from './post.js';
import {botGames} from './games.js';
import {randomNumber, decision, getPrompts} from './talk.js';
import {botPonkSearch} from './dailyponk.js';
import {join, leave, addToQueue, addPlaylistToQueue, removeFromQueue, clearQueue, showList, pause, next, prev} from './sound.js';
import {randomEdit, rotationEdit, rotationList, queryNew, queryList, queryRemove, queryEdit, channelEdit, channelDefaultEdit, filterEdit} from './rotationQuery.js';
import { prefix, yt_api_key } from './config.js';
import { selectAllStatementDB, insertStatementDB, updateStatementDB, removeStatementDB } from './db/dbQuery.js';
import { Permissions } from 'discord.js'
import { getLink } from './external-libs/twitter.js';
import fetch from 'node-fetch';
import { cronValidator } from './cron.js';

/**
 * This will check every message that Drinkie is sent and will terminate once either a valid message has been sent or 2 minutes has passed.
 * @private
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 * @param {object} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 */
function botMessage(msg, client) {
    msg.type.reply("Depreciated command! Try using the function through `/talk`. Thanks!")
}

async function botNewTalk(msg, client) {
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
    let jsonDBPrompts = await selectAllStatementDB("query_id, json_prompt", "p_prompts", null, null, null);
    for (let x = 0; x < jsonDBPrompts.length; x++) {
        let allCurrentPrompts = jsonDBPrompts[x].json_prompt.split(":")[1];
        if (allCurrentPrompts[x].toLowerCase().includes(msgPrompt.toLowerCase())) {
            msg.type.reply({ephemeral: true, content: "Exact prompt already exists!"});
            return;
        }
    }
    let valueMax = await selectAllStatementDB("MAX(QUERY_ID)", "p_prompts", null, null, null);
    
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
                    if (msg.content[i].match(IdRegx) == null) {
                        msg.type.reply({ephemeral: true, content: "Invalid trigger scope - valid scopes are `everyone`, `user`, `bot` or user IDs."});
                        return;
                    } else {
                        jsonResponse += '"' + msg.content[i] + '":' + '"' + msg.content[i+1] + '",';
                    }
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
    await insertStatementDB("p_prompts(query_id, json_prompt, json_response, submitted_by)", valueMax, jsonPrompt, jsonResponse, msg.author.id);
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
        msg.type.reply("GO AWAY")
    }
    else {
        try {
            let returnedImage = await getDerpibooruImage(msg.content, null, msg.channel.nsfw)
            if (returnedImage !== undefined) {
                send(returnedImage, true, msg, client, '', null, null);
            }
            else {
                msg.type.reply("Your query did not yield any results.");
            }
        } catch (response) {
            if (response == undefined) {
                msg.type.reply("Unknown error...")
            } else {
                msg.type.reply("Error! The network returned the following error code: " + response.status + " - " + response.statusText);
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
async function botSettingsEdit(msg) {
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

    let permissionValue = await selectAllStatementDB("permission_value", "p_permissions", ["server_id", "permission_functionality"], "=", [msg.guild.id, "0"]);
    let functionRole = await selectAllStatementDB("role_name", "p_permissions", ["server_id", "permission_functionality"], "=", [msg.guild.id, "0"]);
    let isOwner = msg.guild.ownerId === msg.author.id
    let roleSet = (functionRole !== "")
    let hasCustomRole = msg.member.roles.cache.some(role => role.name = functionRole);
    let isAdmin = msg.member.permissions.has([Permissions.FLAGS.ADMINISTRATOR]);
    let isMod = msg.member.permissions.has([Permissions.FLAGS.MANAGE_MESSAGES]);
    
    switch(permissionValue) {
        case '0':
            if (!isOwner) {
                msg.type.reply("Only owners can edit these queries.");
                return;
            }
            break;
        case '1':
            //code to check custom role
            if ((!hasCustomRole && roleSet) || !isOwner) {
                msg.type.reply("Only users with role:" + role + " or the owner can edit these queries.")
                return;
            }
            break;
        case '2':
            if (!isAdmin) {
                msg.type.reply("Only users with admin roles can edit these queries.")
                return;
            }
            break;
        case '3':
            if (!isMod) {
                msg.type.reply("Only users with the MANAGE_MESSAGE permission in a role can edit these queries.")
                return;
            }
            break;
        case '4':
            if ((!hasCustomRole && roleSet) || !isMod) {
                msg.type.reply("Only users with role:" + role + " or users with the MANAGE_MESSAGE permission can edit these queries.")
                return;
            }
            break;
        case '5':
            break;
    }

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

async function botSounds(msg) {
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

    let permissionValue = await selectAllStatementDB("permission_value", "p_permissions", ["server_id", "permission_functionality"], "=", [msg.guild.id, "1"]);
    let functionRole = await selectAllStatementDB("role_name", "p_permissions", ["server_id", "permission_functionality"], "=", [msg.guild.id, "1"]);
    let isOwner = msg.guild.ownerId === msg.author.id
    let roleSet = (functionRole !== "")
    let hasCustomRole = msg.member.roles.cache.some(role => role.name = functionRole);
    let isAdmin = msg.member.permissions.has([Permissions.FLAGS.ADMINISTRATOR]);
    let isMod = msg.member.permissions.has([Permissions.FLAGS.MANAGE_MESSAGES]);
    
    switch(permissionValue) {
        case '0':
            if (!isOwner) {
                msg.type.reply("Only owners can use these queue commands.");
                return;
            }
            break;
        case '1':
            //code to check custom role
            if ((!hasCustomRole && roleSet) || !isOwner) {
                msg.type.reply("Only users with role:" + role + " or the owner can use these queue commands.")
                return;
            }
            break;
        case '2':
            if (!isAdmin) {
                msg.type.reply("Only users with admin roles can use these queue commands.")
                return;
            }
            break;
        case '3':
            if (!isMod) {
                msg.type.reply("Only users with the MANAGE_MESSAGE permission in a role can use these queue commands.")
                return;
            }
            break;
        case '4':
            if ((!hasCustomRole && roleSet) || !isMod) {
                msg.type.reply("Only users with role:" + role + " or users with the MANAGE_MESSAGE permission can use these queue commands.")
                return;
            }
            break;
        case '5':
            break;
    }

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

async function botPermissions(msg) {
    let permissionFor = msg.content.split(" ")[0];
    let permissionTo = msg.content.split(" ")[1];
    let customRole = msg.content.split(" ").slice(2);

    let permissionValue = await selectAllStatementDB("permission_value", "p_permissions", ["server_id", "permission_functionality"], "=", [msg.guild.id, "2"]);
    let functionRole = await selectAllStatementDB("role_name", "p_permissions", ["server_id", "permission_functionality"], "=", [msg.guild.id, "2"]);
    let isOwner = msg.guild.ownerId === msg.author.id
    let roleSet = (functionRole !== "")
    let hasCustomRole = msg.member.roles.cache.some(role => role.name = functionRole);
    let isAdmin = msg.member.permissions.has([Permissions.FLAGS.ADMINISTRATOR]);
    let isMod = msg.member.permissions.has([Permissions.FLAGS.MANAGE_MESSAGES]);
    let dictModules = {0: "Query/Rotations", 1: "Sound Player", 2: "Permission Changing"}
    let dictPermissions = {0: "Owner", 1: "Exclusive Role", 2: "Admin", 3: "Mod", 4: "Role + Mods", 5: "Everyone"}

    switch(permissionValue) {
        case '0':
            if (!isOwner) {
                msg.type.reply("Only owners can change these permissions.");
                return;
            }
            break;
        case '1':
            //code to check custom role
            if ((!hasCustomRole && roleSet) || !isOwner) {
                msg.type.reply("Only users with role:" + functionRole + " or the owner can change these permissions.")
                return;
            }
            break;
        case '2':
            if (!isAdmin) {
                msg.type.reply("Only users with admin roles can change these permissions.")
                return;
            }
            break;
        case '3':
            if (!isMod) {
                msg.type.reply("Only users with the MANAGE_MESSAGE permission in a role can change these permissions.")
                return;
            }
            break;
        case '4':
            if ((!hasCustomRole && roleSet) || !isMod) {
                msg.type.reply("Only users with role:" + role + " or users with the MANAGE_MESSAGE permission can change these permissions.")
                return;
            }
            break;
        case '5':
            break;
    }

    if (msg.guild.roles.cache.some(role => role.name == customRole) && customRole !== "") {
        await updateStatementDB('p_permissions', 'role_name', ["permission_functionality", "server_id"], [customRole, permissionFor, msg.guild.id]);
        await updateStatementDB('p_permissions', 'permission_value', ["permission_functionality", "server_id"], [permissionTo, permissionFor, msg.guild.id]);
        msg.type.reply("The permission for " + dictModules[permissionFor] + " has been set to " + dictPermissions[permissionTo] + " with role " + customRole + ".");
        return;
    } else if (customRole !== "" && (permissionTo == 1 || permissionTo == 4)) {
        msg.type.reply("Could not find the role.");
        return;
    }

    await updateStatementDB('p_permissions', 'permission_value', ["permission_functionality", "server_id"], [permissionTo, permissionFor, msg.guild.id]);
    msg.type.reply("The permission for " + dictModules[permissionFor] + " has been set to " + dictPermissions[permissionTo] + ".")
}

async function botBroadcastChange(msg) {
    let broadcastStatus = msg.content.split(" ")[0];
    await updateStatementDB('p_broadcasts', 'broadcast_toggle', ['server_id'], [broadcastStatus, msg.guild.id]);
    let wordedStatus = (broadcastStatus == "0") ? "off" : "on"
    msg.type.reply("Change broadcasts have been turned " + wordedStatus + " for this server.")
}

function botTwitEmbed(msg) {
    let twitLink = msg.content.split(" ")[0];
    getLink(msg, twitLink)
}

async function botMediaFetch(msg) {
    let splitArgs = msg.content.trim().split(' ');
    const link = "https://www.googleapis.com/youtube/v3/";
    let latestVideos;
    if (splitArgs[2] != null) {
        const ytRegex = /\"externalId\":\"(.*?)\"/;
        let respYT = await fetch(splitArgs[2]).catch((error) => console.error(error));
        if (!respYT.ok) {return}
        let pageHTML = await respYT.text();
        let youtubeChannId = ytRegex.exec(pageHTML);
        if (youtubeChannId === null) {
            msg.type.reply("Youtube channel cannot be reached.");
            return;
        } else {
            let apiResultResp = await fetch(link + "channels?part=contentDetails&id=" + youtubeChannId[1] + "&key=" + yt_api_key).catch((error) => console.error(error));
            if (!apiResultResp.ok) {return}
            let apiResult = await apiResultResp.json();
            let userUploadsId = apiResult.items[0].contentDetails.relatedPlaylists.uploads;
            let latestVideosResp = await fetch(link + "playlistItems?part=snippet&playlistId=" + userUploadsId + "&maxResults=1&key=" + yt_api_key).catch((error) => console.error(error));
            if (!latestVideosResp.ok) {return}
            latestVideos = await latestVideosResp.json();
        }
    }
    switch (splitArgs[0]) {
        case "new": {
            let serverQueryId = await selectAllStatementDB("MAX(server_query_id)", "p_fetcher", ["server_id"], "=", [msg.guild.id]);
            serverQueryId ? serverQueryId++ : serverQueryId=1
            await insertStatementDB("p_fetcher(server_id, content, channel_link, latest_video, latest_vtime, server_query_id, channel_name)", msg.guild.id, splitArgs[1], splitArgs[2], latestVideos.items[0].snippet.resourceId.videoId, latestVideos.items[0].snippet.publishedAt, serverQueryId, latestVideos.items[0].snippet.channelTitle);
            msg.type.reply("New fetcher query has been added! **" + latestVideos.items[0].snippet.channelTitle + "'s** latest video is: https://youtube.com/watch?v=" + latestVideos.items[0].snippet.resourceId.videoId);
            break;
        }
        case "edit": {
            let retrievedId = await selectAllStatementDB("server_query_id", "p_fetcher", ["server_id"], "=", [msg.guild.id]);
            if (retrievedId == splitArgs[1]) {
                await updateStatementDB("p_fetcher", "channel_link", ["fetcher_id", "server_id"], [splitArgs[2], splitArgs[1], msg.guild.id]);
                await updateStatementDB("p_fetcher", "latest_video", ["fetcher_id", "server_id"], [latestVideos.items[0].snippet.resourceId.videoId, splitArgs[1], msg.guild.id]);
                await updateStatementDB("p_fetcher", "latest_vtime", ["fetcher_id", "server_id"], [latestVideos.items[0].snippet.publishedAt, splitArgs[1], msg.guild.id]);
                await updateStatementDB("p_fetcher", "channel_name", ["fetcher_id", "server_id"], [latestVideos.items[0].snippet.channelTitle, splitArgs[1], msg.guild.id])
                msg.type.reply("Fetcher query has been updated! **" + latestVideos.items[0].snippet.channelTitle + "'s** latest video is: https://youtube.com/watch?v=" + latestVideos.items[0].snippet.resourceId.videoId);
            }
            break;
        }
        case "remove": {
            let retrievedId = await selectAllStatementDB("server_query_id", "p_fetcher", ["server_id"], "=", [msg.guild.id]);
            if (retrievedId == splitArgs[1]) {
                await removeStatementDB("p_fetcher", ["server_id", "server_query_id"], [msg.guild.id, splitArgs[1]]);
                msg.type.reply("Fetcher query has been removed!");
            }
            break;
        }
        case "list": {
            let allServerFetchers = await selectAllStatementDB("server_query_id, content, channel_link, latest_video", "p_fetcher", ["server_id"], "=", [msg.guild.id]);
            if (allServerFetchers == '') {
                msg.type.reply({content: 'There are currently no fetchers in this server.'});
            } else {
                msg.type.reply({content: allServerFetchers.map((fetchData) => "FETCHER_ID: " + fetchData.server_query_id + ", FETCH_SOURCE: " + fetchData.content + ", CHANNEL: " + fetchData.channel_link + ", LINK: https://youtube.com/watch?v=" + fetchData.latest_video).toString()})
            }
        }
    }
}

async function botReminder(msg) {
    let serverSpecific = msg.content[0];
    let reminderText = msg.content[1];
    let schedule = msg.content[2];
    let reminderTo = msg.content[3];
    let reminderFrom = msg.content[4];

    if (!cronValidator(schedule)) {
        msg.type.reply({content: "Invalid cron query! Please try your command again with correct syntax.", ephemeral: true});
        return;
    }

    if (reminderTo == undefined) {
        reminderTo = null;
    }

    if (reminderFrom == undefined) {
        reminderFrom = null;
    } else {
        if (reminderFrom == 'true') {
            reminderFrom = "<@" + msg.author.id + ">";
        } else {
            reminderFrom = null;
        }
    }

    await insertStatementDB("p_reminder(server_id, server_reminder, reminder_text, schedule, reminder_from, reminder_to)", msg.guild.id, serverSpecific, reminderText, schedule, reminderFrom, reminderTo);

    msg.type.reply({content: "New reminder has been added!", ephemeral: true})
}

async function botJournal(msg) {
    let journalName = msg.content[0];
    let entry = msg.content[1];
    let part = msg.content[2];
    let chapter = msg.content[3];
    let page = msg.content[4];
    let journalTitle = msg.content[5];

    if (isNaN(part)) {
        msg.type.reply({content: "Please enter an integer number, to describe if a journal has been split into parts.", ephemeral: true});
        return;
    }

    if (chapter == undefined) {
        chapter = null;
    } else if (isNaN(chapter)) {
        msg.type.reply({content: "Please enter an integer number as the chapter - in case there are layers to this.", ephemeral: true});
        return;
    }

    if (page == undefined) {
        page = null;
    } else if (isNaN(page)) {
        msg.type.reply({content: "Please enter an integer number for the page. Writing a book maybe?", ephemeral: true});
        return;
    }

    if (journalTitle == undefined) {
        journalTitle = null;
    }
    
    await insertStatementDB("p_journal(user_id, journal_whole_name, journal_chapter, journal_page, journal_title, journal_entry, journal_part, time)", msg.author.id, journalName, chapter, page, journalTitle, entry, part, Date.now())

    msg.type.reply("New journal has been added!")
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
        [prefix + " sounds ", botSounds],
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
        ["talk", botNewTalk],
        ["permission", botPermissions],
        ["broadcast", botBroadcastChange],
        ["twitembed", botTwitEmbed],
        ["mediafetch", botMediaFetch],
        ["reminder", botReminder],
        ["journal", botJournal]
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
        ["talk", "scope"],
        ["permission", "permission_functionality"],
        ["broadcast", "toggle_broadcast"],
        ["twitembed", "link"],
        ["mediafetch", "content_type"],
        ["reminder", "server_specific"],
        ["journal", "journal_name"]
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
        ["scope", ['scope', 'prompt', 'who1', 'response1', 'who2', 'response2', 'who3', 'response3', 'who4', 'response4', 'who5', 'response5']],
        ["permission_functionality", ['permission_functionality', 'permission_number', 'role_name']],
        ["server_specific", ["server_specific", "reminder_text", "schedule", "reminder_to", "reminder_from"]],
        ["journal_name", ["journal_name", "entry", "part", "chapter", "page", "journal_title"]]
    ]);

    const mediafetch = new Map([
        ["new", ["content_type", "url"]],
        ["edit", ["fetch_id", "url"]],
        ["remove", ["fetch_id"]],
        ["list", null]
    ])
    
    const sounds = new Map([
        ["queue", {"join": "args", "leave": "args", "add": ["url", "args"], "addplaylist": ["playlistid", "args"], "remove": ["index", "args"], "clear": "args", "list": "args", "pause": "args", "next": "args", "prev": "args"}]
    ]);
    
    let functionName = responsesKeyPair.get(interaction.commandName);
    let name = optionNameKeyPair.get(interaction.commandName);
    let values = '';
    if (name == 'content_type') {
        values = [];
        let mediaDict = mediafetch.get(interaction.options.getSubcommand());
        values.push(interaction.options.getSubcommand());
        if (mediaDict !== null) {
            for (let i = 0; i < mediaDict.length; i++) {
                values.push(interaction.options.getString(mediaDict[i]));
            }
        }
        values = values.join(' ');
    } else if (name == 'sounds_choice') {
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
    } else if (name == 'game_choice' || name == 'search' || name == 'scope' || name == 'permission_functionality' || name == 'content_type' || name == 'server_specific' || name == 'journal_name') {
        values = [];
        let choicesDict = certainChoices.get(name);
        for (let i = 0; i < choicesDict.length; i++) {
            values.push(interaction.options.getString(choicesDict[i]));
        }
        if (name != 'scope' && name != 'journal_name' && name != 'server_specific') {values = values.join(' ');}
    } else if (name !== null) {
        values = interaction.options.getString(name);
    } 
    
    if (functionName) {
        functionName({content: values, channel: interaction.channel, type: interaction, author: interaction.member, guild: interaction.guild, member: interaction.member, client: interaction.client}, client);
    }
}