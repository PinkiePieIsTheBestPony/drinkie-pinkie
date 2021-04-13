const dinky = require('dinky.js');
const fetch = require('node-fetch');
const post = require('../post');
const { derpi_key } = require('../config');

/**
 * Shortcut function which takes a command and strips it for the neccessary data and turns it into an array
 * @private
 * @param {Message} message [Discord.js] Message object, generated based on message by user
 * @param {string} query The actual query to strip and turn into an array
 */
function getArguments(message, query) {
    return message.replace(query, '').replace(/\s*,\s*/g, ",").split(',');
}

/**
 * Does an API call to Derpibooru and grabs a random image
 * @public
 * @param {Message} message [Discord.js] Message object, generated based on message by user
 * @param {boolean} isNSFW Checks if channel the command is posted in is NSFW.
 */
const getDerpibooruImage = (message, isNSFW) => {
    let tagList = '';
    if (message == null) {
        tagList = ["pinkie pie", "safe", "solo", "!webm", "score.gte:100"];
    }
    else if (message.includes("!dpi img --downloadImage")) {
        tagList = getArguments(message, '!dpi img --downloadImage ');
    }
    else if (message.includes("!dpi img")) {
        tagList = getArguments(message, '!dpi img ');
    }
    else if (message.includes(",")) {
        tagList = getArguments(message, '');
    }
    if (isNSFW) {
        if (!tagList.includes("suggestive") && !tagList.includes("questionable") && !tagList.includes("explicit")) {
            if (Math.random() < 0.33) {
                tagList.push("suggestive");
            } else if (Math.random() < 0.66) {
                tagList.push("questionable");
            } else {
                tagList.push("explicit");
            }
        }
        for (let i = 0; i < tagList.length; i++) {
            if (tagList[i].includes("safe")) {
                tagList.splice(i, 1);
                if (Math.random() < 0.33) {
                    tagList.push("suggestive")
                } else if (Math.random() < 0.66) {
                    tagList.push("questionable");
                } else {
                    tagList.push("explicit");
                }
            }
        }
    }
    else {
        if (!tagList.includes("safe")) {
            tagList.push("safe");
        }
        for (let i = 0; i < tagList.length; i++) {
            if (tagList[i].includes("explicit") || tagList[i].includes("questionable") || tagList.includes("suggestive")) {
                tagList.splice(i, 1);
                tagList.push("safe");
            }
        }
    }
    
    return dinky({key: derpi_key}).search(tagList).random().limit(1);
}

const getDerpibooruImageID = (id) => {
    return dinky({key: derpi_key}).images().getById(id);
}

/**
 * Downloads the image and puts it into a Buffer Object
 * @public
 * @param {Images} derpiObject [dinky.js] The derpibooru object which contains all the information about the random image selected.
 * @param {boolean} isRequest Checks if the reason for image being sent is from a !dpi img message.
 * @param {Message} messageObject [Discord.js] Message object, generated based on message by user
 * @param {String} message Message to add to post
 * @param {Client} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 * @param {String} serverID The specific ID of the Server in which the bot is sending the image to, so it only sends to that server (in most cases).
 */
const fetchDerpibooruImage = (derpiObject, isRequest, messageObject, client, message, serverID) => {
    fetch(derpiObject["viewUrl"])
    .then(res => res.buffer())
    .then(buffer => post.send(buffer, derpiObject, isRequest, messageObject, client, message, serverID))
    .catch(error => console.error(error))
}

exports.getDerpibooruImage = getDerpibooruImage;
exports.fetchDerpibooruImage = fetchDerpibooruImage;
exports.getDerpibooruImageID = getDerpibooruImageID