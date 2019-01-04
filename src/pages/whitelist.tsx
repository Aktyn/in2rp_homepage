import * as React from 'react';
import './../styles/whitelist.scss';

import Loader from './../components/loader';
import Content from './../components/content';
import Session from './../components/discord_session';
// import Loader from './../components/loader';
import Config, { QuestionType } from './../config';
import Cookies from './../utils/cookies';

enum STATE {
	UNKNOWN,
	UNAUTHORIZED,
	AUTHORIZED
};

enum WL_STATUS {
	UNKNOWN,
	NOTHING,//user does not send request for whitelist
	PENDING,
	ACCEPTED,
	REJECTED
}

interface QuestionsBlockSchema {
	[index: string]: {type: QuestionType, content: string}
}

interface WhitelistState {
	status: STATE;
	wl_status: WL_STATUS;
	discord_nick: string;
	send_confirm: number;
	error?: string;
}

export default class WhitelistClass extends React.Component<any, WhitelistState> {
	private static cached_wl_status: WL_STATUS = WL_STATUS.UNKNOWN;

	state: WhitelistState = {
		status: STATE.UNKNOWN,
		wl_status: WhitelistClass.cached_wl_status,
		discord_nick: 'Uknown user',
		send_confirm: 0,
		error: undefined
	};

	private confirm_timeout: NodeJS.Timeout | number | null = null;

	constructor(props: any) {
		super(props);
	}

	componentDidMount() {
		this.setState({
			status: Session.isLoggedIn() ? STATE.AUTHORIZED : STATE.UNAUTHORIZED,
			discord_nick: Session.getUserNick() || 'Error'
		});

		Session.addLoginListener('whitelist_session_listener', (user) => {
			this.setState({
				status: Session.isLoggedIn() ? STATE.AUTHORIZED : STATE.UNAUTHORIZED,
				discord_nick: user.nick
			});
		});
	}

	componentWillUnmount() {
		Session.removeLoginListener('whitelist_session_listener');
		if(this.confirm_timeout !== null)
			clearTimeout(this.confirm_timeout as number);
	}

	private mapAnswersBlock(block: QuestionsBlockSchema, prefix: string) {
		let answers_block: {[index: string]: string} = {};
		Object.keys(block).map(key => {
			var input_el = document.getElementsByName(key)[0];
			var answer = (input_el instanceof HTMLInputElement || 
				input_el instanceof HTMLTextAreaElement) && input_el.value;
			if(typeof answer === 'string')
				answers_block[prefix + key] = answer;
		});
		return answers_block;
	}

	sendRequest() {
		if(this.state.send_confirm === 0) {
			this.setState({send_confirm: 1});
			this.confirm_timeout = setTimeout(() => {
				this.setState({send_confirm: 0})
			}, 5000);
			return;
		}

		var _answers = {
			...this.mapAnswersBlock(Config.WHITELIST_QUESTIONS.OOC, 'ooc_'),
			...this.mapAnswersBlock(Config.WHITELIST_QUESTIONS.IC, 'ic_')
		} as {[index: string]: string};
		// console.log(_answers);

		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null) {
			this.setState({error: 'Nie można wysłać formularza.', send_confirm: 0});
			throw new Error('No discord_token cookie found');
		}

		fetch(Config.api_server_url + '/whitelist_request', {
			method: "POST",
			mode: process.env.NODE_ENV === 'development' ? 'cors' : 'same-origin',
			headers: {
	           "Content-Type": "application/json; charset=utf-8",
	        },
			body: JSON.stringify({answers: _answers, token: cookie_token})
		}).then(res => res.json()).then(response => {
			//console.log(response);
			if(response['result'] !== 'SUCCESS') {
				var error_msg;
				switch(response['result']) {
					case 'REQUEST_ALREADY_IN_DATABASE':
						error_msg = 'W bazie danych znajduje się już podanie wysłane z twojego konta';
						break;
					case 'DATABASE_ERROR':
						error_msg = 'Błąd bazy danych. Spróbuj ponownie później.';
						break;
					default:
						error_msg = 'Autoryzacja nieudana. Upewnij się, że jesteś zalogowany przez discord.';
						break;
				}
				this.setState({error: error_msg, send_confirm: 0});
			}
			else {
				WhitelistClass.cached_wl_status = WL_STATUS.PENDING;
				this.setState({wl_status: WL_STATUS.PENDING, send_confirm: 0, error: undefined})
			}
		}).catch(e => console.error(e));
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

