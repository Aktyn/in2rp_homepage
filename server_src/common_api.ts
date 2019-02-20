import discordAPI from './discord_api';
import discordBot from './discord_bot';
import { SERVERS_DATA } from './discord_status_app';
import Database from './database';
import * as fs from 'fs';
import * as path from 'path';
import LOG from './log';
import Utils from './utils';
import CacheManager from './cache';

const LOGS_PATH = path.join(__dirname, '..', 'logs');

const admins_cache_name = 'admins_page';
const whitelist_players_cache_name = 'whitelist_players';

interface UserJSON {
	id: string;
	nick: string;
	discriminator: string;
}

function isCandidateRole(name: string) {//important roles like admin, developer etc
	return ['Developer', 'Administrator', 'Właściciel', 'Moderacja', 'Partner'].indexOf(name) !== -1;
}

function hexToDec(s: string) {
    var i, j, digits = [0], carry;
    for (i = 0; i < s.length; i += 1) {
        carry = parseInt(s.charAt(i), 16);
        for (j = 0; j < digits.length; j += 1) {
            digits[j] = digits[j] * 16 + carry;
            carry = digits[j] / 10 | 0;
            digits[j] %= 10;
        }
        while (carry > 0) {
            digits.push(carry % 10);
            carry = carry / 10 | 0;
        }
    }
    return digits.reverse().join('');
}


