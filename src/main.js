import {initialiseDiscordJS} from './external-libs/discord.js';
import {getDerpibooruImage} from './external-libs/derpi.js';
import {initialiseDB} from './db/initDB.js';
import {selectAllStatementDB, insertGuildDetails, removeStatementDB, updateStatementDB} from './db/dbQuery.js';
import {cronChecker} from './cron.js';
import {possibleResponses, possibleResponsesSlash} from './response.js';
import nodeCron from 'cron';
import {send} from './post.js';
import { discord_key, prefix, yt_api_key } from './config.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
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

async function reminderChecker() {
    let fetchReminders = selectAllStatementDB("reminder_id, server_id, server_reminder, schedule, reminder_from, reminder_to", "p_reminder", null, null, null);
    if (fetchReminders !== "") {
        let fetchRemindersArray = fetchReminders.split('\n');
        for (let i = 0; i < fetchRemindersArray.length; i++) {
            let reminderArray = fetchRemindersArray[i].split(', ');
            let serverID = reminderArray[1];
            let serverReminder = reminderArray[2];
            let reminderText = selectAllStatementDB("reminder_text", "p_reminder", ["reminder_id"], "=", [reminderArray[0]])
            let schedule = reminderArray[3];
            let reminderFrom = reminderArray[4];
            let reminderTo = reminderArray[5];

            if (reminderArray[4] == "null") {
                reminderFrom = null;
            }

            if (reminderArray[5] == "null") {
                reminderTo = null;
            }

            let defaultChannel = selectAllStatementDB("default_channel", "p_server", ["server_id"], "=", [serverID]);
            if (cronChecker(schedule)) {
                let text = `${reminderTo ? "Hey " + reminderTo + ", " : ""}${reminderText}${reminderFrom ? ", from " + reminderFrom + "." : ""}`;
                if (serverReminder == true) {
                    client.guilds.cache.get(serverID).channels.cache.find(channel => "<#" + channel.id + ">" === defaultChannel).send(text);
                } else {
                    [...client.guilds.cache.values()].forEach(guild => {
                        let toggleSetting = selectAllStatementDB("broadcast_toggle", "p_broadcasts", ["server_id"], "=", [guild.id]);
                        let defaultChannel = selectAllStatementDB("default_channel", "p_server", ["server_id"], "=", [guild.id]);
                        if (toggleSetting == 1) {
                            guild.channels.cache.get(defaultChannel.replace('<#', '').replace('>', '')).send(text);
                        }
                    });
                }
            }
        }
    }
}

