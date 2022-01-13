import { Client, Intents, MessageEmbed } from 'discord.js';
import {getJSONFile} from '../json/jsonReader.js';
import {getArtistDetails} from './derpi.js';

/**
 * Initialise Drinkie
 * @public
 */
export const initialiseDiscordJS = () => {
    return new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS], partials: ['CHANNEL']});
}

/**
 * Reads a JSON file and creates a new messageEmbed object to be sent which a user needs help
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
export const createEmbeddedHelp = (msg) => {
    let parsedData = getJSONFile('help.json')
    if (msg === null) {
        let generalData = parsedData["help"]["general"];
        return new MessageEmbed()
        .setTitle(generalData["title"])
        .setAuthor({name: generalData["author"]})
        .setColor(generalData["color"])
        .setDescription(generalData["description"])
        .addField("Commands", generalData["fields"]["Commands"])
        .addField("Guides", generalData["fields"]["Guides"])
        .addField("Functions", generalData["fields"]["Functions"]);
        
    }
    else if (msg.includes('query')) {
        let queryData = parsedData["help"]["query"];
        return new MessageEmbed()
        .setTitle(queryData["title"])
        .setAuthor({name: queryData["author"]})
        .setColor(queryData["color"])
        .setDescription(queryData["description"])
        .addField("Commands", queryData["fields"]["Commands"])
    }
    else if (msg.includes('rotation')) {
        let rotationData = parsedData["help"]["rotation"];
        return new MessageEmbed()
        .setTitle(rotationData["title"])
        .setAuthor({name: rotationData["author"]})
        .setColor(rotationData["color"])
        .setDescription(rotationData["description"])
        .addField("Commands", rotationData["fields"]["Commands"])
        .addField("Introduction", rotationData["fields"]["Introduction"])
        .addField("Example Explained", rotationData["fields"]["Example Explained"])
        .addField("External Help", rotationData["fields"]["External Help"])
    }
    else if (msg.includes('prompts')) {
        let promptData = parsedData["help"]["prompts"];
        return new MessageEmbed()
        .setTitle(promptData["title"])
        .setAuthor(promptData["author"])
        .setColor(promptData["color"])
        .setDescription(promptData["description"])
        .addField("Commands", promptData["fields"]["Commands"])
        .addField("Example", promptData["fields"]["Example"])
        .addField("Example Explained", promptData["fields"]["Example Explained"])
    } 
    else if (msg.includes('audio')) {
        let audioData = parsedData["help"]["audio"];
        return new MessageEmbed()
        .setTitle(audioData["title"])
        .setAuthor(audioData["author"])
        .setColor(audioData["color"])
        .setDescription(audioData["description"])
        .addField("Commands", audioData["fields"]["Commands"]);
    }
}

export const createEmbeddedImg = (derpiObj, attachment) => {
    return new MessageEmbed()
    .setTitle("Derpibooru Image")
    .setURL("https://derpibooru.org/" + derpiObj["id"])
    .addField("Tags", derpiObj["tags"].join(", ").substring(0, 1020).toString())
    .addFields(
        { name: "Score", value: derpiObj["score"] + "(+" + derpiObj["upvotes"] + "/-" + derpiObj["downvotes"] + ")".toString(), inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: "Faves", value: derpiObj["faves"].toString(), inline: true },
        { name: "Artist", value: getArtistDetails(derpiObj["tags"]).toString(), inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: "Uploaded by", value: derpiObj["uploader"] === null ? 'Anonymous' : derpiObj["uploader"], inline: true }
    )
    .setImage(attachment)
    .setFooter({text: "Drinkie Pinkie - Made with 💜"})
}

export const createQueueList = (prevQueue, newQueue, prevInQueue, nextInQueue, currentlyPlaying) => {
    return new MessageEmbed()
    .setTitle("YouTube Queue")
    .addFields(
        { name: "Queue Counter", value: (prevQueue.length+1) + "/" + (prevQueue.length + newQueue.length) },
        { name: "Current Song", value: currentlyPlaying}
    )
    .addField("Prev Tracklist", prevInQueue)
    .addField("Next Tracklist", nextInQueue)
}