export default {
	get_logs: async (req: any, res: any) => {//responds with list of files inside logs folder
		try {
			if(false === await Utils.testForAdmin(req, res))
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
			if(false === await Utils.testForAdmin(req, res))
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
			if(false === await Utils.testForAdmin(req, res))
				return;

			let cache = CacheManager.getCache(admins_cache_name);
			if(cache)
				return res.json(cache.data);

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

			let result = {result: 'SUCCESS', admins: admins, candidats: candidats};
			CacheManager.createCache(admins_cache_name, 1000*60*60*24, result);
			res.json(result);
		}
		catch(e) {
			console.error(e);
			res.json({result: 'ERROR'});
		}
	},

	remove_admin: async (req: any, res: any) => {
		try {
			if(false === await Utils.testForAdmin(req, res))
				return;

			//console.log(req.body);
			if(req.body.id === '204639827193364492')
				return res.json({result: 'ERROR_XXX'});

			let new_admins = discordAPI.Admins.getAdmins().filter(id => id !== req.body.id);
			discordAPI.Admins.setAdmins(new_admins);

			CacheManager.deleteCache(admins_cache_name);
			res.json({result: 'SUCCESS'});
		}
		catch(e) {
			console.error(e);
			res.json({result: 'ERROR'});
		}
	},
	add_admin: async (req: any, res: any) => {
		try {
			if(false === await Utils.testForAdmin(req, res))
				return;

			//console.log(req.body);

			let new_admins = discordAPI.Admins.getAdmins();
			new_admins.push(req.body.id);
			discordAPI.Admins.setAdmins(new_admins);

			CacheManager.deleteCache(admins_cache_name);
			res.json({result: 'SUCCESS'});
		}
		catch(e) {
			console.error(e);
			res.json({result: 'ERROR'});
		}
	},

	get_visits: async (req: any, res: any) => {//TODO - cache this
		try {
			if(false === await Utils.testForAdmin(req, res))
				return;

			if(!req.body.from || !req.body.to) {
				res.json({result: 'RECEIVED_INCORRECT_DATA'});
				return;
			}
			 
			var visits = await Database.getVisits(req.body.from, req.body.to);
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
			let response = await discordAPI.getDiscordUserData(req.body.token);

			if(response.code === 0)
				return res.json({result: 'ERROR'});
			LOG('client played snake', response.username, response.id);

			let id_list = path.join(__dirname, '..', 'data', 'snake_players');
			if(!fs.existsSync(id_list))
				fs.openSync(id_list, 'a+');

			let ids = fs.readFileSync(id_list, 'utf8').split('\n');
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
			return res.json({
				result: 'SUCCESS', 
				data: SERVERS_DATA.isl1.getData(),
				data2: SERVERS_DATA.isl2.getData()
			});
		}
		catch(e) {//ignore
			res.json({result: 'ERROR'});
		}
	},

	get_whitelist_players: async function(req: any, res: any) {
		try {
			if(false === await Utils.testForAdmin(req, res))
				return;

			let cache = CacheManager.getCache(whitelist_players_cache_name);
			if(cache)
				return res.json(cache.data);

			let data = await Database.getWhitelistPlayers();
			let discord_users = await Database.getDiscordUserWithAcceptedRequestsWithoutServerAccess();
			//console.log(discord_users);

			let result = {result: 'SUCCESS', players_data: data, discord_users_data: discord_users};
			CacheManager.createCache(whitelist_players_cache_name, 1000*60*60*1, result);
			return res.json(result);
		}
		catch(e) {//ignore
			res.json({result: 'ERROR'});
		}
	},

	get_whitelist_player_details: async function(req: any, res: any) {
		try {
			if(false === await Utils.testForAdmin(req, res))
				return;

			if(!req.body.user_id)
				return res.json({result: 'ERROR'});

			let data = await Database.getPlayerDetails(req.body.user_id);
			if(data.length > 0)
				return res.json({result: 'SUCCESS', player_data: data[0]});
			else
				return res.json({result: 'DATABASE_ERROR'});
		}
		catch(e) {//ignore
			res.json({result: 'ERROR'});
		}
	},

	add_whitelist_player: async function(req: any, res: any) {
		try {
			let admin_user = await Utils.testForAdmin(req, res);
			if(false === admin_user)
				return;
			
			if(!req.body.steamid)
				return res.json({result: 'ERROR'});
			
			//@ts-ignore
			let steam_hex = BigInt(req.body.steamid).toString(16);
			
			let already_in_db = (await Database.customQuery(`SELECT * from admin_in2rp.whitelist 
				WHERE identifier = 'steam:${steam_hex}'`)).length > 0;
			
			let db_added = false;
			if(!already_in_db)
				db_added = (await Database.addWhitelistPlayer(steam_hex)).affectedRows > 0;
			//console.log(add_response);

			if(process.env.NODE_ENV !== 'dev') {
				try {
					for(let isl_i=0; isl_i<Utils.ISLANDS; isl_i++)
						await Utils.executeRconCommand('wlrefresh_r', isl_i);
				}
				catch(e) {
					console.error(e);
				}
			}

			LOG('User', admin_user.username, admin_user.id, 'added steamid:', req.body.steamid,
				'to in2rp whitelist with results:', db_added ? 'true' : 'false');

			let discord_user = await Database.getDiscordUserFromRequest(req.body.steamid);
			let discord_result: string | undefined = undefined;

			if(discord_user.length > 0) {
				let dis_id = discord_user[0].discord_id;

				LOG('found discord user with steamid:', req.body.steamid, 
					`(${discord_user[0].discord_nick}, ${dis_id})`, 
					'giving him a role');

				//add discord user role
				if( (await discordBot.changeUserRoleAsync(dis_id, 'Obywatel')) &&
					(await discordBot.changeUserRole(dis_id, 'Rozmowa kwalifikacyjna', true)) )
				{
					discord_result = 
						`${discord_user[0].discord_nick}#${discord_user[0].discord_discriminator}`;

					try {
						if(!already_in_db) {
							discordBot.sendPrivateMessage(dis_id, 'Witaj.\nOtrzymałeś(-aś) właśnie rangę Obywatela.\nMożesz teraz rozpocząć grę na naszym serwerze.\nW razie problemów prosimy o kontakt z administracją.');
						}
					}
					catch(e) {}

					setTimeout(() => {
						//try again becouse discord stucks sometimes
						discordBot.changeUserRoleAsync(dis_id, 'Obywatel');
					}, 1000*5);
				}
				else
					discord_result = 'ERROR';
			}

			CacheManager.deleteCache(whitelist_players_cache_name);

			return res.json({
				result: 'SUCCESS', 
				discord_result: discord_result,
				db_result: already_in_db ? 'ALREADY_IN_DABASE' : (db_added ? 'SUCCES' : 'ERROR')
			});
		}
		catch(e) {//ignore
			res.json({result: 'ERROR'});
		}
	},

	remove_whitelist_player: async function(req: any, res: any) {
		try {
			let admin_user = await Utils.testForAdmin(req, res);
			if(false === admin_user)
				return;

			if(!req.body.steamhex)
				return res.json({result: 'ERROR'});

			let steamid = hexToDec(req.body.steamhex);

			let discord_user = await Database.getDiscordUserFromRequest(steamid);
			if(discord_user.length > 0) {
				let d_id = discord_user[0].discord_id;
				LOG('found discord user with steamid:', steamid, 
					`(${discord_user[0].discord_nick}, ${d_id})`, 
					'removing a role');
				if(	!(await discordBot.changeUserRoleAsync(d_id, 'Obywatel', 	true)) || 
					!(await discordBot.changeUserRoleAsync(d_id, 'Obywatelka', 	true)) )
				{
					LOG('Cannot remove user role with steamid:', steamid);
				}
			}

			//let remove_response = await Utils.executeRconCommand(`wlremove_r ${req.body.steamhex}`);
			let remove_response = await Database.removeWhitelistPlayer(req.body.steamhex);
			if(process.env.NODE_ENV !== 'dev') {
				try {
					for(let isl_i=0; isl_i<Utils.ISLANDS; isl_i++)
						await Utils.executeRconCommand('wlrefresh_r', isl_i);
				}
				catch(e) {
					console.error(e);
				}
			}

			LOG('User', admin_user.username, admin_user.id, 'removed steamhex:', req.body.steamhex,
				'from in2rp whitelist with results:', remove_response.affectedRows);

			CacheManager.deleteCache(whitelist_players_cache_name);
			return res.json({result: 'SUCCESS'});
		}
		catch(e) {//ignore
			res.json({result: 'ERROR'});
		}
	},

	upload_screenshot: async function(req: any, res: any) {
		try {
			//@ts-ignore
			if(Object.keys(req.files).length === 0 || req.files.screen_file === undefined)
				return res.status(413).send('No files were uploaded.');

			//@ts-ignore
			var file = req.files.screen_file;
			if(file.data.length >= 1024*1024*1) {
				try { res.status(413).send('File to big'); } catch(e) {}
				return;
			}

			let ext = file.mimetype.replace(/^.+\//gi, '');
			let name = Date.now().toString() + '.' + ext;

			const screenshots_folder = path.join(__dirname, '..', 'data', 'screenshots');

			if(!fs.existsSync(screenshots_folder))
				fs.mkdirSync(screenshots_folder);

			fs.writeFileSync(path.join(screenshots_folder, name), file.data);
			
			LOG('file', file.name, 'uploaded as screenshot');

			res.status(200).send('SUCCESS');
		}
		catch(e) {
			res.status(413).send('ERROR');
		}
	},

	get_stock_exchange: async function(req: any, res: any) {
		try {
			var response = await discordAPI.getDiscordUserData(req.body.token);
			if(response.code === 0) {
				res.json({ result: response.message });
				return false;
			}

			let is_admin = discordAPI.Admins.isAdmin(response.id);

			let entries = await Database.getStockExchangeEntries();

			return res.json({
				result: 'SUCCESS', 
				admin: is_admin,
				data: entries
			});
		}
		catch(e) {//ignore
			res.json({result: 'ERROR'});
		}
	},

	add_stock_exchange_entry: async function(req: any, res: any) {
		try {
			let admin_user = await Utils.testForAdmin(req, res);
			if(false === admin_user)
				return;

			//@ts-ignore
			if(Object.keys(req.files).length === 0)
				return res.status(413).send('No files were uploaded.');

			//console.log(req.body);

			let keys = Object.keys(req.files);
			var files: any[] = [];

			for(let key of keys) {
				var file = req.files[key];
				if(file.data.length >= 1024*1024*1) {
					try { res.status(413).send('File to big'); } catch(e) {}
					return;
				}
				files.push(file);
			}

			const files_folder = path.join(__dirname, '..', 'data', 'uploaded');
			if(!fs.existsSync(files_folder))
				fs.mkdirSync(files_folder);

			let file_names: string[] = [];
			let index = 0;
			for(let file of files) {
				let ext = file.mimetype.replace(/^.+\//gi, '');
				let name = Date.now().toString() + '_' + (index++) + '.' + ext;

				fs.writeFileSync(path.join(files_folder, name), file.data);
				file_names.push(name);
			}

			//console.log(file_names);

			let insert_result = await Database.addStockExchange(
				req.body.mark, req.body.capacity, req.body.model, req.body.price);

			if(insert_result.affectedRows !== 1)
				res.status(413).send('ERROR');

			for(let f_name of file_names) {
				await Database.addStockExchangePreview(insert_result.insertId, f_name);
			}
			
			//console.log( insert_result.insertId );

			res.status(200).send('SUCCESS');
		}
		catch(e) {
			res.status(413).send('ERROR');
		}
	},

	delete_stock_exchange_entry: async function(req: any, res: any) {
		try {
			let admin_user = await Utils.testForAdmin(req, res);
			if(false === admin_user)
				return;

			//let insert_result = await Database.addStockExchange(
			//	req.body.mark, req.body.capacity, req.body.model, req.body.price);

			await Database.deleteStockExchange(req.body.id);
			await Database.deleteStockExchangePreview(req.body.id);
			
			//console.log( insert_result.insertId );

			res.json({result: 'SUCCESS'});
		}
		catch(e) {
			res.json({result: 'ERROR'});
		}
	},
};