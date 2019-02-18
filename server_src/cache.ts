
class Cache {
	readonly data: any;
	private expiration_date: number;

	constructor(lifetime: number, data: any) {
		this.data = data;
		this.expiration_date = Date.now() + lifetime;
	}

	expired() {
		return Date.now() > this.expiration_date;
	}
}

/*interface CacheStore {
	[index: string]: Cache
}*/

// var cache_store: CacheStore = {};
var cache_store: Map<string, Cache> = new Map();

export default {
	getCache: function(name: string): Cache | undefined {
		var cache = cache_store.get(name); //cache_store[name];

		if(cache && cache.expired()) {
			cache_store.delete(name); //delete cache_store[name];
			console.log('Expired cache:', name);
			return undefined;
		}

		return cache;
	},

	createCache: function(name: string, lifetime: number, data: any) {//lifetime - in miliseconds
		console.log('New cache created:', name);
		//cache_store[name] = new Cache(lifetime, data);
		cache_store.set( name, new Cache(lifetime, data) );
	},

	deleteCache: function(name: string) {
		return cache_store.delete(name);
	}
};