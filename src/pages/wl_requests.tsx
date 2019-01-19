import * as React from 'react';
import Content from './../components/content';
import Cookies from './../utils/cookies';
import Config, { QuestionsBlockSchema, QuestionType } from './../config';
import Utils from './../utils/utils';
import Loader from './../components/loader';

import './../styles/whitelist_admin.scss';

const CATEGORIES = {
	UNKNOWN: 'unknown',
	PENDING: 'pending',
	ACCEPTED: 'accepted',
	REJECTED: 'rejected'
};

interface WlRequestDataJSON {
	id: number;
	data_ur: string;
	discriminator: number;
	nick: string;
	timestamp: string;

	[index: string]: string | number;
}

interface WlRequestsState {
	current_cat: string;
	error?: string;
	loading: boolean;
	wl_requests?: WlRequestDataJSON[];
	focused?: WlRequestDataJSON;
}

export default class extends React.Component<any, WlRequestsState> {
	state: WlRequestsState = {
		current_cat: CATEGORIES.UNKNOWN,
		error: undefined,
		loading: true,
		wl_requests: undefined,
		focused: undefined
	};

	constructor(props: any) {
		super(props);
	}

	componentDidMount() {
		this.changeCategory(CATEGORIES.PENDING);
	}

	onError(err_msg: string) {
		this.setState({
			error: err_msg, 
			loading: false,
			focused: undefined,
			wl_requests: undefined
		});
	}

