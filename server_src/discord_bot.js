const Discord = require("discord.js");

var TOKEN = null;
var started = false;

process.argv.forEach((val) => {
	if(val.startsWith('TOKEN='))
		TOKEN = val.replace('TOKEN=', '');
});

if(!TOKEN)
	throw new Error('You must specify bot TOKEN as argument: TOKEN=SECRET_TOKEN');

var bot = new Discord.Client();

function onLogin() {
	console.log('Bot is running');

	// bot.user.setActivity("Pracownia Aktyna");

	/*bot.on('presenceUpdate', member => {
		console.log(member.user);
	});*/

	// console.log( bot.channels.get('516321132656197661') );

	bot.on('message', message => {
		//console.log(message.author);
		//#9473 - aktyn
		/*if(message.author && message.author.bot === false) {
			console.log(message.author.username, message.content);
			message.author.send("Jestę botę");
		}*/
	    /*if(!message.content.startsWith('!')) return;

	    let args = message.content.substring(1).split(' ');
	    let cmd = args.shift();

	    switch(cmd) {
	        case 'say':
	            if(message.author.id === '457479295078760448')
	                message.channel.send(args.join(' '))
	                    .then(message.delete());
	            break;
	    }*/
	});
}

module.exports = {
	start: function() {
		if(started === true) {
			console.log('Bot already started');
			return;
		}
		started = true;
		bot.login(TOKEN).then(onLogin).catch(console.error);
	},

	sendPrivateMessage: function(user_id, message) {
		if(started)
			bot.users.get(user_id).send(message);
	},

	//💬zarzad, id: 520748695059300383
	//whitelist, id: 516321132656197661
	sendChannelMessage: function(channel_id, message) {
		if(started)
			bot.channels.get(channel_id).send(message);
	}
};