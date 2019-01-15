import * as React from 'react';
import { Link } from 'react-router-dom';
import Config from './../config';

import './../styles/header.scss';
//@ts-ignore
// import GTA_Font from './../styles/pricedown.ttf';

import Discord from './discord_session';

interface HeaderProps {
	type: string;//small, large
}

export default class Header extends React.Component<HeaderProps, any> {
	private static BG_ID = process.env.NODE_ENV === 'development' ? 
		(Math.random()*3)|0 : 
		(new Date().getHours() % 3);

	static defaultProps = {
		type: 'small'
	}

	constructor(props: HeaderProps) {
		super(props);
		
		fetch(Config.api_server_url + '/get_online_players', {
			method: "POST",
			mode: process.env.NODE_ENV === 'development' ? 'cors' : 'same-origin',
			headers: {
	           "Content-Type": "application/json; charset=utf-8",
	        }
		}).then(res => res.json()).then(res => {
			console.log(res);
		}).catch(console.error);
	}

	render() {
		return <React.Fragment>
			<h1 className={this.props.type + ' main_header_container'} data-bgid={Header.BG_ID}>
				<div className='header_gradient'>
					<Link to='/' style={{justifySelf: 'right'}} className='logo'></Link>
					<div style={{
						justifySelf: 'left', 
						// fontFamily: GTA_Font,
						fontWeight: 'bold',
						// color: '#F7FFAD',
						textShadow: `0px 1px 4px #0004`,
					}}>{Config.short_description}</div>
				</div>
			</h1>
			<div className='header_separator'>
				<Link to='/' className='homepage_icon' />
				<div className='players'>Graczy online: 6/32</div>
				<div className='short_info'>{Config.short_info}</div>
				<Discord.Widget />
			</div>
		</React.Fragment>;
	}
}