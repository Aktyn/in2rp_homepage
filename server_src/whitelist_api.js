const discordAPI = require('./discord_api.js');
const Database = require('./database.js');
const discordBot = require('./discord_bot.js');

/* jshint ignore: start */
module.exports = {
	async apply_request(req, res) {
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
			discordBot.sendPrivateMessage('204639827193364492', //<@519130104073289769>
				`<@${response.id}> właśnie zlożył podanie o whiteliste`);
			// response.username+'#'+response.discriminator + ' właśnie zlożył podanie o whiteliste');
		}
		else
			res.json({result: 'DATABASE_ERROR'});
	},

	async status_request(req, res) {
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

	async applicants_request(req, res) {
		var response = await discordAPI.getDiscordUserData(req.body.token);

		if(response.code === 0)
			return res.json({ result: response.message });

		if(discordAPI.isAdmin(response.id) === false)
			return res.json({ result: 'INSUFICIENT_PERMISSIONS' });
		
		if(req.body.requested_status !== 'accepted' && req.body.requested_status !== 'rejected')
			req.body.requested_status = 'pending';

		var select_res = await Database.getRequests(req.body.requested_status);

		//console.log(select_res);
		// console.log(req.body);

		var data = [];

		select_res.forEach(res => {
			var wl_app_data = {
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

	async update_request(req, res) {
		var response = await discordAPI.getDiscordUserData(req.body.token);

		if(response.code === 0)
			return res.json({ result: response.message });

		//console.log(response);

		if(discordAPI.isAdmin(response.id) === false)
			return res.json({ result: 'INSUFICIENT_PERMISSIONS' });

		var update_res = await Database.changeStatus(req.body.id, req.body.requested_status);

		// console.log(update_res);
		if(update_res.affectedRows < 1)
			return res.json({ result: 'DATABASE_ERROR' });

		res.json({result: 'SUCCESS'});

		//setTimeout(() => {//TODO - asynchronosly deal with discord bot sending message to user
			var new_status;
			if(req.body.requested_status === 'accepted')
				new_status = 'zaakceptowane';
			else if(req.body.requested_status === 'rejected')
				new_status = 'odrzucone';
			else
				return;

			var target_user_discord_id = await Database.getUserDiscordID(req.body.id);

			if(target_user_discord_id.length > 0) {
				discordBot.sendPrivateMessage(target_user_discord_id[0].discord_id,
					`Witaj. Twoje podanie o whiteliste zostało właśnie ${new_status}.`);
			}
		//});
	}
};
/* jshint ignore: end */