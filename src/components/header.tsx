import * as React from 'react';
import { Link } from 'react-router-dom';
import Config from './../config';

import './../styles/header.scss';

import Discord from './discord_session';

interface HeaderProps {
	type: string;//small, large
}

export default class Header extends React.Component<HeaderProps, any> {
	private static BG_ID = new Date().getHours() % 4;

	static defaultProps = {
		type: 'small'
	}

	constructor(props: HeaderProps) {
		super(props);
	}

	render() {
		return <React.Fragment>
			<h1 className={this.props.type + ' main_header_container'} data-bgid={Header.BG_ID}>
				<div className='header_gradient'>
					<Link to='/' style={{justifySelf: 'right'}} className='logo'></Link>
					<div style={{justifySelf: 'left'}}>{Config.short_description}</div>
				</div>
			</h1>
			<div className='header_separator'>
				<Link to='/' className='homepage_icon' />
				<div className='short_info'>{Config.short_info}</div>
				<Discord.Widget />
			</div>
		</React.Fragment>;
	}
}