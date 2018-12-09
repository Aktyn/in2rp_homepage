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
	//data_ur excluded due to short length
	QUESTION_NAMES: ['o_rp', 'dosw', 'postacie', 'czy_stream', 
		'Q1_jps', 'Q2_uc', 'Q3_napad', 'Q4_koledzy', 'Q5_pg', 'Q6_wu', ]
};

const self = {
	QUESTION_NAMES: Utils.QUESTION_NAMES,

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

	init: function() {
		this.customQuery(
			"CREATE TABLE IF NOT EXISTS `Whitelist`.`requests` (\
			  	`id` INT(16) NOT NULL AUTO_INCREMENT,\
			  	`status` VARCHAR(16) NOT NULL DEFAULT 'pending',\
			  	`timestamp` VARCHAR(16) NOT NULL,\
			  	`discord_nick` VARCHAR(128) NOT NULL,\
			  	`discord_discriminator` INT(6) NOT NULL,\
			  	`discord_id` VARCHAR(32) NOT NULL,\
			  	`data_ur` VARCHAR(16) NULL," + Utils.QUESTION_NAMES.map(q => {
			  		return "`" + q + "` VARCHAR(512) NULL, ";
			  	}).join('') +
		  		"PRIMARY KEY (`id`),\
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
			return "'" + encodeURIComponent(answers[key]) + "'";
		}).join(', ');

		return this.customQuery("INSERT INTO `Whitelist`.`requests`\
			(`timestamp`, `discord_nick`, `discord_discriminator`, `discord_id`, " + columns_names + ")\
			VALUES \
			('" + Date.now() + "', '" + username + "', '" + discriminator + "', '" + id + "', " + column_values + ");"
		);
	},

	getWhitelistRequest: function(id: string) {
		return this.customQuery("SELECT * FROM `Whitelist`.`requests` WHERE `discord_id` = '"+id+"';");
	},

	getRequests: function(status: string) {//1000*60*60*24 = 86400000 => miliseconds in one day
		return this.customQuery("SELECT * FROM `Whitelist`.`requests`\
			WHERE `status`='" + status + "' AND ((UNIX_TIMESTAMP()*1000 - `timestamp`)/86400000) < 7\
			ORDER BY `timestamp` DESC LIMIT 100;");
	},

	changeStatus: function(id: number, new_status: string) {
		return this.customQuery("UPDATE `Whitelist`.`requests` SET `status`='" + new_status + "'\
			WHERE `id`=" + id + ";");
	},

	getUserDiscordID: function(id: number) {
		return this.customQuery("SELECT discord_id FROM Whitelist.requests WHERE id=" + id + ";");
	}
};

export default self;