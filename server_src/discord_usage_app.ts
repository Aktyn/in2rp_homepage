import * as Discord from 'discord.js';
const os = require('node-os-utils');
import * as _os from 'os';

const id = '544241564071755777';//channel id

//var MainMessage: Discord.Message | null = null;

interface MessageSchema {
	process_count: number;
	thread_usage: number[];

	used_memory: number;
	total_memory: number;

	downloadMb: number;
	uploadMb: number;
}

function generateMessage(data: MessageSchema) {
	let mem_t = data.total_memory;
	let mem_u = data.used_memory;

	var embed = new Discord.RichEmbed().setColor('#4FC3F7')//4FC3F7 - cyan
		.addField('Ilość procesów', data.process_count)
		.addField('Obciążenie rdzeni', data.thread_usage.map((tu, i) => {
			return `${i+1}: ${tu|0}%`;
		}).join('\n'))
		.addField('Zużycie RAM (GB)', 
			`${(mem_u/mem_t)*100|0}% (${(mem_u/1000).toFixed(1)}/${(mem_t/1000).toFixed(1)})`)
		.addField('Obciążenie sieci', 
			`Download: ${data.downloadMb} Mb/s\nUpload: ${data.uploadMb} Mb/s`)
		.addField('Ostatnia aktualizacja', new Date().toLocaleTimeString('en-US', {hour12: false}))
		.setFooter('made in china');
	return embed;
}

async function startRefreshing(msg: Discord.Message) {
	 
	let proc_info = await os.proc.totalProcesses();
	let mem_info = await os.mem.info();
	let net_info = await os.netstat.inOut();

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
		used_memory: mem_info.usedMemMb,
		total_memory: mem_info.totalMemMb,
		downloadMb: net_info.total.inputMb,
		uploadMb: net_info.total.outputMb
	};

	msg.edit(generateMessage(data));

	setTimeout(startRefreshing, 1000*60, msg);
}

function clearChannel(channel: Discord.TextChannel) {
	return channel.fetchMessages().then(messages => {
		messages.forEach(m => m.delete());
	}).catch(err => {
		console.log('Error while deleting channel messages');
		console.log(err);
	});
}

var StatusApp = {
	CHANNEL_ID: id,

	init: async (bot: Discord.Client) => {
		var msg: Discord.Message | Discord.Message[] | undefined;
		
		var target = bot.channels.get(id);
		if(!target || !(target instanceof Discord.TextChannel)) {
			console.error('Error while fetching user/channel (usage app)');
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

		if(msg instanceof Discord.Message)
			startRefreshing(msg);//MainMessage = msg;
		else {
			console.error('Error while creating message (status app)');
			return;
		}
	},

	handleMessage: async (message: Discord.Message, bot: Discord.Client) => {
		message.delete().catch(console.log);

		//TODO - allow to change interval
	}
};

export default StatusApp;