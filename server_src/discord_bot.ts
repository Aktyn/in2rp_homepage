import * as Discord from 'discord.js';
import LOG from './log';

import Hangman from './hangman';
import todoApp from './discord_todo_app';
import statusApp from './discord_status_app';
import rulesApp from './discord_rules_app';
import manageApp from './discord_servermng_app';

var TOKEN: string | undefined = undefined;
var started = false;

process.argv.forEach((val: string) => {
	//@ts-ignore
	if(val.startsWith('TOKEN='))
		TOKEN = val.replace('TOKEN=', '');
});

if(!TOKEN)
	throw new Error('You must specify bot TOKEN as argument: TOKEN=SECRET_TOKEN');

var bot = new Discord.Client();

bot.on('messageReactionAdd', rulesApp.onReactionAdded);
bot.on('messageReactionRemove', rulesApp.onReactionRemoved);

interface GameSchema {
	id: string;
	game: Hangman;
}
var games: GameSchema[] = [];

function removeGame(user_id: string) {
	let current_game = games.find(g => g.id === user_id);
	if(current_game)
		games.splice(games.indexOf(current_game), 1);
}

function answerToMsg(author: Discord.User, message?: string) {
	author.send(message).catch(e => console.log('Cannot answer to user:', author.username));
}

function onLogin() {
	console.log('Bot is running');

	if(process.env.NODE_ENV === 'dev')
		bot.user.setActivity("Pracownia Aktyna");

	/*bot.on('presenceUpdate', member => {
		console.log(member.user);
	});*/
	
	//@ts-ignore
	//console.log( bot.channels.map(ch => {return {id: ch.id, name: ch.name}}) );

	if(process.env.NODE_ENV !== 'dev')//disabled in dev move
		statusApp.init(bot);
	if(process.env.NODE_ENV !== 'dev')//disabled in dev move
		rulesApp.init(bot);
	if(process.env.NODE_ENV !== 'dev')
		manageApp.init(bot);

	bot.on('message', message => {
		//console.log(message.channel);
		//return;
		if(!message.author || message.author.bot)
			return;

		//#co-trzeba-jeszcze-zrobic //520947668432715787
		//#regulamin - 516320348464087054
		if(message.channel.type === 'text') {//non private message
			switch(message.channel.id) {
				case todoApp.CHANNEL_ID: 	
					if(process.env.NODE_ENV !== 'dev')
						return todoApp.handleMessage(message);
					break;
				case statusApp.CHANNEL_ID: 	
					if(process.env.NODE_ENV !== 'dev')
						return statusApp.handleMessage(message, bot);
					break;
				case manageApp.CHANNEL_ID:	
					if(process.env.NODE_ENV !== 'dev')
						return manageApp.handleMessage(message, bot);
					break;
			}
			return;
		}
		else if(message.channel.type !== 'dm')
			return;

		if(process.env.NODE_ENV === 'dev')//disable hangman in dev mode
			return;

	    if(message.content.startsWith('!')) {//private message command
	    	LOG(message.author.username, 'used discordbot command:', message.content);

	    	let args = message.content.substring(1).split(' ');
		    let cmd = args.shift();

		    switch(cmd) {
		        case 'wisielec':
		        	if(games.find(g => g.id === message.author.id)) {
		        		answerToMsg(message.author, "Już gramy w wisielca. Aby przerwać napisz: `!koniec`");
		        		break;
		        	}
		        	answerToMsg(message.author, "No to gramy. Jeśli chcesz przerwać - napisz `!koniec`");

		        	var game = new Hangman();
		        	games.push({
		        		id: message.author.id,
		        		game: game
		        	});

		        	answerToMsg(message.author, `Zgaduj litery pisząc je do mnie (pojedyńczo), lub spróbuj zgadnąć hasło wpisując je w całości.\nPozostało szans: ${game.getRemainingTries()}\n\`${game.getUserGuess()}\``);
		        	break;
		        case 'koniec':
		        	if(games.find(g => g.id === message.author.id) === undefined)
		        		answerToMsg(message.author, 'Nie ma żadnej gry, którą można by zakończyć.');
		        	else
		        		answerToMsg(message.author, 'Fajnie się grało. Może jeszcze będzie okazja.');
		        	removeGame(message.author.id);
		        	break;
		   	}

		   	if(process.env.NODE_ENV === 'dev') {
		   		statusApp.handleMessage(message, bot);
		   	}
	    }
	    else {//regular message
	    	var user_game = games.find(g => g.id === message.author.id);
	    	
	    	if(user_game === undefined) {
		    	answerToMsg(message.author, "Cześć. Jestem tylko małomównym botem, chyba że chcesz zagrać w wisielca.\nNapisz do mnie `!wisielec` by zacząć. :wink:");
		    }
		    else if(Date.now() - user_game.game.timestamp > 1000 * 60 * 60) {//game expired
	    		answerToMsg(message.author, `Gra w wisielca wygasła.`);
	    		removeGame(message.author.id);
	    	} 
	    	else {
	    		var guess_res = user_game.game.tryAnswerOrLetter(message.content);
	    		
	    		switch(guess_res) {
	    			case Hangman.RESULT.letter_guessed:
	    				answerToMsg(message.author, `Zgadłeś\n\`${user_game.game.getUserGuess()}\``);
	    				break;
    				case Hangman.RESULT.wrong_guess:
    					if(user_game.game.getRemainingTries() === 0) {
    						answerToMsg(message.author, `Zostałeś powieszony :dizzy_face:\nHasło to: \`${user_game.game.getAnswer()}\`\nMoże następnym razem się uda.`);
    						removeGame(message.author.id);
    					}
    					else {
    						answerToMsg(message.author, `Źle\n\`${user_game.game.getUserGuess()}\`\nPozostało prób: ${user_game.game.getRemainingTries()}`);
    					}
	    				break;
    				case Hangman.RESULT.solved:
    					LOG('Someone won hangman game with discobot:', message.author.username, message.author.id, user_game.game.getUserGuess());
    					answerToMsg(message.author, `Brawo! :clap:\nOdgadłeś hasło: \`${user_game.game.getUserGuess()}\``);
    					removeGame(message.author.id);
	    				break;
    				case Hangman.RESULT.repeated_guess:
    					answerToMsg(message.author, `Już tego próbowałeś. Nie powtarzaj odpowiedzi.\n\`${user_game.game.getUserGuess()}\``);
	    				break;
	    			case Hangman.RESULT.wrong_input:
	    				answerToMsg(message.author, `Możesz podawać tylko litery i spacje.\n\`${user_game.game.getUserGuess()}\``);
	    				break;
	    		}

	    	} 
	    }
	});
}

