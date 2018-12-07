'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
global.PORT = 1234;
const fs = require('fs');

const Database = require('./database.js');

//DISCORD
const discordBot = require('./discord_bot.js');
discordBot.start();

// console.log('ENV:', process.env.NODE_ENV);

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

if(process.env.NODE_ENV === 'dev')
	app.use(allowCrossDomain);

const discordApi = require('./discord_api.js');

app.get('/discord_login', discordApi.login_request);
app.get('/discord_callback', discordApi.discord_callback);
app.post('/discord_restore_session', discordApi.restore_session);

//data_ur excluded due to short length

/* jshint ignore: start */
Database.onConnected(() => {
	Database.init();
});
/* jshint ignore: end */

/* jshint ignore: start */
app.post('/whitelist_request', async (req, res) => {
	//console.log(req.body);

	var response = await discordApi.getDiscordUserData(req.body.token);

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
});

app.post('/whitelist_status_request', async (req, res) => {
	var response = await discordApi.getDiscordUserData(req.body.token);

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
});
/* jshint ignore: end */

// const dir = __dirname + '/dist';
const dir = __dirname + '/../dist';
app.use('/', express.static(dir));

const index_html = fs.readFileSync(dir + '/index.html', 'utf8');
app.get('*', (req, res) => res.send(index_html));

app.listen(global.PORT, () => console.log(`Example app listening on port ${global.PORT}!`));