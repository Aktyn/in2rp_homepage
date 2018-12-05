import * as React from 'react';
import { Link } from 'react-router-dom';
import Config from './../config';

import './../styles/header.scss';

import Discord from './discord_session';

interface HeaderProps {
	type: string;//small, large
}

export default class extends React.Component<HeaderProps, any> {
	static defaultProps = {
		type: 'small'
	}

	constructor(props: HeaderProps) {
		super(props);
	}

	render() {
		return <React.Fragment>
			<h1 className={this.props.type + ' main_header_container'}>
				<div className='header_gradient'>
					<Link to='/' style={{justifySelf: 'right'}} className='logo'></Link>
					<div style={{justifySelf: 'left'}}>{Config.short_description}</div>
				</div>
			</h1>
			<div className='header_separator'><Discord.Widget /></div>
		</React.Fragment>;
	}
}