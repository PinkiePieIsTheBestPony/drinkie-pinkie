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
export const randomEdit = (msg) => {
    if (msg.member.hasPermission('ADMINISTRATOR')) {
        let numberEnforce = validateNumber(remainingArguments.split(" ")[0]);
        let userID = msg.mentions.users.first().id;
        updateStatementDB("p_guesses", "cooldown_time", ["user_id"], [numberEnforce, "user_id", userID]);
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
export const rotationEdit = (msg) => {
    let number = validateNumber(msg.content.substr(0, msg.content.indexOf(" ")));
    let cronArguments = msg.content.substr(msg.content.indexOf(" ") + 1);
    if (!isNaN(number)) {
        let queryID = selectAllStatementDB("server_query_id", "p_queries", ["server_id", "server_query_id"], "=", [msg.guild.id, number]);
        if (queryID !== '') {
            let cronStatus = cronValidator(cronArguments);
            if (cronStatus) {
                updateStatementDB("p_rotation", "rotation", ["server_id", "server_query_id"], [cronArguments.split(' ').map((x, i) => i >= 3 && !isNaN(x) ? x-1 : x).join(' '), msg.guild.id, number]);
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
export const rotationList = (msg) => {
    let allValues = selectAllStatementDB("server_query_id, rotation", "p_rotation", ["server_id"], "=", [msg.guild.id]);
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

    msg.type.reply({content: messageResponse});
}

/**
 * Add an entirely new query that drinkie will periodically post, based on derpi arguments added by user. By default sent every 6 hours.
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
export const queryNew = (msg) => {
    let query = msg.content;
    let filter = null;
    const regx = /filter_id:([0-9]{1,})/
    let expr = msg.content.split(" ")[0];
    if (regx.test(expr)) {
        filter = regx.exec(expr)[1]
        query = msg.content.substr(msg.content.indexOf(" ") + 1);
    } 

    let maxNumber = selectAllStatementDB("MAX(server_query_id)", "p_queries", ["server_id"], "=", [msg.guild.id]);
    let botChannel = selectAllStatementDB("default_channel", "p_server", ["server_id"], "=", [msg.guild.id]);
    if (botChannel === undefined) {
        botChannel = "noChannelFoundForDrinkie"
    }
    
    insertStatementDB("p_queries(search_query, channel_name, server_id, server_query_id, filter_id)", query, botChannel, msg.guild.id, Number(maxNumber) + 1, filter);
    insertStatementDB("p_rotation(rotation, server_id, server_query_id)", "0 0/6 * * *", msg.guild.id, Number(maxNumber) + 1);

    msg.type.reply("Query has been added!")
}

/**
 * Displays all queries that are currently being posted on the server (per server).
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
export const queryList = (msg) => {
    let allValues = selectAllStatementDB("server_query_id, channel_name, filter_id, search_query", "p_queries", ["server_id"], "=", [msg.guild.id]);
    let arrayQuery = allValues.split('\n');
    let messageResponse = '';

    if (allValues == '') {
        messageResponse = 'There are currently no queries in this server.'
    } else {
        for (let i = 0; i < arrayQuery.length; i++) {
            let queryID = arrayQuery[i].split(', ')[0];
            let channelName = arrayQuery[i].split(', ')[1];
            let filter = arrayQuery[i].split(', ')[2]
            let query = arrayQuery[i].split(', ').splice(3).join(', ');;
            
            messageResponse += "QUERY_ID: " + queryID + ", QUERY_STRING: " + query + ", QUERY_CHANNEL: " + channelName + ", QUERY_FILTER: " + filter + "\n";
        }
    }

    msg.type.reply({content: messageResponse, });
}

/**
 * Removes a query that you specify. This will also delete the associated rotation timing data (per server).
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
export const queryRemove = (msg) => {
    let number = validateNumber(msg.content)
    if (!isNaN(number)) {
        let queryID = selectAllStatementDB("server_query_id", "p_queries", ["server_id", "server_query_id"], "=", [msg.guild.id, number]);
        if (queryID !== '') {
            removeStatementDB("p_queries", ["server_id", "server_query_id"], [msg.guild.id, number]);
            removeStatementDB("p_rotation", ["server_id", "server_query_id"], [msg.guild.id, number]);
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
export const queryEdit = (msg) => {
    let number = validateNumber(msg.content.substr(0, msg.content.indexOf(" ")));
    let queryList = msg.content.substr(msg.content.indexOf(" ") + 1).split(",");
    if (!isNaN(number)) {
        let numberExists = selectAllStatementDB("server_query_id", "p_queries", ["server_id", "server_query_id"], "=", [msg.guild.id, number]);
        if (numberExists !== false) {
            updateStatementDB("p_queries", "search_query", ["server_id", "server_query_id"], [queryList, msg.guild.id, number]);
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
export const channelEdit = (msg) => {
    let number = validateNumber(msg.content.substr(0, msg.content.indexOf(" ")));
    let channelName = msg.content.substr(msg.content.indexOf(" ") + 1);
    if (!isNaN(number)) {
        let numberExists = selectAllStatementDB("server_query_id", "p_queries", ["server_id", "server_query_id"], "=", [msg.guild.id, number]);
        if (numberExists !== false) {
            let channelId = msg.guild.channels.cache.find(channel => channel.name === channelName);
            if (channelId !== undefined) {
                updateStatementDB("p_queries", "channel_name", ["server_id", "server_query_id"], [channelId, msg.guild.id, number]);
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

export const channelDefaultEdit = (msg) => {
    let channelName = msg.content.substr(msg.content.indexOf(" ") + 1);
    let channelId = msg.guild.channels.cache.find(channel => channel.name === channelName);
    if (channelId !== undefined) {
        updateStatementDB("p_server", "default_channel", ["server_id"], [channelId, msg.guild.id]);
        msg.type.reply("Default channel has been updated.")
    } else {
        msg.type.reply("Channel name cannot be found.")
    }
}

export const filterEdit = (msg) => {
    let queryID = validateNumber(msg.content.substr(0, msg.content.indexOf(" ")));
    let filterID = validateNumber(msg.content.substr(msg.content.indexOf(" ") + 1));
    if (!isNaN(queryID)) {
        let queryExists = selectAllStatementDB("server_query_id", "p_queries", ["server_id", "server_query_id"], "=", [msg.guild.id, queryID]);
        if (queryExists !== false) {
            updateStatementDB("p_queries", "filter_id", ["server_id", "server_query_id"], [filterID, msg.guild.id, queryID]);
            msg.type.reply("Image schedule ID:" + queryID + " channel has been updated.");
        } else {
            msg.type.reply("Query ID cannot be found.")
        }
    } else {
        msg.type.reply("ID is not a valid number.");
    }
}