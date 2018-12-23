import * as React from 'react';
import { Link } from 'react-router-dom';

import Config from '../config';

import './../styles/footer.scss';

interface FooterState {
	revealed: boolean;
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

	render() {//TODO - change icon to close when showing github page
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
				{this.state.revealed ? 
					<a target='_blank' href='https://github.com/Aktyn' style={{
						color: '#71c1bb'
					}} className='fader_in'>GitHub autora strony</a> : 
					<label className='fader_in'>
						<Link to='/snake'>Copyright ©</Link> 2018 - Aktyn - All rights reserved
					</label>
				}
				<button onClick={this.switchView.bind(this)} 
					className={this.state.revealed ? 'clean close_icon' : 'clean more_icon'}></button>
			</div>
		</div>;
	}
}