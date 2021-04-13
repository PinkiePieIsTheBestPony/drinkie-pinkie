const Twit = require('twit');
const post = require('../post');
const { consumer_key, consumer_secret, access_token, access_token_secret } = require('../config');

/**
 * Initialise Twitter functionality.
 * @public
 */
const initialiseTwit = () => {
    return new Twit({
        consumer_key: consumer_key,
        consumer_secret: consumer_secret,
        access_token: access_token,
        access_token_secret: access_token_secret
    });
}

/**
 * Will focus on a certain user and if they post an image it will be downloaded and posted to eveeryone
 * @param {Tweet} tweet [twit] Tweet object, based on a predefined stream (on a certain user)
 * @param {Client} client [Discord.js] Client object, this represents Drinkie on the server where the message was sent
 */
const extractImage = (tweet, client) => {
    let isReTweet = tweet.text.startsWith('RT @')
    let isQuote = tweet.is_quote_status;
    let isReply = tweet.in_reply_to_screen_name;
    let correctUser = tweet.user.id_str;
    if (correctUser == '910628947561295872') {
        if (!isReTweet && !isQuote && isReply == null) { //ensure tweet isn't quote, retweet or reply
            if (tweet.entities.hasOwnProperty('media')) { //ensure tweet contains an image
                if (tweet.text.includes("#毎日ピンキーパイ")) {
                    let image_url = tweet.entities.media[0].media_url_https; 
                    if (image_url) {
                        fetch(image_url)
                        .then(res => res.buffer())
                        .then(buffer => post.send(buffer, {format:'png', id:'dailyPonk'}, false, null, client, "The daily ponk!!!"))
                        .catch(error => console.log(error))
                    }
                }
            }
        }
    }
}

exports.initialiseTwit = initialiseTwit;
exports.extractImage = extractImage;