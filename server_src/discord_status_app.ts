import * as Discord from 'discord.js';
import fetch from 'node-fetch';
import LOG from './log';
import Eclipse from './eclipse';

//every minute if server is online, otherwise every 5 minutes
const REFRESH_ONLINE_SERVER_INFO_DELAY = 1000*60;
const REFRESH_OFFLINE_SERVER_INFO_DELAY = 1000*60*5;

const PREMIERE_TIMESTAMP = new Date(2019, 2-1, 15, 18, 0, 0).getTime();

interface ServerDataSchema {
	online: boolean;
	players_online: string[];
}

class ServerData {
	private data: ServerDataSchema = {
		online: false, 
		players_online: []
	};

	private max_players = 0;
	private ip: string;
	private isl_index: number;

	private hooked_messages: Discord.Message[] = [];

	constructor(_ip: string, _isl_index: number) {
		this.ip = _ip;
		this.isl_index = _isl_index;

		fetch(`http://${this.ip}/info.json`).then((response) => response.json()).then(res => {
			this.max_players = Number( res.vars.sv_maxClients );
		}).catch(()=>{});//ignore errors
		//.catch(e => console.error('Cannot fetch server info data'));

		this.refresh();//start refreshing loop
	}

	private async refresh() {
		//fetching data
		try {
			var jsondata = await fetch(`http://${this.ip}/players.json`)
				.then((response) => response.json());

			this.data = {
				online: true,
				players_online: jsondata.map((player: any) => player.name)
			};
		}
		catch(e) {
			//console.error('Cannot fetch server player\'s data');
			this.data = {online: false, players_online: []};
		}
		
		//updating discord message
		for(var msg of this.hooked_messages)
			await msg.edit( this.generateMessage() );

		setTimeout(() => this.refresh(), this.data.online ?
			REFRESH_ONLINE_SERVER_INFO_DELAY : REFRESH_OFFLINE_SERVER_INFO_DELAY);
	}

	private generateMessage() {
		var embed = new Discord.RichEmbed().setColor('#ff5555');
		if(this.data.online === false) {
			embed.setTitle('Serwer offline :dizzy_face:');
			return embed; 
		}

		let time_to_premiere = Math.max(0, PREMIERE_TIMESTAMP - Date.now());

		//(process.env.NODE_ENV === 'dev' ? '[dev] ' : '') + 
		embed.addField('Gracze online', `**${this.data.players_online.length}** / **${this.max_players}**\n${this.data.players_online.join(this.data.players_online.length < 10 ? '\n' : ', ')}`);

		let et_s = Eclipse.getTimeToEclipse(this.isl_index);
		if(et_s > 0) {
			let mm = (et_s/60)|0;
			let ss = et_s - mm*60;
			embed.addField('Czas do zaćmienia',
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
			.setFooter(`IP serwera: ${this.ip}`);
		return embed;
	}

	hookMessage(msg: Discord.Message) {
		this.hooked_messages.push(msg);
		msg.edit( this.generateMessage() );
	}

	getData() {
		return this.data;
	}
}

export const SERVERS_DATA = {
	isl1: new ServerData('213.32.7.56:30120', 0),
	isl2: new ServerData('213.32.7.56:30121', 1),
	dev: new ServerData('213.32.7.56:30122', 2)
};

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

function clearChannel(channel: Discord.TextChannel) {
	return channel.fetchMessages().then(messages => {
		messages.forEach(m => m.delete());
	}).catch(err => {
		console.log('Error while deleting channel messages');
		console.log(err);
	});
}

export default class StatusApp {
	private static instances_count = 0;

	readonly channel_id: string;
	private target_channel: Discord.TextChannel | null = null;
	private server_data: ServerData;
	private isl_index: number;

	private instance_id = StatusApp.instances_count++;

	constructor(bot: Discord.Client, _channel_id: string, _server_data: ServerData, _isl_index: number)
	{
		this.channel_id = _channel_id;
		this.server_data = _server_data;
		this.isl_index = _isl_index;

		this.init(bot);
		//hookEclipse();
	}

	async init(bot: Discord.Client) {
		var msg: Discord.Message | Discord.Message[] | undefined;
		
		var target = bot.channels.get(this.channel_id);
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
			this.target_channel = target;
		if(msg instanceof Discord.Message) {
			this.server_data.hookMessage(msg);
		}
		else {
			console.error('Error while creating message (status app)');
			return;
		}
	}

	handleMessage(message: Discord.Message) {
		message.delete().catch(()=>{});//ignore error
	}

	hookEclipse() {
		Eclipse.addListener((time) => {
			if(!this.target_channel)
				return;
			if(time === 0)
				LOG('Eclipse: server restart');
			let embed = new Discord.RichEmbed().setColor('#26A69A')
				.setTitle(time === 0 ? 'Restart serwera' : 
					`Zaćmienie za **${time}** ${formatMinutes(time)}`);
			this.target_channel.send(embed).then(notif_msg => {
				setTimeout(() => {
					try {
						if(notif_msg instanceof Discord.Message)
							notif_msg.delete();
					}
					catch(e) {}
				}, 1000*60*3);//delete message after 3 minutes
			}).catch(console.error)
			
			//console.log(time);
		}, this.isl_index, 'status_app_hook' + this.instance_id);
	}
}

/*
//testing from localhost
setTimeout(() => {
	Eclipse.start(4, 2);
}, 5000);*/