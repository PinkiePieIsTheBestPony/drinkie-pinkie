const discord = require('./external-libs/discord.js')
const derpi = require('./external-libs/derpi.js');
const post = require('./post');
const game = require('./games');
const talk = require('./talk');
const dailyponk = require('./dailyponk');
const rotationQuery = require('./rotationQuery');
const { prefix } = require('./config');

/**
 * This will check every message that Drinkie is sent and will terminate once either a valid message has been sent or 2 minutes has passed.
 * @private
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 * @param {object} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 */
function botMessage(msg, client) {
    msg.author.send("Hi! Drinkie here, please enter your prompt...I'll be waiting :)").then(privateMsg => {
        let filter = m => (m.author.id != client.user.id);
        let collector = privateMsg.channel.createMessageCollector(filter, { time: 120000 } );
        let validResponse = false;

        collector.on('collect', m => {
            let response = talk.jsonConvertor(m.content, msg);
            if (response) {
                validResponse = true;
                collector.stop();
            }
            else {
                m.channel.send("Invalid prompt! Try again?")
            }
        });

        collector.on('end', collected => {
            if (collected.size == 0) {
                msg.author.send("Timeout. Retrigger me to try again.");
            }
            else {
                if (validResponse) {
                    msg.author.send("Your prompt has been submitted!")
                }
                else {
                    msg.author.send("Unfortunately your inputs were invalid. Please retrigger me again.")
                }
            }
        });
    });
}

/**
 * Calls function to get random Derpibooru image, depending on search parameters inputted by user. Will either send just a link or will download the image and send that.
 * @private
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 * @param {object} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 */
async function botGetImg(msg, client) {
    msg.channel.sendTyping();
    if (msg.content.includes("/") || msg.content.includes("\\") || msg.content.includes(";")) {
        msg.reply("GO AWAY")
    }
    else {
        try {
            let returnedImage = await derpi.getDerpibooruImage(msg.content, null, msg.channel.nsfw)
            if (returnedImage !== undefined) {
                post.send(returnedImage, true, msg, client, '', null, null);
            }
            else {
                msg.reply("Your query did not yield any results.");
            }
        } catch (response) {
            if (response == undefined) {
                msg.channel.send("Unknown error...")
            } else {
                msg.channel.send("Error! The network returned the following error code: " + response.status + " - " + response.statusText);
                console.log(response);
            }
        }
    }
}

/**
 * Replies with the relevant help embeded value
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
function botGetHelp(msg) {
    msg.type.reply({embeds: [discord.createEmbeddedHelp(msg.content)]});
}

/**
 * Checks if user inputted value number, and will generate random number which is then sent to be decided on.
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
function botGetRndNum(msg) {
    let number = msg.content.replace(prefix + ' random ', '');
    if (!isNaN(number)) {
        if (number >= 1 && number <= 10) {
            botNum = talk.randomNumber(1, 10);
            talk.decision(number, botNum, msg);
        }
        else {
            msg.reply("Needs to be between 1 and 10. Please try command again with a valid number.")
        }
    }
    else {
        msg.reply("Not a number input. Please try command again with a valid number between 1 and 10.");
    }
}

/**
 * Checks input from user regarding settings for Drinkie and will call relevant function
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
function botSettingsEdit(msg) {
    settingsKeyPair = new Map([
        ["random edit", rotationQuery.randomEdit],
        ["rotation edit", rotationQuery.rotationEdit],
        ["rotation list", rotationQuery.rotationList],
        ["query new", rotationQuery.queryNew],
        ["query list", rotationQuery.queryList],
        ["query remove", rotationQuery.queryRemove],
        ["query edit", rotationQuery.queryEdit],
        ["channel edit", rotationQuery.channelEdit],
        ["channelDefault edit", rotationQuery.channelDefaultEdit],
        ["filter edit", rotationQuery.filterEdit]
    ]);

    let functionName = settingsKeyPair.get(msg.content.split(' ').slice(0, 2).join(' '));
    msg.content = msg.content.split(' ').slice(2).join(' ');

    if (functionName) {
        functionName(msg);
    }
}

/**
 * Posts a response linking to the GitHub page for this bot. (very meta!!)
 * @private
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
function botSource(msg) {
    msg.type.reply("Here is the GitHub link! https://github.com/PinkiePieIsTheBestPony/drinkie-pinkie")
}

/**
 * Interesting algorithm which will take n arguments, and will assign each argument a random percentage value
 * @param {number} length Length of below array
 * @param {object} array Array that contains all the different arguments
 */
