const Discord = require('discord.js');
const reader = require('../json/jsonReader');
const derpi = require('./derpi');

/**
 * Initialise Drinkie
 * @public
 */
const initialiseDiscordJS = () => {
    return new Discord.Client();
}

/**
 * Reads a JSON file and creates a new messageEmbed object to be sent which a user needs help
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
const createEmbeddedHelp = (msg) => {
    let parsedData = reader.getJSONFile('help.json')
    if (msg.includes('query')) {
        let queryData = parsedData["help"]["query"];
        return new Discord.MessageEmbed()
        .setTitle(queryData["title"])
        .setAuthor(queryData["author"])
        .setColor(queryData["color"])
        .setDescription(queryData["description"])
        .addField("Commands", queryData["fields"]["Commands"])
    }
    else if (msg.includes('rotation')) {
        let rotationData = parsedData["help"]["rotation"];
        return new Discord.MessageEmbed()
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
        return new Discord.MessageEmbed()
        .setTitle(promptData["title"])
        .setAuthor(promptData["author"])
        .setColor(promptData["color"])
        .setDescription(promptData["description"])
        .addField("Commands", promptData["fields"]["Commands"])
        .addField("Example", promptData["fields"]["Example"])
        .addField("Example Explained", promptData["fields"]["Example Explained"])
    }
    else {
        let generalData = parsedData["help"]["general"];
        return new Discord.MessageEmbed()
        .setTitle(generalData["title"])
        .setAuthor(generalData["author"])
        .setColor(generalData["color"])
        .setDescription(generalData["description"])
        .addField("Commands", generalData["fields"]["Commands"])
        .addField("Guides", generalData["fields"]["Guides"])
        .addField("Functions", generalData["fields"]["Functions"]);
    }
}

const createEmbeddedImg = (derpiObj, attachment) => {
    return new Discord.MessageEmbed()
    .setTitle("Derpibooru Image")
    .setURL("https://derpibooru.org/" + derpiObj["id"])
    .addField("Tags", derpiObj["tags"].join(", ").substring(0, 1020))
    .addFields(
        { name: "Score", value: derpiObj["score"] + "(+" + derpiObj["upvotes"] + "/-" + derpiObj["downvotes"] + ")", inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: "Faves", value: derpiObj["faves"], inline: true },
        { name: "Artist", value: derpi.getArtistDetails(derpiObj["tags"]), inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: "Uploaded by", value: derpiObj["uploader"], inline: true }
    )
    .setImage(attachment)
    .setFooter("Drinkie Pinkie - Made with 💜")
}

exports.initialiseDiscordJS = initialiseDiscordJS;
exports.createEmbeddedHelp = createEmbeddedHelp;
exports.createEmbeddedImg = createEmbeddedImg;