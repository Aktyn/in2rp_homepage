import * as Discord from 'discord.js';
import discordBot from './discord_bot';
import LOG from './log';

const id = '528678812507045898';//channel id

var targetMsg: Discord.Message | null = null;
const TARGET_ROLE_NAME = 'Użytkownik';

function isCorrectReaction(name: string) {
	return name === '✅';
}

function onUserAcceptedRules(user: Discord.User, message: Discord.Message) {
	LOG('User accepted rules:', user.username, user.id);

	// changeUserRole(user, message);
	discordBot.changeUserRole(user.id, TARGET_ROLE_NAME);
}

function onUserRejectedRules(user: Discord.User, message: Discord.Message) {
	LOG('User rejected rules:', user.username, user.id);

	// changeUserRole(user, message, true);
	discordBot.changeUserRole(user.id, TARGET_ROLE_NAME, true);
}

export default {
	CHANNEL_ID: id,
	init: async (bot: Discord.Client) => {
		var rules_channel = bot.channels.get(id);
		if(rules_channel) {
			var messages = await (<Discord.TextChannel>rules_channel).fetchMessages();
			var msg_arr = messages.array();
			if(msg_arr.length > 0) {
				targetMsg = msg_arr[msg_arr.length-1];

				const filter: Discord.CollectorFilter = (reaction, user) => 
					isCorrectReaction(reaction.emoji.name);//optimization
				targetMsg.createReactionCollector(filter);
			}
		}
	},
	onReactionAdded: (reaction: Discord.MessageReaction, user: Discord.User) => {
		if(targetMsg && reaction.message.id === targetMsg.id && isCorrectReaction(reaction.emoji.name))
			onUserAcceptedRules(user, reaction.message);
	},
	onReactionRemoved: (reaction: Discord.MessageReaction, user: Discord.User) => {
		if(targetMsg && reaction.message.id === targetMsg.id && isCorrectReaction(reaction.emoji.name))
			onUserRejectedRules(user, reaction.message);
	}
}