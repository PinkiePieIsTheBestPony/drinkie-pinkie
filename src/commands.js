const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { discord_key, client_id } = require('./config');

const commands = [
	new SlashCommandBuilder()
        .setName('msg')
        .setDescription('Create custom bot interaction, will respond with a private message to you...'),
	new SlashCommandBuilder()
        .setName('img')
        .setDescription('Grabs random image from Derpibooru')
        .addStringOption(option =>
		    option.setName('query')
                .setDescription('Derpibooru specific query')
                .setRequired(true)),
	new SlashCommandBuilder()
        .setName('help')
        .setDescription('Sends embed with further instructions for each command')
        .addStringOption(option => 
            option.setName('help_choice')
                .setDescription('Specific help option')
                .addChoice('Query', 'query')
                .addChoice('Rotation', 'rotation')
                .addChoice('Prompts', 'prompts')),
    new SlashCommandBuilder()
        .setName('random')
        .setDescription('Will tell you one of my commands if your number matches wuth my generated one')
        .addStringOption(option => 
            option.setName('number')
                .setDescription('Number between 1 and 10')
                .setRequired(true)),
	new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Bunch of commands relating to image query + rotation variables')
        .addStringOption(option => 
            option.setName('system_choice')
                .setDescription('If you don\'t know what you\'re doing, check /help query & /help rotation')
                .setRequired(true)),
	new SlashCommandBuilder()
        .setName('game')
        .setDescription('Commands relating to games')
        .addStringOption(option => 
            option.setName('game_choice')
                .setDescription('Choose a game and mention the person you want to play with.')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('dailyponk')
        .setDescription('Finds relevant dailyponk, depending on your value')
        .addStringOption(option => 
            option.setName('search')
                .setDescription('Choose type of search and use date or index')
                .setRequired(true)),
	new SlashCommandBuilder()
        .setName('source')
        .setDescription('Sends link to github repo'),
	new SlashCommandBuilder()
        .setName('predict')
        .setDescription('Prediction creation with a number of different scenarios')
        .addStringOption(option => 
            option.setName('predict_options')
                .setDescription('Choose type of prediction and make comma-seperated list')
                .setRequired(true))
]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(discord_key);

(async () => {
	try {
		await rest.put(
			Routes.applicationCommands(client_id),
			{ body: commands },
		);

		console.log('Successfully registered application commands.');
	} catch (error) {
		console.error(error);
	}
})();