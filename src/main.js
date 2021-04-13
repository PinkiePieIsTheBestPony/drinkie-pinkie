const discord = require('./external-libs/discord');
const twitter = require('./external-libs/twitter');
const derpi = require('./external-libs/derpi');
const initDB = require('./db/initDB');
const dbQueries = require('./db/dbQuery');
const cron = require('./cron');
const responses = require('./response');
const nodeCron = require('cron');
const { discord_key } = require('./config');

/**
 * Initialises Drinkie client user, along with the DB and Twitter connectivity.
 */
const client = discord.initialiseDiscordJS();
const T = twitter.initialiseTwit();
initDB.initialiseDB();

client.login(discord_key);

let stream = T.stream('statuses/filter', { 
    track: '#毎日ピンキーパイ', follow: '910628947561295872' 
});

/**
 * When initialisation finishes - queries every server/guild Drinkie is in and ensures that there is a corresponding entry in DB. If not, will add that server/guild in.
 * Cron job will run every minute, running the following set of steps:
 * 1) Get the output from table which stores the rotation of every query.
 * 2) Loop through each of these - doing a check to see if the time matches with the cron query within the DB query.
 * 3) If the time matches with cron, get output from table which stores the query.
 * 4) Connect to Derpi and run query, fetch image from query and post to relevant server.
 */
client.on('ready', () => {
    client.user.setActivity('!dpi help');
    client.guilds.cache.array().forEach(guild => {
        let response = dbQueries.selectAllStatementDB("server_id", "p_server", "server_id", "=", guild.id);
        if (response !== guild.id) {
            dbQueries.insertGuildDetails(guild);
        }
    });
    nodeCron.job(
        '0 * * * * *',
        function() {
            let allRotationsForServers = dbQueries.selectAllStatementDB("rotation_id, rotation, server_query_id, server_id", "p_rotation", null, null, null);
            if (allRotationsForServers != '') {
                let allRotationsForServersArray = allRotationsForServers.split('\n');
                for (i = 0; i < allRotationsForServersArray.length; i++) {
                    let resultArray = allRotationsForServersArray[i].split(', ');
                    let rotationQuery = resultArray[1];
                    let rotationServerID = resultArray[2];
                    let serverID = resultArray[3];
                    if (cron.cronChecker(rotationQuery)) {
                        let queryForServer = dbQueries.selectAllStatementDB("search_query", "p_queries", "server_query_id, server_id", "=", [rotationServerID, serverID]);
                        derpi.getDerpibooruImage(queryForServer, false).then(({images}) => {
                            if (Array.isArray(images) && images.length) {
                                derpi.fetchDerpibooruImage(images[0], false, null, client, '', serverID);
                            }
                        });
                    }
                }
            }
        },
        null,
        true
    )
});

client.on('guildCreate', guild => {
    dbQueries.insertGuildDetails(guild);
});

client.on('message', msg => {
    responses.possibleResponses(msg, client);
});

stream.on('tweet', function(tweet) {
    twitter.extractImage(tweet, client);
});