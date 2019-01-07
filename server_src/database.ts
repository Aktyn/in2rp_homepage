/* jshint multistr:true */

import * as MySQL from 'mysql';
var prompt = require('prompt-sync')();

const STATUS = {
    ERROR: 0,
    PENDING: 1,
    SUCCESS: 2
};

var status = STATUS.PENDING;
var connection_callback: (() => void) | undefined = undefined;

var mysql_login = process.env.npm_config_mysqllogin;
if(!mysql_login) {
	try {//ask user to type password in console
		mysql_login = prompt('MySQL login: ');
	}
	catch(e) {
		console.error(
			'You must specify mysql login adding --mysqllogin=LOGIN to console npm command');
		process.exit();
	}
}

var mysql_pass = process.env.npm_config_mysqlpass;
if(!mysql_pass) {
	try {//ask user to type password in console
		mysql_pass = prompt('MySQL password: ');
	}
	catch(e) {
		console.error(
			'You must specify mysql password adding --mysqlpass=PASSWORD to console npm command');
		process.exit();
	}
}

var connection = MySQL.createConnection({
	host: "localhost",
	user: String(mysql_login),
	password: String(mysql_pass),
	database: "Whitelist"
});

connection.connect((err) => {
	if(err) {
		console.error('Error while connecting to MySQL database: ' + err.stack);
		status = STATUS.ERROR;
		return;
	}
	status = STATUS.SUCCESS;
	console.log('MySQL connection established');

	if(typeof connection_callback === 'function')
		connection_callback();
});

const Utils = {
	maxLengths: {
		'ic_historia': 			8192,
		'ic_imie_nazwisko': 	128,
		'ic_kreatywna_akcja': 	8192,
		'ic_plan_na_postac': 	4096,
		'ic_wiek': 				3,
		'ooc_data_ur': 			16,
		'ooc_imie': 			64,
		'ooc_o_rp': 			512,
		'ooc_steam_id': 		64
	} as {[index: string]: number},
	QUESTIONS: {
		'ic_historia': 			'VARCHAR(8192)',
		'ic_imie_nazwisko': 	'VARCHAR(128)',
		'ic_kreatywna_akcja': 	'VARCHAR(8192)',
		'ic_plan_na_postac': 	'VARCHAR(4096)',
		'ic_wiek': 				'INT(3)',
		'ooc_data_ur': 			'VARCHAR(16)',
		'ooc_imie': 			'VARCHAR(64)',
		'ooc_o_rp': 			'VARCHAR(512)',
		'ooc_steam_id': 		'VARCHAR(64)'
	} as {[index: string]: string}
};

const self = {
	QUESTIONS: Utils.QUESTIONS,

	onConnected: function(callback: () => void) {
		if(status === STATUS.SUCCESS)
			callback();
		else
			connection_callback = callback;
	},
	customQuery: function(query: string): Promise<any> {
		return new Promise((resolve, reject) => {
			if(status === STATUS.PENDING)
				setTimeout(() => self.customQuery(query).then(resolve).catch(reject), 1000);
			else if (status === STATUS.SUCCESS) {
				connection.query(query, function(err, result) {
					if(err) 
						reject(err);
					else
						resolve(result);
				});
			}
			else
				reject('MySQL connection failed');
		});
	},

	init: async function() {
		await this.customQuery(//table for whitelist requests
			"CREATE TABLE IF NOT EXISTS `requests` (\
			  	`id` INT(16) NOT NULL AUTO_INCREMENT,\
			  	`status` VARCHAR(16) NOT NULL DEFAULT 'pending',\
			  	`timestamp` VARCHAR(16) NOT NULL,\
			  	`discord_nick` VARCHAR(128) NOT NULL,\
			  	`discord_discriminator` INT(6) NOT NULL,\
			  	`discord_id` VARCHAR(32) NOT NULL," + 
			  	Object.keys(Utils.QUESTIONS).map(q => {
			  		return "`" + q + "` " + Utils.QUESTIONS[q] + " NULL, ";
			  	}).join('') +
		  		"PRIMARY KEY (`id`),\
		  		UNIQUE INDEX `id_UNIQUE` (`id` ASC));"
	  	);
	  	await this.customQuery(//table for whitelist requests
			"CREATE TABLE IF NOT EXISTS `visits` (\
			  	`id` INT(16) NOT NULL AUTO_INCREMENT,\
			  	`timestamp` VARCHAR(16) NOT NULL,\
			  	`user` VARCHAR(32),\
			  	`ip` VARCHAR(32),\
			  	PRIMARY KEY (`id`),\
		  		UNIQUE INDEX `id_UNIQUE` (`id` ASC));"
	  	);
	},

	addWhitelistRequest: function(answers: {[index: string]: string}, username: string, 
		discriminator: number, id: string) 
	{
		var answer_keys = Object.keys(answers);
		var columns_names = answer_keys.map(key => {
			return "`" + encodeURIComponent(key) + "`";
		}).join(', ');
		var column_values = answer_keys.map(key => {
			return "'" + encodeURIComponent(answers[key]).substr(0, Utils.maxLengths[key] || 8192) + "'";
		}).join(', ');

		return this.customQuery("INSERT INTO `requests`\
			(`timestamp`, `discord_nick`, `discord_discriminator`, `discord_id`, " + columns_names + ")\
			VALUES \
			('" + Date.now() + "', '" + username + "', '" + discriminator + "', '" + id + "', " + column_values + ");"
		);
	},

	getWhitelistRequest: function(id: string) {
		return this.customQuery("SELECT * FROM `requests` WHERE `discord_id` = '"+id+"';");
	},

	getRequests: function(status: string) {//1000*60*60*24 = 86400000 => miliseconds in one day
		return this.customQuery("SELECT * FROM `requests`\
			WHERE `status`='" + status + "' AND ((UNIX_TIMESTAMP()*1000 - `timestamp`)/86400000) < 7\
			ORDER BY `timestamp` DESC LIMIT 100;");
	},

	changeStatus: function(id: number, new_status: string) {
		return this.customQuery("UPDATE `requests` SET `status`='" + new_status + "'\
			WHERE `id`=" + id + ";");
	},

	getUserDiscordID: function(id: number) {
		return this.customQuery("SELECT discord_id, discord_nick FROM requests WHERE id=" + id + ";");
	},

	storeVisit: function(ip: string, user?: string) {
		return this.customQuery("INSERT INTO `visits` (`timestamp`, `user`, `ip`)\
			VALUES ('" + Date.now() + "', " + (user && user.length > 0 ? `'${encodeURIComponent(user)}'` : "NULL") + ", '" + ip + "');");
	},

	getVisits: function(from: string, to: string) {//'from' and 'to' are dates in format: YYYY-MM-DD
		return this.customQuery("SELECT \
				COUNT(`id`) as 'count', \
				COUNT(distinct `ip`) as 'distinct_ip',\
				DATE_FORMAT(from_unixtime(`timestamp`/1000), '%Y-%m-%d') as day\
			FROM Whitelist.visits\
			GROUP BY day\
			HAVING day >= '" + from + "' AND day <= '" + to + "'\
			ORDER BY day ASC LIMIT 366;");
	}
};

export default self;