import * as Discord from 'discord.js';
const os = require('node-os-utils');
import * as _os from 'os';
import {spawnSync} from 'child_process';

const id = '544241564071755777';//channel id

const MAX_INTERVAL = 600;
const MIN_INTERVAL = 1;
var INTERVAL = 60;//default value

var current_timeout: number | null = null;

interface MessageSchema {
	process_count: number;
	thread_usage: number[];

	used_memory: number;
	total_memory: number;
	used_swap: number;
	total_swap: number;

	downloadMb: number;
	uploadMb: number;
}

function generateMessage(data: MessageSchema) {
	let mem_t = data.total_memory;
	let mem_u = data.used_memory;
	let swap_t = data.total_swap;
	let swap_u = data.used_swap;

	let ram_used = `${(mem_u/mem_t)*100|0}% (${(mem_u).toFixed(2)}/${(mem_t).toFixed(2)})`;
	let swap_used = `${(swap_u/swap_t)*100|0}% (${(swap_u).toFixed(2)}/${(swap_t).toFixed(2)})`;

	var embed = new Discord.RichEmbed().setColor('#4FC3F7')//4FC3F7 - cyan
		.addField('Ilość procesów', data.process_count)
		.addField('Obciążenie rdzeni', data.thread_usage.map((tu, i) => {
			return `${i+1}: ${tu|0}%`;
		}).join('\n'))
		.addField('Zużycie pamięci (GB)', 
			`RAM: ${ram_used}\nSWAP: ${swap_used}`)
		.addField('Obciążenie sieci', 
			`Download: ${data.downloadMb} Mb/s\nUpload: ${data.uploadMb} Mb/s`)
		.addField('Ostatnia aktualizacja', new Date().toLocaleTimeString('en-US', {hour12: false}))
		.setFooter(`Odświeżanie co ${INTERVAL}s`);
	return embed;
}

async function startRefreshing(msg: Discord.Message) {
	let proc_info = await os.proc.totalProcesses();
	let mem_info: {used: number, total: number};// = await os.mem.info();
	let swap_info: {used: number, total: number};
	let net_info = await os.netstat.inOut();

	let free_info: string[];
	try {
		free_info = spawnSync(`free | tail -n -2 | awk '{print $2, $3}'`, 
			{shell: true, encoding: 'ascii'}).output.filter(x => x && x.length>0).toString().split('\n');
		
		mem_info = {
			total: ( parseInt(free_info[0].split(' ')[0]) / 1024 / 1024 ),
			used: ( parseInt(free_info[0].split(' ')[1]) / 1024 / 1024 )
		};

		swap_info = {
			total: ( parseInt(free_info[1].split(' ')[0]) / 1024 / 1024 ),
			used: ( parseInt(free_info[1].split(' ')[1]) / 1024 / 1024 )
		};
	}
	catch(e) { 
		console.error(e);
		msg.edit(e);
		return;
	}

	var cpus = _os.cpus();

	let threads: number[] = [];
	for(var cpu of cpus) {
		let total = cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle;
		// console.log(`${ii++}: ${(1 - cpu.times.idle/total)*100|0}%`);
		threads.push((1 - cpu.times.idle/total)*100);
	}

	var data: MessageSchema = {
		process_count: proc_info,
		thread_usage: threads,
		used_memory: mem_info.used,
		total_memory: mem_info.total,
		used_swap: swap_info.used,
		total_swap: swap_info.total,
		downloadMb: net_info.total.inputMb,
		uploadMb: net_info.total.outputMb
	};

	msg.edit(generateMessage(data));

	current_timeout = setTimeout(startRefreshing, 1000*INTERVAL, msg);
}

function clearChannel(channel: Discord.TextChannel) {
	return channel.fetchMessages().then(messages => {
		messages.forEach(m => m.delete());
	}).catch(err => {
		console.log('Error while deleting channel messages');
		console.log(err);
	});
}

function printHelp(message: Discord.Message) {
	message.channel.send(
		`\`!interval [liczba]\` - ustawia częstotliwość odświeżeń w sekundach (min: ${MIN_INTERVAL}, max: ${MAX_INTERVAL})`)
	.then(m => {
		//delete help message after 30 seconds
		setTimeout(() => {
			if(m instanceof Discord.Message)
				m.delete();
		}, 1000*30);
	}).catch(() => {});//ignore errors
}

var StatusApp = {
	CHANNEL_ID: id,

	init: async (bot: Discord.Client, prevent_channel_clear = false) => {
		var msg: Discord.Message | Discord.Message[] | undefined;
		
		var target = bot.channels.get(id);
		if(!target || !(target instanceof Discord.TextChannel)) {
			console.error('Error while fetching user/channel (usage app)');
			return;
		}

		var messages = await (<Discord.TextChannel>target).fetchMessages();
		var msg_arr = messages.array();

		if(prevent_channel_clear === false) {
			if(msg_arr.length === 1 && msg_arr[0].author.bot)
				msg = msg_arr[0];
			else {
				if(msg_arr.length > 1)
					await clearChannel(target);
				msg = await target.send('Ładowanko...');
			}
		}
		else {
			if(msg_arr.length > 0)
				msg = msg_arr[msg_arr.length-1];
			else
				msg = await target.send('Ładowanko...');
		}

		if(msg instanceof Discord.Message)
			startRefreshing(msg);//MainMessage = msg;
		else {
			console.error('Error while creating message (status app)');
			return;
		}
	},

	handleMessage: async function(message: Discord.Message, bot: Discord.Client) {
		let args = message.content.substring(1).split(' ');
	    let cmd = (args.shift() || '').replace(/^dev_/i, '');

	    switch(cmd) {
	    	default: 
	    		printHelp(message);
	    		break;
	    	case 'interval': {
	    		try {
	    			INTERVAL = Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, parseInt(args[0])));
	    		}
	    		catch(e) {}
	    		if(current_timeout) {
	    			clearTimeout(current_timeout);
	    			current_timeout = null;
	    		}
	    		message.channel.send(`Interval zmieniony na ${INTERVAL} sekund`).then(m => {
					setTimeout(() => {
						if(m instanceof Discord.Message)
							m.delete();
					}, 1000*5);//delete after 5 seconds
				}).catch(() => {});//ignore errors
				this.init(bot, true);
	    	}	break;
	    }

		message.delete().catch(()=>{});
	}
};

export default StatusApp;