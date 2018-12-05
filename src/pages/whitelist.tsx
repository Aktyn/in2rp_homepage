import * as React from 'react';
import './../styles/whitelist.scss';

import Content from './../components/content';
import Session from './../components/discord_session';
// import Loader from './../components/loader';

enum STATE {
	UNKNOWN,
	UNAUTHORIZED,
	AUTHORIZED
};

interface WhitelistState {
	status: STATE;
	discord_nick: string;
}

export default class extends React.Component<any, WhitelistState> {
	state: WhitelistState = {
		status: STATE.UNKNOWN,
		discord_nick: 'Uknown user'
	};

	constructor(props: any) {
		super(props);
	}

	componentDidMount() {
		/*var user_token = location.href.match(/.+[\?|&]user=([a-z0-9#]+)/i);
		var match_token = location.href.match(/.+[\?|&]token=([a-z0-9#]+)/i);

		if(match_token !== null && match_token.length > 1) {//match_token[1] = token
			this.setState({
				status: STATE.AUTHORIZED, 
				discord_user: user_token !== null ? user_token[1] : this.state.discord_user
			});
		}
		else
			this.setState({status: STATE.UNAUTHORIZED});*/
		// console.log( Session.isLoggedIn(), Session.getUserNick() );
		this.setState({
			status: Session.isLoggedIn() ? STATE.AUTHORIZED : STATE.UNAUTHORIZED,
			discord_nick: Session.getUserNick() || 'Error'
		});

		Session.addLoginListener('whitelist_session_listener', (_nick, _discriminator) => {
			this.setState({
				status: Session.isLoggedIn() ? STATE.AUTHORIZED : STATE.UNAUTHORIZED,
				discord_nick: _nick
			});
		});
	}

	componentWillUnmount() {
		Session.removeLoginListener('whitelist_session_listener');
	}

	renderAuthorizeInfo() {
		return <React.Fragment>
			<label className='info_label'>
				Aby odblokować formularz whitelisty, zaloguj się za pomocą konta na discordzie.
			</label>
			<div className='fancy_button_holder'>
				<button className='fancy_button clean discord' onClick={Session.login}>
					Zaloguj
				</button>
			</div>
		</React.Fragment>;
	}

	renderQuestions() {
		return <div className='wl_container'>
			<h2>Witaj&nbsp;
				<span className='user_nick'>
					{this.state.discord_nick}
				</span>
			</h2>
			<h3>Odpowiedz na poniższe pytania przed wysłaniem podania o whiteliste.</h3>
			<div className='questions'>
				<label>Pytanie 1: blablabla</label>
				<div><input type='text' /></div>
			</div>
		</div>;
	}

	render() {
		//{this.state.status === STATE.UNKNOWN && <Loader />}
		return <Content>
			{this.state.status === STATE.UNAUTHORIZED && this.renderAuthorizeInfo()}
			{this.state.status === STATE.AUTHORIZED && this.renderQuestions()}
		</Content>;
	}
}