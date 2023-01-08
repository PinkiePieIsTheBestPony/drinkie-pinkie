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
        .setColor(generalData["color"])
        .setDescription(generalData["description"])
        .addFields({name: "Commands", value: generalData["fields"]["Commands"]})
        .addFields({name: "Guides", value: generalData["fields"]["Guides"]})
        .addFields({name: "Functions", value: generalData["fields"]["Functions"]})
        .setFooter({iconURL: 'https://cdn.discordapp.com/avatars/721412130661728288/cdeaff2b9089ef86e06b0788bb9f913d.webp?size=80', text: generalData["footer"]});
    }
    else if (msg.includes('query')) {
        let queryData = parsedData["help"]["query"];
        return new MessageEmbed()
        .setTitle(queryData["title"])
        .setColor(queryData["color"])
        .setDescription(queryData["description"])
        .addFields({name: "Commands", value: queryData["fields"]["Commands"]})
        .setFooter({iconURL: 'https://cdn.discordapp.com/avatars/721412130661728288/cdeaff2b9089ef86e06b0788bb9f913d.webp?size=80', text: queryData["footer"]});
    }
    else if (msg.includes('rotation')) {
        let rotationData = parsedData["help"]["rotation"];
        return new MessageEmbed()
        .setTitle(rotationData["title"])
        .setColor(rotationData["color"])
        .setDescription(rotationData["description"])
        .addFields({name: "Commands", value: rotationData["fields"]["Commands"]})
        .addFields({name: "Introduction", value: rotationData["fields"]["Introduction"]})
        .addFields({name: "Example Explained", value: rotationData["fields"]["Example Explained"]})
        .addFields({name: "External Help", value: rotationData["fields"]["External Help"]})
        .setFooter({iconURL: 'https://cdn.discordapp.com/avatars/721412130661728288/cdeaff2b9089ef86e06b0788bb9f913d.webp?size=80', text: rotationData["footer"]});
    }
    else if (msg.includes('prompts')) {
        let promptData = parsedData["help"]["prompts"];
        return new MessageEmbed()
        .setTitle(promptData["title"])
        .setColor(promptData["color"])
        .setDescription(promptData["description"])
        .addFields({name: "Commands", value: promptData["fields"]["Commands"]})
        .addFields({name: "Example", value: promptData["fields"]["Example"]})
        .setFooter({iconURL: 'https://cdn.discordapp.com/avatars/721412130661728288/cdeaff2b9089ef86e06b0788bb9f913d.webp?size=80', text: promptData["footer"]});
    } 
    else if (msg.includes('audio')) {
        let audioData = parsedData["help"]["audio"];
        return new MessageEmbed()
        .setTitle(audioData["title"])
        .setColor(audioData["color"])
        .setDescription(audioData["description"])
        .addFields({name: "Commands", value: audioData["fields"]["Commands"]})
        .setFooter({iconURL: 'https://cdn.discordapp.com/avatars/721412130661728288/cdeaff2b9089ef86e06b0788bb9f913d.webp?size=80', text: audioData["footer"]});
    }
}

export const createEmbeddedImg = (derpiObj, attachment) => {
    return new MessageEmbed()
    .setTitle("Derpibooru Image")
    .setURL("https://derpibooru.org/" + derpiObj["id"])
    .setColor('f5b7d0')
    .addFields({name: "Tags", value: derpiObj["tags"].join(", ").substring(0, 1020).toString()})
    .addFields(
        { name: "Score", value: derpiObj["score"] + "(+" + derpiObj["upvotes"] + "/-" + derpiObj["downvotes"] + ")".toString(), inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: "Faves", value: derpiObj["faves"].toString(), inline: true },
        { name: "Artist", value: getArtistDetails(derpiObj["tags"]).toString(), inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: "Uploaded by", value: derpiObj["uploader"] === null ? 'Anonymous' : derpiObj["uploader"], inline: true }
    )
    .setImage(attachment)
    .setFooter({iconURL: 'https://cdn.discordapp.com/avatars/721412130661728288/cdeaff2b9089ef86e06b0788bb9f913d.webp?size=80', text: "Drinkie Pinkie - Made with 💜"})
}

export const createQueueList = (prevQueue, newQueue, prevInQueue, nextInQueue, currentlyPlaying) => {
    return new MessageEmbed()
    .setTitle("YouTube Queue")
    .setColor('f5b7d0')
    .addFields(
        { name: "Queue Counter", value: (prevQueue.length+1) + "/" + (prevQueue.length + newQueue.length) },
        { name: "Current Song", value: currentlyPlaying}
    )
    .addFields({name: "Prev Tracklist", value: prevInQueue})
    .addFields({name: "Next Tracklist", value: nextInQueue})
    .setFooter({iconURL: 'https://cdn.discordapp.com/avatars/721412130661728288/cdeaff2b9089ef86e06b0788bb9f913d.webp?size=80', text: "Drinkie Pinkie - Made with 💜"})
}

export const createEmbeddedTweet = (images, displayName, username, tweetText, favCount, retweetCount, tweetLink, isVideo) => {
    let embedsAll = [];
    switch (images.length) {
        case 4: {
            embedsAll[3] = new MessageEmbed().setURL(tweetLink).setImage(images[3])
        }
        case 3: {
            embedsAll[2] = new MessageEmbed().setURL(tweetLink).setImage(images[2])
        }
        case 2: {
            embedsAll[1] = new MessageEmbed().setURL(tweetLink).setImage(images[1])
        }
        case 1: {
            embedsAll[0] = 
            new MessageEmbed()
            .setTitle(username + " (@" + displayName + ")")
            .setURL(tweetLink)
            .setColor('f5b7d0')
            .setDescription(tweetText)
            .addFields({name: "\u200B", value: "❤️  " + favCount + " 🔁  " + retweetCount.toString()})
            .setImage(images[0])
            .setFooter({iconURL: 'https://cdn.discordapp.com/avatars/721412130661728288/cdeaff2b9089ef86e06b0788bb9f913d.webp?size=80', text: "Drinkie Pinkie - Made with 💜"})
        }
    }
    return embedsAll;
}