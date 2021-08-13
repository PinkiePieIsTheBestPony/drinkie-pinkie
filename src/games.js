const { prefix } = require('./config');

var peoplePlaying = [];

/**
 * Make the gameboard
 */
function initTTT() {
    //empty board;
    let board = new String(
    "⬛|⬛|⬛\n" +
    "⬛|⬛|⬛\n" +
    "⬛|⬛|⬛");
    return board;
}

/**
 * Determine who starts and what symbol they'll be using
 * @private
 * @param {string[]} players Contains both player's Discord IDs.
 */
function setupTTT(players) {
    let rankings = {};
    //determine who goes first (X)
    if (Math.random() >= 0.5) {
        rankings = { "first": [players[0], "X"], "second": [players[1], "O"] };
    } else {
        rankings = { "first": [players[1], "X"], "second": [players[0], "O"] };
    }
    return rankings;
}

/**
 * Custom function to simulate mutable Strings since they don't exist within JavaScript
 * @private
 * @param {string} string String which will be being modified
 * @param {number} index This will specify the specific position within the above text variable that will be replaced
 * @param {string} replacement Index position value above will be replaced with this string value
 */
function replaceAtIndex(string, index, replacement) {
    return string.substr(0, index) + replacement + string.substr(index + replacement.length);
}

/**
 * This function will specifically change the tic tac toe board to add the ❌ & ⭕
 * @private
 * @param {object} filledSlots This holds the particular position of symbols within the game
 * @param {number[]} indexSlots This holds information about which index positions to replace for the game
 * @param {string} board String representation of the gameboard which is shown in chat
 */
function fillBoard(filledSlots, indexSlots, board) {
    let slotToEmoji = {"X": "❌", "O": "⭕" }
    let length = Object.keys(filledSlots).length;
    let modifiedBoard = board;
    for (i = 1; i < length+1; i++) {
        let slotValue = filledSlots[i];
        if (slotValue != null) {
            let emojiValue = slotToEmoji[slotValue]
            modifiedBoard = replaceAtIndex(modifiedBoard, indexSlots[i-1], emojiValue);
        }
    }
    return modifiedBoard;
}

/**
 * Checks if a win-condition has been reached, with epic performance boost
 * @private
 * @param {object} filledSlots This holds the particular position of symbols within the game
 * @param {string} symbol The nought or cross
 */
function validate(filledSlots, symbol) {
    //i dunno
    if (filledSlots[1] == symbol && filledSlots[2] == symbol && filledSlots[3] == symbol || 
        filledSlots[4] == symbol && filledSlots[5] == symbol && filledSlots[6] == symbol ||
        filledSlots[7] == symbol && filledSlots[8] == symbol && filledSlots[9] == symbol ||
        filledSlots[1] == symbol && filledSlots[4] == symbol && filledSlots[7] == symbol ||
        filledSlots[2] == symbol && filledSlots[5] == symbol && filledSlots[8] == symbol ||
        filledSlots[3] == symbol && filledSlots[6] == symbol && filledSlots[9] == symbol ||
        filledSlots[1] == symbol && filledSlots[5] == symbol && filledSlots[9] == symbol ||
        filledSlots[3] == symbol && filledSlots[5] == symbol && filledSlots[7] == symbol) {
            return true;
    }
    return false;
}

function removePlayer(player) {
    let i = 0
    while (i < peoplePlaying.length) {
        if (peoplePlaying[i] == player) {
            peoplePlaying.splice(peoplePlaying.indexOf(player), 1);
        } else {
            i++;
        }
    }
}

/**
 * Main game recursive loop for tic-tac-toe, does the following things ->
 * 1) Checks who's turn to play
 * 2) Check status of board, and send message asking where player will place, done through reacting to the number that corresponds to your position
 * 3) Loops through until either somebody wins or the game ends in a tie (or an error occurs)
 * @param {object} msg [Discord.js] Message object representation of message that kicked off game.
 * @param {object} player Dictionary object that contains details about particular player who is player (ID & whether they play first or second).
 * @param {object} numToWord Dictionary object that converts emoji to number.
 * @param {number} numberOfTurns Amount of turns until game is over.
 * @param {string} board Array that contains representation of the game board - starts blank, but values within string are replaced with X & Os.
 * @param {object} filledSlots Dictionary that keeps which parts of the board have been filled in and which parts haven't.
 * @param {object} rankings Dictionary object that contains details of the two players.
 * @param {number[]} indexSlots This holds information about which index positions to replace for the game
 * @returns 
 */
