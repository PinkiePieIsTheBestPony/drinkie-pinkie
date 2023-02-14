import {TwitterApi} from "twitter-api-v2";
import fetch from "node-fetch";
import {app_key, app_key_secret, access_token, access_token_secret} from "../config.js";
import {createEmbeddedTweet} from "./discord.js";

function getTwitClient() {
    return new TwitterApi({
        appKey: app_key,
        appSecret: app_key_secret,
        accessToken: access_token,
        accessSecret: access_token_secret,
      });
}

function extractTwitId(msg, link) {
    const cronPattern = /(https:\/\/twitter\.com)\/.*\/status\/([0-9]*)/
    let result = cronPattern.exec(link);
    if (result[1] == null && result[2] == null) {
        msg.type.reply("Not a valid link.");
        return null
    } else {
        return result[2];
    }
}

function getArtists(tagsArray) {
    const tags = tagsArray.toString();
    if (tags.includes("artist:")) {
        const numOfArtists = tags.match(new RegExp("artist:", "g") || []).length;
        const pattern = /artist:./;
        const arrOfTags = tags.split(",");
        let tagsStripped = [];
        let a = 0;
        for (let i = 0; i < arrOfTags.length; i++) {
            if (numOfArtists == a) {
                const artistsString = tagsStripped.join(", ");
                return artistsString;
            }
            let tag = arrOfTags[i].trim();
            if (pattern.test(tag)) {
                let tagStripped = tag.substring(7);
                if (numOfArtists > 1) {
                    tagsStripped[a] = tagStripped;
                    a++;
                } else {
                    return tagStripped;
                }
            }
        }
    }
    return null;
}

function createStatus(id, artists, sauce) {
    let artistText = '';
    let sauceText = '';
    const url = "Derpi link: https://derpibooru.org/" + id;
    if (artists != null) {
        if (artists.includes(',')) {
            artistText = "Artists: " + artists + " | ";
        }
        else {
            artistText = "Artist: " + artists + " | ";
        }
    }
    if (sauce != null) {
        if (sauce.includes("http")) {
            sauceText = "Source: " + sauce + " | ";
        }
    }
    return artistText + sauceText + url;
}

async function checkSource(res, sauce, twitterAccount) {
    if (sauce.includes("twitter.com")) {
        if (res.ok) {
            const tweetClient = getTwitClient();
            let regx = /(https:\/\/)?(www\.)?twitter\.com\/.*\/([0-9]+)\/?/
            let info = regx.exec(sauce);
            let singleTweet = await tweetClient.v2.singleTweet(info[3]);
            if (singleTweet.hasOwnProperty('errors')) {
                retweetImage(info[3], twitterAccount);
                return false;
            }
        }
    }
    return true;
}

async function retweetImage(twitterID, twitterAccount) {
    //const T = initialiseTwit(twitterAccount);
    await tweetClient.v2.unretweet(twitterAccount, twitterID);
    await tweetClient.v2.retweet(twitterAccount, twitterID);
}

function twitterPost(image) {
    const artists = getArtists(image.tags.toString());
    const status = createStatus(image.id, artists, image.sourceUrl);
    fetchImage(image.viewUrl, status, image.mimeType);
}

async function fetchImage(urlDirect, status, fileType) {
    const resp = await fetch(urlDirect);
    const buffer = await resp.arrayBuffer();
    postTweetWithImage(buffer, status, fileType);
}

async function postTweetWithImage(image, status, fileType) {
    const tweetClient = getTwitClient();
    const mediaId = await tweetClient.v1.uploadMedia(Buffer.from(image), {mimeType: fileType});
    await tweetClient.v1.tweet(status, {media_ids: mediaId});
}

async function validateLink(msg, twitLink) {
    try {
        let repsonse = await fetch(twitLink);
        return repsonse.status;
    } catch(error) {
        console.error(error);
        msg.type.reply("Error trying to validate and embed tweet.");
        return null;
    }
}

export async function checkImageInfo(image, twitterAccount) {
    if (image.sourceUrl == null || image.sourceUrl == '') {
        twitterPost(image);
    } else {
        const resp = await fetch(image);
        const notRetweetable = checkSource(resp, image.sourceUrl, twitterAccount);
        if (notRetweetable) {
            twitterPost(image);
        }
    }
}

export async function getLink(msg, twitLink) {
    let twitId = extractTwitId(msg, twitLink);
    if (twitId == null) {
        return;
    }
    let twitStatus = await validateLink(msg, twitLink);
    if (twitStatus !== 200) {
        return;
    }
    let arrayOfImages = [];
    try {
        const twitClient = getTwitClient();
        const tweet = await twitClient.v1.singleTweet(twitId);
        if (tweet.extended_entities !== undefined) {
            const isVideo = (tweet.extended_entities.media[0].type === "animated_gif" || tweet.extended_entities.media[0].type === "video")
            for (let i = 0; i < tweet.extended_entities.media.length; i++) {
                if (tweet.extended_entities.media[i].type === "animated_gif" || tweet.extended_entities.media[i].type === "video") {
                    arrayOfImages[i] = tweet.extended_entities.media[i].video_info.variants[0].url;
                } else {
                    arrayOfImages[i] = tweet.extended_entities.media[i].media_url_https;
                }
            }
            if (!isVideo) {
                msg.type.reply({embeds: createEmbeddedTweet(arrayOfImages, tweet.user.screen_name, tweet.user.name, tweet.full_text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, ''), tweet.favorite_count, tweet.retweet_count, twitLink, isVideo)});
            } else {
                msg.type.reply(arrayOfImages[0])
            }
        } else {
            msg.type.reply("Tweet does not contain any media to embed.");
        }
    } catch (error) {
        console.error(error);
        msg.type.reply("Error found.");
        return;
    }
}