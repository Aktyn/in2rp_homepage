import discordAPI from './discord_api';
import discordBot from './discord_bot';
import statusApp from './discord_status_app';
import Database from './database';
import * as fs from 'fs';
import * as path from 'path';
import LOG from './log';

const LOGS_PATH = path.join(__dirname, '..', 'logs');

async function testForAdmin(req: any, res: any) {
	var response = await discordAPI.getDiscordUserData(req.body.token);

	if(response.code === 0) {
		res.json({ result: response.message });
		return false;
	}

	if(discordAPI.Admins.isAdmin(response.id) === false) {
		res.json({ result: 'INSUFICIENT_PERMISSIONS' });
		return false;
	}

	return true;
}

interface UserJSON {
	id: string;
	nick: string;
	discriminator: string;
}

function isCandidateRole(name: string) {//important roles like admin, developer etc
	return ['Developer', 'Administrator', 'Właściciel', 'Community Manager'].indexOf(name) !== -1;
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

			var admins = discordAPI.Admins.getAdmins().map(user_id => {
				var user = discordBot.getDiscordUser(user_id);

				return user === undefined ? user : <UserJSON>{
					id: user_id,
					nick: user.username,
					discriminator: user.discriminator
				};
			}).filter(admin => admin !== undefined) as UserJSON[];

			var candidats = discordBot.getGuild().members
				.filter(m => m.roles.some(r => isCandidateRole(r.name))).map(user => {
					return <UserJSON>{
						id: user.user.id,
						nick: user.user.username,
						discriminator: user.user.discriminator
					}
				}).filter(user => admins.find(a => a.id === user.id) === undefined);

			res.json({result: 'SUCCESS', admins: admins, candidats: candidats});
		}
		catch(e) {
			console.error(e);
			res.json({result: 'ERROR'});
		}
	},

	remove_admin: async (req: any, res: any) => {
		try {
			if(false === await testForAdmin(req, res))
				return;

			//console.log(req.body);
			if(req.body.id === '204639827193364492')
				return res.json({result: 'ERROR_XXX'});

			let new_admins = discordAPI.Admins.getAdmins().filter(id => id !== req.body.id);
			discordAPI.Admins.setAdmins(new_admins);

			res.json({result: 'SUCCESS'});
		}
		catch(e) {
			console.error(e);
			res.json({result: 'ERROR'});
		}
	},
	add_admin: async (req: any, res: any) => {
		try {
			if(false === await testForAdmin(req, res))
				return;

			//console.log(req.body);

			let new_admins = discordAPI.Admins.getAdmins();
			new_admins.push(req.body.id);
			discordAPI.Admins.setAdmins(new_admins);

			res.json({result: 'SUCCESS'});
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

	snake_gameover: async function(req: any, res: any) {
		try {
			if(typeof req.body.token !== 'string') {
				LOG('guest played snake');
				return res.json({result: 'ERROR'});
			}
			var response = await discordAPI.getDiscordUserData(req.body.token);

			if(response.code === 0)
				return res.json({result: 'ERROR'});
			LOG('client played snake', response.username, response.id);

			var id_list = path.join(__dirname, '..', 'data', 'snake_players');
			if(!fs.existsSync(id_list))
				fs.openSync(id_list, 'a+');

			var ids = fs.readFileSync(id_list, 'utf8').split('\n');
			if(!ids.find(line => line === response.id)) {
				fs.appendFileSync(id_list, response.id + '\n', 'utf8');
				discordBot.sendPrivateMessage(response.id, `No, no... gratulacje!\nJako jedna z nielicznych osób znalazłeś/aś na stronie easter egga w formie ukrytej gry.\nTo jednak dopiero początek, gdyż więcej tajemnic czeka na odkrycie.\nJeśli zdecydujesz się w to brnąć - oto link do pliku niespodzianki: http://in2rp.pl/ftp/snake.exe\n\nPamiętaj - do odważnych świat należy.`);
			}
			return res.json({result: 'SUCCESS'});
		}
		catch(e) {//ignore
			res.json({result: 'ERROR'});
		}
	},

	get_online_players: async function(req: any, res: any) {
		try {
			return res.json({result: 'SUCCESS', data: statusApp.getStatus()});
		}
		catch(e) {//ignore
			res.json({result: 'ERROR'});
		}
	}
};