async function checkForLatest(client) {
    //get all db entries
    //id, server_id, content, channel, last video
    let fetcherIDsDBRes = selectAllStatementDB("fetcher_id, server_id", "p_fetcher", null, null, null);
    if (fetcherIDsDBRes !== "") {
        let fetcherIDsArray = fetcherIDsDBRes.split('\n')
        for (let i = 0; i < fetcherIDsArray.length; i++) {
            let fetcherIDs = fetcherIDsArray[i].split(',');
            let checkFrom = selectAllStatementDB("content", "p_fetcher", ["fetcher_id"], "=", [fetcherIDs[0]]);
            let serverID = selectAllStatementDB("server_id", "p_fetcher", ["fetcher_id"], "=", [fetcherIDs[0]]);
            let channelLink = selectAllStatementDB("channel_link", "p_fetcher", ["fetcher_id"], "=", [fetcherIDs[0]]);
            let latestVideo = selectAllStatementDB("latest_video", "p_fetcher", ["fetcher_id"], "=", [fetcherIDs[0]]);
            let latestVtime = selectAllStatementDB("latest_vtime", "p_fetcher", ["fetcher_id"], "=", [fetcherIDs[0]]);
            let channelName = selectAllStatementDB("channel_name", "p_fetcher", ["fetcher_id"], "=", [fetcherIDs[0]]);
            let defaultChannel = selectAllStatementDB("default_channel", "p_server", ["server_id"], "=", [serverID]);
            const link = "https://www.googleapis.com/youtube/v3/";
            const ytRegex = /\"externalId\":\"(.*?)\"/;
            if (defaultChannel !== "") {
                switch(checkFrom) {
                    case 'youtube': {
                        //get latest video link
                        if (channelLink !== "") {
                            let respYT = await fetch(channelLink).catch((error) => console.error(error));
                            if (!respYT.ok) {continue}
                            let pageHTML = await respYT.text();
                            let youtubeChannId = ytRegex.exec(pageHTML);
                            if (youtubeChannId !== null) {
                                let apiResultResp = await fetch(link + "channels?part=contentDetails&id=" + youtubeChannId[1] + "&key=" + yt_api_key).catch((error) => console.error(error));
                                if (!apiResultResp.ok) {continue}
                                let apiResult = await apiResultResp.json();
                                let userUploadsId = apiResult.items[0].contentDetails.relatedPlaylists.uploads;
                                let latestVideosResp = await fetch(link + "playlistItems?part=snippet&playlistId=" + userUploadsId + "&maxResults=20&key=" + yt_api_key).catch((error) => console.error(error));
                                if (!apiResultResp.ok) {continue}
                                let latestVideos = await latestVideosResp.json();
                                if (latestVideo === "" && latestVtime === "") {
                                    updateStatementDB("p_fetcher", "latest_video", ["fetcher_id"], [latestVideos.items[0].snippet.resourceId.videoId, fetcherIDs[0]]);
                                    updateStatementDB("p_fetcher", "latest_vtime", ["fetcher_id"], [latestVideos.items[0].snippet.publishedAt, fetcherIDs[0]]);
                                } else {
                                    let newToOldFound;
                                    if (latestVideo !== latestVideos.items[0].snippet.resourceId.videoId) {
                                        let videosFound = [];
                                        for (let j = 0; j < latestVideos.items.length; j++) {
                                            //found last video
                                            if (latestVideos.items[j].snippet.resourceId.videoId === latestVideo) {
                                                let lengthOfMsg = "New video from " + channelName + " has been uploaded";
                                                if (videosFound.length > 1) {
                                                    lengthOfMsg = videosFound.length + " new videos from " + channelName + " has been uploaded."
                                                }
                                                updateStatementDB("p_fetcher", "latest_video", ["fetcher_id"], [latestVideos.items[0].snippet.resourceId.videoId, fetcherIDs[0]]);
                                                updateStatementDB("p_fetcher", "latest_vtime", ["fetcher_id"], [latestVideos.items[0].snippet.publishedAt, fetcherIDs[0]]);
                                                //alert of upload(s)
                                                client.guilds.cache.get(serverID).channels.cache.find(channel => "<#" + channel.id + ">" === defaultChannel).send(lengthOfMsg + "\n" + videosFound.map(e => "https://youtube.com/watch?v=" + e + "\n").toString().replaceAll(',', ''));
                                                newToOldFound=true;
                                                break;
                                            //have not found it
                                            } else {
                                                videosFound.push(latestVideos.items[j].snippet.resourceId.videoId)
                                                newToOldFound=false;
                                            }
                                        }
                                        if (newToOldFound == false) {
                                            //alert of deleted old video
                                            updateStatementDB("p_fetcher", "latest_video", ["fetcher_id"], [latestVideos.items[0].snippet.resourceId.videoId, fetcherIDs[0]]);
                                            updateStatementDB("p_fetcher", "latest_vtime", ["fetcher_id"], [latestVideos.items[0].snippet.publishedAt, fetcherIDs[0]]);
                                            client.guilds.cache.get(serverID).channels.cache.find(channel => "<#" + channel.id + ">" === defaultChannel).send("Unlisting/Privating/Removal of video from  " + channelName + ": https://youtube.com/watch?v=" + latestVideo);
                                        }
                                    } 
                                }
                            } 
                        }
                        break;
                    }
                    default: {
                        client.guilds.cache.get(serverID).channels.cache.find(channel => "<#" + channel.id + ">" === defaultChannel).send("We currently cannot check from this source...stay tuned though!");
                    }
                }
            }
        }
    }
}

function broadcastChange(guild, fileStream) {
    let toggleSetting = selectAllStatementDB("broadcast_toggle", "p_broadcasts", ["server_id"], "=", [guild.id]);
    let validBroadcast = selectAllStatementDB("broadcast_valid", "p_broadcasts", ["server_id"], "=", [guild.id]);
    let defaultChannel = selectAllStatementDB("default_channel", "p_server", ["server_id"], "=", [guild.id]);
    if (toggleSetting == "1" && defaultChannel !== "noChannelFoundForDrinkie" && validBroadcast == "1") {
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
        updateStatementDB("p_broadcasts", "broadcast_valid", ["server_id"], ["0", guild.id]);
    });
    //every minute
    nodeCron.job(
        '0 * * * * *',
        function() {
            let numberOfIterations = 0;
            if (numberOfIterations < 1) {
                autoPostLoop(client);
                reminderChecker();
                numberOfIterations++;
            }
        },
        null,
        true
    )
    //every five minutes
    nodeCron.job(
        '0 */5 * * * *',
        function() {
            let numberOfIterations = 0;
            if (numberOfIterations < 1) {
                checkForLatest(client);
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