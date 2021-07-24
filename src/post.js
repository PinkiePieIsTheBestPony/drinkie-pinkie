const discord = require('./external-libs/discord');

/**
 * Where all posts which either require an image attached, or contain a Derpibooru request are posted (including the scheduled posts).
 * @public
 * @param {object} derpiObject [dinky.js] The derpibooru object which contains all the information about the random image selected.
 * @param {boolean} isRequest Checks if the reason for image being sent is from a !dpi img message.
 * @param {object} messageObject [Discord.js] Message object, generated based on message by user
 * @param {object} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 * @param {string} message Sometimes images are sent with a message (Daily Pinkie Pie).
 * @param {string} serverID The specific ID of the Server in which the bot is sending the image to, so it only sends to that server (in most cases).
 */
const send = (derpiObject, isRequest, messageObject, client, message, serverID, channelQueryForServer) => {
    if (channelQueryForServer != null && !isRequest && messageObject == null && serverID != null) {
        client.guilds.cache.get(serverID).channels.cache.find(channel => "<#" + channel.id + ">" === channelQueryForServer).send({message: message, embed: discord.createEmbeddedImg(derpiObject, derpiObject["viewUrl"])});   
    } else if (isRequest == false && channelQueryForServer == null && derpiObject == null) {
        if (serverID != null) {
            serverID.forEach(guild => guild.channels.cache.find(channel => channel.name.includes("bot")).send(message));
        } else {
            client.guilds.cache.array().forEach(guild => guild.channels.cache.find(channel => channel.name.includes("bot")).send(message));
        }
    } else {
        messageObject.reply("Result of your query: `" + messageObject.content.split(' ').slice(2).join(' ') + "`", discord.createEmbeddedImg(derpiObject, derpiObject["viewUrl"]));
        messageObject.channel.stopTyping();
    }
}

exports.send = send;