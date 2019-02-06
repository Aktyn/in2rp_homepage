import * as Discord from 'discord.js';
import Utils from './utils';
import Eclipse from './eclipse';
import LOG from './log';

const id = '528686772679606273';//'527950073322143794';//channel id

const PERMITTED_ROLES = ['Developer', 'Właściciel', 'Administrator', 'Moderacja'];

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
	return `**Komendy serwera:**\n!start\n!stop\n!restart\n!reboot X - restartuje serwer po X minutach\n!rcon komenda - wykonuje podaną komendę w konsoli fivem\n\n**Inne:**\n!clear - czyści kanał\n\n${status}`;//.replace(/^\ */gi, '').replace(/^\t/gi, '');
}

function update(status: string) {
	if(!MainMessage)
		return;
	MainMessage.edit(generateMessage(status));
}

function execCommand(command: string, message: Discord.Message) {
	var timest = new Date().toLocaleTimeString('en-US', {hour12: false});

	return Utils.executeCommand(command).then((stdout: string) => {
		sendCommandOutput(message.channel as Discord.TextChannel, stdout, true);
		update(`**Ostatnie polecenie:** \`${message.content}\` (${message.author.username}) - ${timest}\n`);
	}).catch((stderr: string) => {
		sendCommandOutput(message.channel as Discord.TextChannel, stderr, false);
		if(stderr.length > 1000)
			stderr = stderr.substr(0, 1000) + '...';
		update(`**Ostatnie polecenie:** \`${message.content}\` (${message.author.username}) - ${timest}\n**Błąd:** \`${stderr}\`\n`);
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
	   			update(`Wykonywanie skryptu w trakcie (\`${Utils.SERVER_CMDS[cmd]}\`)`);
		   		await execCommand(Utils.SERVER_CMDS[cmd], message);
		   		break;
		   	case 'reboot':
		   		//let full_command1 = path.join(__dirname, '..', 'tools', 'rcon') + 
		   		//	' 54.37.128.15 30120 ameryczkarp reboot ' + args[0];
		   		//console.log(full_command1);
		   		let X = parseInt(args[0]);
		   		update(`Wykonywanie polecenia konsoli fivem w trakcie (\`rcon reboot ${args.join(' ')}\`)`);
		   		await execCommand(Utils.RCON_CMD_BASE + 'reboot ' + X, message);

		   		//restarts serwer after X minutes
		   		Eclipse.start(X, true);
		   		break;
		   	case 'rcon':
		   		//TODO - test localhost instead of serwer ip in production
		   		//let full_command2 = path.join(__dirname, '..', 'tools', 'rcon') + 
		   		//	' 54.37.128.15 30120 ameryczkarp ' + args.join(' ');
		   		update(`Wykonywanie polecenia konsoli fivem w trakcie (\`rcon ${args.join(' ')}\`)`);
		   		await execCommand(Utils.RCON_CMD_BASE + args.join(' '), message);
		   		break;
		}

		return message.delete();
	}
};

export default ManagerApp;