import * as React from 'react';
import { Link } from 'react-router-dom';
import Content from './../components/content';
import Config from './../config';
// import Countdown from './../components/countdown';
import './../styles/homepage.scss';

export default class extends React.Component<any, any> {
	constructor(props: any) {
		super(props);
	}

	/*
	<section>
		<iframe width={640} height={360} src='https://www.youtube.com/embed/YbehCmRtLvc?modestbranding=1&rel=0&controls=1&showinfo=0&fs=1'
			allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
			frameBorder={0} allowFullScreen={true} scrolling='no'></iframe>
	</section>
	*/

	render() {//<Countdown end_timestamp={new Date(2019, 2-1, 15, 18, 0, 0).getTime()} />
		return <React.Fragment>
			<Content>
				
				<section className='main_links'>
					<a href='/forum' className='fancy_button forum'>Forum</a>
					<a target="_blank" href={Config.discord_invitation_link} rel="noreferrer"
						className='fancy_button discord'>Discord</a>
					<Link to='/wl' className='fancy_button whitelist'>Whitelista</Link>
					<Link to='/rules' className='fancy_button rules'>Regulamin</Link>
				</section>
			</Content>
		</React.Fragment>;
	}
}