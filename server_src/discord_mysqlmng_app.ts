import * as Discord from 'discord.js';
import Database from './database';
import LOG from './log';

const channel_id = '546308361168355354';

const OUTPUT_LIMIT = 10;

const CODE_PREFIX = '```cs';
const CODE_SUFFIX = '```';

async function executeMysql(msg: Discord.Message, user: Discord.User, no_description = false) {
	let msg_data = msg.content.split('\n');

	let description = !no_description ? msg_data.shift() : '';

	let command = msg_data.filter(line=>!line.startsWith(CODE_PREFIX) && !line.startsWith(CODE_SUFFIX))
		.join('\n');

	command = command.trim().replace(';', '') + ` LIMIT ${OUTPUT_LIMIT};`;

	let result_msg = await msg.channel.send('Wykonywanie...');

	setTimeout(() => {
		if(result_msg instanceof Discord.Message)
			result_msg.delete().catch(()=>{});
	}, 1000*60);//remove after one minute

	if(command.match(/UPDATE/gi) || command.match(/REMOVE/gi)) {
		if(result_msg instanceof Discord.Message) {
			await result_msg.edit(
				'Z powodów bezpieczeństwa nie mozna wykonywać operacji UPDATE i REMOVE').catch(()=>{});
		}
		return;
	}

	LOG('User', user.username, user.id, 'executed mysql script:', description || '');

	// console.log('description:', description, 'cmd:', command);

	Database.customQuery(command).then((res: {[index: string]: string}[]) => {
		let out: string = '';

		for(var row of res) {
			Object.keys(row).forEach(key => {
				out += `${key}: ${row[key]} `;
			});
			out += '\n';
		}

		if(result_msg instanceof Discord.Message)
			result_msg.edit(out).catch(()=>{});
	}).catch(e => {
		if(result_msg instanceof Discord.Message)
			result_msg.edit(`error code: ${e.code}\n${e.sqlMessage}`).catch(()=>{});
	});
}

export default {
	CHANNEL_ID: channel_id,

	init: async (bot: Discord.Client) => {
		let channel = bot.channels.get(channel_id);

		if( !(channel instanceof Discord.TextChannel) )
			return;

		let msgs = await channel.fetchMessages();
		
		for(let m of msgs) {
			await m[1].clearReactions().catch(console.error);

			if(m[1].content.indexOf(CODE_PREFIX) !== -1)
				m[1].react('✅').catch(console.error);
			else if(m[1].content !== msgs.last().content)
				m[1].delete().catch(()=>{});
		}
	},

	handleMessage: async (msg: Discord.Message) => {
		if(msg.content.match(/select/gi) || msg.content.match(/insert/gi)) {
			executeMysql(msg, msg.author, true);
			setTimeout(() => {
				msg.delete().catch(()=>{});
			}, 1000*10);
		}
		else
			msg.delete().catch(()=>{});
	},

	onReactionAdded: (reaction: Discord.MessageReaction, user: Discord.User) => {
		if(reaction.message.channel.id !== channel_id || user.bot)
			return;

		if(reaction.emoji.name === '✅' && reaction.message.content.indexOf(CODE_PREFIX) !== -1)
			executeMysql(reaction.message, user).catch(console.error);

		//if(reaction.emoji.name !== '✅')
		setTimeout(() => {
			reaction.remove().catch(()=>{});//ignore errors
		}, 1000*10);
	},
}