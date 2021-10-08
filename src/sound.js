const dbQuery = require('./db/dbQuery');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const ytdl = require("ytdl-core");
const discord = require('./external-libs/discord');

let allAudioPlayers = '';
let allPauseStates = '';
let allPrevSongs = '';
let allStates = '';

function accessQueue(serverID) {
    return dbQuery.selectAllStatementDB("queue_data", "p_queue", ["server_id"], "=", [serverID]);
}

function updateQueue(serverID, queueData) {
    dbQuery.updateStatementDB("p_queue", "queue_data", ["server_id"], [queueData, serverID]);
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
        msg.type.reply("No previous songs!");
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
            msg.channel.send(`Now playing: ${queue[0].title}`);
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
                playQueue(serverID, msg);
            } else {
                msg.channel.send("Error encountered...going to disconnect and leave.");
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

const join = (msg) => {
    let connection = getVoiceConnection(msg.guild.id);
    if (typeof connection == 'undefined') {
        if (msg.member.voice.channel) {
            const permissions = msg.member.voice.channel.permissionsFor(msg.client.user);
            if (permissions.has("CONNECT") | permissions.has("SPEAK")) {
                let serverID = msg.guild.id;
                let data = accessQueue(serverID);
                if (data === "noDataFoundInQueue") {
                    msg.type.reply("You need to add a song into this queue...")
                } else {
                    data = JSON.parse(data);
                    joinVoiceChannel({channelId: msg.member.voice.channel.id, guildId: serverID, adapterCreator: msg.guild.voiceAdapterCreator});
                    msg.type.reply("Joining voice channel!");
                    voiceStatus(serverID, msg);
                }
            } else {
                msg.type.reply("Please give me the appropriate permissions to play sounds!");
            }
        } else {
            msg.type.reply("Must be in voice.");
        }
    } else {
        msg.type.reply("I'm already in a server!")
    }
}

function safelyRemove(msg) {
    let connection = getVoiceConnection(msg.guild.id);
    connection.destroy();
    allAudioPlayers.delete(msg.guild.id);
    allPauseStates.delete(msg.guild.id);
    allStates.delete(msg.guild.id);
}

const leave = (msg) => {
    msg.type.reply("Leaving voice channel!");
    safelyRemove(msg);
}

async function addToQueue(msg) {
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
        msg.type.reply("Added to the queue!");
    } else {
        msg.type.reply("Invalid URL. Please remember to only enter URLs from YT, and enter one at a time.")
    }
}

const removeFromQueue = (msg) => {
    let queue = accessQueue(msg.guild.id);
    if (queue !== "noDataFoundInQueue") {
        queue = JSON.parse(queue);
        if (msg.content > queue.length) {
            msg.type.reply("Invalid index for queue.")
        } else {
            queue.splice(msg.content, 1);
            if (queue.length > 0) {
                updateQueue(msg.guild.id, JSON.stringify(queue));
            } else {
                updateQueue(msg.guild.id, "noDataFoundInQueue");
            }
            msg.type.reply("Queue updated!")
        }
    } else {
        msg.type.reply("Empty queue.")
    }
}

const clearQueue = (msg) => {
    updateQueue(msg.guild.id, "noDataFoundInQueue");
    msg.type.reply("Queue cleared!");
}

const next = (msg) => {
    if (allAudioPlayers !== '') {
        let queue = accessQueue(msg.guild.id);
        let audioPlayer = allAudioPlayers.get(msg.guild.id);
        if (typeof audioPlayer !== 'undefined') {
            allStates.set(msg.guild.id, 'N');           
            audioPlayer.stop();
            queue = JSON.parse(queue);
            msg.type.reply("Playing next song in queue!");
            nextSong(queue, msg.guild.id, msg);
        } else {
            msg.type.reply("Need to have started playing music.")
        }
    } else {
        msg.type.reply("Need to have started playing music.")
    }
}

const prev = (msg) => {
    if (allAudioPlayers !== '') {
        let queue = accessQueue(msg.guild.id);
        let audioPlayer = allAudioPlayers.get(msg.guild.id);
        if (typeof audioPlayer !== 'undefined') {
            allStates.set(msg.guild.id, 'P');
            audioPlayer.stop();
            queue = JSON.parse(queue);
            msg.type.reply("Playing previous song in queue!");
            prevSong(queue, msg.guild.id, msg);
        } else {
            msg.type.reply("Need to have started playing music.");
        }
    } else {
        msg.type.reply("Need to have started playing music.");
    }
}

const pause = (msg) => {
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
                msg.type.reply("Unpausing the music!")
                allPauseStates.set(msg.guild.id, false);
            } else {
                audio.pause();
                msg.type.reply("Pausing the music!")
                allPauseStates.set(msg.guild.id, true);
            }
        } else {
            msg.type.reply("Need to have started playing music.")
        }
    } else {
        msg.type.reply("Need to have started playing music.")
    }
}

const showList = (msg) => {
    let queue = accessQueue(msg.guild.id);
    if (queue === "noDataFoundInQueue") {
        msg.type.reply("Nothing queued...")
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
            
            msg.type.reply({embeds: [discord.createQueueList(prevMsgQueue, nextMsgQueue, prevDetails, nextDetails, currentDetail)]});
        } else {
            msg.type.reply("Needed to have started music...");
        }
    }
}

exports.join = join;
exports.leave = leave;
exports.addToQueue = addToQueue;
exports.removeFromQueue = removeFromQueue;
exports.clearQueue = clearQueue;
exports.showList = showList;
exports.pause = pause;
exports.next = next;
exports.prev = prev;