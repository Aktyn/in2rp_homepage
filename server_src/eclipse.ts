import Utils from './utils';

var current_timeout: NodeJS.Timeout | null = null;

const periods = [30, 15, 10, 5, 2, 1];

function nextPeriod(time: number) {
	let i = 0;
	for(; i<periods.length && periods[i] >= (time|0); i++);
	return i < periods.length ? periods[i] : 0;
}

function step(time: number, skip = false) {
	time = time|0;

	if(time === 0) {
		current_timeout = null;
		//TODO - kick every player
		Utils.executeCommand(Utils.SERVER_CMDS['restart']);
		return;
	}

	if(!skip)
		Utils.executeRconCommand('reboot ' + time);
	
	let next_period = nextPeriod(time);

	current_timeout = setTimeout(() => {
		step(next_period);
	}, 1000*60*(time-next_period));
}

export default {
	start: (time: number, skip_first = false) => {//time in seconds
		if(current_timeout !== null) {
			console.log('Canceling current timeout');
			clearTimeout(current_timeout);
		}

		step(time, skip_first);
	},
	getNextPeriod: nextPeriod
};