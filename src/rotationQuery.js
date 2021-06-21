const dbQuery = require('./db/dbQuery');
const cron = require('./cron');

/**
 * Editing of cooldown time for users.
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
 const randomEdit = (msg) => {
    if (msg.member.hasPermission('ADMINISTRATOR')) {
        let remainingArguments = msg.content.replace('!dpi settings random ', '');
        let numberEnforce = remainingArguments.split(" ")[0];
        let userID = msg.mentions.users.first().id;
        dbQuery.updateStatementDB("p_guesses", "cooldown_time", ["user_id"], [numberEnforce, "user_id", userID]);
        msg.reply("I have changed the cooldown period for <@!" + userID + "> to " + numberEnforce + " hours.");
    } else {
        msg.reply("You are not an admin!")
    }
}

/**
 * Editing the timing of when images are posted by Drinkie (per server).
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
const rotationEdit = (msg) => {
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
 * @param {object} msg Message object, generated based on message by user
 */
const rotationList = (msg) => {
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
 * @param {object} msg Message object, generated based on message by user
 */
const queryNew = (msg) => {
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
 * @param {object} msg Message object, generated based on message by user
 */
const queryList = (msg) => {
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
 * @param {object} msg Message object, generated based on message by user
 */
const queryRemove = (msg) => {
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
 * @param {object} msg Message object, generated based on message by user
 */
const queryEdit = (msg) => {
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

/**
 * Edit the channel that drinkie will post to.
 * @param {object} msg Message object, generated based on message by user
 */
const channelEdit = (msg) => {
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

exports.randomEdit = randomEdit;
exports.rotationEdit = rotationEdit;
exports.rotationList = rotationList;
exports.queryNew = queryNew;
exports.queryList = queryList;
exports.queryRemove = queryRemove;
exports.queryEdit = queryEdit;
exports.channelEdit = channelEdit;