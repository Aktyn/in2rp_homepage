import * as fs from 'fs';
import * as path from 'path';

function toFixed(value: number | string) {//giving one digit value returns string with leading 0
	return value < 10 ? '0' + value : value.toString();
}

if(fs.existsSync( path.join(__dirname, '..', 'logs') ) === false) {
	console.log('Creating folder for logs');
	fs.mkdirSync('logs');
}

var day_nr = 0;
var current_day = 'today';
var today_log_file: string | undefined = undefined;
var ready = false;

function fixedZero(n: number) {
	return n >= 10 ? n.toString() : ('0'+n);
}

function generateLogFile(dt: Date) {
	current_day = `${fixedZero(dt.getFullYear())}-${fixedZero(dt.getMonth()+1)}-${toFixed(dt.getDate())}`;

	today_log_file = path.join(__dirname, '..', 'logs', 'log_' + current_day);
	
	fs.open(today_log_file, 'a+', (err, file) => {
		console.log('Log file opened/created');
		ready = true;
	});
	
	day_nr = dt.getDate();
}

generateLogFile(new Date());

export default function(...args: (string | number | boolean)[]) {
	if(!ready) return;
	try {
		let dt = new Date();

		if(day_nr !== dt.getDate())
			generateLogFile(dt);
		
		var current_time = `${toFixed(dt.getHours())}:${toFixed(dt.getMinutes())}:${toFixed(dt.getSeconds())}`;
		if(today_log_file)
			fs.appendFileSync(today_log_file, current_time + ': ' + args.join(' ') + '\n', 'utf8');
	}
	catch(e) {
		console.log('Cannot write to log file:', e);
	}
};