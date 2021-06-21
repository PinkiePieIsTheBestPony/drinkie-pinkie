const jsonRead = require('./json/jsonReader.js');

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
    let driValQuery = msg.content.replace('!dpi dailyponk ', '');
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
                const bonusDays = [new Date("2019-10-11"), new Date("2019-10-12"), new Date("2019-10-31"), new Date("2019-11-02"), new Date("2019-11-08"), new Date("2019-11-09"), new Date("2019-28-10"), new Date("2020-03-21")] 
                if (firstDay <= dateDri && lastDay >= dateDri) {
                    if (Boolean(+dateDri) && dateDri.getFullYear() == splitVals[0] && driValType == "day") {
                        ponkJSONLookup(driValType, driValString, msg);
                    }
                    else if (driValType == "bonuses" && bonusDays.find(bonusDay => { return bonusDay.getTime() == dateDri.getTime() })) {
                        ponkJSONLookup(driValType, driValString, msg);
                    }
                    else {
                        msg.reply("Invalid date range...")
                    }
                }
                else {
                    msg.reply("Invalid date range...")
                }
            }
            else {
                msg.reply("Invalid date...")
            }
        }
        else if (driValString == "random") {
            let indexDri;
            if (driValType == "day") {
                indexDri = Math.floor(Math.random() * 366 + 1);
                ponkJSONLookup(driValType, indexDri, msg);
            } else if (driValType == "bonuses") {
                indexDri = Math.floor(Math.random() * 8);
                const vals = [60, 61, 77, 80, 82, 88, 89, 222];
                indexDri = vals[indexDri];
                ponkJSONLookup(driValType, indexDri, msg);
            } else {
                msg.reply("Invalid type of value!")
            }
        } 
        else {
            if (!isNaN(driValString)) {
                const vals = [60, 61, 77, 80, 82, 88, 89, 222];
                if (driValString <= 366 && driValType == "day") {
                    ponkJSONLookup(driValType, driValString, msg);
                }
                else if (vals.indexOf(parseInt(driValString)) != -1 && driValType == "bonuses") {
                    ponkJSONLookup(driValType, driValString, msg);
                }
                else {
                    msg.reply("Invalid index number!")
                }
            }
            else {
                msg.reply("Number you have entered is not a number!")
            }
        }
    }
    else {
        msg.reply("Number of arguments is wrong!")
    }
}

exports.botPonkSearch = botPonkSearch;