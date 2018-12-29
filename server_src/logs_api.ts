import discordAPI from './discord_api';
import * as fs from 'fs';
import * as path from 'path';

const LOGS_PATH = path.join(__dirname, '..', 'logs');

export default {
	get_logs: async (req: any, res: any) => {//responds with list of files inside logs folder
		try {
			var response = await discordAPI.getDiscordUserData(req.body.token);

			if(response.code === 0)
				return res.json({ result: response.message });

			if(discordAPI.isAdmin(response.id) === false)
				return res.json({ result: 'INSUFICIENT_PERMISSIONS' });

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
			var response = await discordAPI.getDiscordUserData(req.body.token);

			if(response.code === 0)
				return res.json({ result: response.message });

			if(discordAPI.isAdmin(response.id) === false)
				return res.json({ result: 'INSUFICIENT_PERMISSIONS' });

			let log_content = fs.readFileSync(path.join(LOGS_PATH, req.body.log_file), 'utf8');
			res.json({result: 'SUCCESS', content: log_content.split('\n')});
		}
		catch(e) {
			console.error(e);
			res.json({result: 'ERROR'});
		}
	}
};