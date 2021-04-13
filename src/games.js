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
 * @param {Array} players Contains both player's Discord IDs.
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
 * Custom function to simulate muttable Strings since they don't exist within JavaScript
 * @private
 * @param {String} string String which will be being modified
 * @param {int} index This will specify the specific position within the above text variable that will be replaced
 * @param {String} replacement Index position value above will be replaced with this string value
 */
function replaceAtIndex(string, index, replacement) {
    return string.substr(0, index) + replacement + string.substr(index + replacement.length);
}

/**
 * This function will specifically change the tic tac toe board to add the ❌ & ⭕
 * @private
 * @param {Map} filledSlots This holds the particular position of symbols within the game
 * @param {Array} indexSlots This holds information about which index positions to replace for the game
 * @param {String} board String representation of the gameboard which is shown in chat
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
 * @param {Map} filledSlots This holds the particular position of symbols within the game
 * @param {String} symbol The nought or cross
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

async function sendBoard(msg, player, numToWord, numberOfTurns, board, filledSlots, rankings, indexSlots) {
    if ([1, 3, 5, 7, 9].includes(numberOfTurns)) {
        player = rankings['first']
    } else {
        player = rankings['second']
    }

    board = fillBoard(filledSlots, indexSlots, board);

    try {
        let msgGame = await msg.channel.send(board + "\nIt is your turn to choose a number which correlates to your spot, <@!" + player[0] + ">");
        for (let i = 0; i < filledSlots.length; i++) {
            if (filledSlots[i+1] == null) { await msgGame.react(Object.keys(numToWord)[i]) }
        }

        const filter = (reaction, user) => { return user.id == player[0] && (reaction.name.emoji == "1️⃣" || reaction.name.emoji == "2️⃣" || reaction.name.emoji == "3️⃣" || reaction.name.emoji == "4️⃣" || 
        reaction.name.emoji == "5️⃣" || reaction.name.emoji == "6️⃣" || reaction.name.emoji == "7️⃣" || reaction.name.emoji == "8️⃣" || reaction.name.emoji == "9️⃣") };
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
                    msg.channel.send(board + "\nCongrats <@!" + player[0] + ">, you have won!")
                    return 0;
                }
            }
            if (numberOfTurns > 0) {
                sendBoard(msg, player, numToWord, numberOfTurns, board, filledSlots, rankings, indexSlots);
            } else {
                board = fillBoard(filledSlots, indexSlots, board);
                msg.channel.send(board + "\nYou have both tied!")
            }
        });

    } catch (error) {
        console.log(error);
        msg.channel.send("Error occurred...")
        return 1;
    }
}

/**
 * Maing game loop for tic-tac-toe
 * @private
 * @param {Array} players Contains both player's Discord IDs.
 * @param {Message} msg [Discord.js] Message object representation of message that kicked off game.
 */
function playTTT(players, msg) {
    let board = initTTT();
    let rankings = setupTTT(players);
    //pieces to use (x or o);
    //[1],[2],...
    //[1]->[1,1]//[5]->[3,3]//[9]->[5,5]
    msg.channel.send("<@!" + rankings['first'][0] + "> has been randomly selected to go first and will be playing ❌");
    let filledSlots = {1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null}
    let numToWord = {"1️⃣": 1, "2️⃣": 2, "3️⃣": 3, "4️⃣": 4, "5️⃣": 5, "6️⃣": 6, "7️⃣": 7, "8️⃣": 8, "9️⃣": 9}
    let indexSlots = [0, 2, 4, 6, 8, 10, 12, 14, 16];
    let numberOfTurns = 9;
    let player;

    sendBoard(msg, player, numToWord, numberOfTurns, board, filledSlots, rankings, indexSlots);
}

/**
 * Checks input to determine if game inputted is relevant
 * @public
 * @param {String} gameName Name of game to be played.
 * @param {Array} players Contains both player's Discord IDs.
 * @param {Message} msg [Discord.js] Message object representation of message that kicked off game.
 */
const init = (gameName, players, msg) => {
    responsesKeyPair = new Map([
        ["tictactoe", playTTT]
    ]);

    let functionName = responsesKeyPair.get(gameName);
    if (functionName) {
        functionName(players, msg);
    }
}

exports.init = init;