import * as React from 'react';
import { Link } from 'react-router-dom';
import Content from './content';
import './../styles/homepage.scss';

export default class extends React.Component<any, any> {
	constructor(props: any) {
		super(props);
	}

	render() {
		return <React.Fragment>
			<Content>
				<section className='main_links'>
					<a href='/forum' className='fancy_button forum'>Forum</a>
					<a target="_blank" href="https://discord.gg/n2ERxEn"
						className='fancy_button discord'>Discord</a>
					<Link to='/wl' className='fancy_button whitelist'>Whitelist</Link>
					<Link to='/rules' className='fancy_button rules'>Regulamin</Link>
				</section>
			</Content>
		</React.Fragment>;
	}
}