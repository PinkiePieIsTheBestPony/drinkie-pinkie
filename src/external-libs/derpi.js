const dinky = require('dinky.js');
const { derpi_key } = require('../config');

/**
 * Shortcut function which takes a command and strips it for the neccessary data and turns it into an array
 * @private
 * @param {object} message [Discord.js] Message object, generated based on message by user
 * @param {string} query The actual query to strip and turn into an array
 */
function getArguments(message, query) {
    return message.replace(query, '').replace(/\s*,\s*/g, ",").split(',');
}

const getArtistDetails = (tagsArray) => {
    const tags = tagsArray.toString();
    if (tags.includes("artist:")) {
        const numOfArtists = tags.match(new RegExp("artist:", "g") || []).length;
        const pattern = /artist:./;
        const arrOfTags = tags.split(",");
        let tagsStripped = [];
        let a = 0;
        for (i = 0; i < arrOfTags.length; i++) {
            if (numOfArtists == a) {
                const artistsString = tagsStripped.join(", ");
                return artistsString;
            }
            let tag = arrOfTags[i].trim();
            if (pattern.test(tag)) {
                let tagStripped = tag.substring(7);
                if (numOfArtists > 1) {
                    tagsStripped[a] = tagStripped;
                    a++;
                } else {
                    return tagStripped;
                }
            }
        }
    }
    else {
        return "Unknown";
    }
}

/**
 * Does an API call to Derpibooru and grabs a random image
 * @public
 * @param {object} message [Discord.js] Message object, generated based on message by user
 * @param {boolean} isNSFW Checks if channel the command is posted in is NSFW.
 */
const getDerpibooruImage = (message, isNSFW) => {
    let tagList = [];
    if (message == null) {
        tagList = ["pinkie pie", "safe", "solo", "!webm", "score.gte:100"];
    }
    else if (message.includes("!dpi img")) {
        tagList = getArguments(message, '!dpi img ');
    }
    else {
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

exports.getDerpibooruImage = getDerpibooruImage;
exports.getDerpibooruImageID = getDerpibooruImageID;
exports.getArtistDetails = getArtistDetails;