function randomStuff(length, array) {
    let totalRandom = 0;
    let arrayOfValues = [];
    for (let i = 0; i < length; i++) {
        let num = talk.randomNumber(0, 101);
        totalRandom += num;
        arrayOfValues.push(num / length);
    }
    let c = ((length * 100) - totalRandom) / length / length;
    for (let j = 0; j < length; j++) {
        arrayOfValues[j] += c
    }
    return array.map((x, y) => "- " + x.trim() + ": " + +arrayOfValues[y].toFixed(3) + "%\n" )
}

/**
 * Checks input for a message and a variable number of options, and will return a message which will choice from one of these options.
 * @public
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
function botPredict(msg) {
    //let remainingArgs = msg.content.replace(prefix + ' predict ', '');
    let splitArgs = msg.content.trim().split(' ');
    let removedArgs = splitArgs.slice(1).join(' ').split("''");
    switch (splitArgs[0]) {
        case 'percentage': {
            if (splitArgs[1] === undefined) {
                msg.type.reply("You need the following argument:`''<question>''`");
            }
            else if (splitArgs[1].substr(0, 2) === "''") {
                if (removedArgs[1] !== undefined) {
                    msg.type.reply("Query: `" + removedArgs[1] + "`\n Drinkie has estimated there is a " + talk.randomNumber(0, 101) + "% chance!" )
                } else {
                    msg.type.reply("Invalid syntax. Use 2 apostrophes independently `''` (not quotation mark) for the end of your message.")
                }
            } else {
                msg.type.reply("Invalid syntax. Use 2 apostrophes independently `''` (not quotation mark) for the start of your message.")
            }
            break;
        }
        case 'percentage-multiple': {
            if (splitArgs[1] === undefined || splitArgs[2] === undefined) {
                msg.type.reply("You need the following arguments:`''<question>'' <option1, option2>`");
            }
            else if (splitArgs[1].substr(0, 2) === "''") {
                if (removedArgs[2] !== undefined) {
                    let matchups = removedArgs[2].trim().split(",");
                    let arrayPercentages = randomStuff(matchups.length, matchups);
                    msg.type.reply("Question: `" + removedArgs[1] + "`\n Each of your options will be presented with a percentage:\n" + arrayPercentages.join(''))
                } else {
                    msg.type.reply("Invalid syntax. Use 2 apostrophes independently `''` (not quotation mark) for the end of your message.")
                }
            } else {
                msg.type.reply("Invalid syntax. Use 2 apostrophes independently `''` (not quotation mark) for the start of your message.")
            }
            break;
        }
        case 'option': {
            if (splitArgs[1] === undefined || splitArgs[2] === undefined) {
                msg.type.reply("You need the following arguments:`''<question>'' <option1, option2>`");
            }
            else if (splitArgs[1].substr(0, 2) === "''") {
                if (removedArgs[2] !== undefined) {
                    let matchups = removedArgs[2].trim().split(",");
                    msg.type.reply("Question: `" + removedArgs[1] + "`\n Choices are:\n" + matchups.map(x => "- " + x.trim() + "\n").join('') + "Drinkie has chosen: `" + matchups[talk.randomNumber(0, matchups.length)].trim() + "`");
                } else {
                    msg.type.reply("Invalid syntax. Use 2 apostrophes independently `''` (not quotation mark) for the end of your message.")
                }
            } else {
                msg.type.reply("Invalid syntax. Use 2 apostrophes independently `''` (not quotation mark) for the start of your message.")
            }
            break;
        }
        default: {
            msg.type.reply("You have not selected a prediction mode! Choose between the following: `option, percentage, percentage-multiple`");
        }
    }
}

function botBroadcast(msg, client) {
    if (msg.channel.type === "DM") {
        if (msg.author.id === "113460834692268032") {
            let remainingArgs = msg.content.replace(prefix + ' broadcast ', '');
            let serverType = remainingArgs.trim().split(' ')[0];
            let message = remainingArgs.substr(remainingArgs.indexOf(' ')+1);
            if (serverType === "all") {
                post.send(null, false, null, client, message, null, null)
            } else if (/\d/.test(serverType)) {
                let servers = serverType.split(',');
                let server = [...client.guilds.cache.values()].filter((guild) => {
                    for (let i = 0; i < servers.length; i++) {
                        let server = servers[i];
                        if (guild.id === server) {
                            return guild.id;
                        }
                    }
                });
                if (server.length > 0) {
                    post.send(null, false, null, client, message, server, null)
                } else {
                    msg.reply("Invalid input.")
                }
            } else {
                msg.reply("Invalid input.")
            }
        } else {
            msg.reply("Not authorised!");
        }
    }
}

/**
 * Checks input from user regarding commands for Drinkie and will call relevant function
 * @public
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
const possibleResponses = (msg, client) => {
    responsesKeyPair = new Map([
        [prefix + " msg ", botMessage],
        [prefix + " img ", botGetImg],
        [prefix + " help ", botGetHelp],
        [prefix + " random ", botGetRndNum],
        [prefix + " settings ", botSettingsEdit],
        [prefix + " game ", game.botGames],
        [prefix + " dailyponk ", dailyponk.botPonkSearch],
        [prefix + " source ", botSource],
        [prefix + " predict ", botPredict],
        [prefix + " broadcast ", botBroadcast]
    ]);

    if (msg.mentions.has(client.user)) {
        talk.getPrompts(msg, client);
    } else if (msg.author.bot) {return}

    //gets first two words of message to check which command it is trying to check
    let msgArr = msg.content.split(' ').slice(0, 3);
    let command = msg.content;
    if (msgArr.length > 2) {
        msgArr.splice(-1, 1, "")
        command = msgArr.join(' ')
    } else {
        command = command + " ";
    }
    
    let functionName = responsesKeyPair.get(command);
    if (functionName) {
        functionName({content: msg.content.split(' ').slice(2).join(' ') === '' ? null : msg.content.split(' ').slice(2).join(' '), channel: msg.channel, guild: msg.guild, author: msg.author, type: msg}, client);
    }
}

/**
 * Checks input from user regarding commands for Drinkie and will call relevant function
 * @public
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
 const possibleResponsesSlash = (interaction, client) => {
    const responsesKeyPair = new Map([
        ["msg", botMessage],
        ["img", botGetImg],
        ["help", botGetHelp],
        ["random", botGetRndNum],
        ["settings", botSettingsEdit],
        ["game", game.botGames],
        ["dailyponk", dailyponk.botPonkSearch],
        ["source", botSource],
        ["predict", botPredict]
    ]);

    const optionNameKeyPair = new Map([
        ["msg", null],
        ["img", "query"],
        ["help", "help_choice"],
        ["random", "number"],
        ["settings", "system_choice"],
        ["game", "game_choice"],
        ["dailyponk", "search"],
        ["source", null],
        ["predict", "predict_options"]
    ]);
    
    let functionName = responsesKeyPair.get(interaction.commandName);
    let name = optionNameKeyPair.get(interaction.commandName);
    let values = '';
    if (name !== null) {
        values = interaction.options.getString(name);
    }
    
    if (functionName) {
        functionName({content: values, channel: interaction.channel, type: interaction, author: interaction.member, guild: interaction.guild}, client);
    }
}

exports.possibleResponses = possibleResponses;
exports.possibleResponsesSlash = possibleResponsesSlash;