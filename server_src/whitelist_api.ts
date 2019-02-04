import discordAPI from './discord_api';
import discordBot from './discord_bot';
import Database from './database';
import LOG from './log';
import Utils from './utils';

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
		if(false === await Utils.testForAdmin(req, res))
			return;
		
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
		let response = await Utils.testForAdmin(req, res);
		if(false === response)
			return;
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
			if(false === response)
				return;
			var target_discord_user = await Database.getUserDiscordID(req.body.id);

			var new_status;
			if(req.body.requested_status === 'accepted') {
				new_status = `zaakceptowane. Zapraszamy na rozmowę, w której sprawdzimy twoją znajomość regulaminu. <#528681859882811421>`;
			}
			else if(req.body.requested_status === 'rejected')
				new_status = 'odrzucone.';
			else
				return;

			if(target_discord_user.length > 0) {
				try {
					let user_id = target_discord_user[0].discord_id;
					LOG('User', response.username, response.id, 'changed whitelist request status to',
						req.body.requested_status, 'for user', target_discord_user[0].discord_nick, user_id);
					discordBot.sendPrivateMessage(user_id,
						`Witaj. Twoje podanie o whiteliste zostało właśnie ${new_status}`);

					if(req.body.requested_status === 'accepted') {
						discordBot.changeUserRole(user_id, 'Rozmowa kwalifikacyjna');//give user role

						//#zaakceptowane-podania
						discordBot.sendChannelMessage('528960010420617216', //528960010420617216
							`Podanie użytkownika <@${user_id}> zostało zaakceptowane.`);
					}
				}
				catch(e) {
					console.log('Cannot send private message to', target_discord_user[0].discord_id);
				}
			}
		});
	},

	async plagiarism_test(req: any, res: any) {
		try {
			let response = await Utils.testForAdmin(req, res);
			if(false === response)
				return;

			let user_request = await Database.getWhitelistRequestByID(req.body.id);
			if(user_request.length < 1)
				return res.json({result: 'DATABASE_ERROR'});

			let accepted_request = await Database.getAllRequests();

			let user_words_arrays = [
				decodeURIComponent(user_request[0]['ic_historia']).split(' '),
				//decodeURIComponent(user_request[0]['ic_plan_na_postac']).split(' '),
				//decodeURIComponent(user_request[0]['ic_kreatywna_akcja']).split(' ')
			];

			var matches: {id: number, nick: string, percent: number, history: string}[] = [];

			for(var request of accepted_request) {
				if(request['id'] === user_request[0]['id'])//skip same request
					continue;

				var req_words_arrays = [//must be same order as user_words_arrays
					decodeURIComponent(request['ic_historia']).split(' '),
					//decodeURIComponent(request['ic_plan_na_postac']).split(' '),
					//decodeURIComponent(request['ic_kreatywna_akcja']).split(' ')
				];

				var m_percent = 0;

				for(var i=0; i<user_words_arrays.length; i++) {
					var user_words = user_words_arrays[i];
					var req_words = req_words_arrays[i];

					//count number of words in user_words that appear in req_words
					let score = 0;
					for(var word of user_words) {
						if(req_words.indexOf(word) !== -1)
							score++;
					}
					m_percent = Math.max(m_percent, score / user_words.length);
				}

				if(m_percent > 0.5) {//threshold
					matches.push({
						id: request['id'], 
						nick: request['discord_nick'], 
						percent: m_percent,
						history: req_words_arrays[0].join(' ')
					});
				}
			}

			res.json({result: 'SUCCESS', matches: matches.sort((a, b) => b.percent - a.percent)});
		}
		catch(e) {
			console.error(e);
			res.json({result: 'ERROR'});
		}
	}
};