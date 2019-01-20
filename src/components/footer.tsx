import * as React from 'react';
import { Link } from 'react-router-dom';

import Config from '../config';

import './../styles/footer.scss';

var aktyn_logo = require('../img/aktyn_logo.png');

declare var _GLOBALS_: {//compile-time variable passed from webpack config
	update_time: number;
};

interface FooterState {
	revealed: boolean;
}

function padZ(n: number) {//pad zero at the beginning
	return ('0'+n).slice(-2);
}

export default class extends React.Component<any, FooterState> {

	state: FooterState = {
		revealed: false
	};

	constructor(props: any) {
		super(props);
	}

	switchView() {
		this.setState({revealed: !this.state.revealed});
	}

	render() {//new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
		let dt = new Date(_GLOBALS_.update_time);

		let update_time = `${padZ(dt.getDate())}-${padZ(dt.getMonth()+1)}-${padZ(dt.getFullYear())} ` +
			`${padZ(dt.getHours())}:${padZ(dt.getMinutes())}`;

		return <div className='footer'>
			<div className='waves_container'>
				<div></div>
				<div></div>
				<div></div>
			</div>
			<section style={{width: '100%'}}>
				<div className='footer_bg_clipped'>
					<article>{Config.long_description}</article>
					<article>{Config.contacs}</article>
				</div>
			</section>
			<div className='footer_bottom'>
				<div>
					<span>Ostatnia aktualizacja: {update_time}</span>
					<span style={{marginLeft:'10px', color:'#e57373'}} id='server_status_info'></span>
				</div>
				<div>
					{this.state.revealed ? 
						<a target='_blank' href='https://github.com/Aktyn' style={{
							color: '#71c1bb'
						}} className='fader_in'>GitHub autora strony</a> : 
						<label className='fader_in'>
							<Link to='/snake'>Copyright ©</Link> 2018 - Aktyn 
							<img src={aktyn_logo} /> - All rights reserved
						</label>
					}
					<button aria-label="link do githuba autora"
						className={this.state.revealed ? 'clean close_icon' : 'clean more_icon'}
						onClick={this.switchView.bind(this)}></button>
				</div>
			</div>
		</div>;
	}
}