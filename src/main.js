const discord = require('./external-libs/discord');
const derpi = require('./external-libs/derpi.js');
const initDB = require('./db/initDB');
const dbQueries = require('./db/dbQuery');
const cron = require('./cron');
const responses = require('./response');
const nodeCron = require('cron');
const post = require('./post');
const { discord_key, prefix } = require('./config');

/**
 * Initialises Drinkie client user, along with the DB and Twitter connectivity.
 */
const client = discord.initialiseDiscordJS();
initDB.initialiseDB();

async function autoPostLoop(client) {
    let allRotationsForServers = dbQueries.selectAllStatementDB("rotation_id, rotation, server_query_id, server_id", "p_rotation", null, null, null);
    if (allRotationsForServers != '') {
        let allRotationsForServersArray = allRotationsForServers.split('\n');
        for (let i = 0; i < allRotationsForServersArray.length; i++) {
            let resultArray = allRotationsForServersArray[i].split(', ');
            let rotationQuery = resultArray[1];
            let rotationServerID = resultArray[2];
            let serverID = resultArray[3];
            let channelQueryForServer = dbQueries.selectAllStatementDB("channel_name", "p_queries", ["server_query_id", "server_id"], "=", [rotationServerID, serverID]);
            if (channelQueryForServer !== "noChannelFoundForDrinkie") {
                if (cron.cronChecker(rotationQuery)) {
                    let query = dbQueries.selectAllStatementDB("search_query", "p_queries", ["server_query_id", "server_id"], "=", [rotationServerID, serverID]);
                    let filter = dbQueries.selectAllStatementDB("filter_id", "p_queries", ["server_query_id", "server_id"], "=", [rotationServerID, serverID]);
                    try {
                        let imageReturned = await derpi.getDerpibooruImage(query, filter, client.guilds.cache.get(serverID).channels.cache.find(channel => "<#" + channel.id + ">" === channelQueryForServer).nsfw)
                        if (imageReturned !== undefined) {
                            post.send(imageReturned, false, null, client, '', serverID, channelQueryForServer);
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
    [...client.guilds.cache.values()].forEach(guild => {
        dbQueries.insertGuildDetails(guild);
    });
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
        dbQueries.removeStatementDB("p_rotation", ["server_id"], [guild.id]);
        dbQueries.removeStatementDB("p_queries", ["server_id"], [guild.id]);
        dbQueries.removeStatementDB("p_server", ["server_id"], [guild.id]);
        dbQueries.removeStatementDB("p_queue", ["server_id"], [guild.id]);
    }
});

client.on('guildCreate', guild => {
    dbQueries.insertGuildDetails(guild);
});

client.on('messageCreate', msg => {
    responses.possibleResponses(msg, client);
});

client.on('interactionCreate', interaction => {
    if (!interaction.isCommand()) return;
    responses.possibleResponsesSlash(interaction, client);
});

client.login(discord_key);