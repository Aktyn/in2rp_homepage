import fetch from 'node-fetch';
// import btoa from 'btoa';
const btoa = require('btoa');
import LOG from './log';
import * as fs from 'fs';
import * as path from 'path';

import discordBot from './discord_bot';

const HOST = '145.239.92.229:' + global.PORT;//'in2rp.pl';

var CLIENT_ID: string | null = null;
var SECRET_KEY: string | null = null;

const admins = [//discord account ids
	'204639827193364492',//Aktyn
	'363604545261142017',//Smerf (Tasma)
	'272366948371660801',//Neqik
	'217963448682807297',//Bilu
];

process.argv.forEach((val) => {
	if(val.startsWith('CLIENT_ID'))
		CLIENT_ID = val.replace('CLIENT_ID=', '');
	else if(val.startsWith('SECRET_KEY'))
		SECRET_KEY = val.replace('SECRET_KEY=', '');
});

if(!SECRET_KEY)
	throw new Error('You must specify bot SECRET_KEY as argument: SECRET_KEY=VALUE');
if(!CLIENT_ID)
	throw new Error('You must specify bot CLIENT_ID as argument: CLIENT_ID=VALUE');

var redirect: string;
var client_port: number;
var final_redirect: string;

if(process.env.NODE_ENV === 'dev') {
	redirect = encodeURIComponent(`http://localhost:${global.PORT}/discord_callback`);

	client_port = 3000;
	final_redirect = `http://localhost:${client_port}/login_result`;
}
else {
	redirect = encodeURIComponent(`http://${HOST}/discord_callback`);

	client_port = global.PORT;
	final_redirect = `http://${HOST}/login_result`;
}

interface DiscordUserJSON {
	code: number;
	message: string;
	id: string;
	username: string;
	discriminator: number;
}

function getDiscordUserData(token: string): Promise<DiscordUserJSON> {
	return fetch('http://discordapp.com/api/users/@me', {
		headers: {
			Authorization: `Bearer ${token}`,
		}
	}).then((response) => response.json());
}

export default {
	login_request: function(req: any, res: any) {
		res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=identify`);
	},

	getDiscordUserData: getDiscordUserData,

	isAdmin: function(id: string) {
		return admins.indexOf(id) !== -1;
	},

	discord_callback: function(req: any, res: any) {
		if (!req.query.code) {
			LOG('client session expired or discord denied access', 
				req.connection.remoteAddress.replace(/::ffff:/, ''));
			console.error('NoCodeProvided');
			res.redirect(final_redirect + `?success=false`);
			return;
		}
		
		const code = req.query.code;
		const creds = btoa(`${CLIENT_ID}:${SECRET_KEY}`);

		fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirect}`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${creds}`,
			},
		
		}).then((res) => res.json()).then(async (json) => {
			try {
				var response = await getDiscordUserData(json.access_token);
				if(response.code === 0)
					throw new Error('Cannot fetch DiscordUserData');
				console.log('User logged in:', response.username + '#' + response.discriminator, 'id:',
					response.id);
				let is_admin = admins.indexOf(response.id) !== -1;
				LOG('User logged in:', response.username + '#' + response.discriminator, 'id:',
					response.id, 'admin:', is_admin);
				res.redirect(final_redirect + `?success=true&token=${json.access_token}?user=${response.username}#${response.discriminator}?admin=${is_admin}`);
			}
			catch(e) {
				console.error(e);
				res.redirect(final_redirect + `?success=false`);
			}
		
			//res.redirect(final_redirect + `?success=true&token=${json.access_token}`);
		}).catch((e) => {
			console.error(e);
			// res.status(400);
			// res.send(e.message);
			res.redirect(final_redirect + `?success=false`);
		});
	},
	
	restore_session: async function(req: any, res: any) {
		try {
			let forwards = req.headers['x-forwarded-for'];
			if(typeof forwards === 'object')
				forwards = forwards.join(',');
			var ip = (forwards || req.connection.remoteAddress || '').replace(/::ffff:/, '');

			if(typeof req.body.token !== 'string') {
				res.status(400);
				LOG('guest session', ip);
				return res.json({result: 'You must provide token in body request'});
			}
			
			var response = await getDiscordUserData(req.body.token);

			if(response.code === 0) {
				LOG('client session expired or discord denied access', ip);
				res.json({
					result: response.message
				});
			}
			else {
				LOG('client session', response.username, response.id, ip);
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
	},

	snake_gameover: async function(req: any, res: any) {
		try {
			if(typeof req.body.token !== 'string') {
				LOG('guest played snake');
				return res.json({result: 'ERROR'});
			}
			var response = await getDiscordUserData(req.body.token);

			if(response.code === 0)
				return res.json({result: 'ERROR'});
			LOG('client played snake', response.username, response.id);

			var id_list = path.join(__dirname, '..', 'logs', 'snake_players');
			if(!fs.existsSync(id_list))
				fs.openSync(id_list, 'a+');

			var ids = fs.readFileSync(id_list, 'utf8').split('\n');
			if(!ids.find(line => line === response.id)) {
				fs.appendFileSync(id_list, response.id + '\n', 'utf8');
				discordBot.sendPrivateMessage(response.id, `No, no... gratulacje!\nJako jedna z nielicznych osób znalazłeś/aś na stronie easter egga w formie ukrytej gry.\nTo jednak dopiero początek, gdyż więcej tajemnic czeka na odkrycie.\nJeśli zdecydujesz się w to brnąć - oto link do pliku niespodzianki: http://in2rp.pl/bs/ftp/snake.exe\n\nPamiętaj - do odważnych świat należy.`);
			}
			return res.json({result: 'SUCCESS'});
		}
		catch(e) {
			//ignore
		}
	}
};