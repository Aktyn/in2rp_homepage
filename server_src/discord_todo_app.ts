import * as Discord from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import LOG from './log';

const MAX_HISTORY_SIZE = 69;

const data_path = path.join(__dirname, '..', 'data');
if(!fs.existsSync(data_path))
	fs.mkdirSync(data_path);
const todo_path = path.join(data_path, 'todo');
if(!fs.existsSync(todo_path))
	fs.appendFileSync(todo_path, '', 'utf8');

var history: string[][] = [];
var todo_list: string[] = fs.readFileSync(todo_path, 'utf8').split('\n').filter(line => line.length > 0);

function clearChannel(message: Discord.Message) {//removes every message from channel
	message.channel.fetchMessages().then(messages => {
		message.channel.bulkDelete(messages);
		//var messagesDeleted = messages.array().length; // number of messages deleted
	}).catch(err => {
		console.log('Error while deleting channel messages');
		console.log(err);
	});
}

function printList(message: Discord.Message) {
	if(todo_list.length === 0) {
		message.channel.send('Nic do zrobienia :open_mouth:');
		return;
	}
	let list = todo_list.map((line, index) => {
		return `${index+1} - ${line}`;
	}).join('\n');

	if(list.length >= 2000) {//handle single message length limit
		let lines = list.split('\n');
		let firstmsg: string[] = [], secondmsg: string[] = [];
		let temp_len = 0;
		for(var i=0; i<lines.length; i++) {
			if((temp_len += lines[i].length+1) < 2000)
				firstmsg.push(lines[i]);
			else
				secondmsg.push(lines[i]);
		}

		message.channel.send(firstmsg.join('\n')).then(() => {
			message.channel.send(secondmsg.join('\n'));
		});
	}
	else
		message.channel.send(list);
}

function printEmptyHistoryInfo(message: Discord.Message) {
	message.channel.send('Nie ma nic do cofnięcia.');
}

function printHelp(message: Discord.Message) {
	message.channel.send((process.env.NODE_ENV === 'dev' ? '[dev mode] ' : '') + '`Czyszczenie wszystkiego prócz listy zadań: !clear\nDodawanie nowego zadania: !add tresc zadania\nUsuwanie zadania z listy: !delete [numer_zadania]\nCofniecie ostatniej zmiany: !undo`');
}

export default {
	CHANNEL_ID: '528686895836692480',//'520947668432715787',
	handleMessage: (message: Discord.Message) => {
		if(process.env.NODE_ENV === 'dev') {
			if(!message.content.startsWith('!dev_'))
				return printHelp(message);

		}
		if(!message.content.startsWith('!'))
			return printHelp(message);

		LOG(`user ${message.author.username}#${message.author.discriminator} used todo app command: ${message}`);

		let args = message.content.substring(1).split(' ');
	    let cmd = (args.shift() || '').replace(/^dev_/i, '');

	    switch(cmd) {
	    	default:
	    		printHelp(message);
	    		break;
		   	case 'clear':
		   		clearChannel(message);
		   		printList(message);
		   		break;
		   	case 'add':
		   		let msg_to_add = args.join(' ') + ` (${message.author.username})`;
		   		history.push(todo_list.slice());
		   		if(history.length > MAX_HISTORY_SIZE)
		   			history.shift();
		   		todo_list.push(msg_to_add);
		   		fs.writeFileSync(todo_path, todo_list.join('\n'));

		   		clearChannel(message);
		   		printList(message);
		   		break;
		   	case 'remove':
		   	case 'delete':
		   		let index = parseInt( args[0] ) || -1;
		   		if(index <= todo_list.length) {
		   			history.push(todo_list.slice());
		   			todo_list.splice(index-1, 1);
		   			fs.writeFileSync(todo_path, todo_list.join('\n'));
		   		}
		   		clearChannel(message);
		   		printList(message);
		   		break;
		   	case 'undo':
		   		if(history.length > 0) {
		   			todo_list = history.pop() || [];
		   			fs.writeFileSync(todo_path, todo_list.join('\n'));
		   			clearChannel(message);
		   			printList(message);
		   		}
		   		else
		   			printEmptyHistoryInfo(message);
		   		break;
		}
	}
};