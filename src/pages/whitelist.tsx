import * as React from 'react';
import './../styles/whitelist.scss';

import Content from './content';
// import Loader from './../components/loader';

import Config from './../config';

enum STATE {
	UNKNOWN,
	UNAUTHORIZED,
	AUTHORIZED
};

interface WhitelistState {
	status: STATE;
	discord_user: string;
}

export default class extends React.Component<any, WhitelistState> {
	state: WhitelistState = {
		status: STATE.UNKNOWN,
		discord_user: 'Uknown user'
	};

	constructor(props: any) {
		super(props);
	}

	componentDidMount() {
		var user_token = location.href.match(/.+[\?|&]user=([a-z0-9#]+)/i);
		var match_token = location.href.match(/.+[\?|&]token=([a-z0-9#]+)/i);

		if(match_token !== null && match_token.length > 1) {//match_token[1] = token
			this.setState({
				status: STATE.AUTHORIZED, 
				discord_user: user_token !== null ? user_token[1] : this.state.discord_user
			});
		}
		else
			this.setState({status: STATE.UNAUTHORIZED});
	}

	authorize() {
		location.href =  Config.api_server_url + '/discord_login';
	}

	renderAuthorizeInfo() {
		return <React.Fragment>
			<label className='info_label'>
				Aby odblokować formularz whitelisty, połącz się ze swoim kontem na discordzie.
			</label>
			<div className='fancy_button_holder'>
				<button className='fancy_button clean discord' onClick={this.authorize.bind(this)}>
					Połącz
				</button>
			</div>
		</React.Fragment>;
	}

	renderQuestions() {
		return <div className='wl_container'>
			<h2>Witaj&nbsp;
				<span className='user_nick'>
					{this.state.discord_user.replace(/#[0-9]+/i, '')}
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