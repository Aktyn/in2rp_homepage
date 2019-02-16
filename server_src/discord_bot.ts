import * as Discord from 'discord.js';
import LOG from './log';
import Utils from './utils';

import Hangman from './hangman';
import todoApp from './discord_todo_app';
import StatusApp, { SERVERS_DATA } from './discord_status_app';
import usageApp from './discord_usage_app';
import rulesApp from './discord_rules_app';
import manageApp from './discord_servermng_app';
import mysqlApp from './discord_mysqlmng_app';

//import Database from './database';

var music = require("discord.js-musicbot-addon");

var TOKEN = Utils.getArgument('TOKEN');
var YOUTUBE_API_KEY = Utils.getArgument('YOUTUBE_API_KEY');
var started = false;

/*process.argv.forEach((val: string) => {
	if(val.startsWith('TOKEN='))
		TOKEN = val.replace('TOKEN=', '');
	else if(val.startsWith('YOUTUBE_API_KEY='))
		YOUTUBE_API_KEY = val.replace('YOUTUBE_API_KEY=', '');
});*/

if(!TOKEN)
	throw new Error('You must specify bot TOKEN as argument: TOKEN=SECRET_TOKEN');

var bot = new Discord.Client();
var guild: Discord.Guild | null = null;

// console.log(YOUTUBE_API_KEY, music);
if(process.env.NODE_ENV !== 'dev') {
	music.start(bot, {
		youtubeKey: YOUTUBE_API_KEY,
		anyoneCanSkip: true,
		anyoneCanLeave: true,
		logging: false,
		defVolume: 20,
		messageNewSong: false,
		requesterName: false,
		ownerOverMember: true,
	  	ownerID: '204639827193364492',
	  	botAdmins: ['204639827193364492'],
	  	channelWhitelist: ['539421078116761600']//bot-komendy
	});
}

bot.on('messageReactionAdd', (reaction: Discord.MessageReaction, user: Discord.User) => {
	mysqlApp.onReactionAdded(reaction, user);
	rulesApp.onReactionAdded(reaction, user);
});
bot.on('messageReactionRemove', rulesApp.onReactionRemoved);

bot.on('guildMemberAdd', member => {
	if(process.env.NODE_ENV === 'dev')
		return;
	let new_member_id = member.id;

	setTimeout(() => {
		if(!guild)
			return;
		guild.fetchMember(new_member_id).then(m => {
			if(m.roles.some(r => r.name === 'Użytkownik'))
				return;
			m.user.send('Witaj.\nPięć minut temu moje czujniki wykryły, że jesteś nowym użytkownikiem na naszym serwerze IN2RP.\nNiestety do tej pory nie zaakceptowałeś regulaminu, więc większości kanałów jest dla ciebie niedostępna.\nMożesz to w każdej chwili zmienić klikając :white_check_mark: pod regulaminem na kanale: <#528678812507045898>.');
		}).catch(()=>{});//ignore errors
		
	}, 1000*60*5);
});

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

const good_links = [
	new RegExp('https?:\/\/in2rp.(pl|com)', 'i'),
	new RegExp('https?:\/\/discord.gg/4aa6F7Q', 'i'),
	new RegExp('https?:\/\/(www\.)?youtube.com', 'i'),
	new RegExp('https?:\/\/youtu.be', 'i'),
	new RegExp('https?:\/\/i.imgur.com', 'i')
];
//const forbiddenPatterns = ['http://discord'];
function isProperMessage(msg: string) {
	//check whitelisted links
	for(var link of good_links) {
		if(msg.match(link))
			return true;
	}

	//check for discord invitations hidden in messages
	/*let matching_chars = new Uint8Array(forbiddenPatterns.length);
	for(var i=0; i<msg.length; i++) {
		for(var j=0; j<forbiddenPatterns.length; j++) {
			if( msg[i] === forbiddenPatterns[j][matching_chars[j]] ) {
				if(++matching_chars[j] === forbiddenPatterns[j].length)
					return false;
			}
		}
	}*/

	//check for regular link
	return !msg.match(/(https?:\/\/|www\.).+\..+/gi);
}

