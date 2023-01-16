import {createEmbeddedImg} from './external-libs/discord.js';
import {selectAllStatementDB} from './db/dbQuery.js';

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
export const send = (derpiObject, isRequest, messageObject, client, message, serverID, channelQueryForServer) => {
    if (channelQueryForServer != null && !isRequest && messageObject == null && serverID != null) {
        client.guilds.cache.get(serverID).channels.cache.find(channel => channel.id === channelQueryForServer).send({embeds: [createEmbeddedImg(derpiObject, derpiObject["viewUrl"])]});   
    } else if (isRequest == false && channelQueryForServer == null && derpiObject == null) {
        if (serverID != null) {
            serverID.forEach(guild => {
                let channelName = guild.channels.cache.find(channel => + channel.id === selectAllStatementDB("default_channel", "p_server", ["server_id"], "=", [guild.id]));
                if (channelName !== undefined) {
                    channelName.send({content: message});
                }
            }); 
        } else {
            [...client.guilds.cache.values()].forEach(guild => {
                let channelName = guild.channels.cache.find(channel => channel.id === selectAllStatementDB("default_channel", "p_server", ["server_id"], "=", [guild.id]))
                if (channelName !== undefined) {
                    channelName.send({content: message})
                }});
        }
    } else {
        messageObject.type.reply({ content: "Result of your query: `" + messageObject.content + "`", embeds: [createEmbeddedImg(derpiObject, derpiObject["viewUrl"])]});
    }
}
