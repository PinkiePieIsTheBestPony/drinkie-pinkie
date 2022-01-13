import {selectAllStatementDB, updateStatementDB} from './db/dbQuery.js';
import { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } from '@discordjs/voice';
import ytdl from "ytdl-core";
import ytpl from 'ytpl';
import {createQueueList} from './external-libs/discord.js';

let allAudioPlayers = '';
let allPauseStates = '';
let allPrevSongs = '';
let allStates = '';
let allOptsGbl = '';

function accessQueue(serverID) {
    return selectAllStatementDB("queue_data", "p_queue", ["server_id"], "=", [serverID]);
}

function updateQueue(serverID, queueData) {
    updateStatementDB("p_queue", "queue_data", ["server_id"], [queueData, serverID]);
}

function nextSong(queue, serverID, msg) {
    let playedSong = queue.shift();
    let prevSongs = allPrevSongs.get(serverID);
    prevSongs.push(playedSong);
    allPrevSongs.set(serverID, prevSongs);
    if (queue.length === 0) {
        queue = "noDataFoundInQueue";
    } else {
        queue = JSON.stringify(queue);
    }
    updateQueue(serverID, queue);
    playQueue(serverID, msg);
}

function prevSong(queue, serverID, msg) {
    let prevSongs = allPrevSongs.get(serverID);
    if (prevSongs.length > 0) {
        let lastPlayed = prevSongs.pop();
        queue.unshift(lastPlayed);
        allPrevSongs.set(serverID, prevSongs);
        allStates.set(serverID, 'N');     
        updateQueue(serverID, JSON.stringify(queue));
        playQueue(serverID, msg);
    } else {
        (allOptsGbl.notif) ? msg.type.reply("No previous songs!") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "No previous songs!"}) : "";
    }
}

async function playQueue(serverID, msg) {
    let queue = accessQueue(serverID);

    if (queue === "noDataFoundInQueue") {
        safelyRemove(msg);
    } else {
        queue = JSON.parse(queue);
        let player = createAudioPlayer();
        allAudioPlayers.set(serverID, player);
        let connection = getVoiceConnection(serverID);
        let audioPlayer = allAudioPlayers.get(serverID);

        connection.subscribe(audioPlayer);
        const stream = ytdl(queue[0].url, {filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1<<25});
        audioPlayer.play(createAudioResource(stream, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true
        }));

        audioPlayer.on(AudioPlayerStatus.Playing, () => {
            if (allOptsGbl.notif) msg.channel.send(`Now playing: ${queue[0].title}`)
        });

        audioPlayer.on(AudioPlayerStatus.Idle, () => {
            audioPlayer.stop();
            let playState = allStates.get(serverID);
            let pauseState = allPauseStates.get(serverID);
            let queueNew = accessQueue(serverID);
            queueNew = JSON.parse(queueNew);
            if (pauseState == false) { 
                if (playState == 'N') {
                    nextSong(queueNew, serverID, msg);
                } else if (playState == 'P') {
                    prevSong(queueNew, serverID, msg);
                }
            }
        });

        audioPlayer.on('error', error => {
            console.error(`Error: ${error}.`);
            if (error.message === "Status code: 403") {
                let queueNew = accessQueue(serverID);
                queueNew = JSON.parse(queueNew);
                nextSong(queueNew, serverID, msg);
            } else {
                (allOptsGbl.notif) ? msg.type.reply("Error encountered...going to disconnect and leave.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Error encountered...going to disconnect and leave."}) : "";
                safelyRemove(msg);
            }
        });
    }
}

async function playerStatus(serverID) {
    if (allAudioPlayers === '') {
        allAudioPlayers = new Map();
        allPrevSongs = new Map();
        allStates = new Map();
        allPauseStates = new Map();
        allPrevSongs.set(serverID, new Array());
        allStates.set(serverID, 'N');
        allPauseStates.set(serverID, false);
    } else {
        allPrevSongs.set(serverID, new Array());
        allStates.set(serverID, 'N');
        allPauseStates.set(serverID, false);
    }
}