export default {
	getClient: function() {
		return bot;
	},

	getGuild: function() {
		return bot.guilds.find(g => g.name === 'IN2RP.PL +16');
	},

	start: function() {
		if(started === true) {
			console.log('Bot already started');
			return;
		}
		started = true;
		bot.login(TOKEN).then(onLogin).catch(console.error);
	},

	sendPrivateMessage: function(user_id: string, message: string) {
		if(started) {
			var found_user = bot.users.get(user_id);
			if(found_user)
				return found_user.send(message);
			else
				return undefined;
		}
		return undefined;
	},

	sendChannelMessage: function(channel_id: string, message: string) {
		if(started) {
			var found_channel = bot.channels.get(channel_id);
			if(found_channel)
				//@ts-ignore
				return found_channel.send(message);
			else
				return undefined;
		}
		return undefined;
	},

	clearChannel: async function(channel_id: string) {
		try {
			var channel = bot.channels.get(channel_id);
			if(channel instanceof Discord.TextChannel) {
				let messages = await channel.fetchMessages();
				channel.bulkDelete(messages);
			}
		}
		catch(e) {
			console.log('Cannot clear channel:', e);
		}
	},

	getDiscordUser: function(user_id: string) {
		if(started)
			return bot.users.get(user_id);
		return undefined;
	}	
};