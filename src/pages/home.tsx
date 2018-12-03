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
					<Link to='/forum' className='forum'>Forum</Link>
					<a target="_blank" href="https://discord.gg/Ge2ZGq"
						className='discord'>Discord</a>
					<Link to='/wl' className='whitelist'>Whitelist</Link>
				</section>
			</Content>
		</React.Fragment>;
	}
}