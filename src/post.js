const discord = require('./external-libs/discord');

/**
 * Where all posts which either require an image attached, or contain a Derpibooru request are posted (including the scheduled posts).
 * @public
 * @param {Buffer} imageBuffer Downloaded image data respresentation object.
 * @param {Images} derpiObject [dinky.js] The derpibooru object which contains all the information about the random image selected.
 * @param {boolean} isRequest Checks if the reason for image being sent is from a !dpi img message.
 * @param {Message} messageObject [Discord.js] Message object, generated based on message by user
 * @param {Client} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 * @param {String} message Sometimes images are sent with a message (Daily Pinkie Pie).
 * @param {String} serverID The specific ID of the Server in which the bot is sending the image to, so it only sends to that server (in most cases).
 */
const send = (imageBuffer, derpiObject, isRequest, messageObject, client, message, serverID) => {
    if (imageBuffer != null) {
        //bypass/workaround for 8mb discord attachment upload limit
        if (Buffer.byteLength(imageBuffer) > 8000000) {
            client.guilds.cache.get(serverID).channels.cache.find(channel => channel.name.includes("bot")).send(derpiObject["viewUrl"]);
        }
        else {
            const attachment = discord.createDiscordAttachment(imageBuffer, derpiObject["format"], derpiObject["id"]);
            if (!isRequest && messageObject == null && serverID != null) {
                client.guilds.cache.get(serverID).channels.cache.find(channel => channel.name.includes("bot")).send({message: message, files: [attachment], embed: discord.createEmbeddedImg(derpiObject, "attachment://" + attachment["name"])});
            }
            else {
                client.guilds.cache.array().forEach(guild => guild.channels.cache.find(channel => channel.name.includes("bot")).send(message, attachment));
            }
        }
    } else {
        messageObject.reply("Result of your query: `" + messageObject.content.split(' ').slice(2).join(' ') + "`", discord.createEmbeddedImg(derpiObject, derpiObject["viewUrl"]));
        messageObject.channel.stopTyping();
    }
    
}

exports.send = send;