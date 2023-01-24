import { Client, Intents, MessageEmbed, MessageActionRow, MessageButton } from 'discord.js';
import {getJSONFile} from '../json/jsonReader.js';
import {getArtistDetails} from './derpi.js';

/**
 * Initialise Drinkie
 * @public
 */
export const initialiseDiscordJS = () => {
    return new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS], partials: ['CHANNEL']});
}

function generalEmbed(generalData, fieldName, fieldInfo) {
    return new MessageEmbed()
        .setTitle(generalData["title"] + " - " + fieldName)
        .setColor(generalData["color"])
        .setDescription(fieldInfo)
        .setFooter({iconURL: 'https://cdn.discordapp.com/avatars/721412130661728288/cdeaff2b9089ef86e06b0788bb9f913d.webp?size=80', text: generalData["footer"]})
}

function commandEmbed(generalData, command, bonusInfo, commandName) {
    const embed = new MessageEmbed()
        .setTitle(generalData["titlecommand"])
        .setColor(generalData["color"])
        .setDescription(generalData["description"])
        .addFields({name: "Command: `" + commandName + "`", value: command})
        .setFooter({iconURL: 'https://cdn.discordapp.com/avatars/721412130661728288/cdeaff2b9089ef86e06b0788bb9f913d.webp?size=80', text: generalData["footer"]});

    if (bonusInfo !== null) { 
        embed.addFields({name: "Bonus Info", value: bonusInfo})
    }
        
    return embed;
}

function setupCommand(msg, generalData, allGeneralCommands, source) {
    if (msg !== null && msg.includes(source)) {
        let typedCommand = msg.replace(source + ' ', '');
        let filteredCommands = Object.keys(allGeneralCommands).filter(command => command === typedCommand)
        if (filteredCommands.length > 0) {
            let bonusInfo = generalData["fields"]["Bonus Info"][filteredCommands];
            return [commandEmbed(generalData, allGeneralCommands[typedCommand], bonusInfo, filteredCommands), null, null, source];
        } else if (source === "general") {
            filteredCommands = Object.keys(generalData["fields"]["Guides"]).filter(command => command === typedCommand);
            if (filteredCommands.length > 0) {
                return [commandEmbed(generalData, generalData["fields"]["Guides"][typedCommand], null, filteredCommands), null, null, source];
            }
        } else if (typedCommand !== "") {
            let replyToMsg = "Invalid command to search! `" + typedCommand + "` does not exist within `" + source + "`";
            return [null, replyToMsg, null, null];
        }
    }
    return false
}

export const editEmbed = (buttonPressed, typeOfHelp, editMsg, buttons) => {
    let parsedData = getJSONFile('help.json')
    let generalData = parsedData["help"][typeOfHelp];
    let buttonLabel = buttons.components[buttonPressed.customId[buttonPressed.customId.length-1] - 1].label
    let newInfo = generalData["fields"][buttonLabel];
    let infoHelp;
    if (typeof newInfo === 'string') {
        infoHelp = newInfo;
    } else {
        infoHelp = Object.keys(newInfo).map((command) => newInfo[command]).join('\n\n');
    } 
    let modifiedEmbed = generalEmbed(generalData, buttonLabel, infoHelp)
    editMsg.edit({ embeds: [modifiedEmbed], components: [buttons] });
}

