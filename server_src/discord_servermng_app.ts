import * as Discord from 'discord.js';
import {spawn} from 'child_process';
import * as path from 'path';
import LOG from './log';

const id = '528686772679606273';//'527950073322143794';//channel id

const PERMITTED_ROLES = ['Developer', 'Właściciel', 'Administrator'];
const SERVER_CMDS: any = {
	'start': '/home/in2rp/start.sh',
	'stop': '/home/in2rp/stop.sh',
	'restart': '/home/in2rp/restart.sh'
};

//var target_channel: Discord.TextChannel | undefined;
var MainMessage: Discord.Message | undefined;

async function clearChannel(channel: Discord.TextChannel) {
	try {
		let messages = await channel.fetchMessages();
		channel.bulkDelete(messages);
	}
	catch(e) {
		console.log('Error while clearing channel (servermng app):', e);
	}
}

function deleteDelayed(msg: Discord.Message | Discord.Message[]) {
	if(msg instanceof Discord.Message)
		setTimeout(() => msg.delete(), 20000);//20 seconds delay
}

function sendInsuficcientPermissionsWarning(channel: Discord.TextChannel) {
	channel.send('**Nie masz uprawnień do użycia komend na tym kanale** :poop:')
		.then(deleteDelayed).catch(console.error);
}

function sendCommandOutput(channel: Discord.TextChannel, output: string, success: boolean) {
	let text = success ? `\n**KOMENDA WYKONANA**\n${output}` : `\n:dizzy_face: **ERROR** :dizzy_face:\n\`${output}\``;
	channel.send(text)
		.then(deleteDelayed).catch(console.error);
}

function generateMessage(status = '') {//\n\n**Komendy strony:**\ntodo
	return `**Komendy serwera:**\n!start\n!stop\n!restart\n!rcon komenda - wykonuje podaną komendę w konsoli fivem\n\n**Inne:**\n!clear - czyści kanał\n\n${status}`;//.replace(/^\ */gi, '').replace(/^\t/gi, '');
}

function update(status: string) {
	if(!MainMessage)
		return;
	MainMessage.edit(generateMessage(status));
}

function executeCommand(cmd: string): Promise<string> {
	return new Promise((resolve, reject) => {
		var stdout = '';
		var stderr = '';

		try {
			let args = cmd.split(' ');
			let main_cmd = args.shift() || 'echo';
			const command = spawn(main_cmd, args);
			command.stdout.on('data', (data: string) => stdout += data);
			command.stderr.on('data', (data: string) => stderr += data);
			command.on('close', (code: number) => {
				//console.log(code, typeof code);
			  	if(code === 0)
			  		resolve(stdout);
			  	else
			  		reject(stderr);
			});
			command.on('error', (err: any) => {
			  	reject(err);
			});
		}
		catch(e) {
			reject(e);
		}
	});
}

function execCommand(command: string, message: Discord.Message) {
	return executeCommand(command).then((stdout: string) => {
		sendCommandOutput(message.channel as Discord.TextChannel, stdout, true);
		update(`**Ostatnie polecenie:** \`${message.content}\` (${message.author.username})`);
	}).catch((stderr: string) => {
		sendCommandOutput(message.channel as Discord.TextChannel, stderr, false);
		if(stderr.length > 1000)
			stderr = stderr.substr(0, 1000) + '...';
		update(`**Ostatnie polecenie:** \`${message.content}\` (${message.author.username})\n**Błąd:** \`${stderr}\``);
	});
}

const ManagerApp = {
	CHANNEL_ID: id,
	init: async (bot: Discord.Client) => {
		let target_channel = bot.channels.get(id);

		if(target_channel instanceof Discord.TextChannel) {
			var msg_arr = (await target_channel.fetchMessages()).array();
			if(msg_arr.length === 1 && msg_arr[0].author.bot) {
				MainMessage = msg_arr[0];
				MainMessage.edit(generateMessage());
			}
			else {
				await clearChannel(target_channel);
				target_channel.send(generateMessage()).then(msg => {
					MainMessage = msg as Discord.Message;
				}).catch(console.error);
			}
		}

		//test
		/*let full_command = path.join(__dirname, '..', 'tools', 'rcon.sh');
		const command = spawn(full_command, ['54.37.128.15', '30120', 'ameryczkarp', 'restart esx_scoreboard']);
		command.stdout.on('data', (data: string) => console.log(data.toString()));
		//command.stderr.on('data', (data: string) => stderr += data);
		command.on('close', (code: number) => {
			console.log(code, typeof code);
		});
		command.on('error', (err: any) => {
		  	console.log('error', err);
		});*/
	},
	handleMessage: async (message: Discord.Message, bot: Discord.Client) => {
		//console.log(message.member.roles.array().map(role => role.name));

		if(!message.content.startsWith('!'))
			return message.delete();

		if( message.member.roles.some(r => PERMITTED_ROLES.indexOf(r.name) !== -1) === false ) {
			sendInsuficcientPermissionsWarning(message.channel as Discord.TextChannel);
			return message.delete();
		}

		let args = message.content.substring(1).split(' ');
	    let cmd = (args.shift() || '').replace(/^dev_/i, '');

	    LOG(message.author.username, 'used servermng app command:', message.content);
	    switch(cmd) {
	    	case 'clear':
	    		return ManagerApp.init(bot);
		   	case 'start':
	   		case 'stop':
	   		case 'restart':
	   			update(`Wykonywanie skryptu w trakcie (\`${SERVER_CMDS[cmd]}\`)`);
		   		/*executeCommand(SERVER_CMDS[cmd]).then((stdout: string) => {
		   			sendCommandOutput(message.channel as Discord.TextChannel, stdout, true);
		   			update(`**Ostatnie polecenie:** \`${message.content}\` (${message.author.username})`);
		   		}).catch((stderr: string) => {
		   			sendCommandOutput(message.channel as Discord.TextChannel, stderr, false);
		   			if(stderr.length > 1000)
		   				stderr = stderr.substr(0, 1000) + '...';
		   			update(`**Ostatnie polecenie:** \`${message.content}\` (${message.author.username})\n**Błąd:** \`${stderr}\``);
		   		});*/

		   		await execCommand(SERVER_CMDS[cmd], message);
		   		break;
		   	case 'rcon':
		   		//TODO - test localhost instead of serwer ip in production
		   		let full_command = path.join(__dirname, '..', 'tools', 'rcon') + 
		   			' 54.37.128.15 30120 ameryczkarp ' + args.join(' ');
		   		update(`Wykonywanie skryptu w trakcie (\`rcon ${args.join(' ')}\`)`);
		   		await execCommand(full_command, message);
		   		break;
		}

		return message.delete();
	}
};

export default ManagerApp;