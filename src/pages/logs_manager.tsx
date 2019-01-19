import * as React from 'react';
import Content from './../components/content';
import Cookies from './../utils/cookies';
import Utils from './../utils/utils';

import Loader from './../components/loader';

import './../styles/logs_admin.scss';

interface LogsManagerState {
	loading: boolean;
	error?: string;
	log_files: string[];
	focused?: string;
	focused_content?: string[];
}

export default class extends React.Component<any, LogsManagerState> {
	state: LogsManagerState = {
		loading: true,
		error: undefined,
		log_files: [],
		focused: undefined,
		focused_content: undefined
	};

	constructor(props: any) {
		super(props);
	}

	onError(err_msg: string) {
		this.setState({
			error: err_msg, 
			loading: false
		});
	}

	componentDidMount() {
		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		//getting list of avaible log files
		Utils.postRequest(
			'get_avaible_logs', 
			{token: cookie_token}
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
				this.setState({
					error: undefined, 
					loading: false, 
					log_files: (res['files'] as string[]).reverse()
				});
			}
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}

	focusOn(index: number) {
		var focus_target = this.state.log_files[index];
		this.setState({
			focused: focus_target,
			focused_content: undefined
		});

		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		//fetching log content
		Utils.postRequest(
			'get_log_content', 
			{token: cookie_token, log_file: focus_target}
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
				if(this.state.focused !== focus_target)
					console.log('focused log changed while loading this log\'s content');
				else {
					this.setState({
						focused_content: res['content'].reverse()
					});
				}
			}
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}

	renderFocused() {
		return <>
			<h3 className='focused_title'>{'Plik: ' + this.state.focused}</h3>
			<div className='log_content'>
				{this.state.focused_content == undefined ? <Loader color='#f44336' /> :
					this.state.focused_content.map((line, i) => <div key={i}>{line}</div>) }
			</div>
		</>;
	}

	renderMain() {
		return <div className='logs_body'>
			<div className='logs_list'>
				{this.state.log_files.map((file, i) => {
					let name = file.replace(/^log_/i, '');
					return <div className={file === this.state.focused ? 'current' : ''}
						key={i} onClick={() => this.focusOn(i)}>{name}</div>;
					}
				)}
			</div>
			<div>
				{this.state.focused ? this.renderFocused() : 'Nie wybrano pliku z logami'}
			</div>
		</div>;
	}

	render() {//style={{paddingTop: '0px'}}
		return <Content>
			<section className='logs_admin_main container'>
				<article>
					{this.state.error && <span className='error'>{this.state.error}</span>}
					{this.state.loading && <Loader color='#f44336' />}
				</article>
				{this.state.log_files.length > 0 && this.renderMain()}
			</section>
		</Content>;
	}
}