/**
 * Reads a JSON file and creates a new messageEmbed object to be sent which a user needs help
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
export const createEmbeddedHelp = (msg) => {
    let parsedData = getJSONFile('help.json')
    if (msg === ' ' || msg === null || msg.includes('general')) {
        let source = "general";
        let generalData = parsedData["help"]["general"];
        let allGeneralCommands = generalData["fields"]["Commands"];
        let results = setupCommand(msg, generalData, allGeneralCommands, source);
        if (results !== false) {
            return results;
        }

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
					.setCustomId('button1')
					.setLabel(Object.keys(generalData["fields"])[0])
					.setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('button2')
                    .setLabel(Object.keys(generalData["fields"])[2])
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('button3')
                    .setLabel(Object.keys(generalData["fields"])[3])
                    .setStyle('PRIMARY'),
			);
         
        let filter = i => i.customId === 'button1' || i.customId === 'button2' || i.customId === 'button3'
        let arrayOfCommands = Object.keys(allGeneralCommands).map((command) => allGeneralCommands[command]);
        return [generalEmbed(generalData, Object.keys(generalData["fields"])[0], arrayOfCommands.join('\n\n')), row, filter, source];
    }
    else if (msg.includes('query')) {
        let source = "query";
        let queryData = parsedData["help"]["query"];
        let allGeneralCommands = queryData["fields"]["Commands"];
        let results = setupCommand(msg, queryData, allGeneralCommands, source);
        if (results !== false) {
            return results;
        }

        let arrayOfCommands = Object.keys(allGeneralCommands).map((command) => allGeneralCommands[command]);
        return [generalEmbed(queryData, Object.keys(queryData["fields"])[0], arrayOfCommands.join('\n\n')), null, null, source];
    }
    else if (msg.includes('rotation')) {
        let source = "rotation";
        let rotationData = parsedData["help"]["rotation"];
        let allGeneralCommands = rotationData["fields"]["Commands"];
        let results = setupCommand(msg, rotationData, allGeneralCommands, source);
        if (results !== false) {
            return results;
        }

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
					.setCustomId('button1')
					.setLabel(Object.keys(rotationData["fields"])[0])
					.setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('button2')
                    .setLabel(Object.keys(rotationData["fields"])[1])
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('button3')
                    .setLabel(Object.keys(rotationData["fields"])[2])
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('button4')
                    .setLabel(Object.keys(rotationData["fields"])[3])
                    .setStyle('PRIMARY'),
			);
         
        let filter = i => i.customId === 'button1' || i.customId === 'button2' || i.customId === 'button3' || i.customId === "button4";
        let arrayOfCommands = Object.keys(allGeneralCommands).map((command) => allGeneralCommands[command]);
        return [generalEmbed(rotationData, Object.keys(rotationData["fields"])[0], arrayOfCommands.join('\n\n')), row, filter, source];
    }
    else if (msg.includes('prompts')) {
        let source = "prompts";
        let promptData = parsedData["help"]["prompts"];
        let allGeneralCommands = promptData["fields"]["Commands"];
        let results = setupCommand(msg, promptData, allGeneralCommands, source);
        if (results !== false) {
            return results;
        }

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
					.setCustomId('button1')
					.setLabel(Object.keys(promptData["fields"])[0])
					.setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('button2')
                    .setLabel(Object.keys(promptData["fields"])[1])
                    .setStyle('PRIMARY'),
			);
         
        let filter = i => i.customId === 'button1' || i.customId === 'button2'
        let arrayOfCommands = Object.keys(allGeneralCommands).map((command) => allGeneralCommands[command]);
        return [generalEmbed(promptData, Object.keys(promptData["fields"])[0], arrayOfCommands.join('\n\n')), row, filter, source];
    } 
    else if (msg.includes('audio')) {
        let source = "audio";
        let audioData = parsedData["help"]["audio"];
        let allGeneralCommands = audioData["fields"]["Commands"];
        let results = setupCommand(msg, audioData, allGeneralCommands, source);
        if (results !== false) {
            return results;
        }

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
					.setCustomId('button1')
					.setLabel(Object.keys(audioData["fields"])[0])
					.setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('button2')
                    .setLabel(Object.keys(audioData["fields"])[1])
                    .setStyle('PRIMARY'),
			);
         
        let filter = i => i.customId === 'button1' || i.customId === 'button2'
        let arrayOfCommands = Object.keys(allGeneralCommands).map((command) => allGeneralCommands[command]);
        return [generalEmbed(audioData, Object.keys(audioData["fields"])[0], arrayOfCommands.join('\n\n')), row, filter, source];
    }
    else if (msg.includes('mediafetch')) {
        let source = "mediafetch";
        let mediaData = parsedData["help"]["mediafetch"];
        let allGeneralCommands = mediaData["fields"]["Commands"];
        let results = setupCommand(msg, mediaData, allGeneralCommands, source);
        if (results !== false) {
            return results;
        }

        let arrayOfCommands = Object.keys(allGeneralCommands).map((command) => allGeneralCommands[command]);
        return [generalEmbed(mediaData, Object.keys(mediaData["fields"])[0], arrayOfCommands.join('\n\n')), null, null, source];
    }
    else if (msg.includes('journal')) {
        let source = "journal";
        let journalData = parsedData["help"]["journal"];
        let allGeneralCommands = journalData["fields"]["Commands"];
        let results = setupCommand(msg, journalData, allGeneralCommands, source);
        if (results !== false) {
            return results;
        }
         
        let arrayOfCommands = Object.keys(allGeneralCommands).map((command) => allGeneralCommands[command]);
        return [generalEmbed(journalData, Object.keys(journalData["fields"])[0], arrayOfCommands.join('\n\n')), null, null, source];
    }
    else if (msg.includes('command')) {
        let sectionData = parsedData["help"]
        let allSections = Object.keys(sectionData);
        let allData = [];
        allData[0] = Object.keys(sectionData["general"]["fields"]["Guides"]).map(command => sectionData["general"]["fields"]["Guides"][command]);
        for (let i = 0; i < allSections.length; i++) {
            allData[i+1] = Object.keys(sectionData[allSections[i]]["fields"]["Commands"]).map(command => sectionData[allSections[i]]["fields"]["Commands"][command]);
        }
        return [new MessageEmbed()
        .setTitle("All Current Commands")
        .setColor('f5b7d0')
        .setDescription("Here is every current relevant command:")
        .addFields({name: "Guide Commands", value: allData[0].join('\n')})
        .addFields({name: "Query Commands", value: allData[1].join('\n')})
        .addFields({name: "Rotation Commands", value: allData[2].join('\n')})
        .addFields({name: "Prompt Commands", value: allData[3].join('\n')})
        .addFields({name: "Audio Commands", value: allData[4].join('\n')})
        .addFields({name: "Mediafetch Commands", value: allData[5].join('\n')})
        .addFields({name: "Journal Commands", value: allData[6].join('\n')})
        .addFields({name: "General Commands", value: allData[7].join('\n')})
        .setFooter({iconURL: 'https://cdn.discordapp.com/avatars/721412130661728288/cdeaff2b9089ef86e06b0788bb9f913d.webp?size=80', text: "Drinkie Pinkie - Made with 💜"}), null, null, "command"];
    } else {
        let replyToMsg = "Command not found!";
        return [null, replyToMsg, null, null];
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