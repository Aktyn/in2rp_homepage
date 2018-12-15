declare global {
	namespace NodeJS {
		export interface Global {
			PORT: number;
		}
	}
}
global.PORT = 1234;

import * as express from 'express';
import * as bodyParser from 'body-parser';
const app = express();

import * as fs from 'fs';
import LOG from './log';

import Database from './database';

//DISCORD
import discordBot from './discord_bot';
discordBot.start();

/*setTimeout(() => {
	discordBot.sendChannelMessage('520748695059300383', 'Siema człowieki.\nDziała juz domena: http://in2rp.pl/');
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

if(process.env.NODE_ENV === 'dev')
	app.use(allowCrossDomain);

import discordAPI from './discord_api';

app.get('/discord_login', discordAPI.login_request);
app.get('/discord_callback', discordAPI.discord_callback);
app.post('/discord_restore_session', discordAPI.restore_session);
app.post('/snake_gameover', discordAPI.snake_gameover);

// const whitelistAPI = require('./whitelist_api.js');
import whitelistAPI from './whitelist_api';

Database.onConnected(() => {
	Database.init();
});

app.post('/whitelist_request', whitelistAPI.apply_request);
app.post('/whitelist_status_request', whitelistAPI.status_request);
app.post('/get_whitelist_applicants', whitelistAPI.applicants_request);
app.post('/update_whitelist_status', whitelistAPI.update_request);

app.post('/record_visit', (req, resp) => {
	LOG('guest session', (req.connection.remoteAddress || '').replace(/::ffff:/, ''));
});

const dir = __dirname + '/../dist';
app.use('/', express.static(dir));

const index_html = fs.readFileSync(dir + '/index.html', 'utf8');
app.get('*', (req, res) => res.send(index_html));

app.listen(global.PORT, () => console.log(`Homepage server runs on: ${global.PORT}!`));