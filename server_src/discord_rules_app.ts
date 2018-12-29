import * as Discord from 'discord.js';
import LOG from './log';

const id = '527902170822213663';//channel id

var targetMsg: Discord.Message | null = null;

function isCorrectReaction(name: string) {
	return name === '✅';
}

function changeUserRole(user: Discord.User, message: Discord.Message, remove_role = false) {
	try {
		let role = message.guild.roles.find(r => r.name === "Użytkownik");
		//console.log(role);
		let member = message.guild.members.get(user.id);
		if(member) {
			if(remove_role === true)
				member.removeRole(role).catch(console.error);
			else
				member.addRole(role).catch(console.error);
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

//set role for those who accepted rules
//and removes role for those who doesn't
async function setUserInitialRoles(rules_msg: Discord.Message) {
	try {
		let users_who_accepted = await rules_msg.reactions.filter(reaction => {
			return isCorrectReaction(reaction.emoji.name);
		}).array()[0].fetchUsers();

		let accepted_users_ids = users_who_accepted.array().map(u => u.id);

		let role = rules_msg.guild.roles.find(r => r.name === "Użytkownik");

		for(var mem of rules_msg.guild.members.array()) {
			if( accepted_users_ids.indexOf(mem.user.id) !== -1 )//user has accepted rules
				mem.addRole(role).catch(console.error);
			else
				mem.removeRole(role).catch(console.error);
		}
	} 
	catch(e) {
		console.log('Cannot set initial roles:', e);
	}
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
				//console.log(targetMsg.content);

				const filter: Discord.CollectorFilter = (reaction, user) => true;
					//reaction.emoji.name === '✅';
				/*const collector = */
				targetMsg.createReactionCollector(filter);
				//collector.on('collect', r => console.log(r));
				//collector.on('end', collected => console.log(`Collected ${collected.size} items`));

				setUserInitialRoles(targetMsg);
			}
		}
		//bot.guilds.find(g => g.name === 'IN2RP [+16]')
		//	.members.find(m => m.user.username === 'Boteg').setNickname('IN2RP').catch(console.error);
	},
	onReactionAdded: (reaction: Discord.MessageReaction, user: Discord.User) => {
		if(reaction.message === targetMsg && isCorrectReaction(reaction.emoji.name))
			onUserAcceptedRules(user, reaction.message);
	},
	onReactionRemoved: (reaction: Discord.MessageReaction, user: Discord.User) => {
		if(reaction.message === targetMsg && isCorrectReaction(reaction.emoji.name))
			onUserRejectedRules(user, reaction.message);
	}
}