import * as React from 'react';
import { Link } from 'react-router-dom';
// import { Redirect } from 'react-router-dom';
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
	ic_historia: string;
	ic_plan_na_postac: string;
	ic_kreatywna_akcja: string;
	accepted_rules?: boolean;
	previous_attempts?: number;

	[index: string]: string | number | boolean | undefined;
}

interface PlagiarismMatchSchema {
	id: number;
	nick: string;
	percent: number;
	text_type: 0 | 1 | 2;
	text: string;
}

interface WlRequestsState {
	current_cat: string;
	error?: string;
	loading: boolean;
	wl_requests?: WlRequestDataJSON[];
	focused?: WlRequestDataJSON;
	plagiarism_result?: PlagiarismMatchSchema[] | string;
}

export default class extends React.Component<any, WlRequestsState> {
	state: WlRequestsState = {
		current_cat: CATEGORIES.UNKNOWN,
		error: undefined,
		loading: true,
		wl_requests: undefined,
		focused: undefined,
		plagiarism_result: undefined
	};

	constructor(props: any) {
		super(props);
	}

	componentDidMount() {
		this.changeCategory();
	}

	componentDidUpdate() {
		this.changeCategory();
	}

	onError(err_msg: string) {
		this.setState({
			error: err_msg, 
			loading: false,
			focused: undefined,
			wl_requests: undefined
		});
	}

	changeCategory() {
		let cat = this.props.match.params.category || 'pending';

		if(this.state.current_cat === cat)
			return;

		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

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
					focused: undefined,
					plagiarism_result: undefined
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
				const { history: { push } } = this.props;
				push('/wl_requests/' + cat);//redirecting to new category
			}
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}

	plagiarismTest() {
		if(!this.state.focused)
			return;

		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.setState({plagiarism_result: 'Wygląda na to, że nie jesteś zalogowany'});

		this.setState({plagiarism_result: 'Trwa testowanie...'});

		Utils.postRequest(
			'plagiarism_test', {token: cookie_token, id: this.state.focused.id}
		).then(res => res.json()).then((res: {result: string, matches: PlagiarismMatchSchema[]}) => {
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

				this.setState({plagiarism_result: error_msg || 'Nieznany błąd'});
			}
			else {
				this.setState({plagiarism_result: res['matches']});
			}
		}).catch(e => {
			this.setState({plagiarism_result: 'Niewłaściwa odpowiedź serwera'});
			console.error(e);
		});
	}

	focusOn(index: number) {
		if(this.state.wl_requests === undefined)
			throw new Error('No wl_requests data in state');

		this.setState({focused: this.state.wl_requests[index], plagiarism_result: undefined});
	}

	closeFocused() {
		this.setState({focused: undefined});
	}

	renderDataHeader(data: WlRequestDataJSON, closer?: JSX.Element, h1_border_color?: string) {
		var creation_date = new Date(parseInt(data['timestamp'])).toLocaleString()
			.replace(/(:[0-9]{2}$)|,/gi, '');
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

		let nick = Utils.deepUriDecode(data['nick']) + '#' + data['discriminator'];
		const max_len = 15;
		if(!this.state.focused && nick.length > max_len)
			nick = nick.substr(0, max_len-3) + '...';

		return <h1 style={{borderColor: h1_border_color}}>
			<span className='creation_date'>{creation_date}</span>
			<span className='nick'>
				{nick}
			</span>
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
			answer_content = Utils.deepUriDecode(answer_content);

			return <p key={id}>
				<label>{block[key].content}</label>
				<span style={{
					textAlign: block[key].type === QuestionType.TEXTAREA ? 'justify' : 'center'
				}}>{answer_content}</span>
			</p>;
		});
	}

	renderPlagiarismResult(data: PlagiarismMatchSchema[] | string) {
		if(typeof data === 'string')
			return data;
		if(!this.state.focused)
			return 'Błąd - nie znaleziono wybranego podania';

		if(data.length === 0)
			return 'Nie znaleziono plagiatów';

		//let focused_history_words = Utils.deepUriDecode(this.state.focused.ic_historia).split(' ');
		let focused_texts = [
			Utils.deepUriDecode(this.state.focused.ic_historia),
			Utils.deepUriDecode(this.state.focused.ic_plan_na_postac),
			Utils.deepUriDecode(this.state.focused.ic_kreatywna_akcja)
		];
		
		return <div>{data.map((match, i) => {
			var history_words = match.text.split(' ').map((word, i) => {
				if(focused_texts[match.text_type].indexOf(word) === -1)
					return word + ' ';
				if(word.length < 4)
					return <span key={i}>{word} </span>;
				else
					return <strong key={i}>{word} </strong>;
			});//.join(' ');

			return <div key={i} className='plagiarism_block'>
				<h3>
					<span>{Utils.deepUriDecode(match.nick)}</span>
					<span>Zgodność: {Math.round(match.percent*100)}%</span>
				</h3>
				<div>{history_words}</div>
			</div>;
		})}</div>;
	}

	renderFocused() {
		if(this.state.focused === undefined)
			throw new Error('No focused whitelist request in state');

		//console.log(this.state.focused);

		return <div className='user_wl_focused'>
			{this.renderDataHeader(
				this.state.focused, 
				<button className='closer clean shake_icon' 
					onClick={this.closeFocused.bind(this)}></button>,
				this.state.current_cat === CATEGORIES.PENDING ? '#42A5F5' : 
					(this.state.current_cat === CATEGORIES.ACCEPTED ? '#8BC34A' : '#ef5350')
			)}
			<div>{(this.state.focused.previous_attempts && this.state.focused.previous_attempts > 0) ?
				`Ilość poprzednich podań: ${this.state.focused.previous_attempts}` : ''}</div>
			<div className='QandA'>
				<h4>INFORMACJE OOC</h4>
				{this.renderBlockOfAnswers(Config.WHITELIST_QUESTIONS.OOC, 'ooc_')}
				<h4>INFORMACJE IC</h4>
				{this.renderBlockOfAnswers(Config.WHITELIST_QUESTIONS.IC, 'ic_')}
			</div>
			<div>{this.state.focused.accepted_rules === false && 
				'Indywiduum nie zaakceptowało regulaminu!!!'}</div>
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
			<hr style={{margin: '10px 0px'}} />
			<div>
				<button className='clean small_button plagiarism_test' 
					onClick={this.plagiarismTest.bind(this)}>Test na plagiat</button>
				<div>{this.state.plagiarism_result && 
					this.renderPlagiarismResult(this.state.plagiarism_result)}</div>
			</div>
		</div>;
	}

	render() {
		return <Content>
			<section className='whitelist_admin_main container' style={{paddingTop: '0px'}}>
				<div className='control_panel'>
					<Link to='/wl_requests/pending' className={
						`clean ${this.state.current_cat === CATEGORIES.PENDING ? 'active' : ''}`}>
						Oczekujące
					</Link>
					<Link to='/wl_requests/accepted' className={
						`clean ${this.state.current_cat === CATEGORIES.ACCEPTED ? 'active' : ''}`}>
						Zaakceptowane
					</Link>
					<Link to='/wl_requests/rejected' className={
						`clean ${this.state.current_cat === CATEGORIES.REJECTED ? 'active' : ''}`}>
						Odrzucone
					</Link>
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