//import Database from './database';//tmp
function onLogin() {
	console.log('Bot is running');

	//if(process.env.NODE_ENV === 'dev')
	//	bot.user.setActivity("Pracownia Aktyna");

	/*bot.on('presenceUpdate', member => {
		console.log(member.user);
	});*/

	//clear #bot-komendy channel
	let ch = bot.channels.get('539421078116761600');
	if(ch instanceof Discord.TextChannel) {
		ch.fetchMessages({limit: 100}).then(msgs => msgs.array()).then(msgs => {
			msgs.forEach((msg, i) => {
				if(i !== msgs.length-1)//skip first message
					msg.delete();
				//msg.pin().then(res => console.log(res)).catch(console.error);
				//if(msg.content.indexOf('podanie o whiteliste') === -1)
					//msg.delete();
			});
		});

		//tests
		/*let embed = new Discord.RichEmbed().setColor('#26A69A')
			.setImage('http://in2rp.pl/static/img/favicon.png');
		ch.send(embed).then(msg => {
        	let i = 0;
        	
        	setInterval(() => {
        		if(msg instanceof Discord.Message) {
        			let embed2 = new Discord.RichEmbed().setColor('#26A69A')
        				.setImage(`http://in2rp.pl/static/img/bg_blur${i++}.jpg`);
        			msg.edit(embed2).catch(console.error);
        			if(i===3)
        				i=0;
        		}
        	}, 5000);
        }).catch(console.error);*/
	}

	/*(<Discord.TextChannel>bot.channels.get('528960073507143680')).fetchMessages()
		.then(msgs => msgs.array().map(msg => {return {nick: msg.author.username, id: msg.content}}))
		.then(msgs => msgs.filter(msg => {
			return msg.id.replace(/\d/gi, '').length === 0;
		}))
		.then(msgs => {
			msgs.forEach(async (m) => {
				//@ts-ignore

				let dbres = await Database.customQuery(`select * from admin_in2rp.whitelist where identifier = 'steam:${BigInt(m.id).toString(16)}'`);

				if(dbres.length === 0)
					console.log(m.nick, m.id);
			});
		});*/

	guild = bot.guilds.find(g => g.id === '492333108679409674');//IN2RP guild id
	
	/*guild.members.filter(m=>!m.roles.some(r=>r.name==='Użytkownik')).forEach(m => {
		//if(m.user.username === 'Aktyn') {
			console.log(m.user.username);
			m.send('Witaj.\nZauważyliśmy że jesteś członkiem naszego serwerza od dłuższego czasu i nadal nie zaakceptowałeś/aś regulaminu, więc większość kanałów jest dla ciebie niewidoczna.\nMożesz to w każdej chwili zmienić klikając :white_check_mark: pod regulaminem na kanale: <#528678812507045898>.\nPozdrawiamy, Administracja IN2RP')
		//}
	});*/

	let stat0 = new StatusApp(bot, '528694912162594827', SERVERS_DATA.isl1, 0);//public channels
	stat0.hookEclipse();
	let stat1 = new StatusApp(bot, '545244244101693441', SERVERS_DATA.isl1, 0);
	//stat1.hookEclipse();

	let stat2 = new StatusApp(bot, '545244292575133706', SERVERS_DATA.isl2, 1);//public channels
	stat2.hookEclipse();
	let stat3 = new StatusApp(bot, '546019816050524161', SERVERS_DATA.isl2, 1);
	//stat3.hookEclipse();

	let stat_dev = new StatusApp(bot, '546022679610785792', SERVERS_DATA.dev, 2);
	stat_dev.hookEclipse();
	
	if(process.env.NODE_ENV !== 'dev')//disabled in dev move
		usageApp.init(bot);
	if(process.env.NODE_ENV !== 'dev')//disabled in dev move
		rulesApp.init(bot);
	if(process.env.NODE_ENV !== 'dev')//disabled in dev move
		manageApp.init(bot);
	// if(process.env.NODE_ENV !== 'dev')//disabled in dev move
		mysqlApp.init(bot);

	bot.on('message', (message) => {
		if(message.channel instanceof Discord.TextChannel && 
			message.channel.id === '539421078116761600') 
		{//#bot-komendy
			if(!message.author.bot)
				setTimeout(() => message.delete(), 5000);//remove user message after 5 secs
			else
				setTimeout(() => message.delete(), 60000*3);//remove bot message after 3 minutes
		}

		if(!message.author || message.author.bot)
			return;

		if(message.channel instanceof Discord.TextChannel) {//non private message
			if(!isProperMessage(message.content)) {
				console.log('removing link:', message.content);
				message.delete().catch(console.error);
			}

			if(message.content.indexOf('@everybody') !== -1) {
				if( message.channel.guild.roles.find(r=>r.name==='@everyone') )
					message.channel.send('@everyone').then(() => message.delete()).catch(console.log);
			}

			switch(message.channel.id) {
				case todoApp.CHANNEL_ID:
				case todoApp.CHANNEL_ID2:
					if(process.env.NODE_ENV !== 'dev')
						return todoApp.handleMessage(message);
					break;
				case mysqlApp.CHANNEL_ID:
					//if(process.env.NODE_ENV !== 'dev')
						return mysqlApp.handleMessage(message);
					break;
				/*case statusApp.CHANNEL_ID: 	
					if(process.env.NODE_ENV !== 'dev')
						return statusApp.handleMessage(message, bot);
					break;*/
				case stat0.channel_id:
					return stat0.handleMessage(message);
					break;
				case stat1.channel_id:
					return stat1.handleMessage(message);
					break;
				case stat2.channel_id:
					return stat2.handleMessage(message);
					break;
				case stat3.channel_id:
					return stat3.handleMessage(message);
					break;
				case stat_dev.channel_id:
					return stat_dev.handleMessage(message);
					break;
				case usageApp.CHANNEL_ID: 	
					if(process.env.NODE_ENV !== 'dev')
						return usageApp.handleMessage(message, bot);
					break;
				case manageApp.ISLANDS.isl1.channel_id:
				case manageApp.ISLANDS.isl2.channel_id:
				case manageApp.ISLANDS.isl3.channel_id:
					//if(process.env.NODE_ENV !== 'dev')
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

	//deprecated
	changeUserRole: function(user_id: string, role_name: string, remove_role = false) {
		if(!started || !guild)
			return false;
		try {
			let member = guild.members.get(user_id);
			if(!member)
				throw new Error("Cannot find member with id: " + user_id);
			guild.roles.some(rl => {
				if(rl.name === role_name && member) {
					if(remove_role === true && member.roles.some(rl => rl.name === role_name))
						member.removeRoles([rl]).catch(console.error);
					if(remove_role === false && !member.roles.some(rl => rl.name === role_name))
						member.addRoles([rl]).catch(console.error);
					return true;
				}
				return false;
			});
			return true;
		}
		catch(e) {
			console.log('Cannot set user role:', e);
			return false;
		}
	},

	changeUserRoleAsync: async function(user_id: string, role_name: string, remove_role = false) {
		if(!started || !guild)
			return false;
		try {
			let user = await guild.client.fetchUser(user_id);
			let member = await guild.fetchMember(user);

			guild.roles.some(rl => {
				if(rl.name === role_name) {
					if(remove_role === true && member.roles.some(rl => rl.name === role_name))
						member.removeRoles([rl]).catch(console.error);
					if(remove_role === false && !member.roles.some(rl => rl.name === role_name))
						member.addRoles([rl]).catch(console.error);
					return true;
				}
				return false;
			});
			return true;
		}
		catch(e) {
			console.log('Cannot set user role:', e);
			return false;
		}
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