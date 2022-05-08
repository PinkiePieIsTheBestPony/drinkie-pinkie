import {initialiseDiscordJS} from './external-libs/discord.js';
import {getDerpibooruImage} from './external-libs/derpi.js';
import {initialiseDB} from './db/initDB.js';
import {selectAllStatementDB, insertGuildDetails, removeStatementDB} from './db/dbQuery.js';
import {cronChecker} from './cron.js';
import {possibleResponses, possibleResponsesSlash} from './response.js';
import nodeCron from 'cron';
import {send} from './post.js';
import { discord_key, prefix } from './config.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

/**
 * Initialises Drinkie client user, along with the DB and Twitter connectivity.
 */
const client = initialiseDiscordJS();
initialiseDB();

async function autoPostLoop(client) {
    let allRotationsForServers = selectAllStatementDB("rotation_id, rotation, server_query_id, server_id", "p_rotation", null, null, null);
    if (allRotationsForServers != '') {
        let allRotationsForServersArray = allRotationsForServers.split('\n');
        for (let i = 0; i < allRotationsForServersArray.length; i++) {
            let resultArray = allRotationsForServersArray[i].split(', ');
            let rotationQuery = resultArray[1];
            let rotationServerID = resultArray[2];
            let serverID = resultArray[3];
            let channelQueryForServer = selectAllStatementDB("channel_name", "p_queries", ["server_query_id", "server_id"], "=", [rotationServerID, serverID]);
            if (channelQueryForServer !== "noChannelFoundForDrinkie") {
                if (cronChecker(rotationQuery)) {
                    let query = selectAllStatementDB("search_query", "p_queries", ["server_query_id", "server_id"], "=", [rotationServerID, serverID]);
                    let filter = selectAllStatementDB("filter_id", "p_queries", ["server_query_id", "server_id"], "=", [rotationServerID, serverID]);
                    try {
                        let imageReturned = await getDerpibooruImage(query, filter, client.guilds.cache.get(serverID).channels.cache.find(channel => "<#" + channel.id + ">" === channelQueryForServer).nsfw)
                        if (imageReturned !== undefined) {
                            send(imageReturned, false, null, client, '', serverID, channelQueryForServer);
                        } else {
                            client.guilds.cache.get(serverID).channels.cache.find(channel => "<#" + channel.id + ">" === channelQueryForServer).send("No results found...either you have an obscure query, use a filter which blocks one of your tags, or you have made a mistake. Check query with `!dpi settings query list` and edit it with: `!dpi settings edit query <query_id> <query_list>`");
                        }
                    } catch (error) {
                        console.log(error);
                    }
                }
            }
        }
    }
}

function broadcastChange(guild, fileStream) {
    let toggleSetting = selectAllStatementDB("broadcast_toggle", "p_broadcasts", ["server_id"], "=", [guild.id]);
    let defaultChannel = selectAllStatementDB("default_channel", "p_server", ["server_id"], "=", [guild.id]);
    if (toggleSetting == "1" && defaultChannel !== "noChannelFoundForDrinkie") {
        guild.channels.cache.get(defaultChannel.replace('<#', '').replace('>', '')).send("Changelog: \n```" + fileStream.toString() + "```");
    }
}

/**
 * When initialisation finishes - queries every server/guild Drinkie is in and ensures that there is a corresponding entry in DB. If not, will add that server/guild in.
 * Cron job will run every minute, running the following set of steps:
 * 1) Get the output from table which stores the rotation of every query.
 * 2) Loop through each of these - doing a check to see if the time matches with the cron query within the DB query.
 * 3) If the time matches with cron, get output from table which stores the query.
 * 4) Connect to Derpi and run query, fetch image from query and post to relevant server.
 */
client.on('ready', () => {
    client.user.setActivity(prefix + ' help or /help');
    let fileStream = fs.readFileSync(dirname(fileURLToPath(import.meta.url)) + '/../changes.txt');
    [...client.guilds.cache.values()].forEach(guild => {
        insertGuildDetails(guild);
        if (fileStream.toString() !== "") {
            broadcastChange(guild, fileStream);
        }
    });
    fs.writeFileSync(dirname(fileURLToPath(import.meta.url)) + '/../changes.txt', "");
    nodeCron.job(
        '0 * * * * *',
        function() {
            let numberOfIterations = 0;
            if (numberOfIterations < 1) {
                autoPostLoop(client);
                numberOfIterations++;
            }
        },
        null,
        true
    )
});

client.on('guildDelete', guild => {
    if (guild.available) {
        removeStatementDB("p_rotation", ["server_id"], [guild.id]);
        removeStatementDB("p_queries", ["server_id"], [guild.id]);
        removeStatementDB("p_queue", ["server_id"], [guild.id]);
        removeStatementDB("p_server", ["server_id"], [guild.id]);
    }
});

client.on('guildCreate', guild => {
    insertGuildDetails(guild);
});

client.on('messageCreate', msg => {
    possibleResponses(msg, client);
});

client.on('interactionCreate', interaction => {
    if (!interaction.isCommand()) return;
    possibleResponsesSlash(interaction, client);
});

client.login(discord_key);