const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    env_state: process.env.NODE_ENV,
    discord_key: process.env.client_token,
    db_url: process.env.DATABASE_URL,
    derpi_key: process.env.derpi_key,
    consumer_key: process.env.consumer_key,
    consumer_secret: process.env.consumer_secret,
    access_token: process.env.access_token,
    access_token_secret: process.env.access_token_secret
};