import * as React from 'react';

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
			<section style={{width: '100%'}}>
				<article className='long_desc'>{Config.long_description}</article>
			</section>
			<div className='footer_bottom'>
				{this.state.revealed ? 
					<a target='_blank' href='https://github.com/Aktyn' style={{
						color: '#71c1bb'
					}} className='fader_in'>GitHub autora strony</a> : 
					<label className='fader_in'>© 2018 Aktyn | All rights reserved</label>}
				<button onClick={this.switchView.bind(this)} 
					className={this.state.revealed ? 'clean close_icon' : 'clean more_icon'}></button>
			</div>
		</div>;
	}
}