	checkWhitelistStatus(): void {
		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null) {
			this.setState({status: STATE.UNAUTHORIZED});
			throw new Error('No discord_token cookie found');
		}

		fetch(Config.api_server_url + '/whitelist_status_request', {
			method: "POST",
			mode: process.env.NODE_ENV === 'development' ? 'cors' : 'same-origin',
			headers: {
	           "Content-Type": "application/json; charset=utf-8",
	        },
			body: JSON.stringify({token: cookie_token})
		}).then(res => res.json()).then(res => {
			// console.log(res);
			if(res['result'] !== 'SUCCESS')
				this.setState({status: STATE.UNAUTHORIZED});
			else {
				switch(res['status']) {
					case 'nothing':
						WhitelistClass.cached_wl_status = WL_STATUS.NOTHING;
						break;
					case null:
					case 'pending':
						WhitelistClass.cached_wl_status = WL_STATUS.PENDING;
						break;
					case 'accepted':
						WhitelistClass.cached_wl_status = WL_STATUS.ACCEPTED;
						break;
					case 'rejected':
						WhitelistClass.cached_wl_status = WL_STATUS.REJECTED;
						break;
				}

				this.setState({wl_status: WhitelistClass.cached_wl_status})
			}
		}).catch(e => console.error(e));
	}

	private questionsBlock(block: QuestionsBlockSchema) {
		return Object.keys(block).map((key, id) => {
			var data = block[key];

			var answer_input;
			switch(data.type) {
				case QuestionType.DATE:
					answer_input = <input type='date' maxLength={512} name={key} />;
					break;
				case QuestionType.INPUT:
					answer_input = <input type='text' maxLength={512} name={key} />;
					break;
				case QuestionType.NUMBER_INPUT:
					answer_input = <input type='number' maxLength={512} name={key} />;
					break;
				case QuestionType.TEXTAREA:
					answer_input = <textarea name={key} maxLength={512} />;
					break;
			}

			return <p key={id}>
				<label>{data.content}</label>
				{answer_input}
			</p>;
		});
	}

	renderQuestions() {
		if(this.state.wl_status === WL_STATUS.UNKNOWN) {
			this.checkWhitelistStatus();
			return <Loader />;
		}

		var content;

		if(this.state.wl_status === WL_STATUS.PENDING) {
			content = <div>Twoje podanie oczekuje na rozpatrzenie.<br/>Zostaniesz poinformowany o decyzji zarządu poprzez prywatną wiadomość na discordzie.</div>;
		}
		else if(this.state.wl_status === WL_STATUS.ACCEPTED) {
			content = <React.Fragment>
				<div>Twoje podanie zostało zaakceptowane.</div>
				<div className='accepted_icon'>&#x2714;</div>
			</React.Fragment>;
		}
		else if(this.state.wl_status === WL_STATUS.REJECTED) {
			content = <React.Fragment>
				<div>Twoje podanie zostało odrzucone.</div>
				<div className='rejected_icon'>&#x2717;</div>
			</React.Fragment>;
		}
		else {
			content = <React.Fragment>
				<h3>Odpowiedz na poniższe pytania przed wysłaniem podania o whiteliste.</h3>
				<div className='questions'>
					<br />
					<h4>INFORMACJE OOC</h4>
					{this.questionsBlock(Config.WHITELIST_QUESTIONS.OOC)}
					<br />
					<h4>INFORMACJE IC</h4>
					{this.questionsBlock(Config.WHITELIST_QUESTIONS.IC)}
				</div>
				<hr />
				<div style={{color: '#f55', fontWeight: 'bold'}}>{this.state.error}</div>
				{this.state.send_confirm === 1 && 
					<div style={{
						padding: '10px 0px',
						fontWeight: 'bold'
					}}>Na pewno? Nie bedziesz mógł cofnąć tej decyzji.</div>}
				<button onClick={this.sendRequest.bind(this)} 
					className='simple_button no_anim check clean' 
					style={{boxShadow: '0px 2px 6px #000a'}}>
					{this.state.send_confirm === 0 ? 'Wyślij' : 'Potwierdź'}
				</button>
			</React.Fragment>;
		}

		return <div className='wl_container container'>
			<h2>Witaj&nbsp;
				<span className='user_nick'>
					{this.state.discord_nick}
				</span>
			</h2>
			{content}
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