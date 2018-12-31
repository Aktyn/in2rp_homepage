import discordAPI from './discord_api';
import discordBot from './discord_bot';
import Database from './database';
import LOG from './log';

export default {
	async apply_request(req: any, res: any) {
		//console.log(req.body);

		var response = await discordAPI.getDiscordUserData(req.body.token);

		if(response.code === 0) {
			return res.json({
				result: response.message
			});
		}

		var user_current_request = await Database.getWhitelistRequest(response.id);

		if(user_current_request.length > 0)
			return res.json({result: 'REQUEST_ALREADY_IN_DATABASE'});

		var insert_res = await Database.addWhitelistRequest(req.body.answers, 
			response.username, response.discriminator, response.id);
		
		//console.log(insert_res);
		if(insert_res.affectedRows > 0) {
			res.json({result: 'SUCCESS'});
			let msg = `<@${response.id}> zlożył podanie o whiteliste.`;
			LOG(`${response.username} zlożył podanie o whiteliste.`);//not tested
			try {
				discordBot.sendChannelMessage('528987808438812683', msg).catch((e: Error) => {
					console.error('Cannot send message to channel 520748695059300383');
					//discordBot.sendChannelMessage('516321132656197661', 'test')
				});
			}
			catch(e) {
				console.error('Sending channel message failed:', e);
			}
		}
		else
			res.json({result: 'DATABASE_ERROR'});
	},

	async status_request(req: any, res: any) {
		var response = await discordAPI.getDiscordUserData(req.body.token);

		if(response.code === 0) {
			return res.json({
				result: response.message
			});
		}

		var user_current_request = await Database.getWhitelistRequest(response.id);

		if(user_current_request.length > 0)
			res.json({result: 'SUCCESS', status: user_current_request[0]['status']});
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

			Database.QUESTION_NAMES.map(qn => {
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

			var target_user_discord_id = await Database.getUserDiscordID(req.body.id);

			if(target_user_discord_id.length > 0) {
				try {
					LOG('User', response.username, response.id, 'changed whitelist request status to',
						req.body.requested_status, 'for user', target_user_discord_id[0].discord_id);
					discordBot.sendPrivateMessage(target_user_discord_id[0].discord_id,
						`Witaj. Twoje podanie o whiteliste zostało właśnie ${new_status}`);
				}
				catch(e) {
					console.log('Cannot send private message to', target_user_discord_id[0].discord_id);
				}
			}
		});
	}
};