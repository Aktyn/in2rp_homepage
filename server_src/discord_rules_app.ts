import * as Discord from 'discord.js';
import LOG from './log';

const id = '528678812507045898';//channel id

var targetMsg: Discord.Message | null = null;
const TARGET_ROLE_NAME = 'Użytkownik';
var target_role: Discord.Role | null = null;

function isCorrectReaction(name: string) {
	return name === '✅';
}

function changeUserRole(user: Discord.User, message: Discord.Message, remove_role = false) {
	try {
		if(target_role === null)
			throw "Target role";
		let member = message.guild.members.get(user.id);
		if(member) {
			if(remove_role === true) {
				if(member.roles.some(rl => rl.name === TARGET_ROLE_NAME))
					member.removeRoles([target_role]).catch(console.error);
			}
			else {
				if(!member.roles.some(rl => rl.name === TARGET_ROLE_NAME))
					member.addRoles([target_role]).catch(console.error);
			}
		}
		else
			console.log('member not found:', user.username);
	}
	catch(e) {
		console.log('Cannot set user role:', e);
	}
}

function onUserAcceptedRules(user: Discord.User, message: Discord.Message) {
	LOG('User accepted rules:', user.username, user.id);

	changeUserRole(user, message);
}

function onUserRejectedRules(user: Discord.User, message: Discord.Message) {
	LOG('User rejected rules:', user.username, user.id);

	changeUserRole(user, message, true);
}

export default {
	CHANNEL_ID: id,
	init: async (bot: Discord.Client) => {
		try {
			target_role = bot.guilds.find(g => g.name === 'IN2RP.PL +16')
				.roles.find(r => r.name === TARGET_ROLE_NAME);
		}
		catch(e) {
			console.error('Cannot fetch target role:', e);
		}

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