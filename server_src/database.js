const MySQL = require('mysql');
var prompt = require('prompt-sync')();

const STATUS = {//TODO - convert to javascript
    ERROR: 0,
    PENDING: 1,
    SUCCESS: 2
};

var status = STATUS.PENDING;
var connection_callback;

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

const UTILS = {
	currentTime: function() {
		let date = new Date();
		let m = date.getUTCMonth() + 1;
		let d = date.getDate();
		let mins = date.getMinutes();
		let hours = date.getHours();
		return date.getFullYear() + '-' + 
			(m < 10 ? ('0' + m) : m) + '-' + 
			(d < 10 ? ('0' + d) : d) + ' ' +
			(hours < 10 ? ('0' + hours) : hours) + ':' + 
			(mins < 10 ? ('0' + mins) : mins);
	}
};

module.exports = {
	onConnected: function(callback) {
		if(status === STATUS.SUCCESS)
			callback();
		else
			connection_callback = callback;
	},
	customQuery: function(query) {
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
		const QUESTION_NAMES = ['o_rp', 'dosw', 'postacie', 'czy_stream', 
			'Q1_jps', 'Q2_uc', 'Q3_napad', 'Q4_koledzy', 'Q5_pg', 'Q6_wu', ];
		this.customQuery(
			'CREATE TABLE IF NOT EXISTS `Whitelist`.`requests` (\
			  	`id` INT(16) NOT NULL AUTO_INCREMENT,\
			  	`status` VARCHAR(16) NULL,\
			  	`timestamp` VARCHAR(16) NOT NULL,\
			  	`discord_nick` VARCHAR(128) NOT NULL,\
			  	`discord_discriminator` INT(6) NOT NULL,\
			  	`discord_id` VARCHAR(32) NOT NULL,\
			  	`data_ur` VARCHAR(16) NULL,' + QUESTION_NAMES.map(q => {
			  		return '`' + q + '` VARCHAR(512) NULL, ';
			  	}).join('') +
		  		'PRIMARY KEY (`id`),\
		  		UNIQUE INDEX `id_UNIQUE` (`id` ASC));'
	  	);
	},

	addWhitelistRequest: function(answers, username, discriminator, id) {
		var answer_keys = Object.keys(answers);
		var columns_names = answer_keys.map(key => {
			return "`" + key + "`";
		}).join(', ');
		var column_values = answer_keys.map(key => {
			return "'" + answers[key] + "'";
		}).join(', ');

		return this.customQuery("INSERT INTO `Whitelist`.`requests`\
			(`timestamp`, `discord_nick`, `discord_discriminator`, `discord_id`, " + columns_names + ")\
			VALUES \
			('" + Date.now() + "', '" + username + "', '" + discriminator + "', '" + id + "', " + column_values + ");"
		);
	},

	getWhitelistRequest: function(id) {
		return this.customQuery("SELECT * FROM `Whitelist`.`requests` WHERE `discord_id` = '"+id+"';");
	}
};