	changeCategory(cat: string) {
		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		if(this.state.current_cat === cat)
			return;

		this.setState({current_cat: cat, loading: true, focused: undefined, wl_requests: undefined});

		//loading requests authors
		Utils.postRequest(
			'get_whitelist_applicants', 
			{token: cookie_token, requested_status: cat}
		).then(res => res.json()).then(res => {
			//console.log(res);
			if(res['result'] !== 'SUCCESS') {
				let error_msg;
				switch(res['result']) {
					case 'INSUFICIENT_PERMISSIONS':
						error_msg = 'Nie masz uprawnień do tego kontentu.';
						break;
				}

				this.setState({error: error_msg || 'Nieznany błąd', loading: false});
			}
			else {
				// if(res.data[0])
				// res.data = new Array(10).fill(0).map(() => res.data[0]);//temp line for debugging
				this.setState({
					error: undefined, 
					loading: false, 
					wl_requests: res['data'],
					focused: undefined
				});
			}
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}

	sendStatusUpdateRequest(cat: string) {
		if(this.state.focused === undefined)
			throw new Error('No focused whitelist request in state');
		//console.log(cat);

		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		this.setState({loading: true, focused: undefined, wl_requests: undefined});

		Utils.postRequest(
			'update_whitelist_status', 
			{
				token: cookie_token, 
				requested_status: cat, 
				id: this.state.focused.id
			}
		).then(res => res.json()).then(res => {
			//console.log(res);
			
			if(res['result'] !== 'SUCCESS') {
				let error_msg;
				switch(res['result']) {
					case 'INSUFICIENT_PERMISSIONS':
						error_msg = 'Nie masz uprawnień do tego kontentu.';
						break;
					case 'DATABASE_ERROR':
						error_msg = 'Błąd bazy danych';
						break;
				}

				this.setState({error: error_msg || 'Nieznany błąd', loading: false});
			}
			else {
				this.changeCategory(cat);
			}
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}

	focusOn(index: number) {
		if(this.state.wl_requests === undefined)
			throw new Error('No wl_requests data in state');

		this.setState({focused: this.state.wl_requests[index]});
	}

	closeFocused() {
		this.setState({focused: undefined});
	}

	renderDataHeader(data: WlRequestDataJSON, closer?: JSX.Element, h1_border_color?: string) {
		var creation_date = new Date(parseInt(data['timestamp'])).toLocaleString()
			.replace(/(:[0-9]{2}$)|,/gi, '');//TODO - fixed zeros
		var age = (() => {
			try {
				var dt_destructed = (data['ooc_data_ur'] as string).split('-');
				var dtur = new Date();
				dtur.setFullYear( parseInt(dt_destructed[0]) );
				dtur.setMonth( parseInt(dt_destructed[1]) );
				dtur.setDate( parseInt(dt_destructed[2]) );

				var ageDifMs = Date.now() - dtur.getTime();
			    var ageDate = new Date(ageDifMs); // miliseconds from epoch
			    return Math.abs(ageDate.getUTCFullYear() - 1970);
			}
			catch(e) {
				return 0;
			}
		})();
		

		return <h1 style={{borderColor: h1_border_color}}>
			<span className='creation_date'>{creation_date}</span>
			<span className='nick'>{data['nick'] + '#' + data['discriminator']}</span>
			<span className='age'>
				{isNaN(age) ? 'Błędny wiek' : `${age} lat${(age > 21 && (age%10 > 1))?'a':''}` }
			</span>
			{closer}
		</h1>;
	}

	renderWlRequests() {
		if(this.state.wl_requests === undefined)
			throw new Error('No wl_requests data in state');
			
		return <div className='user_wl_entries_container'>
			{this.state.wl_requests.map((data, i) => {
				return <div key={i}>
					{this.renderDataHeader(data)}
					<button className='show_btn clean' onClick={() => this.focusOn(i)}>Pokaż</button>
				</div>;
			})}
		</div>;
	}

	private renderBlockOfAnswers(block: QuestionsBlockSchema, prefix: string) {
		return Object.keys(block).map((key, id) => {
			var answer_content = this.state.focused ? String(this.state.focused[prefix+key]) : '';
			try {
				answer_content = decodeURIComponent(answer_content);
			}
			catch(e) {
				console.log('Cannot decode uri. Trying to fix that');
				try {
					answer_content = answer_content.replace(/%.{0,2}$/i, '');
					answer_content = decodeURIComponent(answer_content);
				}
				catch(e) {
					console.log('First fix failed. Trying another one.');
					try {
						answer_content = answer_content.replace(/%.{0,2}$/i, '');
						answer_content = decodeURIComponent(answer_content);
					}
					catch(e) {
						answer_content = 'Niepoprawne dane';
						console.log(e);
					}
				}
				
			}

			return <p key={id}>
				<label>{block[key].content}</label>
				<span style={{
					textAlign: block[key].type === QuestionType.TEXTAREA ? 'justify' : 'center'
				}}>{answer_content}</span>
			</p>;
		});
	}

	renderFocused() {
		if(this.state.focused === undefined)
			throw new Error('No focused whitelist request in state');

		//console.log(this.state.focused);

		//const q_data = Config.WHITELIST_QUESTIONS.OOC;//TODO - separate for both blocks
		//console.log(this.state.focused);

		return <div className='user_wl_focused'>
			{this.renderDataHeader(
				this.state.focused, 
				<button className='closer clean shake_icon' 
					onClick={this.closeFocused.bind(this)}></button>,
				this.state.current_cat === CATEGORIES.PENDING ? '#42A5F5' : 
					(this.state.current_cat === CATEGORIES.ACCEPTED ? '#8BC34A' : '#ef5350')
			)}
			<div className='QandA'>
				<h4>INFORMACJE OOC</h4>
				{this.renderBlockOfAnswers(Config.WHITELIST_QUESTIONS.OOC, 'ooc_')}
				<h4>INFORMACJE IC</h4>
				{this.renderBlockOfAnswers(Config.WHITELIST_QUESTIONS.IC, 'ic_')}
			</div>
			<div className='control_buttons'>
				{this.state.current_cat !== CATEGORIES.ACCEPTED && 
					<button className='clean accept' 
						onClick={() => this.sendStatusUpdateRequest(CATEGORIES.ACCEPTED)}>
						AKCEPTUJ
					</button>}
				{this.state.current_cat !== CATEGORIES.REJECTED && 
					<button className='clean reject'
						onClick={() => this.sendStatusUpdateRequest(CATEGORIES.REJECTED)}>
						ODRZUĆ
					</button>}
			</div>
		</div>;
	}

	render() {
		return <Content>
			<section className='whitelist_admin_main container' style={{paddingTop: '0px'}}>
				<div className='control_panel'>
					<button className={
						`clean ${this.state.current_cat === CATEGORIES.PENDING ? 'active' : ''}`} 
						onClick={() => this.changeCategory(CATEGORIES.PENDING)}>Oczekujące</button>
					<button className={
						`clean ${this.state.current_cat === CATEGORIES.ACCEPTED ? 'active' : ''}`} 
						onClick={() => this.changeCategory(CATEGORIES.ACCEPTED)}>Zaakceptowane</button>
					<button className={
						`clean ${this.state.current_cat === CATEGORIES.REJECTED ? 'active' : ''}`} 
						onClick={() => this.changeCategory(CATEGORIES.REJECTED)}>Odrzucone</button>
				</div>
				<article>
					{this.state.error && <span className='error'>{this.state.error}</span>}
					{this.state.loading && <Loader color='#f44336' />}
					{this.state.wl_requests && (
						this.state.focused ? this.renderFocused() : this.renderWlRequests()
					)}
				</article>
			</section>
		</Content>;
	}
}