function voiceStatus(serverID, msg) {
    let connection = getVoiceConnection(serverID);
    playerStatus(serverID);

    connection.on(VoiceConnectionStatus.Ready, () => {
        playQueue(serverID, msg);
    });

    connection.on(VoiceConnectionStatus.Disconnect, async (oldState, newState) => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
            playQueue(serverID, msg);
        } catch (error) {
            console.log(error);
            safelyRemove(msg);
        }
    })
}

export const join = (msg, optArgs) => {
    allOptsGbl = optArgs;
    let connection = getVoiceConnection(msg.guild.id);
    if (typeof connection == 'undefined') {
        if (msg.member.voice.channel) {
            const permissions = msg.member.voice.channel.permissionsFor(msg.client.user);
            if (permissions.has("CONNECT") | permissions.has("SPEAK")) {
                let serverID = msg.guild.id;
                let data = accessQueue(serverID);
                if (data === "noDataFoundInQueue") {
                    (allOptsGbl.notif) ? msg.type.reply("You need to add a song into this queue...") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "You need to add a song into this queue..."}) : "";
                } else {
                    data = JSON.parse(data);
                    joinVoiceChannel({channelId: msg.member.voice.channel.id, guildId: serverID, adapterCreator: msg.guild.voiceAdapterCreator});
                    (allOptsGbl.notif) ? msg.type.reply("Joining voice channel!") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Joining voice channel!"}) : "";
                    voiceStatus(serverID, msg);
                }
            } else {
                (allOptsGbl.notif) ? msg.type.reply("Please give me the appropriate permissions to play sounds!") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Please give me the appropriate permissions to play sounds!"}) : "";
            }
        } else {
            (allOptsGbl.notif) ? msg.type.reply("Must be in voice.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Must be in voice."}) : "";
        }
    } else {
        (allOptsGbl.notif) ? msg.type.reply("I'm already in a server!") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "I'm already in a server!"}) : "";
    }
}

function safelyRemove(msg) {
    let connection = getVoiceConnection(msg.guild.id);
    connection.destroy();
    allAudioPlayers.delete(msg.guild.id);
    allPauseStates.delete(msg.guild.id);
    allStates.delete(msg.guild.id);
}

export const leave = (msg, optArgs) => {
    allOptsGbl = optArgs;
    (allOptsGbl.notif) ? msg.type.reply("Leaving voice channel!") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Leaving voice channel!"}) : "";
    safelyRemove(msg);
}

export async function addToQueue(msg, optArgs) {
    allOptsGbl = optArgs;
    let queue = accessQueue(msg.guild.id);
    if (queue === "noDataFoundInQueue") {
        queue = [];
    } else {
        queue = JSON.parse(queue);
    }
    let isValidVid = ytdl.validateURL(msg.content);
    if (isValidVid) {
        let soundDetails = await ytdl.getInfo(msg.content);
        let sound = {title: soundDetails.videoDetails.title, url: soundDetails.videoDetails.video_url};
        queue.push(sound);
        updateQueue(msg.guild.id, JSON.stringify(queue));
        (allOptsGbl.notif) ? msg.type.reply(`Added to the queue!`) : (!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND") ? msg.type.reply({ephemeral: true, content: `Added to the queue!`}) : "";
    } else {
        (allOptsGbl.notif) ? msg.type.reply("Invalid URL. Please remember to only enter URLs from YT, and enter one at a time.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Invalid URL. Please remember to only enter URLs from YT, and enter one at a time."}) : "";
    }
}

