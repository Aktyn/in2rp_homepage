import Utils from './utils';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const BACKUPS_DELAY = 3;

var mysql_login = Utils.getArgument('MYSQL_LOGIN');
var mysql_pass = Utils.getArgument('MYSQL_PASS');

var mongodb_login = Utils.getArgument('MONGODB_LOGIN');
var mongodb_pass = Utils.getArgument('MONGODB_PASS');

// console.log(mysql_login, mysql_pass, mongodb_login, mongodb_pass);

const backups_path = path.join(os.homedir(), 'backups');

function toFixed(value: number | string) {//giving one digit value returns string with leading 0
	return value < 10 ? '0' + value : value.toString();
}

try {
	if(!fs.existsSync(backups_path))
		fs.mkdirSync(backups_path);
}
catch(e) {
	console.error(e);
}

async function databaseBackup() {
	let dt = new Date();
	let hh = dt.getHours();
	let time = `${toFixed(dt.getFullYear())}-${toFixed(dt.getMonth()+1)}-${toFixed(dt.getDate())}`;
	time += `_${toFixed(hh)}-${toFixed(dt.getMinutes())}`;

	const backups_path_time = path.join(os.homedir(), 'backups', time);
	if(!fs.existsSync(backups_path_time))
		fs.mkdirSync(backups_path_time);

	const admin_sql = path.join(backups_path_time, 'admin_in2rp.sql');
	const wl_sql = path.join(backups_path_time, 'Whitelist.sql');
	const mongodb_out = path.join(backups_path_time);

	if(hh >= 4 && hh < 4+BACKUPS_DELAY) {
		try {
			console.log('Making game backup');
			let res = await Utils.executeCommand(path.join(os.homedir(), 'skrypty', 'game_backup.sh'));
			console.log('\t', res);
		}
		catch(e) {
			console.error(e);
		}
	}

	try {
		console.log('Starting backup');
		if(fs.existsSync(admin_sql))
			fs.unlinkSync(admin_sql);
		if(fs.existsSync(wl_sql))
			fs.unlinkSync(wl_sql);

		await Utils.executeCommand(
			`mysqldump -u ${mysql_login} -p${mysql_pass} admin_in2rp > ${admin_sql}`)
				.then(res => console.log(res)).catch(console.error);
		console.log('\tadmin_in2rp backed up [mysql]');
		await Utils.executeCommand(
			`mysqldump -u ${mysql_login} -p${mysql_pass} Whitelist > ${wl_sql}`)
				.then(res => console.log(res)).catch(console.error);
		console.log('\tWhitelist backed up [mysql]');

		await Utils.executeCommand(`mongodump -u ${mongodb_login} -p "${mongodb_pass}" --db nodebb --authenticationDatabase=${mongodb_login} --out ${mongodb_out}`);
		console.log('\tforum backed up [mongodb]');
		console.log('\tbackup successful');
	}
	catch(e) {
		console.error(e);
	}
}

//databaseBackup();//testing

setInterval(databaseBackup, 1000*60*60 * BACKUPS_DELAY);//backup database every BACKUPS_DELAY hours