export default {
	api_server_url: process.env.NODE_ENV === 'development' ? 
		'http://localhost:1234' : 
		'http://54.37.128.46',
	short_description: 'TODO - krotki opis',
	long_description: 'TODO - dlugi opis'
};
console.log();