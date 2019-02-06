import * as Discord from 'discord.js';
import Utils from './utils';
import Eclipse from './eclipse';
import LOG from './log';

const id = '528686772679606273';//channel id
const id2 = '542828808252948480';//#zarzadzanie-serverem-test

const PERMITTED_ROLES = ['Developer', 'Właściciel', 'Administrator', 'Moderacja'];

var MainMessage: Discord.Message | undefined;
var MainMessage2: Discord.Message | undefined;

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

function update(target_msg: Discord.Message, status: string) {
	//if(!MainMessage)
	//	return;
	target_msg.edit(generateMessage(status));
}

function execCommand(command: string, message: Discord.Message, target_msg: Discord.Message) {
	var timest = new Date().toLocaleTimeString('en-US', {hour12: false});

	return Utils.executeCommand(command).then((stdout: string) => {
		sendCommandOutput(message.channel as Discord.TextChannel, stdout, true);
		update(target_msg, `**Ostatnie polecenie:** \`${message.content}\` (${message.author.username}) - ${timest}\n`);
	}).catch((stderr: string) => {
		sendCommandOutput(message.channel as Discord.TextChannel, stderr, false);
		if(stderr.length > 1000)
			stderr = stderr.substr(0, 1000) + '...';
		update(target_msg, `**Ostatnie polecenie:** \`${message.content}\` (${message.author.username}) - ${timest}\n**Błąd:** \`${stderr}\`\n`);
	});
}

async function prepareChannel(channel: Discord.TextChannel): Promise<Discord.Message> {
	return new Promise(async (resolve, reject) => {
		var msg_arr = (await channel.fetchMessages()).array();
		if(msg_arr.length === 1 && msg_arr[0].author.bot)
			resolve(msg_arr[0]);
		else {
			await clearChannel(channel);
			channel.send('Ładowanko...').then(msg => {
				// MainMessage = msg as Discord.Message;
				if(msg instanceof Discord.Message)
					resolve(msg);
				else
					resolve(msg[0]);
			}).catch(reject);
		}
	});
}

const ManagerApp = {
	CHANNEL_ID: id,
	CHANNEL_ID2: id2,
	init: async (bot: Discord.Client, init1 = true, init2 = true) => {
		let target_channel = bot.channels.get(id);
		let target_channel2 = bot.channels.get(id2);

		if(init1 && target_channel instanceof Discord.TextChannel) {
			MainMessage = await prepareChannel(target_channel);
			MainMessage.edit(generateMessage());
		}
		if(init2 && target_channel2 instanceof Discord.TextChannel){
			MainMessage2 = await prepareChannel(target_channel2);
			MainMessage2.edit(generateMessage());
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

	    let ch1 = message.channel.id === id, ch2 = message.channel.id === id2;
	    let targetMsg = ch1 ? MainMessage : MainMessage2;
	    if(!targetMsg)
	    	throw new Error('No target message. Script may not be initalized properly.');

	    LOG(message.author.username, `used servermng app command${ch2?' on test server' : ''}:`, 
	    	message.content);
	    switch(cmd) {
	    	case 'clear':
	    		return ManagerApp.init(bot, ch1, ch2);
		   	case 'start':
	   		case 'stop':
	   		case 'restart': {
	   			let scriptname = ch1 ? Utils.SERVER_CMDS[cmd] : Utils.SERVER_CMDS2[cmd];
	   			update(targetMsg, `Wykonywanie skryptu w trakcie (\`${scriptname}\`)`);
		   		await execCommand(scriptname, message, targetMsg);
		   	}	break;
		   	case 'reboot': {
		   		//let full_command1 = path.join(__dirname, '..', 'tools', 'rcon') + 
		   		//	' 54.37.128.15 30120 ameryczkarp reboot ' + args[0];
		   		//console.log(full_command1);
		   		let X = parseInt(args[0]);
		   		let rcon_base = Utils.RCON_CMD_BASE(ch1 ? 30120 : 30121);
		   		update(targetMsg, `Wykonywanie polecenia konsoli fivem w trakcie (\`rcon reboot ${args.join(' ')}\`)`);
		   		await execCommand(rcon_base + 'reboot ' + X, message, targetMsg);

		   		//restarts serwer after X minutes
		   		if(ch1)//eclipse only for main server
		   			Eclipse.start(X, true);
		   		else {//skip 'countdown' for test server
		   			setTimeout(() => {//restart after X minutes
		   				Utils.executeCommand(Utils.SERVER_CMDS2['restart'])
		   			}, 1000*60*X);
		   		}
		   	}	break;
		   	case 'rcon': {
		   		//TODO - test localhost instead of serwer ip in production
		   		//let full_command2 = path.join(__dirname, '..', 'tools', 'rcon') + 
		   		//	' 54.37.128.15 30120 ameryczkarp ' + args.join(' ');
		   		let rcon_base = Utils.RCON_CMD_BASE(ch1 ? 30120 : 30121);
		   		update(targetMsg, `Wykonywanie polecenia konsoli fivem w trakcie (\`rcon ${args.join(' ')}\`)`);
		   		await execCommand(rcon_base + args.join(' '), message, targetMsg);
		   	}	break;
		}

		message.delete().catch(console.error);
	}
};

export default ManagerApp;