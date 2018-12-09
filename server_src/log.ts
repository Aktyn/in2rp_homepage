import * as fs from 'fs';
import * as path from 'path';

if(fs.existsSync( path.join(__dirname, '..', 'logs') ) === false) {
	console.log('Creating folder for logs');
	fs.mkdirSync('logs');
}

const dt = new Date();
const current_day = `${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()<10?'0':''}${dt.getDate()}`;

const today_log_file = path.join(__dirname, '..', 'logs', 'log_' + current_day);
var ready = false;
fs.open(today_log_file, 'a+', (err, file) => {
	console.log('Log file opened/created');
	ready = true;
});

export default function(...args: (string | number | boolean)[]) {
	if(!ready) return;
	try {
		fs.appendFileSync(today_log_file, 
			new Date().toLocaleTimeString() + ': ' + args.join(' ') + '\n', 'utf8');
	}
	catch(e) {
		console.log('Cannot write to log file:', e);
	}
};