import dotenv from 'dotenv';
dotenv.config();

export const env_state = process.env.NODE_ENV;
export const discord_key = process.env.client_token;
export const db_url = process.env.DATABASE_URL;
export const derpi_key = process.env.derpi_key;
export const prefix = process.env.BOT_PREFIX;
export const client_id = process.env.client_id;

export const access_token = process.env.access_token;
export const access_token_secret = process.env.access_token_secret;
export const app_key = process.env.consumer_key;
export const app_key_secret = process.env.consumer_secret;
