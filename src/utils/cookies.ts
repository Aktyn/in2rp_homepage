export default {
	/**
     * lifetime argument must be given as number of miliseconds
     */
	setCookie: function(name: string, value: string | number | boolean, lifetime: number) {
	    document.cookie = name + '=' + value + ';' + 'expires=' +
	    	(new Date(Date.now() + lifetime)).toUTCString() + ';path=/';
	},

	removeCookie: function(name: string) {
		this.setCookie(name, '', 0);
	},

	getCookie: function(name: string) {
	    try {
	    	var match = decodeURIComponent(document.cookie)
	    		.match(new RegExp('.*'+name+'=([^;]*)', 'i'));
	    	if(match && match.length > 1)
		   		return match[1];
		   	return null;
		}
		catch(e) {
			return null;//cookie not found
		}
	}
};