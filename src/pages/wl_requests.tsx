import * as React from 'react';
import Content from './../components/content';
import Cookies from './../utils/cookies';
import Config from './../config';
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
		fetch(Config.api_server_url + '/get_whitelist_applicants', {
			method: "POST",
			mode: process.env.NODE_ENV === 'development' ? 'cors' : 'same-origin',
			headers: {"Content-Type": "application/json; charset=utf-8"},
			body: JSON.stringify({token: cookie_token, requested_status: cat})
		}).then(res => res.json()).then(res => {
			//console.log(res);
			if(res.result !== 'SUCCESS') {
				let error_msg;
				switch(res.result) {
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
					wl_requests: res.data,
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

		fetch(Config.api_server_url + '/update_whitelist_status', {
			method: "POST",
			mode: process.env.NODE_ENV === 'development' ? 'cors' : 'same-origin',
			headers: {"Content-Type": "application/json; charset=utf-8"},
			body: JSON.stringify({
				token: cookie_token, 
				requested_status: cat, 
				id: this.state.focused.id
			})
		}).then(res => res.json()).then(res => {
			console.log(res);
			
			if(res.result !== 'SUCCESS') {
				let error_msg;
				switch(res.result) {
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

	renderDataHeader(data: WlRequestDataJSON, closer?: JSX.Element) {
		var creation_date = new Date(parseInt(data.timestamp)).toLocaleString()
			.replace(/(:[0-9]{2}$)|,/gi, '');
		var age = (() => {
			try {
				var dt_destructed = data.data_ur.split('-');
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

		return <h1>
			<span className='creation_date'>{creation_date}</span>
			<span className='nick'>{data.nick + '#' + data.discriminator}</span>
			<span className='age'>
				{age} lat{(age > 21 && (age%10 > 1))?'a':''}
			</span>
			{closer}
		</h1>;
	}

	renderWlRequests() {
		if(this.state.wl_requests === undefined)
			throw new Error('No wl_requests data in state');
			
		return <div className='user_wl_entries_container'>
			{this.state.wl_requests.map((data, i) => {
				//console.log(data);//data.id

				return <div key={i}>
					{this.renderDataHeader(data)}
					<button className='show_btn clean' onClick={() => this.focusOn(i)}>Pokaż</button>
				</div>;
			})}
		</div>;
	}

	renderFocused() {
		if(this.state.focused === undefined)
			throw new Error('No focused whitelist request in state');

		//console.log(this.state.focused);

		const q_data = Config.WHITELIST_QUESTIONS;

		return <div className='user_wl_focused'>
			{this.renderDataHeader(
				this.state.focused, 
				<button className='closer clean' 
					onClick={this.closeFocused.bind(this)}>&times;</button>
			)}
			<div className='QandA'>
				{Object.keys(q_data).map((key, id) => 
					<p key={id}>
						<label>{q_data[key].content}</label>
						<span>{this.state.focused && 
							decodeURIComponent(String(this.state.focused[key]))}</span>
					</p>
				)}
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