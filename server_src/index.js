'use strict';

//TODO - log some events like when user logs in

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
global.PORT = 1234;
const fs = require('fs');

const Database = require('./database.js');

//DISCORD
const discordBot = require('./discord_bot.js');
discordBot.start();

// setTimeout(() => {
// 	discordBot.sendChannelMessage('520748695059300383', 'test').catch(e => {
// 		discordBot.sendChannelMessage('516321132656197661', 'test')
// 	});
// }, 5000);

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

const discordAPI = require('./discord_api.js');

app.get('/discord_login', discordAPI.login_request);
app.get('/discord_callback', discordAPI.discord_callback);
app.post('/discord_restore_session', discordAPI.restore_session);

const whitelistAPI = require('./whitelist_api.js');

Database.onConnected(() => {
	Database.init();
});

app.post('/whitelist_request', whitelistAPI.apply_request);
app.post('/whitelist_status_request', whitelistAPI.status_request);
app.post('/get_whitelist_applicants', whitelistAPI.applicants_request);
app.post('/update_whitelist_status', whitelistAPI.update_request);

// const dir = __dirname + '/dist';
const dir = __dirname + '/../dist';
app.use('/', express.static(dir));

const index_html = fs.readFileSync(dir + '/index.html', 'utf8');
app.get('*', (req, res) => res.send(index_html));

app.listen(global.PORT, () => console.log(`Example app listening on port ${global.PORT}!`));