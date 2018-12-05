import * as React from 'react';
import './../styles/discord_widget.scss';

import Config from './../config';
import Cookies from './../utils/cookies';

interface WidgetState {
	session: boolean;
	nick?: string;
	discriminator?: number;
}

class WidgetClass extends React.Component<any, WidgetState> {
	state: WidgetState = {
		session: false,
		nick: undefined,
		discriminator: undefined
	};

	constructor(props: any) {
		super(props);
	}

	componentDidMount() {
		Session.addLoginListener('header_widget', (_nick, _discriminator) => {
			this.setState({
				session: true,
				nick: _nick,
				discriminator: _discriminator
			});
		});
	}

	componentWillUnmount() {
		Session.removeLoginListener('header_widget');
	}

	renderLoginButton() {
		return <button className='clean dw_login_btn' onClick={Session.login}>
			Zaloguj się przez discord
		</button>;
	}

	renderSessionInfo() {
		return <div className='discord_session_widget'>
			{this.state.nick}#{this.state.discriminator}
			<button onClick={Session.logout} className='clean discord_logout'>Wyloguj</button>
		</div>;
	}

	render() {
		return <div className='discord_widget_main'>
			{this.state.session ? this.renderSessionInfo() : this.renderLoginButton()}
		</div>;
	}
}

var token: string | null = null;
var discord_user: {nick: string, discriminator: number} | null = null;

interface LoginListener {
	name?: string;
	callback: (nick: string, discriminator: number) => void;
}

var login_listeners: LoginListener[] = [];

function invokeLoginListeners(nick: string, discriminator: number) {
	login_listeners.forEach(listener => listener.callback(nick, discriminator));
}


interface SessionTemplate {
	Widget: typeof WidgetClass;
	login(): void;
	logout(): void;

	isLoggedIn(): boolean;

	getUserNick(): string | undefined;
	getUserDiscriminator(): number | undefined;

	addLoginListener(_name: string, _callback: (nick: string, discriminator: number) => void): void;
	removeLoginListener(_name: string): boolean;

	onLoginResponse(token: string, discord_user: string): void;
	restoreSession(): Promise<boolean>;
}

const Session = {
	Widget: WidgetClass,
	login: function() {
		if(localStorage)
			localStorage.setItem('current_path', location.pathname);
		location.href =  Config.api_server_url + '/discord_login';
	},

	logout: function() {
		Cookies.removeCookie('discord_token');
		location.reload();
	},

	isLoggedIn: function() {
		return token !== null && discord_user !== null;
	},

	getUserNick: function() {
		if(!discord_user)
			return undefined;
		return discord_user.nick;
	},
	getUserDiscriminator: function() {
		if(!discord_user)
			return undefined;
		return discord_user.discriminator;
	},

	addLoginListener: function(_name, _callback) {
		login_listeners.push( {name: _name, callback: _callback} );
	},

	removeLoginListener: function(_name) {
		for(var i=0; i<login_listeners.length; i++) {
			if(login_listeners[i].name === _name) {
				login_listeners.splice(i, 1);
				return true;
			}
		}
		return false;
	},

	onLoginResponse: function(_token, _discord_user) {
		token = _token;
		if(_discord_user.indexOf('#') !== -1) {
			discord_user = {
				nick: _discord_user.split('#')[0],
				discriminator: parseInt( _discord_user.split('#')[1] )
			};
			invokeLoginListeners(discord_user.nick, discord_user.discriminator);
		}

		Cookies.setCookie('discord_token', _token, 1000*60*60*24*7);
	},

	restoreSession: function() {
		return new Promise((resolve, reject) => {
			if(token)
				resolve(true);

			interface SessionResponseJSON {
				result: string;
				nick: string;
				discriminator: string | number;
			}

			var cookie_token = Cookies.getCookie('discord_token');
			if(cookie_token === null)
				resolve(false);
			else {//trying to restore session using token from cookies
				fetch(Config.api_server_url + '/discord_restore_session', {
					method: "POST",
        			mode: process.env.NODE_ENV === 'development' ? 'cors' : 'same-origin',
        			headers: {
			           "Content-Type": "application/json; charset=utf-8",
			        },
        			body: JSON.stringify({token: cookie_token})
				}).then(resp => resp.json()).then((res: SessionResponseJSON) => {
					//console.log(res);

					if(res.result !== 'SUCCESS') {
						Cookies.removeCookie('discord_token');
						resolve(false);
					}
					else {
						discord_user = {
							nick: res.nick,
							discriminator: parseInt(res.discriminator as (string))
						};
						token = cookie_token;

						invokeLoginListeners(discord_user.nick, discord_user.discriminator);
						resolve(true);
					}

				}).catch(e => {
					Cookies.removeCookie('discord_token');
					reject(e);
				});
			}
		});
	}
} as SessionTemplate;

export default Session;