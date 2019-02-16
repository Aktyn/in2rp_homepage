import Utils from './utils';

var current_timeouts: number[] | undefined[] = new Array(Utils.ISLANDS).fill(undefined);
var next_eclipse_timestamps: number[] = new Array(Utils.ISLANDS).fill(0);

const periods = [30, 15, 10, 5, 2, 1];

interface PeriodListener {
	callback: (time: number) => void; 
	isl_index: number;
	name: string;
}

var period_listeners: PeriodListener[] = [];

function nextPeriod(time: number) {
	let i = 0;
	for(; i<periods.length && periods[i] >= (time|0); i++);
	return i < periods.length ? periods[i] : 0;
}

function step(time: number, isl_index: number, skip = false) {
	time = time|0;
	next_eclipse_timestamps[isl_index] = Date.now() + time*1000*60;

	if(time === 0) {
		period_listeners.forEach(p => {
			if(p.isl_index === isl_index)
				p.callback(0);
		});

		current_timeouts[isl_index] = undefined;
		//TODO - kick every player
		//Utils.executeCommand(Utils.SERVER_CMDS['restart']);
		Utils.executeCommand(Utils.getServerCMDS(isl_index)['restart']);
		return;
	}
	else {
		period_listeners.forEach(p => {
			if(p.isl_index === isl_index)
				p.callback(time);
		});
	}

	if(skip === false)
		Utils.executeRconCommand('reboot ' + time, isl_index);
	
	let next_period = nextPeriod(time);

	current_timeouts[isl_index] = setTimeout(() => {
		step(next_period, isl_index);
	}, 1000*60*(time-next_period)) as never;
}

export default {
	start: (time: number, isl_index: number, skip_first = false) => {//time in minutes
		if(current_timeouts[isl_index] !== undefined) {
			console.log('Canceling current timeout for isl_index: ' + isl_index);
			clearTimeout(current_timeouts[isl_index]);
		}

		step(time, isl_index, skip_first);
	},

	getNextPeriod: nextPeriod,
	getPeriods: function() {
		return periods;
	},

	getTimeToEclipse: (isl_index: number) => {//return seconds to next eclipse
		return Math.round( Math.max(0, next_eclipse_timestamps[isl_index] - Date.now()) / 1000 );
	},

	addListener: function(_callback: (time: number) => void, _isl_index: number, _name: string) {
		period_listeners.push( {callback: _callback, isl_index: _isl_index, name: _name} );
	},

	removeListener: function(name: string) {
		period_listeners = period_listeners.filter(p => p.name !== name);
	}
};