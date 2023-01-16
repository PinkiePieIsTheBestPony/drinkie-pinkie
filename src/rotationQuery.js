import {selectAllStatementDB, insertStatementDB, updateStatementDB, removeStatementDB} from './db/dbQuery.js';
import {cronValidator} from './cron.js';

function validateNumber(numToValidate) {
    return parseInt(numToValidate, 10);
}

/**
 * Editing of cooldown time for users.
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
export async function randomEdit(msg) {
    if (msg.member.hasPermission('ADMINISTRATOR')) {
        let numberEnforce = validateNumber(remainingArguments.split(" ")[0]);
        let userID = msg.mentions.users.first().id;
        await updateStatementDB("p_guesses", "cooldown_time", ["user_id"], [numberEnforce, "user_id", userID]);
        msg.type.reply("I have changed the cooldown period for <@!" + userID + "> to " + numberEnforce + " hours.");
    } else {
        msg.type.reply("You are not an admin!")
    }
}

/**
 * Editing the timing of when images are posted by Drinkie (per server).
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
export async function rotationEdit(msg) {
    let number = validateNumber(msg.content.substr(0, msg.content.indexOf(" ")));
    let cronArguments = msg.content.substr(msg.content.indexOf(" ") + 1);
    if (!isNaN(number)) {
        let queryID = await selectAllStatementDB("server_query_id", "p_queries", ["server_id", "server_query_id"], "=", [msg.guild.id, number]);
        if (queryID !== '') {
            let cronStatus = cronValidator(cronArguments);
            if (cronStatus) {
                await updateStatementDB("p_rotation", "rotation", ["server_id", "server_query_id"], [cronArguments.split(' ').map((x, i) => i >= 3 && !isNaN(x) ? x-1 : x).join(' '), msg.guild.id, number]);
                msg.type.reply(cronStatus);
            }
            else {
                msg.type.reply("Invalid rotation syntax...")
            }
        }
        else {
            msg.type.reply("Rotation ID cannot be found.")
        }
    }
    else {
        msg.type.reply("ID is not a valid number, or wrong number of arguments found.")
    }
}

/**
 * Displays the timing of when images are posted by Drinkie (per server).
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
export async function rotationList(msg) {
    let allValues = await selectAllStatementDB("server_query_id, rotation", "p_rotation", ["server_id"], "=", [msg.guild.id]);
    let messageResponse = '';

    if (allValues == '') {
        messageResponse = 'There are current no queries in this server.'
    } else {
        for (let i = 0; i < allValues.length; i++) {
            messageResponse += "QUERY_ID: " + allValues[i].server_query_id + ", ROTATION: " + allValues[i].rotation + "\n";
        }
    }

    msg.type.reply({content: messageResponse});
}

/**
 * Add an entirely new query that drinkie will periodically post, based on derpi arguments added by user. By default sent every 6 hours.
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
export async function queryNew(msg) {
    let query = msg.content;
    let filter = null;
    const regx = /filter_id:([0-9]{1,})/
    let expr = msg.content.split(" ")[0];
    if (regx.test(expr)) {
        filter = regx.exec(expr)[1]
        query = msg.content.substr(msg.content.indexOf(" ") + 1);
    } 

    let maxNumber = await selectAllStatementDB("MAX(server_query_id)", "p_queries", ["server_id"], "=", [msg.guild.id]);
    let botChannel = await selectAllStatementDB("default_channel", "p_server", ["server_id"], "=", [msg.guild.id]);
    if (botChannel === undefined) {
        botChannel = "noChannelFoundForDrinkie"
    }
    
    await insertStatementDB("p_queries(search_query, channel_name, server_id, server_query_id, filter_id)", query, botChannel, msg.guild.id, (Number(maxNumber) + 1), filter);
    await insertStatementDB("p_rotation(rotation, server_id, server_query_id)", "0 0/6 * * *", msg.guild.id, (Number(maxNumber) + 1));

    msg.type.reply("Query has been added!")
}

/**
 * Displays all queries that are currently being posted on the server (per server).
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
export async function queryList(msg) {
    let allValues = await selectAllStatementDB("server_query_id, channel_name, filter_id, search_query", "p_queries", ["server_id"], "=", [msg.guild.id]);
    let messageResponse = '';

    if (allValues == '') {
        messageResponse = 'There are currently no queries in this server.'
    } else {
        for (let i = 0; i < allValues.length; i++) {
            messageResponse += "QUERY_ID: " + allValues[i].server_query_id + ", QUERY_STRING: " + allValues[i].search_query + ", QUERY_CHANNEL: " + allValues[i].channel_name + ", QUERY_FILTER: " + allValues[i].filter_id + "\n";
        }
    }

    msg.type.reply({content: messageResponse, });
}

/**
 * Removes a query that you specify. This will also delete the associated rotation timing data (per server).
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
export async function queryRemove(msg) {
    let number = validateNumber(msg.content)
    if (!isNaN(number)) {
        let queryID = await selectAllStatementDB("server_query_id", "p_queries", ["server_id", "server_query_id"], "=", [msg.guild.id, number]);
        if (queryID !== '') {
            await removeStatementDB("p_queries", ["server_id", "server_query_id"], [msg.guild.id, number]);
            await removeStatementDB("p_rotation", ["server_id", "server_query_id"], [msg.guild.id, number]);
            msg.type.reply("Query schedule has been removed.")
        }
        else {
            msg.type.reply("Query ID cannot be found.")
        }
    }
    else {
        msg.type.reply("ID is not a valid number, or wrong number of arguments found.")
    }
}

/**
 * Edit the query that drinkie uses to fetch an image (per server).
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
export async function queryEdit(msg) {
    let number = validateNumber(msg.content.substr(0, msg.content.indexOf(" ")));
    let queryList = msg.content.substr(msg.content.indexOf(" ") + 1).split(",");
    if (!isNaN(number)) {
        let numberExists = await selectAllStatementDB("server_query_id", "p_queries", ["server_id", "server_query_id"], "=", [msg.guild.id, number]);
        if (numberExists !== false) {
            await updateStatementDB("p_queries", "search_query", ["server_id", "server_query_id"], [queryList, msg.guild.id, number]);
            msg.type.reply("Image schedule ID:" + number + " query has been updated.")
        }
        else {
            msg.type.reply("Query ID cannot be found.")
        }
    }
    else {
        msg.type.reply("ID is not a valid number, or wrong number of arguments found.")
    }
}

/**
 * Edit the channel that drinkie will post an image to.
 * @param {object} msg Message object, generated based on message by user
 */
