const jsonRead = require('./json/jsonReader.js');
const {prefix} = require('./config');

/**
 * Reads JSON file which contains all the information regarding https://twitter.com/KurogeWaPony daily ponk image posting. Replies with the relevant image.
 * @private
 * @param {string} searchType String value, which is either "day" - which refers to the standard daily image posted, or "bonuses" - which refers to any additional images that were posted.
 * @param {string} searchValue String value, either referring to the date that the image was posted in an ISO-8601 format (i.e. 2019-10-31), or the corresponding number index value (i.e. 80). In the examples listed, they will return the same image.
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
function ponkJSONLookup(searchType, searchValue, msg) {
    let fileJSON = jsonRead.getJSONFile("dailyponk.json");
    if (!searchValue.includes("-")) {
        let d = new Date("2019-08-12");
        d.setDate(d.getDate() + parseInt(searchValue));
        searchValue = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();  
    } else if (searchValue.includes("-")) {
        let d = new Date(searchValue);
        searchValue = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    } else {
        msg.reply("Invalid input found...")
    }
    let jsonResult = fileJSON["drinkiepic"][searchType][searchValue];
    msg.reply(jsonResult["link"]);
}

/**
 * Will interpret the type of image, along with the value associated with the type. Check ponkJSONLookup function docs for more details.
 * @public
 * @param {object} msg [Discord.js] Message object, generated based on message by user
 */
const botPonkSearch = (msg) => {
    let driValQuery = msg.content.replace(prefix + ' dailyponk ', '');
    let driValArr = driValQuery.split(" ");
    if (driValArr.length == 2) {
        let driValType = driValArr[0];
        let driValString = driValArr[1];
        if (driValString.includes("-")) {
            let splitVals = driValString.split("-");
            if (splitVals.length == 3) {
                let dateDri = new Date(driValString);
                const firstDay = new Date("2019-08-13")
                const lastDay = new Date("2020-08-12");
                const bonusDays = [new Date("2019-10-11"), new Date("2019-10-12"), new Date("2019-10-28"), new Date("2019-10-31"), new Date("2019-11-02"), new Date("2019-11-08"), new Date("2019-11-09"), new Date("2020-03-21")] 
                if (firstDay <= dateDri && lastDay >= dateDri) {
                    if (Boolean(+dateDri) && dateDri.getFullYear() == splitVals[0] && driValType == "day") {
                        ponkJSONLookup(driValType, driValString, msg);
                    }
                    else if (driValType == "bonuses") {
                        if (bonusDays.find(bonusDay => { return bonusDay.getTime() == dateDri.getTime() })) {
                            ponkJSONLookup(driValType, driValString, msg);
                        }
                        else {
                            let dates = bonusDays.map(day => " " + day.getFullYear() + "-" + (day.getMonth() + 1) + "-" + day.getDate())
                            msg.reply("Invalid date range... Bonus dates must be the following days: " + dates);
                        }
                    }
                    else {
                        msg.reply("`->" + driValType + " " + driValString + "`Invalid type argument! Types are: `day or bonuses`")
                    }
                }
                else {
                    msg.reply("Invalid date range... Please enter date between 2019-08-13 & 2020-08-12")
                }
            }
            else {
                msg.reply("Invalid date... Please enter date between 2019-08-13 & 2020-08-12")
            }
        }
        else if (driValString == "random") {
            let indexDri;
            if (driValType == "day") {
                indexDri = Math.floor(Math.random() * 366 + 1);
                ponkJSONLookup(driValType, indexDri.toString(), msg);
            } else if (driValType == "bonuses") {
                indexDri = Math.floor(Math.random() * 8);
                const vals = [60, 61, 77, 80, 82, 88, 89, 222];
                indexDri = vals[indexDri];
                ponkJSONLookup(driValType, indexDri.toString(), msg);
            } else {
                msg.reply("`->" + driValType + " " + driValString + "`Invalid type argument! Types are: `day or bonuses`")
            }
        } 
        else if (!isNaN(driValString)) {
            const vals = [60, 61, 77, 80, 82, 88, 89, 222];
            if (driValType == "day") {
                if (driValString <= 366) {
                    ponkJSONLookup(driValType, driValString, msg);
                } else {
                    msg.reply("Invalid index number! Valid value is between 1 and 366.")
                }
            }
            else if (driValType == "bonuses") {
                if (vals.indexOf(parseInt(driValString)) != -1) {
                    ponkJSONLookup(driValType, driValString, msg);
                } else {
                    msg.reply("Invalid index number! Valid values are `" + vals + "`")
                }
            }
            else {
                msg.reply("`->" + driValType + " " + driValString + "`Invalid type argument! Types are: `day or bonuses`")
            }
        }
        else {
            msg.reply("`" + driValType + " " + driValString + "<-` Value argument you have entered is not valid! Here is the following valid values: `date[ex.2019-10-31], index[ex.69], random`")
        }
    }
    else {
        msg.reply("Number of arguments is wrong! You should have the following arguments - type:`day|bonuses` & value:`date[ex.2019-10-31]|index[ex.69]|random`")
    }
}

exports.botPonkSearch = botPonkSearch;