import * as React from 'react';
import Utils from './../utils/utils';
import './../styles/countdown.scss';

/* n-th child order:
 0000
1	 2
1	 2
 3333
4	 5
4	 5
 6666
*/
const DIGIT_SEGMENTS = [
	[true,	true,	true,	false,	true,	true,	true],	//0
	[false,	false,	true,	false,	false,	true,	false],	//1
	[true,	false,	true,	true,	true,	false,	true],	//2
	[true,	false,	true,	true,	false,	true,	true],	//3
	[false,	true,	true,	true,	false,	true,	false],	//4
	[true,	true,	false,	true,	false,	true,	true],	//5
	[true,	true,	false,	true,	true,	true,	true],	//6
	[true,	false,	true,	false,	false,	true,	false],	//7
	[true,	true,	true,	true,	true,	true,	true],	//8
	[true,	true,	true,	true,	false,	true,	true],	//9
];

interface CountdownProps {
	end_timestamp: number;
}

interface CountdownState {
	//remaining time
	rem_t: { days: number, hours: number, minutes: number, seconds: number };
	mouseX: number;
	mouseY: number;
}

export default class extends React.Component<CountdownProps, CountdownState> {

	static defaultProps = {
		end_timestamp: 0
	}

	state: CountdownState = {
		rem_t: {days: 0, hours: 0, minutes: 0, seconds: 0},
		mouseX: 0,
		mouseY: 0
	}

	private visibleMouseX = 0;
	private visibleMouseY = 0;

	private running = false;

	private update_interval: number | null = null;

	constructor(props: CountdownProps) {
		super(props);
	}

	componentDidMount() {
		this.update();

		var tryFit = () => {
			let ms = Date.now()%1000;

			if(ms > 400 && ms < 600)
				this.update_interval = setInterval(this.update.bind(this), 1000) as any;
			else
				setTimeout(tryFit, 500-ms);
		}

		tryFit();

		window.addEventListener('mousemove', this.onMouseMoved.bind(this));

		this.running = !Utils.IS_MOBILE;

		var now = 0, dt = 0;
		const smooth_factor = 10;
		var smoothPerspective = (time: number) => {
			dt = (time - now);
			now = time;

			if(dt > 30)
				dt = 30;

			var dx = this.state.mouseX-this.visibleMouseX;
			var dy = this.state.mouseY-this.visibleMouseY;
			if(Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
				this.visibleMouseX += dx*dt / 1000.0*smooth_factor;
				this.visibleMouseY += dy*dt / 1000.0*smooth_factor;

				try {
					document.documentElement.style.setProperty("--mouseX", 
						this.visibleMouseX.toString());
					document.documentElement.style.setProperty("--mouseY", 
						this.visibleMouseY.toString());
				}
				catch(e) {}

			}

			if(this.running)
				requestAnimationFrame(smoothPerspective);
		};
		smoothPerspective(0);
	}

	componentWillUnmount() {
		if(this.update_interval)
			clearInterval(this.update_interval);

		this.running = false;
		window.removeEventListener('mousemove', this.onMouseMoved.bind(this));
	}

	onMouseMoved(e: MouseEvent) {
		this.setState({
			mouseX: (document.body.clientWidth / 2 - e.clientX) / document.body.clientWidth,
	    	mouseY: (document.body.clientHeight / 2 - e.clientY) / document.body.clientHeight
	    });
	}

	update() {
		let diff = Math.max(0, this.props.end_timestamp - Date.now());

		let d = (diff / 86400000) | 0; diff -= d*86400000;//1000*60*60*24 = 86400000
		let h = (diff / 3600000) | 0; diff -= h*3600000;//3600000 = 1000*60*60
		let m = (diff / 60000) | 0; diff -= m*60000;//60000 = 1000*60
		let s = (diff / 1000) | 0;

		this.setState({
			rem_t: { days: d, hours: h, minutes: m, seconds: s }
		});

		//console.log(Date.now()%1000);
	}

	checkSegmentShouldBeActive(i: number, digit: number) {
		if(digit < 0 || digit > 9)
			return false;
		return DIGIT_SEGMENTS[digit][i];
	}

	renderBlock(val: number) {
		return <section>
			<article>{new Array(7).fill(0).map((s,i)=>{
				return <div key={i} 
					className={this.checkSegmentShouldBeActive(i, (val/10)|0) ? '' : 'off'}></div>;
			})}</article>
			<article>{new Array(7).fill(0).map((s,i)=>{
				return <div key={i} 
					className={this.checkSegmentShouldBeActive(i, val%10) ? '' : 'off'}></div>;
			})}</article>
		</section>;
	}

	render() {
		if(!this.state.rem_t.days && !this.state.rem_t.hours && !this.state.rem_t.minutes && 
			!this.state.rem_t.seconds)
		{
			this.running = false;
			return '';
		}

		return <div className='perspectiveHandler'>
			<div className='countdown_main'>
				<div>
					{this.state.rem_t.days > 0 && <>
						{this.renderBlock(this.state.rem_t.days)}
						<div className='space_separator'></div>
						<div className='space_separator'></div>
						<div className='space_separator'></div>
					</>}
					{(this.state.rem_t.days > 0 || this.state.rem_t.hours > 0) && <>
						{this.renderBlock(this.state.rem_t.hours)}
						<div className='time_separator'></div>
					</>}
					{(this.state.rem_t.days > 0 || this.state.rem_t.hours > 0 || 
						this.state.rem_t.minutes > 0) && 
					<>
						{this.renderBlock(this.state.rem_t.minutes)}
						<div className='time_separator'></div>
					</>}
					{this.renderBlock(this.state.rem_t.seconds)}
				</div>
				<div style={{display: 'block'}}>
					{this.state.rem_t.days > 0 && <>
						<label className='block_width'>
							{this.state.rem_t.days === 1 ? 'DZIEŃ' : 'DNI'}
						</label>
						<div className='space_separator'></div>
						<div className='space_separator'></div>
						<div className='space_separator'></div>
					</>}
					{(this.state.rem_t.days > 0 || this.state.rem_t.hours > 0) && <>
						<label className='block_width'>GODZIN</label>
						<div className='space_separator'></div>
					</>}
					{(this.state.rem_t.days > 0 || this.state.rem_t.hours > 0 || 
						this.state.rem_t.minutes > 0) && 
					<>
						<label className='block_width'>MINUT</label>
						<div className='space_separator'></div>
					</>}
					<label className='block_width'>SEKUND</label>
				</div>
			</div>
		</div>;
	}
}