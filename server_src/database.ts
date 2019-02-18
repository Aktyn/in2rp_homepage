import Utils from './utils';
import * as MySQL from 'mysql';

const STATUS = {
    ERROR: 0,
    PENDING: 1,
    SUCCESS: 2
};

var status = STATUS.PENDING, fivem_status = STATUS.PENDING;
var connection_callback: (() => void) | undefined = undefined;

var connection: MySQL.Connection, fivem_connection: MySQL.Connection;

setTimeout(() => {
	var mysql_login = Utils.getArgument('MYSQL_LOGIN');
	//process.env.npm_config_mysqllogin || Utils.inputPrompt('MySQL login', 
		//'You must specify mysql login adding --mysqllogin=LOGIN to console npm command');

	var mysql_pass = Utils.getArgument('MYSQL_PASS');
	//process.env.npm_config_mysqlpass || Utils.inputPrompt('MySQL password', 
		//'You must specify mysql password adding --mysqlpass=PASSWORD to console npm command');

	connection = MySQL.createConnection({
		host: "localhost",
		user: String(mysql_login),
		password: String(mysql_pass),
		database: "Whitelist"
	});

	fivem_connection = MySQL.createConnection({
		host: "localhost",
		user: String(mysql_login),
		password: String(mysql_pass),
		database: "admin_in2rp"
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

	fivem_connection.connect((err) => {
		if(err) {
			console.error('Error while connecting to MySQL fivem database: ' + err.stack);
			fivem_status = STATUS.ERROR;
			return;
		}
		fivem_status = STATUS.SUCCESS;
		console.log('MySQL connection established (fivem)');

		if(typeof connection_callback === 'function')
			connection_callback();
	});
});

const UtilsDB = {
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

interface DiscordUserJSON {
	discord_nick: string;
	discord_discriminator: number;
	discord_id: string;
}

const self = {
	QUESTIONS: UtilsDB.QUESTIONS,

	onConnected: function(callback: () => void) {
		if(status === STATUS.SUCCESS)
			callback();
		else
			connection_callback = callback;
	},
	customQuery: function(query: string): Promise<any> {
		return new Promise((resolve, reject) => {
			if(status === STATUS.PENDING || fivem_status === STATUS.PENDING)
				setTimeout(() => self.customQuery(query).then(resolve).catch(reject), 1000);
			else if(status === STATUS.SUCCESS && fivem_status === STATUS.SUCCESS) {
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
			"CREATE TABLE IF NOT EXISTS `Whitelist`.`requests` (\
			  	`id` INT(16) NOT NULL AUTO_INCREMENT,\
			  	`status` VARCHAR(16) NOT NULL DEFAULT 'pending',\
			  	`timestamp` VARCHAR(16) NOT NULL,\
			  	`discord_nick` VARCHAR(128) NOT NULL,\
			  	`discord_discriminator` INT(6) NOT NULL,\
			  	`discord_id` VARCHAR(32) NOT NULL," + 
			  	Object.keys(UtilsDB.QUESTIONS).map(q => {
			  		return "`" + q + "` " + UtilsDB.QUESTIONS[q] + " NULL, ";
			  	}).join('') +
		  		"PRIMARY KEY (`id`),\
		  		UNIQUE INDEX `id_UNIQUE` (`id` ASC));"
	  	);
	  	await this.customQuery(//table for whitelist requests
			"CREATE TABLE IF NOT EXISTS `Whitelist`.`visits` (\
			  	`id` INT(16) NOT NULL AUTO_INCREMENT,\
			  	`timestamp` VARCHAR(16) NOT NULL,\
			  	`user` VARCHAR(32),\
			  	`ip` VARCHAR(32),\
			  	`user_agent_id` INT(16) NOT NULL,\
			  	PRIMARY KEY (`id`),\
		  		UNIQUE INDEX `id_UNIQUE` (`id` ASC));"
	  	);
	  	await this.customQuery(//table for user agents
			"CREATE TABLE IF NOT EXISTS `Whitelist`.`user_agents` (\
			  	`id` INT(16) NOT NULL AUTO_INCREMENT,\
			  	`agent` VARCHAR(200),\
			  	PRIMARY KEY (`id`),\
		  		UNIQUE INDEX `id_UNIQUE` (`id` ASC),\
		  		UNIQUE INDEX `agent_UNIQUE` (`agent` ASC));"
	  	);
	  	await this.customQuery(
	  		"CREATE TABLE IF NOT EXISTS `Whitelist`.`stock_exchange` (\
				`id` INT(16) NOT NULL AUTO_INCREMENT,\
				`timestamp` VARCHAR(16) NOT NULL,\
				`mark` VARCHAR(32) NULL DEFAULT NULL,\
				`capacity` INT(2) NULL DEFAULT NULL,\
				`model` VARCHAR(32) NULL DEFAULT NULL,\
				`price` VARCHAR(32) NULL DEFAULT NULL,\
				PRIMARY KEY (`id`),\
		  		UNIQUE INDEX `id_UNIQUE` (`id` ASC));"
	  	);
	  	await this.customQuery(
	  		"CREATE TABLE IF NOT EXISTS `Whitelist`.`stock_exchange_previews` (\
				`stock_id` INT(16) NOT NULL,\
				`file_name` VARCHAR(64) NOT NULL,\
				UNIQUE INDEX `file_name_UNIQUE` (`file_name` ASC),\
				PRIMARY KEY (`file_name`));"
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
			let val = encodeURIComponent(answers[key]).replace(/'/gi, "\\'")
				.substr(0, UtilsDB.maxLengths[key] || 8192);
			if(key === 'ic_wiek')
				return val || 0;
			return "'" + val + "'";
		}).join(', ');

		return this.customQuery("INSERT INTO `requests` (`timestamp`, `discord_nick`, `discord_discriminator`, `discord_id`, " + columns_names + ") VALUES ('" + Date.now() + "', '" + encodeURIComponent(username) + "', '" + discriminator + "', '" + id + "', " + column_values + ");"
		);
	},

	getWhitelistRequest: function(id: string) {
		return this.customQuery("SELECT * FROM `requests` WHERE `discord_id` = '"+id+"' ORDER BY `timestamp` DESC;");
	},

	getWhitelistRequestByID: function(id: number) {
		return this.customQuery("SELECT * FROM `requests` WHERE `id` = "+id+" LIMIT 1;");
	},

	getRequests: function(status: string) {//1000*60*60*24 = 86400000 => miliseconds in one day
		return this.customQuery("SELECT * FROM `requests`\
			WHERE `status`='" + status + "' AND ((UNIX_TIMESTAMP()*1000 - `timestamp`)/86400000) < 28\
			ORDER BY `timestamp` DESC LIMIT 100;");
	},

	getAllRequests: function() {//1000*60*60*24 = 86400000 => miliseconds in one day
		return this.customQuery("SELECT * FROM `requests`\
			ORDER BY `timestamp` DESC LIMIT 1000;");
	},

	changeStatus: function(id: number, new_status: string) {
		return this.customQuery("UPDATE `requests` SET `status`='" + new_status + "'\
			WHERE `id`=" + id + ";");
	},

	getUserDiscordID: function(id: number) {
		return this.customQuery("SELECT discord_id, discord_nick, discord_discriminator FROM requests WHERE id=" + id + ";");
	},

	storeVisit: function(ip: string, user_agent: string | null, user?: string) {
		//add user agent
		this.customQuery(`INSERT IGNORE INTO \`user_agents\` (\`agent\`)
			VALUES (${user_agent === null ? "NULL" : `'${user_agent}'`});`);

		const select_agent_id_query = `(SELECT id from \`user_agents\` WHERE 
			${user_agent === null ? '`agent` IS NULL' : `\`agent\` = '${user_agent}'`})`;

		return this.customQuery(`INSERT INTO \`visits\` 
			(\`timestamp\`, \`user\`, \`ip\`, \`user_agent_id\`)
			VALUES ('${Date.now()}', ${(user && user.length > 0) ? `'${encodeURIComponent(user)}'` : 'NULL'}, '${ip}', ${select_agent_id_query});`);
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
	},

	addWhitelistPlayer: function(steamhex: string) {
		return this.customQuery(`INSERT IGNORE INTO admin_in2rp.whitelist (identifier) 
			VALUES ('steam:${steamhex}');`);
	},

	removeWhitelistPlayer: function(steamhex: string) {
		return this.customQuery(`DELETE FROM admin_in2rp.whitelist 
			WHERE identifier = 'steam:${steamhex}'`);
	},

	getWhitelistPlayers: function() {
		return this.customQuery("SELECT users.id, whitelist.identifier, users.name, users.firstname,\
			    users.lastname, users.phone_number, CONCAT(users.money, ' + ', users.bank) AS 'money',\
			    CONCAT(jobs.label, ' ', job_grades.label) AS 'job'\
			FROM admin_in2rp.users \
				RIGHT JOIN admin_in2rp.whitelist USING (identifier)\
				LEFT JOIN admin_in2rp.job_grades ON users.job_grade = job_grades.id\
			   	LEFT JOIN admin_in2rp.jobs ON jobs.name = users.job;");
	},

	getPlayerDetails: function(user_id: number) {
		return this.customQuery(`SELECT users.id, users.identifier, users.name, users.group,
			    users.firstname, users.lastname, users.dateofbirth, users.sex, users.height,
			    users.phone_number, users.money, users.bank, users.loadout, users.status,
			    CONCAT(jobs.label, ' ', job_grades.label) AS 'job'
			FROM
			    admin_in2rp.users
			        LEFT JOIN admin_in2rp.job_grades ON users.job_grade = job_grades.id
			        LEFT JOIN admin_in2rp.jobs ON jobs.name = users.job
			WHERE
			    users.id = ${user_id}
			LIMIT 1;`);
	},

	getDiscordUserWithAcceptedRequestsWithoutServerAccess: function() {
		return this.customQuery(`SELECT 
			    requests.discord_nick, requests.discord_discriminator, requests.ooc_steam_id
			FROM
			    Whitelist.requests
			WHERE
			    status = 'accepted'
			        AND CONVERT(CONCAT('steam:',
			            LOWER(HEX(CAST(ooc_steam_id AS UNSIGNED)))) USING utf8) NOT IN 
			      	(SELECT 
			            CONVERT(identifier USING utf8)
			        FROM
			            admin_in2rp.whitelist)
			       	AND ((UNIX_TIMESTAMP()*1000 - \`timestamp\`)/86400000) < 28
			ORDER BY timestamp DESC;`)
	},

	getDiscordUserFromRequest: function(steamid: string): Promise<DiscordUserJSON[]> {
		return this.customQuery(`SELECT discord_nick, discord_discriminator, discord_id FROM Whitelist.requests where ooc_steam_id = '${steamid}' LIMIT 1;`);
	},

	getStockExchangeEntries: function() {
		return this.customQuery("SELECT \
			    stock_exchange.*,\
			    GROUP_CONCAT(file_name SEPARATOR ';') AS 'files'\
			FROM\
			    Whitelist.stock_exchange\
			        LEFT JOIN\
			    Whitelist.stock_exchange_previews ON \
			    	stock_exchange.id = stock_exchange_previews.stock_id\
			GROUP BY id;")
	},

	addStockExchange: function(mark: string, capacity: number, model: string, price: string) 
	{
		return this.customQuery(`INSERT INTO Whitelist.stock_exchange (timestamp, mark, capacity, model, price)
			VALUES ('${Date.now()}', '${mark}', ${capacity}, '${model}', '${price}');`);
	},

	addStockExchangePreview: function(stock_id: number, file_name: string) {
		return this.customQuery(`INSERT IGNORE INTO Whitelist.stock_exchange_previews (stock_id, file_name) VALUES (${stock_id}, '${file_name}');`);
	}
};

export default self;