const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    env_state: process.env.NODE_ENV,
    discord_key: process.env.client_token,
    db_url: process.env.DATABASE_URL,
    derpi_key: process.env.derpi_key
};