import * as Discord from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

const logs_path = path.join(__dirname, '..', 'logs');
if(!fs.existsSync(logs_path))
	fs.mkdirSync(logs_path);
const todo_path = path.join(logs_path, 'todo');
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
	message.channel.send(todo_list.map((line, index) => {
		return `${index+1} - ${line}`;
	}).join('\n'));
}

function printHelp(message: Discord.Message) {
	message.channel.send('`Czyszczenie wszystkiego prócz listy zadań: !clear\nDodawanie nowego zadania: !add tresc zadania\nUsuwanie zadania z listy: !delete [numer_zadania]`');
}

export default {
	handleMessage: (message: Discord.Message) => {
		if(process.env.NODE_ENV === 'dev')//temporary blocked in dev mode due to prevent collisions
			return;
		if(!message.content.startsWith('!'))
			return printHelp(message);

		let args = message.content.substring(1).split(' ');
	    let cmd = args.shift();

	    switch(cmd) {
	    	default:
	    		printHelp(message);
	    		break;
		   	case 'clear':
		   		clearChannel(message);
		   		printList(message);
		   		break;
		   	case 'add':
		   		let msg_to_add = args.join(' ');
		   		todo_list.push(msg_to_add);
		   		fs.writeFileSync(todo_path, todo_list.join('\n'));

		   		clearChannel(message);
		   		printList(message);
		   		break;
		   	case 'delete':
		   		let index = parseInt( args[0] ) || -1;
		   		if(index < todo_list.length) {
		   			todo_list.splice(index-1, 1);
		   			fs.writeFileSync(todo_path, todo_list.join('\n'));
		   		}
		   		clearChannel(message);
		   		printList(message);
		   		break;
		}
	}
};