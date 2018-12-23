import * as Discord from 'discord.js';
import fetch from 'node-fetch';
import LOG from './log';

const server_ip = '145.239.92.229:30120';
const id = '526137746126012416';//channel id

var MainMessage: Discord.Message | null = null;
var refreshing_active = true;
var refresher_id = 0;

var ServerInfo = {
	max_players: 0
}

function loadServerInfo() {
	return fetch(`http://${server_ip}/info.json`).then((response) => response.json()).then(res => {
		//console.log(res);
		ServerInfo.max_players = Number( res.vars.sv_maxClients );
	}).catch(e => console.error('Cannot fetch server info data'));
}

interface MessageSchema {
	online: boolean;
	players_online: string[];
}
function generateMessage(data: MessageSchema) {
	if(data.online === false)
		return 'Serwer offline :dizzy_face:';
	/*var players_formated = '```';
	let fixed_len = Math.max( ...data.players_online.map(p => p.length) ) + 3;//3 works as margin
	var col = 0;
	for(var nick of data.players_online) {
		var spaces_offset = fixed_len - nick.length;
		players_formated += nick;
		for(var i=0; i<spaces_offset; i++)
			players_formated += ' ';

		if(2 === ++col)
			players_formated += '\n';
	}
	players_formated += '```';
	console.log(players_formated);*/

	var embed = new Discord.RichEmbed()
		.setColor('#ff5555')
		//.setTitle("in2rp")
		.addField('Graczy online', `**${data.players_online.length}** / **${ServerInfo.max_players}**\n${data.players_online.join(data.players_online.length < 10 ? '\n' : ' ')}`)
		.addField('Ostatnia aktualizacja', new Date().toLocaleTimeString())
		.setFooter(`IP serwera: ${server_ip}`);
	return embed;
}

async function startRefreshing(current_id: number) {
	//fetching data
	var data: MessageSchema;
	try {
		var jsondata = await fetch(`http://${server_ip}/players.json`)
			.then((response) => response.json());
		//console.log(jsondata.map((player: any) => player.name));

		data = <MessageSchema>{
			online: true,
			players_online: jsondata.map((player: any) => player.name)
		};
	}
	catch(e) {
		console.error('Cannot fetch server player\'s data');
		//@ts-ignore
		data = {online: false};
	}

	//updating discord message
	if(current_id !== refresher_id)
		console.log('Current refreshing process with id:', current_id, 'expired');
	else if(MainMessage) {
		await MainMessage.edit(generateMessage(data));
		if(refreshing_active)//every minute if server is online, otherwise every hour
			setTimeout(() => startRefreshing(current_id), data.online ? 1000 * 60 : 1000 * 60 * 60);
	}
}

function printHelp(message: Discord.Message, is_spam = false) {
	let help = (is_spam ? 'Nie spamić mnie tu\n' : '') + '`Dostępne komendy:\n!restart`';
	if(process.env.NODE_ENV === 'dev')
		message.author.send('[dev mode] ' + help);
	else
		message.channel.send(help);
}

function clearChannel(channel: Discord.TextChannel) {
	channel.fetchMessages().then(messages => {
		channel.bulkDelete(messages);
	}).catch(err => {
		console.log('Error while deleting channel messages');
		console.log(err);
	});
}

var StatusApp = {
	CHANNEL_ID: id,
	init: async (bot: Discord.Client) => {
		var msg: Discord.Message | Discord.Message[] | undefined;
		var target: Discord.Channel | Discord.User | undefined;
		if(process.env.NODE_ENV === 'dev')
			target = bot.users.get('204639827193364492');
		else {
			target = bot.channels.get(id);
			if(target instanceof Discord.TextChannel)
				clearChannel(target)
		}
		if(!target) {
			console.error('Error while fetching user/channel (status app)');
			return;
		}
		//@ts-ignore
		msg = await target.send('Ładowanko...');
		if(msg instanceof Discord.Message)
			MainMessage = msg;
		else {
			console.error('Error while creating message (status app)');
			return;
		}

		await loadServerInfo();
		startRefreshing(++refresher_id);
	},
	handleMessage: async (message: Discord.Message, bot: Discord.Client) => {
		if(!message.content.startsWith('!'))
			return printHelp(message, true);

		let args = message.content.substring(1).split(' ');
	    let cmd = (args.shift() || '').replace(/^dev_/i, '');

	    switch(cmd) {
	    	default:
	    		printHelp(message);
	    		break;
		   	case 'restart':
		   		LOG(message.author.username, 'used status app command:', message.content);
		   		if(message.channel instanceof Discord.TextChannel)
		   			clearChannel(message.channel);
		   		MainMessage = null;
		   		StatusApp.init(bot);
		   		break;
		}
	}
};

export default StatusApp;