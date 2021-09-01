const { Client, Intents, MessageEmbed } = require('discord.js');
const reader = require('../json/jsonReader');
const derpi = require('./derpi.js');

/**
 * Initialise Drinkie
 * @public
 */
const initialiseDiscordJS = () => {
    return new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES], partials: ['CHANNEL']});
}

/**
 * Reads a JSON file and creates a new messageEmbed object to be sent which a user needs help
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
const createEmbeddedHelp = (msg) => {
    let parsedData = reader.getJSONFile('help.json')
    if (msg === null) {
        let generalData = parsedData["help"]["general"];
        return new MessageEmbed()
        .setTitle(generalData["title"])
        .setAuthor(generalData["author"])
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
        .setAuthor(queryData["author"])
        .setColor(queryData["color"])
        .setDescription(queryData["description"])
        .addField("Commands", queryData["fields"]["Commands"])
    }
    else if (msg.includes('rotation')) {
        let rotationData = parsedData["help"]["rotation"];
        return new MessageEmbed()
        .setTitle(rotationData["title"])
        .setAuthor(rotationData["author"])
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
}

const createEmbeddedImg = (derpiObj, attachment) => {
    return new MessageEmbed()
    .setTitle("Derpibooru Image")
    .setURL("https://derpibooru.org/" + derpiObj["id"])
    .addField("Tags", derpiObj["tags"].join(", ").substring(0, 1020).toString())
    .addFields(
        { name: "Score", value: derpiObj["score"] + "(+" + derpiObj["upvotes"] + "/-" + derpiObj["downvotes"] + ")".toString(), inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: "Faves", value: derpiObj["faves"].toString(), inline: true },
        { name: "Artist", value: derpi.getArtistDetails(derpiObj["tags"]), inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: "Uploaded by", value: derpiObj["uploader"] === null ? 'Artist Known' : derpiObj["uploader"], inline: true }
    )
    .setImage(attachment)
    .setFooter("Drinkie Pinkie - Made with 💜")
}

exports.initialiseDiscordJS = initialiseDiscordJS;
exports.createEmbeddedHelp = createEmbeddedHelp;
exports.createEmbeddedImg = createEmbeddedImg;