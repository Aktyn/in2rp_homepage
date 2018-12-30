import * as React from 'react';
import Content from './../components/content';
import Cookies from './../utils/cookies';
import Config from './../config';
import Loader from './../components/loader';

import './../styles/admins_admin.scss';

interface AdminJSON {
	id: string; 
	nick: string; 
	discriminator: string;
}

interface AdminResJSON {
	result: string;
	admins: AdminJSON[]
}

interface AdminsManagerState {
	loading: boolean;
	error?: string;
	admins: AdminJSON[];
}

export default class extends React.Component<any, AdminsManagerState> {
	state: AdminsManagerState = {
		loading: true,
		error: undefined,
		admins: []
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
		fetch(Config.api_server_url + '/get_admins', {
			method: "POST",
			mode: process.env.NODE_ENV === 'development' ? 'cors' : 'same-origin',
			headers: {"Content-Type": "application/json; charset=utf-8"},
			body: JSON.stringify({token: cookie_token})
		}).then(res => res.json()).then((res: AdminResJSON) => {
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
					admins: res['admins']
				});
			}
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}

	renderContent() {
		return <>
			<h4 style={{margin: '0px'}}>Edycja poniższej listy adminow nie wpływa na discorda</h4>
			<div className='admins_list'>
				{this.state.admins.map(admin => {
					return <div key={admin.id}>
						{`${admin.nick}#${admin.discriminator}`}
						<button className='clean close_btn shake_icon'></button>
					</div>;
				})}
			</div>
			<div>
				Dodawanie i usuwanie będzie dostępne wkrótce 
				<span style={{color: '#455a6460'}}>(chyba)</span>
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