"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
global.PORT = 1234;
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const fs = require("fs");
const database_1 = require("./database");
//DISCORD
const discord_bot_1 = require("./discord_bot");
discord_bot_1.default.start();
// setTimeout(() => {
// 	discordBot.sendChannelMessage('520748695059300383', 'test').catch(e => {
// 		discordBot.sendChannelMessage('516321132656197661', 'test')
// 	});
// }, 5000);
// console.log('ENV:', process.env.NODE_ENV);
var allowCrossDomain = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
};
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
if (process.env.NODE_ENV === 'dev')
    app.use(allowCrossDomain);
const discord_api_1 = require("./discord_api");
app.get('/discord_login', discord_api_1.default.login_request);
app.get('/discord_callback', discord_api_1.default.discord_callback);
app.post('/discord_restore_session', discord_api_1.default.restore_session);
// const whitelistAPI = require('./whitelist_api.js');
const whitelist_api_1 = require("./whitelist_api");
database_1.default.onConnected(() => {
    database_1.default.init();
});
app.post('/whitelist_request', whitelist_api_1.default.apply_request);
app.post('/whitelist_status_request', whitelist_api_1.default.status_request);
app.post('/get_whitelist_applicants', whitelist_api_1.default.applicants_request);
app.post('/update_whitelist_status', whitelist_api_1.default.update_request);
const dir = __dirname + '/../dist';
app.use('/', express.static(dir));
const index_html = fs.readFileSync(dir + '/index.html', 'utf8');
app.get('*', (req, res) => res.send(index_html));
app.listen(global.PORT, () => console.log(`Example app listening on port ${global.PORT}!`));
