import * as React from 'react';
import { Redirect } from 'react-router';
import { Link } from 'react-router-dom';

import Content from './../components/content';
import DiscordSession from './../components/discord_session';

import './../styles/discord_login.scss';

enum STATUS {
	UNKNOWN,
	SUCCESS,
	ERROR
}

interface LoginState {
	status: STATUS,
	nick?: string,
	time_to_redirect: number;
	redirect_timeout: boolean
}

export default class extends React.Component<any, LoginState> {
	state: LoginState = {
		status: STATUS.UNKNOWN,
		nick: undefined,
		time_to_redirect: 5,
		redirect_timeout: false
	};

	private one_sec_tm: NodeJS.Timeout | number | null = null;

	constructor(props: any) {
		super(props);

		// this.one_sec_tm = null;
	}

	componentDidMount() {
		var success_match = location.href.match(/.+[\?|&]success=([a-z0-9#]+)/i);
		var user_match = location.href.match(/.+[\?|&]user=([a-z0-9#]+)/i);
		var admin_match = location.href.match(/.+[\?|&]admin=([a-z0-9#]+)/i);
		var match_token = location.href.match(/.+[\?|&]token=([a-z0-9#]+)/i);
		var success = false;
		if(success_match && success_match.length > 1 && success_match[1] === 'true') {
			if(match_token && match_token.length > 1) {
				success = true;
				let user = user_match && user_match.length > 1 ? user_match[1] : '';
				let admin = admin_match && admin_match.length > 1 && admin_match[1] === 'true';
				DiscordSession.onLoginResponse(match_token[1], user, !!admin);
			}
		}

		this.setState({
			status: success ? STATUS.SUCCESS : STATUS.ERROR,
			nick: user_match && user_match.length > 1 ? user_match[1].replace(/#.*/i, '') : undefined
		});
	}

	componentWillUnmount() {
		if(this.one_sec_tm !== null)
			clearTimeout(this.one_sec_tm as number);
	}

	returnButton() {
		var return_btn = <Link to={localStorage['current_path']} 
			className='simple_button no_anim return'>Powrót</Link>;

		if(this.state.time_to_redirect > 1) {
			this.one_sec_tm = setTimeout(() => 
				this.setState({time_to_redirect: this.state.time_to_redirect-1}), 1000);
		}
		else
			this.one_sec_tm = setTimeout(() => this.setState({redirect_timeout: true}), 1000);

		if(localStorage) {
			return <React.Fragment>
				<div>{return_btn}</div>
				<div style={{marginTop: '20px'}}>
					Powrót w przeciągu {this.state.time_to_redirect} sekund
				</div>
			</React.Fragment>;
		}
		else
			return undefined;
	}

	renderLoginSuccess() {
		return <div className='login_success'>
			<div style={{color: '#4CAF50'}}>Logowanie pomyślne</div>
			<div>Witaj <b>{this.state.nick}</b></div>
		</div>;
	}

	render() {
		return <Content>
			{this.state.status === STATUS.SUCCESS && <React.Fragment>
					{this.renderLoginSuccess()}
					{this.returnButton()}
				</React.Fragment>
			}
			{this.state.status === STATUS.ERROR && <React.Fragment>
					<div className='login_failed'>Logowanie nieudane</div>
					{this.returnButton()}
				</React.Fragment>
			}
			{this.state.redirect_timeout && <Redirect to={localStorage['current_path']} />}
		</Content>;
	}
}