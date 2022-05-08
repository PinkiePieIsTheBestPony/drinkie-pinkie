import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { discord_key, client_id } from './config.js';

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
                .addChoice('Prompts', 'prompts')
                .addChoice('Audio', 'audio')),
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
        .addSubcommandGroup(group => 
            group.setName('query')
            .setDescription('Relates to derpi query commands')
            .addSubcommand(subcommand =>
                subcommand.setName('list')
                .setDescription('Get all derpi queries.'))
            .addSubcommand(subcommand => 
                subcommand.setName('new')
                .setDescription('Create new Derpi query with default settings.')
                .addStringOption(option =>
                    option.setName('args')
                    .setDescription('Enter your derpi query.')
                    .setRequired(true)))
            .addSubcommand(subcommand =>
                subcommand.setName('edit')
                .setDescription('Edit a Derpi query.')
                .addStringOption(option => 
                    option.setName('query_id')
                    .setDescription('Enter ID')
                    .setRequired(true))
                .addStringOption(option =>
                    option.setName('edited_query')
                    .setDescription('Enter query')
                    .setRequired(true)))
            .addSubcommand(subcommand => 
                subcommand.setName('remove')
                .setDescription('Removes a Derpi query.')
                .addStringOption(option =>
                    option.setName('id')
                    .setDescription('Enter ID')
                    .setRequired(true))))
        .addSubcommandGroup(group =>
            group.setName('rotation')
            .setDescription('Relates to derpi rotation commands')
            .addSubcommand(subcommand =>
                subcommand.setName('list')
                .setDescription('Get all derpi rotation schedules'))
            .addSubcommand(subcommand =>
                subcommand.setName('edit')
                .setDescription('Edit a Derpi rotation schedule.')
                .addStringOption(option => 
                    option.setName('rotation_id')
                    .setDescription('Enter ID')
                    .setRequired(true))
                .addStringOption(option =>
                    option.setName('edited_rotation')
                    .setDescription('Enter Rotation')
                    .setRequired(true))))
        .addSubcommandGroup(group =>
            group.setName('channel')
            .setDescription('Relationship between queries and channels in server')
            .addSubcommand(subcommand =>
                subcommand.setName('edit')
                .setDescription('Edit channel that particular query posts on')
                .addStringOption(option =>
                    option.setName('query_id')
                    .setDescription('Enter query ID')
                    .setRequired(true))
                .addStringOption(option =>
                    option.setName('channel_name')
                    .setDescription('Enter channel name')
                    .setRequired(true)))
            .addSubcommand(subcommand =>
                subcommand.setName('default')
                .setDescription('Edit default channel for server')
                .addStringOption(option =>
                    option.setName('default_channel')
                    .setDescription('Write your default channel')
                    .setRequired(true))))
        .addSubcommandGroup(group =>
            group.setName('filter')
            .setDescription('Derpi filter for queries')
            .addSubcommand(subcommand =>
                subcommand.setName('edit')
                .setDescription('Edit filter value')
                .addStringOption(option =>
                    option.setName('filter_query_id')
                    .setDescription('Enter query ID')
                    .setRequired(true))
                .addStringOption(option =>
                    option.setName('filter_derpi_id')
                    .setDescription('Enter Derpi filter ID')
                    .setRequired(true)))),
	new SlashCommandBuilder()
        .setName('game')
        .setDescription('Commands relating to games')
        .addStringOption(option => 
            option.setName('game_choice')
                .setDescription('Choose a game and mention the person you want to play with.')
                .setRequired(true)
                .addChoice('Tic Tac Toe', 'tictactoe'))
        .addStringOption(option =>
            option.setName('mention')
                .setDescription('Mention user to play with')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('dailyponk')
        .setDescription('Finds relevant dailyponk, depending on your value')
        .addStringOption(option => 
            option.setName('search')
                .setDescription('Choose type of search')
                .setRequired(true)
                .addChoice('Day', 'day')
                .addChoice('Bonuses', 'bonuses'))
        .addStringOption(option =>
            option.setName('day')
                .setDescription('Select daily ponk post using date or index value')
                .setRequired(true)),
	new SlashCommandBuilder()
        .setName('source')
        .setDescription('Sends link to github repo'),
	new SlashCommandBuilder()
        .setName('predict')
        .setDescription('Prediction creation with a number of different scenarios')
        .addSubcommand(subcommand => 
            subcommand.setName('percentage')
                .setDescription('Gives a percentage value')
                .addStringOption(option =>
                    option.setName('question_percentage')
                        .setDescription('List your query based on your percentage group.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('percentage-multiple')
                .setDescription('Gives multiple percentage values based on a number of different lists.')
                .addStringOption(option =>
                    option.setName('question_percentage_multiple')
                        .setDescription('List your query based on percentage group on multiple values')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('list_percentage')
                        .setDescription('All the list of values being valued.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('option')
                .setDescription('Chooses an option out of a list of queries')
                .addStringOption(option => 
                    option.setName('question_option')
                        .setDescription('All the list of values')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('list_option')
                        .setDescription('List where one will be chosen.')
                        .setRequired(true))),
    new SlashCommandBuilder()
        .setName('sounds')
        .setDescription('Enables connection with voice channel')
        .addSubcommandGroup(group => 
            group.setName('queue')
            .setDescription('Commands specifically related to interacting with the YT player (don\'t tell Google!)')
            .addSubcommand(subcommand =>
                subcommand.setName("join")
                .setDescription("Have Drinkie join VC, based on where current user is.")
                .addStringOption(option => 
                    option.setName('args')
                    .setDescription("Additional args for bonus options")
                    .setRequired(false)))
            .addSubcommand(subcommand => 
                subcommand.setName("leave")
                .setDescription("Drinkie leaves VC")
                .addStringOption(option => 
                    option.setName('args')
                    .setDescription("Additional args")
                    .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand.setName("add")
                .setDescription("Add YT links to the queue.")
                .addStringOption(option => 
                    option.setName('url')
                    .setDescription("Put the link here.")
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('args')
                    .setDescription("Additional args")
                    .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand.setName("addplaylist")
                .setDescription("Adds all videos in YT Playlist to the queue.")
                .addStringOption(option => 
                    option.setName('playlistid')
                    .setDescription("Put playlist ID here.")
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('args')
                    .setDescription("Additional args")
                    .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand.setName("remove")
                .setDescription("Removes a value, based on an index value")
                .addStringOption(option =>
                    option.setName("index")
                    .setDescription("Enter the index value used in the list.")
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('args')
                    .setDescription("Additional args")
                    .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand.setName("clear")
                .setDescription("Clears the queue.")
                .addStringOption(option => 
                    option.setName('args')
                    .setDescription("Additional args")
                    .setRequired(false)))
            .addSubcommand(subcommand => 
                subcommand.setName("list")
                .setDescription("Lists a selection of songs in the queue (prev and next)")
                .addStringOption(option => 
                    option.setName('args')
                    .setDescription("Additional args")
                    .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand.setName("pause")
                .setDescription("Pauses the music")
                .addStringOption(option => 
                    option.setName('args')
                    .setDescription("Additional args")
                    .setRequired(false)))
            .addSubcommand(subcommand => 
                subcommand.setName("next")
                .setDescription("Plays next track in the queue")
                .addStringOption(option => 
                    option.setName('args')
                    .setDescription("Additional args")
                    .setRequired(false)))
            .addSubcommand(subcommand => 
                subcommand.setName("prev")
                .setDescription("Plays previous track in the queue")
                .addStringOption(option => 
                    option.setName('args')
                    .setDescription("Additional args")
                    .setRequired(false)))),
        new SlashCommandBuilder()
        .setName('talk')
        .setDescription('Create custom bot interaction, will respond with a private message to you... (V2)')
        .addStringOption(option =>
		    option.setName('scope')
                .setDescription('Determine where this phrase can be triggered.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription("Define the actual prompt which will lead to a response.")
                .setRequired(true))
        .addStringOption(option => 
            option.setName('who1')
                .setDescription('Check who is typing the prompt.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('response1')
                .setDescription('Response to that specific person to check for.')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('who2')
                .setDescription('Check who is typing the prompt.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('response2')
                .setDescription('Response to that specific person to check for.')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('who3')
                .setDescription('Check who is typing the prompt.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('response3')
                .setDescription('Response to that specific person to check for.')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('who4')
                .setDescription('Check who is typing the prompt.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('response4')
                .setDescription('Response to that specific person to check for.')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('who5')
                .setDescription('Check who is typing the prompt.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('response5')
                .setDescription('Response to that specific person to check for.')
                .setRequired(false)),
        new SlashCommandBuilder()
        .setName('permission')
        .setDescription('Change permission settings for Drinkie')
        .addStringOption(option =>
            option.setName('permission_functionality')
                .setDescription("Define which part of Drinkie to change permission settings of")
                .setRequired(true)
                .addChoice('Query/Rotations', '0')
                .addChoice('Sound Player', '1')
                .addChoice('Permission Changing (meta)', '2'))
        .addStringOption(option =>
            option.setName('permission_number')
                .setDescription("Change who can set Drinkie's queries")
                .setRequired(true)
                .addChoice('Owner', '0')
                .addChoice('Custom Role -> Exclusive', '1')
                .addChoice('Administrator', '2')
                .addChoice('Manage Messages [Mods]', '3')
                .addChoice('Custom Role -> Mods+', '4')
                .addChoice('Off', '5'))
        .addStringOption(option => 
            option.setName('role_name')
                .setDescription('If selecting a custom role, enter the name of that role.')
                .setRequired(false)),
        new SlashCommandBuilder()
        .setName('broadcast')
        .setDescription('Broadcast settings, pretty bare tbh')
        .addStringOption(option =>
            option.setName('toggle_broadcast')
                .setDescription("Determine if broadcasts are enabled for this server.")
                .setRequired(true)
                .addChoice('No', '0')
                .addChoice('Yes', '1'))
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