export async function channelEdit(msg) {
    let number = validateNumber(msg.content.substr(0, msg.content.indexOf(" ")));
    let channelName = msg.content.substr(msg.content.indexOf(" ") + 1);
    if (!isNaN(number)) {
        let numberExists = await selectAllStatementDB("server_query_id", "p_queries", ["server_id", "server_query_id"], "=", [msg.guild.id, number]);
        if (numberExists !== false) {
            let channelId = msg.guild.channels.cache.find(channel => channel.name === channelName).id;
            if (channelId !== undefined) {
                await updateStatementDB("p_queries", "channel_name", ["server_id", "server_query_id"], [channelId, msg.guild.id, number]);
                msg.type.reply("Image schedule ID:" + number + " channel has been updated.")
            } else {
                msg.type.reply("Channel name cannot be found.")
            }
        }
        else {
            msg.type.reply("Query ID cannot be found.")
        }
    }
    else {
        msg.type.reply("ID is not a valid number, or wrong number of arguments found.")
    }
}

export async function channelDefaultEdit(msg) {
    let channelName = msg.content.substr(msg.content.indexOf(" ") + 1);
    let channelId = msg.guild.channels.cache.find(channel => channel.name === channelName).id;
    if (channelId !== undefined) {
        await updateStatementDB("p_server", "default_channel", ["server_id"], [channelId, msg.guild.id]);
        msg.type.reply("Default channel has been updated.")
    } else {
        msg.type.reply("Channel name cannot be found.")
    }
}

export async function filterEdit(msg) {
    let queryID = validateNumber(msg.content.substr(0, msg.content.indexOf(" ")));
    let filterID = validateNumber(msg.content.substr(msg.content.indexOf(" ") + 1));
    if (!isNaN(queryID)) {
        let queryExists = await selectAllStatementDB("server_query_id", "p_queries", ["server_id", "server_query_id"], "=", [msg.guild.id, queryID]);
        if (queryExists !== false) {
            await updateStatementDB("p_queries", "filter_id", ["server_id", "server_query_id"], [filterID, msg.guild.id, queryID]);
            msg.type.reply("Image schedule ID:" + queryID + " channel has been updated.");
        } else {
            msg.type.reply("Query ID cannot be found.")
        }
    } else {
        msg.type.reply("ID is not a valid number.");
    }
}