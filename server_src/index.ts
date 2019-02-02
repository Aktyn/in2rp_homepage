declare global {
	namespace NodeJS {
		export interface Global {
			PORT: number;
		}
	}
}
global.PORT = 1234;

import * as express from 'express';
const cacheControl = require('express-cache-controller');
import * as bodyParser from 'body-parser';
const app = express();

import * as fs from 'fs';
import * as path from 'path';

if(fs.existsSync( path.join(__dirname, '..', 'data') ) === false)
	fs.mkdirSync('data');

import LOG from './log';

import Database from './database';

//DISCORD
import discordBot from './discord_bot';
discordBot.start();

//#administracja - 528687540937424955
//#whitelist - 528681859882811421
//#zlozone podania - 528987808438812683
/*setTimeout(() => {
	discordBot.sendChannelMessage('528987808438812683', 'W lutym start');
}, 5000);*/

// console.log('ENV:', process.env.NODE_ENV);

var allowCrossDomain = function(req: any, res: any, next: any) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cacheControl({ 
	noCache: true,//TODO - change to false
	//maxAge: 60*60*24*7  //uncomment this
}));//one week

if(process.env.NODE_ENV === 'dev')
	app.use(allowCrossDomain);

import discordAPI from './discord_api';

app.get('/discord_login', discordAPI.login_request);
app.get('/discord_callback', discordAPI.discord_callback);
app.post('/discord_restore_session', discordAPI.restore_session);

// const whitelistAPI = require('./whitelist_api.js');
import whitelistAPI from './whitelist_api';

Database.onConnected(() => {
	Database.init();
});

app.post('/whitelist_request', whitelistAPI.apply_request);
app.post('/whitelist_status_request', whitelistAPI.status_request);
app.post('/get_whitelist_applicants', whitelistAPI.applicants_request);
app.post('/update_whitelist_status', whitelistAPI.update_request);
app.post('/plagiarism_test', whitelistAPI.plagiarism_test);

import commonAPI from './common_api';

app.post('/snake_gameover', commonAPI.snake_gameover);
app.post('/get_avaible_logs', commonAPI.get_logs);
app.post('/get_log_content', commonAPI.get_log_content);
app.post('/get_admins', commonAPI.get_admins);
app.post('/remove_admin', commonAPI.remove_admin);
app.post('/add_admin', commonAPI.add_admin);
app.post('/get_visits', commonAPI.get_visits);
app.post('/get_online_players', commonAPI.get_online_players);
app.post('/get_whitelist_players', commonAPI.get_whitelist_players);
app.post('/get_whitelist_player_details', commonAPI.get_whitelist_player_details);
app.post('/add_whitelist_player', commonAPI.add_whitelist_player);
app.post('/remove_whitelist_player', commonAPI.remove_whitelist_player);

app.post('/record_visit', (req, resp) => {
	let forwards = req.headers['x-forwarded-for'];
	if(typeof forwards === 'object')
		forwards = forwards.join(',');
	let ip = (forwards || req.connection.remoteAddress || '').replace(/::ffff:/, '');
	LOG('guest session', ip);
	Database.storeVisit(ip, req.headers['user-agent'] || null);
});

const dir = path.join(__dirname, '..', 'dist');
app.use(express.static(dir));

const index_html = fs.readFileSync(dir + '/index.html', 'utf8');
app.get('/main.js', express.static(path.join(__dirname, '..', 'dist', 'main.js')));
app.get('*', (req, res) => res.send(index_html));

app.listen(global.PORT, () => console.log(`Homepage server runs on: ${global.PORT}!`));