async function sendBoard(msg, player, numToWord, numberOfTurns, board, filledSlots, rankings, indexSlots) {
    if ([1, 3, 5, 7, 9].includes(numberOfTurns)) {
        player = rankings['first']
    } else {
        player = rankings['second']
    }

    board = fillBoard(filledSlots, indexSlots, board);

    try {
        let msgGame = await msg.channel.send(board + "\nIt is your turn to choose a number which correlates to your spot, <@!" + player[0] + ">");
        for (let i = 0; i < Object.keys(filledSlots).length; i++) {
            if (filledSlots[i+1] === null) {
                await msgGame.react(Object.keys(numToWord)[i]) 
            }
        }

        const filter = (reaction, user) => { return user.id == player[0] && (reaction.emoji.name == "1️⃣" || reaction.emoji.name == "2️⃣" || reaction.emoji.name == "3️⃣" || reaction.emoji.name == "4️⃣" || 
        reaction.emoji.name == "5️⃣" || reaction.emoji.name == "6️⃣" || reaction.emoji.name == "7️⃣" || reaction.emoji.name == "8️⃣" || reaction.emoji.name == "9️⃣") };
        const collector = await msgGame.createReactionCollector(filter);

        collector.on('collect', (reaction, user) => {
            if (user.id == player[0]) {
                let num = numToWord[reaction.emoji.name];
                filledSlots[num] = player[1];
                collector.stop();
            }
        });
    
        collector.on('end', collected => {
            numberOfTurns--;
            if (numberOfTurns < 7) {
                result = validate(filledSlots, player[1]);
                if (result) {
                    board = fillBoard(filledSlots, indexSlots, board);
                    msg.channel.send(board + "\nCongrats <@!" + player[0] + ">, you have won!");
                    peoplePlaying.filter(person => rankings['first'][0] == person || rankings['second'][0] == person).forEach(player => removePlayer(player));
                    return 0;
                }
            }
            if (numberOfTurns > 0) {
                sendBoard(msg, player, numToWord, numberOfTurns, board, filledSlots, rankings, indexSlots);
            } else {
                board = fillBoard(filledSlots, indexSlots, board);
                msg.channel.send(board + "\nYou have both tied!")
                peoplePlaying.filter(person => rankings['first'][0] == person || rankings['second'][0] == person).forEach(player => removePlayer(player));
                return 0;
            }
        });

    } catch (error) {
        console.log(error);
        msg.channel.send("Error occurred...")
        peoplePlaying.filter(person => rankings['first'][0] == person || rankings['second'][0] == person).forEach(player => removePlayer(player));
        return 1;
    }
}

/**
 * Setting up everything for tic-tac-toe
 * @private
 * @param {string[]} players Contains both player's Discord IDs.
 * @param {object} msg [Discord.js] Message object representation of message that kicked off game.
 */
function playTTT(players, msg) {
    let board = initTTT();
    let rankings = setupTTT(players);
    //pieces to use (x or o);
    //[1],[2],...
    //[1]->[1,1]//[5]->[3,3]//[9]->[5,5]
    msg.channel.send("<@!" + rankings['first'][0] + "> has been randomly selected to go first and will be playing ❌");
    let filledSlots = {1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null};
    let numToWord = {"1️⃣": 1, "2️⃣": 2, "3️⃣": 3, "4️⃣": 4, "5️⃣": 5, "6️⃣": 6, "7️⃣": 7, "8️⃣": 8, "9️⃣": 9};
    let indexSlots = [0, 2, 4, 6, 8, 10, 12, 14, 16];
    let numberOfTurns = 9;
    let player;

    sendBoard(msg, player, numToWord, numberOfTurns, board, filledSlots, rankings, indexSlots);
}

/**
 * Checks input to determine if game inputted is relevant
 * @private
 * @param {string} gameName Name of game to be played.
 * @param {string[]} players Contains both player's Discord IDs.
 * @param {object} msg [Discord.js] Message object representation of message that kicked off game.
 */
function init(gameName, players, msg) {
    responsesKeyPair = new Map([
        ["tictactoe", playTTT]
    ]);

    let functionName = responsesKeyPair.get(gameName);
    if (functionName) {
        functionName(players, msg);
    }
}

/**
 * Checks input from user regarding games that Drinkie can play and will attempt to play it.
 * @private
 * @param {object} msg Message object, generated based on message by user
 */
 const botGames = (msg) => {
    let remainingArgs = msg.content.replace(prefix + ' game ', '');
    //!dpi game tictactoe <user>

    if (remainingArgs.startsWith("tictactoe <")) {
        let player1 = msg.author.id;
        let player2 = msg.mentions.users.first().id;
        let gameState = false;
        if (!peoplePlaying.find(person => { return person == player1 || person == player2 })) {
            peoplePlaying.push(player1, player2);
            if (player1 === player2) {
                msg.channel.send("<@!" + player1 + "> wants to play with themselves apparently...are you sure you want this match? Y/N")
            } else {
                msg.channel.send("<@!" + player1 + "> has issued a tic-tac-toe game with <@!" + player2 + ">. Do you accept this match? Y/N")
            }
            let player2Filter = m => m.author.id == player2
            let collector = msg.channel.createMessageCollector(player2Filter, { time: 60000 });

            collector.on('collect', m => {
                if (m.content.toLowerCase() == "y") {
                    gameState = true;
                    collector.stop();
                }
                else if (m.content.toLowerCase() == "n") {
                    collector.stop();
                }
            });

            collector.on('end', m => {
                if (gameState) {
                    msg.channel.send("Matchup accepted!").then(() => init("tictactoe", [player1,player2], msg));
                }
                else {
                    msg.channel.send("Matchup declined!");
                    peoplePlaying.filter(person => player1 == person || player2 == person).forEach(player => removePlayer(player));
                }
            });
        } else {
            msg.reply("Person is already active in game. Please wait for the game to finish.")
        }
    }
}

exports.botGames = botGames;