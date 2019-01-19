import Config from './../config';

export default {
	postRequest: function(to: string, data: string | {[index: string]: any}) {
		if(!to.startsWith('/')) to = '/' + to;

		if(typeof data !== 'string')
			data = JSON.stringify(data);

		return fetch(Config.api_server_url + to, {
			method: "POST",
			mode: process.env.NODE_ENV === 'development' ? 'cors' : 'same-origin',
			headers: {"Content-Type": "application/json; charset=utf-8"},
			body: data
		})
	}
};