export async function addPlaylistToQueue(msg, optArgs) {
    allOptsGbl = optArgs;
    let queue = accessQueue(msg.guild.id);
    if (queue === "noDataFoundInQueue") {
        queue = [];
    } else {
        queue = JSON.parse(queue);
    }
    let isValidPlaylist = ytpl.validateID(msg.content.trim());
    if (isValidPlaylist) {
        let playlist = await ytpl(msg.content.trim());
        for (let i = 0; i < playlist.items.length; i++) {
            let sound = {title: playlist.items[i].title, url: playlist.items[i].shortUrl};
            queue.push(sound);
        }
        updateQueue(msg.guild.id, JSON.stringify(queue));
        (allOptsGbl.notif) ? msg.type.reply(`Added ${playlist.items.length} songs to the queue!`) : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: `Added ${playlist.items.length} songs to the queue!`}) : "";
    } else {
        (allOptsGbl.notif) ? msg.type.reply("Invalid URL. Please remember to only enter playlist IDs from YT, and enter one at a time.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Invalid URL. Please remember to only enter playlist IDs from YT, and enter one at a time."}) : "";
    }
}

export const removeFromQueue = (msg, optArgs) => {
    allOptsGbl = optArgs;
    let queue = accessQueue(msg.guild.id);
    if (queue !== "noDataFoundInQueue") {
        queue = JSON.parse(queue);
        if (msg.content > queue.length) {
            (allOptsGbl.notif) ? msg.type.reply("Invalid index for queue.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Invalid index for queue."}) : "";
        } else {
            queue.splice(msg.content, 1);
            if (queue.length > 0) {
                updateQueue(msg.guild.id, JSON.stringify(queue));
            } else {
                updateQueue(msg.guild.id, "noDataFoundInQueue");
            }
            (allOptsGbl.notif) ? msg.type.reply("Queue updated!") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Queue updated!"}) : "";
        }
    } else {
        (allOptsGbl.notif) ? msg.type.reply("Empty queue.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Empty queue."}) : "";
    }
}

export const clearQueue = (msg, optArgs) => {
    allOptsGbl = optArgs;
    let queue = accessQueue(msg.guild.id);
    if (queue !== "noDataFoundInQueue") {
        if (allPrevSongs !== '') {
            let nextMsgQueue = JSON.parse(queue);
            if (nextMsgQueue.length < 2) {
                (allOptsGbl.notif) ? msg.type.reply("Nothing to clear.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Nothing to clear."}) : "";
            } else {
                let queueCount = nextMsgQueue.length;
                for (let i = 1; i < queueCount; i++) {
                    nextMsgQueue.pop();
                }
                updateQueue(msg.guild.id, JSON.stringify(nextMsgQueue));
                (allOptsGbl.notif) ? msg.type.reply("Queue cleared!") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Queue cleared!"}) : "";
            }
        }
    } else {
        (allOptsGbl.notif) ? msg.type.reply("Empty queue.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Empty queue."}) : "";
    }
}

export const next = (msg, optArgs) => {
    allOptsGbl = optArgs;
    if (allAudioPlayers !== '') {
        let queue = accessQueue(msg.guild.id);
        let audioPlayer = allAudioPlayers.get(msg.guild.id);
        if (typeof audioPlayer !== 'undefined') {
            allStates.set(msg.guild.id, 'N');           
            audioPlayer.stop();
            queue = JSON.parse(queue);
            (allOptsGbl.notif) ? msg.type.reply("Playing next song in queue!") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Playing next song in queue!"}) : "";
            nextSong(queue, msg.guild.id, msg);
        } else {
            (allOptsGbl.notif) ? msg.type.reply("Need to have started playing music.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Need to have started playing music."}) : "";
        }
    } else {
        (allOptsGbl.notif) ? msg.type.reply("Need to have started playing music.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Need to have started playing music."}) : "";
    }
}

