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