import Utils from './utils';

var current_timeout: NodeJS.Timeout | null = null;
var next_eclipse_timestamp = 0;

const periods = [30, 15, 10, 5, 2, 1];

interface PeriodListener {
	callback: (time: number) => void; 
	name: string;
}

var period_listeners: PeriodListener[] = [];

function nextPeriod(time: number) {
	let i = 0;
	for(; i<periods.length && periods[i] >= (time|0); i++);
	return i < periods.length ? periods[i] : 0;
}

function step(time: number, skip = false) {
	time = time|0;
	next_eclipse_timestamp = Date.now() + time*1000*60;

	if(time === 0) {
		period_listeners.forEach(p => p.callback(0));

		current_timeout = null;
		//TODO - kick every player
		Utils.executeCommand(Utils.SERVER_CMDS['restart']);
		return;
	}
	else
		period_listeners.forEach(p => p.callback(time));

	if(skip === false)
		Utils.executeRconCommand('reboot ' + time);
	
	let next_period = nextPeriod(time);

	current_timeout = setTimeout(() => {
		step(next_period);
	}, 1000*60*(time-next_period));
}

export default {
	start: (time: number, skip_first = false) => {//time in minutes
		if(current_timeout !== null) {
			console.log('Canceling current timeout');
			clearTimeout(current_timeout);
		}

		step(time, skip_first);
	},
	getNextPeriod: nextPeriod,
	getPeriods: function() {
		return periods;
	},

	getTimeToEclipse: () => {//return seconds to next eclipse
		return Math.round( Math.max(0, next_eclipse_timestamp - Date.now()) / 1000 );
	},

	addListener: function(_callback: (time: number) => void, _name: string) {
		period_listeners.push({callback: _callback, name: _name});
	},

	removeListener: function(name: string) {
		period_listeners = period_listeners.filter(p => p.name !== name);
	}
};