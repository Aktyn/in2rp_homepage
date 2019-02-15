import Utils from './utils';
import fetch from 'node-fetch';
import Database from './database';
const btoa = require('btoa');
import LOG from './log';
import * as fs from 'fs';
import * as path from 'path';

// import discordBot from './discord_bot';

const HOST = 'in2rp.pl';
// const HOST = 'in2rp.com';

var CLIENT_ID: string, SECRET_KEY: string;

setTimeout(() => {
	CLIENT_ID = Utils.getArgument('CLIENT_ID');
	SECRET_KEY = Utils.getArgument('SECRET_KEY');

	if(!SECRET_KEY || !SECRET_KEY.length)
		throw new Error('You must specify bot SECRET_KEY as argument: SECRET_KEY=VALUE');
	if(!CLIENT_ID || !CLIENT_ID.length)
		throw new Error('You must specify bot CLIENT_ID as argument: CLIENT_ID=VALUE');
});

//var admins: string[] = [];//discord account ids
const admin_list_file_path = path.join(__dirname, '..', 'data', 'admins');

const ADMINS = {
	list: [] as string[],

	load: function() {
		if(fs.existsSync( admin_list_file_path ) === false) {
			console.log(admin_list_file_path, 'admins file not found, creating it');
			fs.appendFileSync(admin_list_file_path, '', 'utf8');
		}
		
		this.list = fs.readFileSync(admin_list_file_path, 'utf8')//.replace(/\/\/.*/gi, '')
			.split('\n').map(line => line.replace(/\s/g, ''));
	},

	save: function() {
		if(fs.existsSync( admin_list_file_path ) === false)
			fs.appendFileSync(admin_list_file_path, '', 'utf8');
		fs.writeFileSync(admin_list_file_path, this.list.join('\n'), 'utf8');
	},

	setAdmins: function(new_list: string[]) {
		this.list = new_list;
		this.save();
	},

	getAdmins: function() {
		return this.list;
	},

	isAdmin: function(id: string) {
		return this.list.indexOf(id) !== -1;
	},
};

ADMINS.load();

/*process.argv.forEach((val) => {
	if(val.startsWith('CLIENT_ID'))
		CLIENT_ID = val.replace('CLIENT_ID=', '');
	else if(val.startsWith('SECRET_KEY'))
		SECRET_KEY = val.replace('SECRET_KEY=', '');
});*/

var redirect: string;
var client_port: number;
var final_redirect: string;

if(process.env.NODE_ENV === 'dev') {
	redirect = encodeURIComponent(`http://localhost:${global.PORT}/discord_callback`);

	client_port = 3000;
	final_redirect = `http://localhost:${client_port}/login_result`;
}
else {
	redirect = encodeURIComponent(`https://${HOST}/discord_callback`);

	client_port = global.PORT;
	final_redirect = `https://${HOST}/login_result`;
}

export interface DiscordUserJSON {
	code: number;
	message: string;
	id: string;
	username: string;
	discriminator: number;
	avatar: string;
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

	Admins: ADMINS,

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
				let is_admin = ADMINS.isAdmin(response.id);
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
			let ip = Utils.extractIP(req);

			if(typeof req.body.token !== 'string') {
				res.status(400);
				LOG('guest session', ip);
				Database.storeVisit(ip, req.headers['user-agent'] || null);
				return res.json({result: 'You must provide token in body request'});
			}
			
			var response = await getDiscordUserData(req.body.token);
			//console.log(response);

			if(response.code === 0) {
				LOG('client session expired or discord denied access', ip);
				res.json({
					result: response.message
				});
			}
			else {
				LOG('client session', response.username, response.id, ip);
				Database.storeVisit(ip, req.headers['user-agent'], response.username);
				res.json({
					result: 'SUCCESS',
					id: response.id,
					nick: response.username, 
					discriminator: response.discriminator,
					avatar: response.avatar,
					is_admin: ADMINS.isAdmin(response.id)
				});
			}
		}
		catch(e) {
			console.error('Cannot restore user\'s session');
			res.status(400);
			res.json({result: e.message});
		}
	}
};