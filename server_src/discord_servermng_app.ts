import * as Discord from 'discord.js';
import Eclipse from './eclipse';
import LOG from './log';
import Utils from './utils';

const PERMITTED_ROLES = ['Developer', 'Właściciel', 'Administrator', 'Moderacja', 'Car Master'];

function generateMessage(status = '') {//\n\n**Komendy strony:**\ntodo
	return `**Komendy serwera:**\n!start\n!stop\n!restart\n!reboot X - restartuje serwer po X minutach\n!rcon komenda - wykonuje podaną komendę w konsoli fivem\n\n**Inne:**\n!clear - czyści kanał\n\n${status}`;
}

async function clearChannel(channel: Discord.TextChannel) {
	try {
		let messages = await channel.fetchMessages();
		channel.bulkDelete(messages);
	}
	catch(e) {
		console.log('Error while clearing channel (servermng app):', e);
	}
}

async function prepareChannel(channel: Discord.TextChannel): Promise<Discord.Message> {
	return new Promise(async (resolve, reject) => {
		var msg_arr = (await channel.fetchMessages()).array();
		if(msg_arr.length === 1 && msg_arr[0].author.bot)
			resolve(msg_arr[0]);
		else {
			await clearChannel(channel);
			channel.send('Ładowanko...').then(msg => {
				if(msg instanceof Discord.Message)
					resolve(msg);
				else
					resolve(msg[0]);
			}).catch(reject);
		}
	});
}

class Island {
	readonly channel_id: string;
	private index: number;

	public mainMessage?: Discord.Message;

	private static SERVER_CMDS = [Utils.SERVER_CMDS, Utils.SERVER_CMDS2, Utils.SERVER_CMDS3];

	constructor(_channel_id: string, _index: number) {
		this.channel_id = _channel_id;
		this.index = _index;
	}

	async init(bot: Discord.Client) {
		let target_channel = bot.channels.get(this.channel_id);

		if(target_channel instanceof Discord.TextChannel) {
			this.mainMessage = await prepareChannel(target_channel);
			this.mainMessage.edit( generateMessage() );
		}
	}

	getScriptName(cmd: 'start' | 'stop' | 'restart') {
		return Island.SERVER_CMDS[this.index][cmd];
	}

	getServerPort() {
		return 30120 + this.index;
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

const ManagerApp = {
	ISLANDS: {
		isl1: new Island('528686772679606273', 0),
		isl2: new Island('542828808252948480', 1),
		isl3: new Island('546022718915477504', 2)
	},
	getIslandByID: (channel_id: string) => {
		if(channel_id === ManagerApp.ISLANDS.isl1.channel_id)
			return ManagerApp.ISLANDS.isl1;
		if(channel_id === ManagerApp.ISLANDS.isl2.channel_id)
			return ManagerApp.ISLANDS.isl2;
		if(channel_id === ManagerApp.ISLANDS.isl3.channel_id)
			return ManagerApp.ISLANDS.isl3;
		throw new Error('No island assigned to this channel');
	},
	init: async (bot: Discord.Client, island?: Island) => {
		if(island)
			await island.init(bot);
		else {
			await ManagerApp.ISLANDS.isl1.init(bot);
			await ManagerApp.ISLANDS.isl2.init(bot);
			await ManagerApp.ISLANDS.isl3.init(bot);
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

	    // let ch1 = message.channel.id === id, ch2 = message.channel.id === id2;
	    // let targetMsg = ch1 ? MainMessage : MainMessage2;
	    // if(!targetMsg)
	    	// throw new Error('No target message. Script may not be initalized properly.');
	    let island = ManagerApp.getIslandByID(message.channel.id);
	    if(!island.mainMessage)
	    	throw new Error('No target message. Script may not be initalized properly.');

	    LOG(message.author.username, `used servermng app command:`, message.content);
	    switch(cmd) {
	    	case 'clear':
	    		return ManagerApp.init(bot, island);
		   	case 'start':
	   		case 'stop':
	   		case 'restart': {
	   			let scriptname = island.getScriptName(cmd);
	   			//ch1 ? Utils.SERVER_CMDS[cmd] : Utils.SERVER_CMDS2[cmd];
	   			update(island.mainMessage, `Wykonywanie skryptu w trakcie (\`${scriptname}\`)`);
		   		await execCommand(scriptname, message, island.mainMessage);
		   	}	break;
		   	case 'reboot': {
		   		let X = parseInt(args[0]);
		   		let rcon_base = Utils.RCON_CMD_BASE( island.getServerPort() );
		   		update(island.mainMessage, `Wykonywanie polecenia konsoli fivem w trakcie (\`rcon reboot ${args.join(' ')}\`)`);
		   		await execCommand(rcon_base + 'reboot ' + X, message, island.mainMessage);

		   		//restarts serwer after X minutes
		   		if(island === ManagerApp.ISLANDS.isl1)//eclipse only for main server
		   			Eclipse.start(X, true);
		   		else {//skip 'countdown' for test server
		   			setTimeout(() => {//restart after X minutes
		   				Utils.executeCommand(Utils.SERVER_CMDS2['restart'])
		   			}, 1000*60*X);
		   		}
		   	}	break;
		   	case 'rcon': {
		   		//TODO - test localhost instead of serwer ip in production
		   		let rcon_base = Utils.RCON_CMD_BASE( island.getServerPort() );
		   		update(island.mainMessage, `Wykonywanie polecenia konsoli fivem w trakcie (\`rcon ${args.join(' ')}\`)`);
		   		await execCommand(rcon_base + args.join(' '), message, island.mainMessage);
		   	}	break;
		}

		message.delete().catch(console.error);
	}
};

export default ManagerApp;