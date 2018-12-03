import * as React from 'react';
import { Link } from 'react-router-dom';
import Content from './content';

export default class extends React.Component<any, any> {
	constructor(props: any) {
		super(props);
	}

	render() {
		return <React.Fragment>
			<Content>
				<section className='main_links'>
					<a href='/forum' className='forum'>Forum</a>
					<a target="_blank" href="https://discord.gg/n2ERxEn"
						className='discord'>Discord</a>
					<Link to='/wl' className='whitelist'>Whitelist</Link>
					<Link to='/rules' className='rules'>Regulamin</Link>
				</section>
			</Content>
		</React.Fragment>;
	}
}