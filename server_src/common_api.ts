import discordAPI from './discord_api';
import discordBot from './discord_bot';
import Database from './database';
import * as fs from 'fs';
import * as path from 'path';

const LOGS_PATH = path.join(__dirname, '..', 'logs');

async function testForAdmin(req: any, res: any) {
	var response = await discordAPI.getDiscordUserData(req.body.token);

	if(response.code === 0) {
		res.json({ result: response.message });
		return false;
	}

	if(discordAPI.isAdmin(response.id) === false) {
		res.json({ result: 'INSUFICIENT_PERMISSIONS' });
		return false;
	}

	return true;
}

export default {
	get_logs: async (req: any, res: any) => {//responds with list of files inside logs folder
		try {
			if(false === await testForAdmin(req, res))
				return;

			let log_files = fs.readdirSync(LOGS_PATH);
			res.json({result: 'SUCCESS', files: log_files});
		}
		catch(e) {
			console.error(e);
			res.json({result: 'ERROR'});
		}
	},

	get_log_content: async (req: any, res: any) => {
		try {
			if(false === await testForAdmin(req, res))
				return;

			let log_content = fs.readFileSync(path.join(LOGS_PATH, req.body.log_file), 'utf8');
			res.json({result: 'SUCCESS', content: log_content.split('\n')});
		}
		catch(e) {
			console.error(e);
			res.json({result: 'ERROR'});
		}
	},

	get_admins: async (req: any, res: any) => {//TODO - cache this
		try {
			if(false === await testForAdmin(req, res))
				return;

			var admins = discordAPI.getAdmins().map(user_id => {
				var user = discordBot.getDiscordUser(user_id);

				return user === undefined ? user : {
					id: user_id,
					nick: user.username,
					discriminator: user.discriminator
				};
			}).filter(admin => admin !== undefined);
			res.json({result: 'SUCCESS', admins: admins});
		}
		catch(e) {
			console.error(e);
			res.json({result: 'ERROR'});
		}
	},

	get_visits: async (req: any, res: any) => {//TODO - cache this
		try {
			if(false === await testForAdmin(req, res))
				return;

			if(!req.body.from || !req.body.to) {
				res.json({result: 'RECEIVED_INCORRECT_DATA'});
				return;
			}
			 
			var visits = await Database.getVisits(req.body.from, req.body.to);
			//console.log(visits, req.body.from, req.body.to);
			res.json({result: 'SUCCESS', visits: visits});
		}
		catch(e) {
			console.error(e);
			res.json({result: 'ERROR'});
		}
	},
};