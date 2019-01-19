import * as React from 'react';
// import DiscordSession from '../components/discord_session';
import Content from './../components/content';
import Cookies from './../utils/cookies';
import Utils from './../utils/utils';
import Loader from './../components/loader';

import './../styles/admins_admin.scss';

interface UserJSON {
	id: string; 
	nick: string; 
	discriminator: string;
}

interface AdminResJSON {
	result: string;
	admins: UserJSON[],
	candidats: UserJSON[]
}

interface AdminsManagerState {
	loading: boolean;
	error?: string;
	admins: UserJSON[];
	candidats: UserJSON[];
	selected_to_remove?: UserJSON;
	removing_result?: string;
	adding_result?: string;
}

export default class extends React.Component<any, AdminsManagerState> {
	private user_id_input: HTMLInputElement | null = null;

	state: AdminsManagerState = {
		loading: true,
		error: undefined,
		admins: [],
		candidats: [],
		selected_to_remove: undefined,
		removing_result: undefined,
		adding_result: undefined
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

	refresh() {
		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		//getting list of avaible log files
		Utils.postRequest(
			'get_admins', 
			{token: cookie_token}
		).then(res => res.json()).then((res: AdminResJSON) => {
			//console.log(res['candidats']);
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
					admins: res['admins'],
					candidats: res['candidats'],
				});
			}
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}

	componentDidMount() {
		this.refresh();
	}

	removeAttempt(admin: UserJSON) {
		this.setState({selected_to_remove: admin, removing_result: undefined});
	}

	removeAdmin() {
		if(!this.state.selected_to_remove)
			return;

		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		//getting list of avaible log files
		Utils.postRequest(
			'remove_admin', 
			{token: cookie_token, id: this.state.selected_to_remove.id}
		).then(res => res.json()).then((res: AdminResJSON) => {
			//console.log(res);
			if(res['result'] !== 'SUCCESS') {
				this.setState({
					removing_result: res['result'] === 'ERROR_XXX' ? 
						'Co ty robisz?! Aktyna nie usuniesz xD' : 'Nie można usunąć admina'
				});
			}
			else {
				this.setState({selected_to_remove: undefined, removing_result: undefined});
				this.refresh();
			}
		}).catch(e => {
			this.setState({removing_result: 'Nie można usunąć admina'});
			console.error(e);
		});
	}

	addAdmin(id: string) {
		if(id.length < 1)
			return;

		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		//getting list of avaible log files
		Utils.postRequest(
			'add_admin', 
			{token: cookie_token, id: id}
		).then(res => res.json()).then((res: AdminResJSON) => {
			//console.log(res);
			if(res['result'] !== 'SUCCESS')
				this.setState({adding_result: 'Nie można dodać admina'});
			else {
				this.setState({selected_to_remove: undefined, adding_result: undefined});
				this.refresh();
			}
		}).catch(e => {
			this.setState({adding_result: 'Nie można dodać admina'});
			console.error(e);
		});
	}

	renderRemoveConfirmationPrompt() {
		let nick = this.state.selected_to_remove && this.state.selected_to_remove.nick;
		return <>
			<div>{
				this.state.removing_result ? 
					<span style={{color: '#f44336'}}>{this.state.removing_result}</span> : 
					`Czy na pewno chcesz usunąć użytkownika ${nick} z listy adminów?`
			}</div>
			{this.state.removing_result === undefined && <>
					<button className='clean' onClick={this.removeAdmin.bind(this)}>Yep</button>
					<button className='clean' 
						onClick={() => this.setState({selected_to_remove: undefined})}>Nope</button>
				</>
			}
		</>;
	}

	renderContent() {
		return <>
			<h4 style={{margin: '0px'}}>Edycja poniższej listy adminow nie wpływa na discorda</h4>
			<div className='users_list'>
				{this.state.admins.map(admin => {
					return <div key={admin.id}>
						{`${admin.nick}#${admin.discriminator}`}
						<button className='clean close_btn shake_icon' onClick={() => {
							this.removeAttempt(admin);
						}}></button>
					</div>;
				})}
			</div>
			<div className='confirmation_container'>
				{this.state.selected_to_remove && this.renderRemoveConfirmationPrompt()}
			</div>
			<hr />
			<div className='adder_container'>
				<input type='text' placeholder='user discord id' ref={el => this.user_id_input=el} />
				<br />
				<button className='clean' onClick={() => {
					if(this.user_id_input) {
						this.addAdmin(this.user_id_input.value);
						this.user_id_input.value = '';
					}
				}}>Dodaj admina</button>
				<div><span style={{color: '#f44336'}}>{this.state.adding_result}</span></div>
			</div>
			<hr />
			<div>Lista osób z wysokimi rangami typu Developer, Administrator:</div>
			<div className='users_list candidates'>
				{this.state.candidats.map(candidat => {
					return <div key={candidat.id}>
						{`${candidat.nick}#${candidat.discriminator}`}
						<button className='clean add_btn' onClick={() => {
							if(this.user_id_input) {
								this.user_id_input.value = candidat.id;
								this.user_id_input.classList.remove('blink');
								void this.user_id_input.offsetHeight;
								this.user_id_input.classList.add('blink');
							}
						}}>+</button>
					</div>;
				})}
			</div>
		</>;
	}

	render() {//style={{paddingTop: '0px'}}
		return <Content>
			<section className='admins_admin_main container'>
				<article>
					{this.state.error && <span className='error'>{this.state.error}</span>}
					{this.state.loading && <Loader color='#f44336' />}
					{this.state.admins.length > 0 && this.renderContent()}
				</article>
			</section>
		</Content>;
	}
}