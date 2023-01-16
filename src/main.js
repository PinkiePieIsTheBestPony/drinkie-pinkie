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

async function autoPostLoop(client) {
    let allRotationsForServers = await selectAllStatementDB("rotation_id, rotation, server_query_id, server_id", "p_rotation", null, null, null);
    if (allRotationsForServers != '') {
        for (let i = 0; i < allRotationsForServers.length; i++) {
            let channelQueryForServer = await selectAllStatementDB("channel_name", "p_queries", ["server_query_id", "server_id"], "=", [allRotationsForServers[i].server_query_id, allRotationsForServers[i].server_id]);
            if (channelQueryForServer !== "noChannelFoundForDrinkie") {
                if (cronChecker(allRotationsForServers[i].rotation)) {
                    let query = await selectAllStatementDB("search_query", "p_queries", ["server_query_id", "server_id"], "=", [allRotationsForServers[i].server_query_id, allRotationsForServers[i].server_id]);
                    let filter = await selectAllStatementDB("filter_id", "p_queries", ["server_query_id", "server_id"], "=", [allRotationsForServers[i].server_query_id, allRotationsForServers[i].server_id]);
                    try {
                        let imageReturned = await getDerpibooruImage(query, filter, client.guilds.cache.get(allRotationsForServers[i].server_id).channels.cache.find(channel => channel.id === channelQueryForServer).nsfw)
                        if (imageReturned !== undefined) {
                            send(imageReturned, false, null, client, '', allRotationsForServers[i].server_id, channelQueryForServer);
                        } else {
                            client.guilds.cache.get(allRotationsForServers[i].server_id).channels.cache.find(channel => + channel.id === channelQueryForServer).send("No results found...either you have an obscure query, use a filter which blocks one of your tags, or you have made a mistake. Check query with `!dpi settings query list` and edit it with: `!dpi settings edit query <query_id> <query_list>`");
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
    let fetchReminders = await selectAllStatementDB("reminder_id, server_id, server_reminder, schedule, reminder_from, reminder_to", "p_reminder", null, null, null);
    if (fetchReminders !== "") {
        for (let i = 0; i < fetchReminders.length; i++) {
            let reminderText = await selectAllStatementDB("reminder_text", "p_reminder", ["reminder_id"], "=", [reminderArray[0]])
            let reminderFrom;
            let reminderTo;

            if (fetchReminders[i][4] == "null") {
                reminderFrom = null;
            } else {
                reminderFrom = fetchReminders[i].reminder_from;
            }

            if (fetchReminders[i][5] == "null") {
                reminderTo = null;
            } else {
                reminderTo = fetchReminders[i].reminder_to;
            }

            let defaultChannel = await selectAllStatementDB("default_channel", "p_server", ["server_id"], "=", [fetchReminders[i].server_id]);
            if (cronChecker(fetchReminders[i].schedule)) {
                let text = `${reminderTo ? "Hey " + reminderTo + ", " : ""}${reminderText}${reminderFrom ? ", from " + reminderFrom + "." : ""}`;
                if (fetchReminders[i].server_reminder == 'true') {
                    client.guilds.cache.get(fetchReminders[i].server_id).channels.cache.find(channel => channel.id === defaultChannel).send(text);
                } else {
                    [...client.guilds.cache.values()].forEach(async guild => {
                        let toggleSetting = await selectAllStatementDB("broadcast_toggle", "p_broadcasts", ["server_id"], "=", [guild.id]);
                        let defaultChannel = await selectAllStatementDB("default_channel", "p_server", ["server_id"], "=", [guild.id]);
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
    let fetcherIDsArray = await selectAllStatementDB("fetcher_id", "p_fetcher", null, null, null);
    if (fetcherIDsArray !== "") {
        for (let i = 0; i < fetcherIDsArray.length; i++) {
            /*let checkFrom = await selectAllStatementDB("content", "p_fetcher", ["fetcher_id"], "=", [fetcherIDsArray.fetcher_id]);
            let serverID = await selectAllStatementDB("server_id", "p_fetcher", ["fetcher_id"], "=", [fetcherIDsArray.fetcher_id]);
            let channelLink = await selectAllStatementDB("channel_link", "p_fetcher", ["fetcher_id"], "=", [fetcherIDsArray.fetcher_id]);
            let latestVideo = await selectAllStatementDB("latest_video", "p_fetcher", ["fetcher_id"], "=", [fetcherIDsArray.fetcher_id]);
            let latestVtime = await selectAllStatementDB("latest_vtime", "p_fetcher", ["fetcher_id"], "=", [fetcherIDsArray.fetcher_id]);
            let channelName = await selectAllStatementDB("channel_name", "p_fetcher", ["fetcher_id"], "=", [fetcherIDsArray.fetcher_id]);*/
            let videoDetails = await selectAllStatementDB("content, server_id, channel_link, latest_video, latest_vtime, channel_name", "p_fetcher", ["fetcher_id"], "=", [fetcherIDsArray[i].fetcher_id]);
            let defaultChannel = await selectAllStatementDB("default_channel", "p_server", ["server_id"], "=", [videoDetails[0].server_id]);
            const link = "https://www.googleapis.com/youtube/v3/";
            const ytRegex = /\"externalId\":\"(.*?)\"/;
            if (defaultChannel !== "") {
                switch(videoDetails[0].content) {
                    case 'youtube': {
                        //get latest video link
                        if (videoDetails[0].channel_link !== "") {
                            let respYT = await fetch(videoDetails[0].channel_link).catch((error) => console.error(error));
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
                                if (videoDetails.latest_video === "" && videoDetails.latest_vtime === "") {
                                    await updateStatementDB("p_fetcher", "latest_video", ["fetcher_id"], [latestVideos.items[0].snippet.resourceId.videoId, fetcherIDsArray[i].fetcher_id]);
                                    await updateStatementDB("p_fetcher", "latest_vtime", ["fetcher_id"], [latestVideos.items[0].snippet.publishedAt, fetcherIDsArray[i].fetcher_id]);
                                } else {
                                    let newToOldFound;
                                    if (videoDetails[0].latest_video !== latestVideos.items[0].snippet.resourceId.videoId) {
                                        let videosFound = [];
                                        for (let j = 0; j < latestVideos.items.length; j++) {
                                            //found last video
                                            if (latestVideos.items[j].snippet.resourceId.videoId === videoDetails.latest_video) {
                                                let lengthOfMsg = "New video from " + videoDetails.channel_name + " has been uploaded";
                                                if (videosFound.length > 1) {
                                                    lengthOfMsg = videosFound.length + " new videos from " + videoDetails.channel_name + " has been uploaded."
                                                }
                                                await updateStatementDB("p_fetcher", "latest_video", ["fetcher_id"], [latestVideos.items[0].snippet.resourceId.videoId, fetcherIDsArray[i].fetcher_id]);
                                                await updateStatementDB("p_fetcher", "latest_vtime", ["fetcher_id"], [latestVideos.items[0].snippet.publishedAt, fetcherIDsArray[i].fetcher_id]);
                                                //alert of upload(s)
                                                client.guilds.cache.get(videoDetails[0].server_id).channels.cache.find(channel => + channel.id === defaultChannel).send(lengthOfMsg + "\n" + videosFound.map(e => "https://youtube.com/watch?v=" + e + "\n").toString().replaceAll(',', ''));
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
                                            await updateStatementDB("p_fetcher", "latest_video", ["fetcher_id"], [latestVideos.items[0].snippet.resourceId.videoId, fetcherIDsArray[i].fetcher_id]);
                                            await updateStatementDB("p_fetcher", "latest_vtime", ["fetcher_id"], [latestVideos.items[0].snippet.publishedAt, fetcherIDsArray[i].fetcher_id]);
                                            client.guilds.cache.get(videoDetails[0].server_id).channels.cache.find(channel => + channel.id === defaultChannel).send("Unlisting/Privating/Removal of video from  " + videoDetails.channel_name + ": https://youtube.com/watch?v=" + videoDetails.latest_video);
                                        }
                                    } 
                                }
                            } 
                        }
                        break;
                    }
                    default: {
                        client.guilds.cache.get(videoDetails[0].server_id).channels.cache.find(channel => + channel.id === defaultChannel).send("We currently cannot check from this source...stay tuned though!");
                    }
                }
            }
        }
    }
}

async function broadcastChange(guild, fileStream) {
    let toggleSetting = await selectAllStatementDB("broadcast_toggle", "p_broadcasts", ["server_id"], "=", [guild.id]);
    let validBroadcast = await selectAllStatementDB("broadcast_valid", "p_broadcasts", ["server_id"], "=", [guild.id]);
    let defaultChannel = await selectAllStatementDB("default_channel", "p_server", ["server_id"], "=", [guild.id]);
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
client.on('ready', async () => {
    await initialiseDB();
    client.user.setActivity(prefix + ' help or /help');
    let fileStream = fs.readFileSync(dirname(fileURLToPath(import.meta.url)) + '/../changes.txt');
    [...client.guilds.cache.values()].forEach(async guild => {
        await insertGuildDetails(guild);
        if (fileStream.toString() !== "") {
            broadcastChange(guild, fileStream);
        }
        await updateStatementDB("p_broadcasts", "broadcast_valid", ["server_id"], ["0", guild.id]);
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

client.on('guildDelete', async guild => {
    if (guild.available) {
        await removeStatementDB("p_rotation", ["server_id"], [guild.id]);
        await removeStatementDB("p_queries", ["server_id"], [guild.id]);
        await removeStatementDB("p_queue", ["server_id"], [guild.id]);
        await removeStatementDB("p_server", ["server_id"], [guild.id]);
    }
});

client.on('guildCreate', async guild => {
    await insertGuildDetails(guild);
});

client.on('messageCreate', msg => {
    possibleResponses(msg, client);
});

client.on('interactionCreate', interaction => {
    if (!interaction.isCommand()) return;
    possibleResponsesSlash(interaction, client);
});

client.login(discord_key);