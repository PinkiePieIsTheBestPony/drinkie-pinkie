/**
 * Shortcut function that appends th/st/nd/rd to a number depending on what it is.
 * @param {int} number The number that will be appended to.
 */
function nth(number) {
    if (number > 3 && number < 21) return 'th';
    switch (number % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

/**
 * Shortcut function to convert number representation of month/week to string representation
 * @private
 * @param {int} number Representations the number representation to be converted
 * @param {int} index Refers to which part of the cron it's at (i.e. either day or month)
 */
function quickConvert(number, index) {
    number -= 1;
    daysOfMonth = ['January', 'Feburary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    switch (index) {
        case 3: {
            return daysOfMonth[number];
        }
        case 4: {
            return daysOfWeek[number];
        }
    }

}

/**
 * Checks existing cron query and determines if the cron matches the time.
 * @public
 * @param {String} query The cron query to check.
 */
const cronChecker = (query) => {
    //date stuff
    let d = new Date();
    let dateArray = [d.getMinutes(), d.getHours(), d.getDate(), d.getMonth(), d.getDay()]

    let queryArray = query.split(" ");
    for (let i = 0; i < queryArray.length; i++) {
        if (queryArray[i] == "*") {
            continue;
        }
        else if (!isNaN(queryArray[i])) {
            if (queryArray[i] == dateArray[i]) {
                continue;
            }
            else {
                return false;
            }
        }
        else if (queryArray[i].includes("-")) {
            let queryCronArray = queryArray[i].split("-");
            if (queryCronArray[0] <= dateArray[i] && queryCronArray[1] >= dateArray[i]) {
                continue;
            }
            else {
                return false;
            }
        }
        else if (queryArray[i].includes(",")) {
            let queryCronArray = queryArray[i].split(",");
            let foundMatch = false;
            for (let j = 0; j < queryCronArray.length; j++) {
                if (queryCronArray[j] == dateArray[i]) {
                    foundMatch = true;
                    break;
                }
            }
            
            if (foundMatch) {
                continue;
            }
            else {
                return false;
            }
        }
        else if (queryArray[i].includes("/")) {
            let queryCronArray = queryArray[i].split("/");
            if (dateArray[i] % queryCronArray[1] === 0 && queryCronArray[0] <= dateArray[i]) {
                continue;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
    return true;
}

/**
 * When creating a new cron query, checks if it is a valid syntax.
 * @public
 * @param {String} argument The cron query to validate.
 */
const cronValidator = (argument) => {
    const cronPattern = /((\* |\d{1,2} |\d{1,2}-\d{1,2} |(\d{1,2},)+\d{1,2} |\d{1,2}\/\d{1,2} ){4}(\*|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}|(\d{1,2},)+\d{1,2}|\d{1,2}))/;
    const cronParametersWords = {0: ["minute", 59], 1: ["hour", 23], 2: ["day of the month", 31], 3: ["month", 12], 4: ["day of the week", 7]};
    let messageToSend = "I will send a new image: ";
    if (cronPattern.exec(argument)) {
        let arrayCron = argument.split(" ");
        for (i = 0; i < arrayCron.length; i++) {
            let maxLimit = cronParametersWords[i][1];
            if (i > 1) maxLimit--;
            if (arrayCron[i] === "*") {
                messageToSend += `every ${cronParametersWords[i][0]}, `;
                continue;
            }
            else if (arrayCron[i].includes("/")) {
                let cronSplit = arrayCron[i].split("/");
                if (cronSplit[0] <= maxLimit && cronSplit[1] <= maxLimit) {
                    messageToSend += `every ${cronSplit[1]}${nth(cronSplit[1])} ${cronParametersWords[i][0]} from ${cronSplit[0]} to ${cronParametersWords[i][1]}, `;
                    continue;
                } 
                else {
                    return false;
                }
            }
            else if (arrayCron[i].includes("-")) {
                let cronSplit = arrayCron[i].split("-");
                if (cronSplit[0] < cronSplit[1] && cronSplit[0] <= maxLimit && cronSplit[1] <= maxLimit) {
                    messageToSend += `between ${cronSplit[0]} and ${cronSplit[1]} ${cronParametersWords[i][1]}s, `
                    continue;
                }
                else {
                    return false;
                }
            }
            else if (arrayCron[i].includes(",")) {
                let cronSplit = arrayCron[i].split(",");
                messageToSend += `on the following ${cronParametersWords[i][0]}s: `;
                for (let j = 0; j < cronSplit.length; j++) {
                    if (cronSplit[j] > maxLimit) {
                        return false;
                    }
                }
                let lastIndex = cronSplit.lastIndexOf(",");
                let sentMessage = cronSplit.slice(0, lastIndex) + cronSplit.slice(n).replace(",", "&");
                messageToSend += `${sentMessage}, `;
                continue;
            }
            else if (!isNaN(arrayCron[i])) {
                if (arrayCron[i] <= cronParametersWords[i][1]) {
                    if (i >= 3) {
                        messageToSend += `on ${quickConvert(arrayCron[i], i)}, `;
                        continue;
                    }
                    else {
                        messageToSend += `on the ${arrayCron[i]}${nth(arrayCron[i])} ${cronParametersWords[i][0]}, `;
                        continue;
                    }
                    
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        }

    }
    else {
        return false;
    }
    return messageToSend.slice(0, -2);
}

exports.cronChecker = cronChecker;
exports.cronValidator = cronValidator;