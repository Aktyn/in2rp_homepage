import * as React from 'react';
// import { Link } from 'react-router-dom';
import Content from './content';

export default class extends React.Component<any, any> {
	constructor(props: any) {
		super(props);
	}

	render() {
		// <Link to='/wl'>Whiitelist</Link>
		return <React.Fragment>
			<Content>
				<section className='main_links'>
					<article>Forum</article>
					<article>Discord</article>
					<article>Whitelist</article>
				</section>
			</Content>
		</React.Fragment>;
	}
}