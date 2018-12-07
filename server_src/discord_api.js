const fetch = require('node-fetch');
const btoa = require('btoa');

var CLIENT_ID = null;
var SECRET_KEY = null;
var started = false;

const admins = [//discord account ids
	'204639827193364492',//Aktyn
];

process.argv.forEach((val) => {
	//console.log('x', val);
	if(val.startsWith('CLIENT_ID'))
		CLIENT_ID = val.replace('CLIENT_ID=', '');
	else if(val.startsWith('SECRET_KEY'))
		SECRET_KEY = val.replace('SECRET_KEY=', '');
});

if(!SECRET_KEY)
	throw new Error('You must specify bot SECRET_KEY as argument: SECRET_KEY=VALUE');
if(!CLIENT_ID)
	throw new Error('You must specify bot CLIENT_ID as argument: CLIENT_ID=VALUE');

var redirect;
var client_port;
var final_redirect;

if(process.env.NODE_ENV === 'dev') {
	redirect = encodeURIComponent(`http://localhost:${global.PORT}/discord_callback`);

	client_port = 3000;
	final_redirect = `http://localhost:${client_port}/login_result`;
}
else {
	redirect = encodeURIComponent(`http://54.37.128.46/discord_callback`);

	client_port = global.PORT;
	final_redirect = `http://54.37.128.46/login_result`;
}

function getDiscordUserData(token) {
	return fetch('http://discordapp.com/api/users/@me', {
		headers: {
			Authorization: `Bearer ${token}`,
		}
	}).then(response => response.json());
}

module.exports = {
	login_request: function(req, res) {
		res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=identify`);
	},

	getDiscordUserData: getDiscordUserData,

	discord_callback: function(req, res) {
		//console.log('callback');
		if (!req.query.code) {
			console.error('NoCodeProvided');
			res.redirect(final_redirect + `?success=false`);
		}
		//console.log(req.query.code);
		const code = req.query.code;
		const creds = btoa(`${CLIENT_ID}:${SECRET_KEY}`);
		//const response = await 
		fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirect}`, {//TODO - use different redirect for this fetch
			method: 'POST',
			headers: {
				Authorization: `Basic ${creds}`,
			},
		/* jshint ignore:start */
		}).then(res => res.json()).then(async (json) => {
			try {
				var response = await getDiscordUserData(json.access_token);
				if(response.code === 0)
					throw new Error('Cannot fetch DiscordUserData');
				console.log('User logged in:', response.username + '#' + response.discriminator, 'id:',
					response.id);
				let is_admin = admins.indexOf(response.id) !== -1;
				res.redirect(final_redirect + `?success=true&token=${json.access_token}?user=${response.username}#${response.discriminator}?admin=${is_admin}`);
			}
			catch(e) {
				console.error(e);
				res.redirect(final_redirect + `?success=false`);
			}
		/* jshint ignore:end */
			//res.redirect(final_redirect + `?success=true&token=${json.access_token}`);
		}).catch((e) => {
			console.error(e);
			// res.status(400);
			// res.send(e.message);
			res.redirect(final_redirect + `?success=false`);
		});
	},

	/* jshint ignore:start */
	restore_session: async function(req, res) {
		try {
			if(typeof req.body.token !== 'string') {
				res.status(400);
				res.json({result: 'You must provide token in body request'});
			}
			
			var response = await getDiscordUserData(req.body.token);

			// console.log(response.id, typeof response.id);
			//console.log(req.body.token);

			if(response.code === 0) {
				res.json({
					result: response.message
				});
			}
			else {
				res.json({
					result: 'SUCCESS',
					nick: response.username, 
					discriminator: response.discriminator,
					is_admin: admins.indexOf(response.id) !== -1
				});
			}
		}
		catch(e) {
			console.error('Cannot restore user\'s session');
			res.status(400);
			res.json({result: e.message});
		}
	}
	/* jshint ignore:end */
};