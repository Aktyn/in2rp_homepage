import * as Discord from 'discord.js';
import fetch from 'node-fetch';
import LOG from './log';
import Eclipse from './eclipse';

const server_ip = '54.37.128.15:30120';
const id = '528694912162594827';//'526137746126012416';//channel id

var target_channel: Discord.TextChannel | undefined;
var MainMessage: Discord.Message | null = null;
var refreshing_active = true;
var refresher_id = 0;

var ServerInfo = {
	max_players: 0
}

interface MessageSchema {
	online: boolean;
	players_online: string[];
}

var current_status: MessageSchema = {online: false, players_online: []};

function loadServerInfo() {
	return fetch(`http://${server_ip}/info.json`).then((response) => response.json()).then(res => {
		//console.log(res);
		ServerInfo.max_players = Number( res.vars.sv_maxClients );
	}).catch(e => console.error('Cannot fetch server info data'));
}

//Eclipse.start(6);

function generateMessage(data: MessageSchema) {
	if(data.online === false)
		return 'Serwer offline :dizzy_face:';

	let time_to_premiere = Math.max(0, new Date(2019, 2-1, 15, 18, 0, 0).getTime() - Date.now());

	var embed = new Discord.RichEmbed()
		.setColor('#ff5555')
		.addField((process.env.NODE_ENV === 'dev' ? '[dev] ' : '') + 'Gracze online', 
			`**${data.players_online.length}** / **${ServerInfo.max_players}**\n${data.players_online.join(data.players_online.length < 10 ? '\n' : ', ')}`);

	let et_s = Eclipse.getTimeToEclipse();
	if(et_s > 0) {
		let mm = (et_s/60)|0;
		let ss = et_s - mm*60;
		embed.addField('Czas do zaćmienia', //TODO - format words: minut, sekund according to time
			(et_s >= 60 ? `${mm} ${formatMinutes2(mm)} i ` : '') + `${ss} ${formatSeconds2(ss)}`);
	}

	if(time_to_premiere > 0) {
		let d = (time_to_premiere / 86400000) | 0; 
			time_to_premiere -= d*86400000;//1000*60*60*24 = 86400000
		let h = (time_to_premiere / 3600000) | 0; 
			time_to_premiere -= h*3600000;//3600000 = 1000*60*60
		let m = (time_to_premiere / 60000) | 0; 

		let time_str = '';
		if(d > 0)
			time_str = `${d} dni ${h} godzin ${m} minut`;
		else if(h > 0)
			time_str = `${h} godzin ${m} minut`;
		else if(m > 0)
			time_str = `${m} minut`;
		embed.addField('Do premiery serwera pozostało:', time_str);
	}
	embed.addField('Ostatnia aktualizacja', new Date().toLocaleTimeString('en-US', {hour12: false}))
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
		data = <MessageSchema>{online: false, players_online: []};
	}
	current_status = data;
	//console.log(current_status);
	
	//updating discord message
	if(current_id !== refresher_id)
		console.log('Current refreshing process with id:', current_id, 'expired');
	else if(MainMessage) {
		await MainMessage.edit(generateMessage(data));
		if(refreshing_active)//every minute if server is online, otherwise every 5 minutes
			setTimeout(() => startRefreshing(current_id), data.online ? 1000 * 60 : 1000 * 60 * 5);
	}
}

function formatMinutes(value: number) {
	if(value === 1)
		return 'minutę';
	else if(value === 2 || value === 3 || value === 4)
		return 'minuty';
	else
		return 'minut';
}

function formatMinutes2(value: number) {
	if(value === 1)
		return 'minuta';
	else if(value === 2 || value === 3 || value === 4)
		return 'minuty';
	else
		return 'minut';
}

function formatSeconds2(value: number) {
	if(value === 1)
		return 'sekundę';
	else if(value === 2 || value === 3 || value === 4)
		return 'sekundy';
	else
		return 'sekund';
}

function hookEclipse() {
	Eclipse.addListener((time) => {
		if(!target_channel)
			return;
		let embed = new Discord.RichEmbed().setColor('#26A69A')
			.setTitle(time === 0 ? 
				'Restart serwera' : 
				`Zaćmienie za **${time}** ${formatMinutes(time)}`);
		target_channel.send(embed).then(notif_msg => {
			setTimeout(() => {
				try {
					if(notif_msg instanceof Discord.Message)
						notif_msg.delete();
				}
				catch(e) {}
			}, 1000*60*3);//delete message after 3 minutes
		}).catch(console.error)
		
		//console.log(time);
	}, 'status_app_hook');
}

function printHelp(message: Discord.Message, is_spam = false) {
	let help = (is_spam ? 'Nie spamić mnie tu\n' : '') + '`Dostępne komendy:\n!restart`';
	if(process.env.NODE_ENV === 'dev')
		message.author.send('[dev mode] ' + help);
	else
		message.channel.send(help);
}

function clearChannel(channel: Discord.TextChannel) {
	return channel.fetchMessages().then(messages => {
		// channel.bulkDelete(messages);
		messages.forEach(m => m.delete());
	}).catch(err => {
		console.log('Error while deleting channel messages');
		console.log(err);
	});
}

var StatusApp = {
	CHANNEL_ID: id,

	getStatus: () => current_status,

	init: async (bot: Discord.Client) => {
		var msg: Discord.Message | Discord.Message[] | undefined;
		
		var target = bot.channels.get(id);
		if(!target || !(target instanceof Discord.TextChannel)) {
			console.error('Error while fetching user/channel (status app)');
			return;
		}
		var messages = await (<Discord.TextChannel>target).fetchMessages();
		var msg_arr = messages.array();
		if(msg_arr.length === 1 && msg_arr[0].author.bot)
			msg = msg_arr[0];
		else {
			if(msg_arr.length > 1)
				await clearChannel(target);
			msg = await target.send('Ładowanko...');
		}
		if(target instanceof Discord.TextChannel)
			target_channel = target;
		if(msg instanceof Discord.Message)
			MainMessage = msg;
		else {
			console.error('Error while creating message (status app)');
			return;
		}

		await loadServerInfo();
		startRefreshing(++refresher_id);
		hookEclipse();
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