export const prev = (msg, optArgs) => {
    allOptsGbl = optArgs;
    if (allAudioPlayers !== '') {
        let queue = accessQueue(msg.guild.id);
        let audioPlayer = allAudioPlayers.get(msg.guild.id);
        if (typeof audioPlayer !== 'undefined') {
            allStates.set(msg.guild.id, 'P');
            audioPlayer.stop();
            queue = JSON.parse(queue);
            (allOptsGbl.notif) ? msg.type.reply("Playing previous song in queue!") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Playing previous song in queue!"}) : "";
            prevSong(queue, msg.guild.id, msg);
        } else {
            (allOptsGbl.notif) ? msg.type.reply("Need to have started playing music.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Need to have started playing music."}) : "";
        }
    } else {
        (allOptsGbl.notif) ? msg.type.reply("Need to have started playing music.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Need to have started playing music."}) : "";
    }
}

export const pause = (msg, optArgs) => {
    allOptsGbl = optArgs;
    if (allAudioPlayers !== '') {
        let audio = allAudioPlayers.get(msg.guild.id)
        if (typeof audio !== 'undefined') {
            if (allPauseStates === '') {
                allPauseStates = new Map();
                allPauseStates.set(msg.guild.id, false);
            }
            let pauseState = allPauseStates.get(msg.guild.id);
            if (pauseState === undefined) {
                allPauseStates.set(msg.guild.id, false);
            }
            if (allPauseStates.get(msg.guild.id) === true) {
                audio.unpause();
                (allOptsGbl.notif) ? msg.type.reply("Unpausing the music!") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Unpausing the music!"}) : "";
                allPauseStates.set(msg.guild.id, false);
            } else {
                audio.pause();
                (allOptsGbl.notif) ? msg.type.reply("Pausing the music!") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Pausing the music!"}) : "";
                allPauseStates.set(msg.guild.id, true);
            }
        } else {
            (allOptsGbl.notif) ? msg.type.reply("Need to have started playing music.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Need to have started playing music."}) : "";
        }
    } else {
        (allOptsGbl.notif) ? msg.type.reply("Need to have started playing music.") : ((!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND")) ? msg.type.reply({ephemeral: true, content: "Need to have started playing music."}) : "";
    }
}

export const showList = (msg, optArgs) => {
    allOptsGbl = optArgs;
    let queue = accessQueue(msg.guild.id);
    if (queue === "noDataFoundInQueue") {
        (!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND") ? msg.type.reply({ephemeral: true, content: "Nothing queued..."}) : msg.type.reply("Nothing queued...")
    } else {
        if (allPrevSongs !== '') {
            let nextMsgQueue = JSON.parse(queue);
            let prevMsgQueue = allPrevSongs.get(msg.guild.id);
            let prevDetails = '';
            let nextDetails = '';
            let currentDetail = ''
            let j;

            if (prevMsgQueue.length > 5) {
                j = 5;
            } else if (prevMsgQueue.length === 0) {
                j = 0;
                prevDetails = "No previous tracks played!";
            } else {
                j = prevMsgQueue.length;
            }

            for (let i = prevMsgQueue.length - j; i < prevMsgQueue.length; i++) {
                prevDetails += prevMsgQueue[i].title + "\n";
            }
            currentDetail = "*" + nextMsgQueue[0].title + "*";
            if (nextMsgQueue.length <= 1) {
                nextDetails = "No tracks are next!";
            }

            for (let k = 1; k < nextMsgQueue.length; k++) {
                if (k > 6) {
                    break;
                } else {
                    nextDetails += k + " - " + nextMsgQueue[k].title + "\n";
                }
            }
            
            (!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND") ? msg.type.reply({ephemeral: true, embeds: [createQueueList(prevMsgQueue, nextMsgQueue, prevDetails, nextDetails, currentDetail)]}) : msg.type.reply({embeds: [createQueueList(prevMsgQueue, nextMsgQueue, prevDetails, nextDetails, currentDetail)]});
        } else {
            (!allOptsGbl.notif && msg.type.type === "APPLICATION_COMMAND") ? msg.type.reply({ephemeral: true, content: "Needed to have started music..."}) : msg.type.reply("Needed to have started music...")
        }
    }
}