import * as React from 'react';
// import { Link } from 'react-router-dom';
import './../styles/discord_widget.scss';

import Config from './../config';
import Cookies from './../utils/cookies';

import AdminMenu from './admin_menu';

var token: string | null = null;
export interface DiscordUserSchema {
	nick: string;
	discriminator: number;
	admin: boolean;
}
var discord_user: DiscordUserSchema | null = null;

interface WidgetState {
	session: boolean;
	//nick?: string;
	//discriminator?: number;
	user?: DiscordUserSchema;
}

class WidgetClass extends React.Component<any, WidgetState> {
	state: WidgetState = {
		session: discord_user ? true : false,
		user: discord_user ? discord_user : undefined,
	};

	constructor(props: any) {
		super(props);
	}

	componentDidMount() {
		Session.addLoginListener('header_widget', (_user) => {
			this.setState({
				session: true,
				user: _user
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
		// var is_admin = this.state.user && this.state.user.admin;
		if(this.state.user === undefined)
			throw new Error('Session is true but user undefined');

		return <div className='discord_session_widget'>
			{this.state.user.nick}#{this.state.user.discriminator}
			<button aria-label="Wyloguj"
				onClick={Session.logout} className='clean discord_logout'>Wyloguj</button>
			{this.state.user.admin && <AdminMenu />}
		</div>;
	}

	render() {
		return <div className='discord_widget_main'>
			{this.state.session ? this.renderSessionInfo() : this.renderLoginButton()}
		</div>;
	}
}

interface LoginListener {
	name?: string;
	callback: (user: DiscordUserSchema) => void;
}

var login_listeners: LoginListener[] = [];

function invokeLoginListeners(user: DiscordUserSchema) {
	login_listeners.forEach(listener => listener.callback(user));
}

function recordVisit() {
	fetch(Config.api_server_url + '/record_visit', {
		method: "POST",
		mode: process.env.NODE_ENV === 'development' ? 'cors' : 'same-origin',
		headers: {
           "Content-Type": "application/json; charset=utf-8",
        }
	}).catch();//ignore any errors here
}

interface SessionTemplate {
	Widget: typeof WidgetClass;
	login(): void;
	logout(): void;

	isLoggedIn(): boolean;

	getUserNick(): string | undefined;
	getUserDiscriminator(): number | undefined;
	isUserAdmin(): boolean;

	addLoginListener(_name: string, _callback: (user: DiscordUserSchema) => void): void;
	removeLoginListener(_name: string): boolean;

	onLoginResponse(token: string, discord_user: string, admin: boolean): void;
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
	isUserAdmin: function() {
		if(!discord_user)
			return false;
		return discord_user.admin;
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

	onLoginResponse: function(_token, _discord_user, _admin) {
		token = _token;
		if(_discord_user.indexOf('#') !== -1) {
			discord_user = {
				nick: _discord_user.split('#')[0],
				discriminator: parseInt( _discord_user.split('#')[1] ),
				admin: _admin
			} as DiscordUserSchema;
			invokeLoginListeners(discord_user);
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
				is_admin: boolean;
			}

			var cookie_token = Cookies.getCookie('discord_token');
			if(cookie_token === null) {
				recordVisit();
				resolve(false);
			}
			else {//trying to restore session using token from cookies
				fetch(Config.api_server_url + '/discord_restore_session', {
					method: "POST",
        			mode: process.env.NODE_ENV === 'development' ? 'cors' : 'same-origin',
        			headers: {
			           "Content-Type": "application/json; charset=utf-8",
			        },
        			body: JSON.stringify({token: cookie_token})
				}).then(resp => resp.json()).then((res: SessionResponseJSON) => {
					// console.log(res);

					if(res.result !== 'SUCCESS') {
						//Cookies.removeCookie('discord_token'); //changed 06.01.2019
						resolve(false);
					}
					else {
						discord_user = {
							nick: res.nick,
							discriminator: parseInt(res.discriminator as (string)),
							admin: res.is_admin
						} as DiscordUserSchema;
						token = cookie_token;

						invokeLoginListeners(discord_user);
						resolve(true);
					}

				}).catch(e => {
					//Cookies.removeCookie('discord_token');
					reject(e);
				});
			}
		});
	}
} as SessionTemplate;

export default Session;