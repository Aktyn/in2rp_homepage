import discordAPI from './discord_api';
import discordBot from './discord_bot';
import Database from './database';
import LOG from './log';

interface RequestSchema {
	timestamp: string;
	status: 'rejected' | 'accepted' | 'pending'
}

//NOTE - after changing this time - text in whitelist.tsx should be updated
const EXPIRE_TIME = 1000 * 60 * 60 * 24;// * 7;

//returns true for rejected requests older than one week
function requestExpired(request: RequestSchema) {
	return request.status === 'rejected' && (Date.now() - parseInt(request.timestamp)) > (EXPIRE_TIME)
}

export default {
	async apply_request(req: any, res: any) {
		//console.log(req.body);
		try {
			var response = await discordAPI.getDiscordUserData(req.body.token);

			if(response.code === 0) {//check if client is logged in to discord account
				return res.json({
					result: response.message
				});
			}

			var user_current_request = await Database.getWhitelistRequest(response.id);

			if(user_current_request.length > 0 && 
				!user_current_request.every((user_req: any) => requestExpired(user_req)))
			{
				return res.json({result: 'REQUEST_ALREADY_IN_DATABASE'});
			}

			var insert_res = await Database.addWhitelistRequest(req.body.answers, 
				response.username, response.discriminator, response.id);
			
			//console.log(insert_res);
			if(insert_res.affectedRows > 0) {
				res.json({result: 'SUCCESS'});
				let msg = `<@${response.id}> zlożył podanie o whiteliste.`;
				LOG(`${response.username} zlożył podanie o whiteliste.`);//not tested
				try {
					if(process.env.NODE_ENV !== 'dev') {
						discordBot.sendChannelMessage('528987808438812683', msg).catch((e: Error) => {
							console.error('Cannot send message to channel 520748695059300383');
						});
					}
				}
				catch(e) {
					console.error('Sending channel message failed:', e);
				}
			}
			else {
				console.log('Cannot insert row');
				res.json({result: 'DATABASE_ERROR'});
			}
		}
		catch(e) {
			console.log(e);
			res.json({result: 'DATABASE_ERROR'});
		}
	},

	async status_request(req: any, res: any) {
		var response = await discordAPI.getDiscordUserData(req.body.token);

		if(response.code === 0) {
			return res.json({
				result: response.message
			});
		}

		var user_current_request = await Database.getWhitelistRequest(response.id);

		if(user_current_request.length > 0) {
			if( user_current_request.every( (user_req: any) => requestExpired(user_req) ) )
				res.json({result: 'SUCCESS', status: 'expired'});
			else//respond with newest request status
				res.json({result: 'SUCCESS', status: user_current_request[0]['status']});
		}
		else
			res.json({result: 'SUCCESS', status: 'nothing'});
	},

	async applicants_request(req: any, res: any) {
		var response = await discordAPI.getDiscordUserData(req.body.token);

		if(response.code === 0)
			return res.json({ result: response.message });

		if(discordAPI.Admins.isAdmin(response.id) === false)
			return res.json({ result: 'INSUFICIENT_PERMISSIONS' });
		
		if(req.body.requested_status !== 'accepted' && req.body.requested_status !== 'rejected')
			req.body.requested_status = 'pending';

		var select_res = await Database.getRequests(req.body.requested_status);

		//console.log(select_res);
		// console.log(req.body);

		interface WL_APP_DATA_SCHEMA {
			id: number;
			timestamp: string;
			nick: string;
			discriminator: number;
			data_ur: string;

			[index: string]: any;
		}

		var data: WL_APP_DATA_SCHEMA[] = [];

		select_res.forEach((res: WL_APP_DATA_SCHEMA) => {
			var wl_app_data: WL_APP_DATA_SCHEMA = {
				id: res.id,
				timestamp: res.timestamp,
				nick: res.discord_nick,
				discriminator: res.discord_discriminator,
				data_ur: res.data_ur,
			};

			Object.keys(Database.QUESTIONS).map(qn => {
				wl_app_data[qn] = res[qn];
			});

			data.push(wl_app_data);
		});

		res.json({result: 'SUCCESS', data: data});
	},

	async update_request(req: any, res: any) {
		var response = await discordAPI.getDiscordUserData(req.body.token);

		if(response.code === 0)
			return res.json({ result: response.message });

		//console.log(response);

		if(discordAPI.Admins.isAdmin(response.id) === false) {
			LOG('Someone without permissions trying to accept/reject whitelist request:',
				response.id, response.username);
			return res.json({ result: 'INSUFICIENT_PERMISSIONS' });
		}

		var update_res = await Database.changeStatus(req.body.id, req.body.requested_status);

		// console.log(update_res);
		if(update_res.affectedRows < 1)
			return res.json({ result: 'DATABASE_ERROR' });

		res.json({result: 'SUCCESS'});

		setTimeout(async () => {//asynchronosly deal with discord bot sending message to user
			var new_status;
			if(req.body.requested_status === 'accepted')
				new_status = `zaakceptowane. Zapraszamy na rozmowę, w której sprawdzimy twoją znajomość regulaminu. <#528681859882811421>`;
			else if(req.body.requested_status === 'rejected')
				new_status = 'odrzucone.';
			else
				return;

			var target_discord_user = await Database.getUserDiscordID(req.body.id);

			if(target_discord_user.length > 0) {
				try {
					LOG('User', response.username, response.id, 'changed whitelist request status to',
						req.body.requested_status, 'for user', target_discord_user[0].discord_nick, target_discord_user[0].discord_id);
					discordBot.sendPrivateMessage(target_discord_user[0].discord_id,
						`Witaj. Twoje podanie o whiteliste zostało właśnie ${new_status}`);
				}
				catch(e) {
					console.log('Cannot send private message to', target_discord_user[0].discord_id);
				}
			}
		});
	}
};