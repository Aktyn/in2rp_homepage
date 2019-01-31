import * as React from 'react';
// import { Link } from 'react-router-dom';
import Content from './../components/content';
import Loader from './../components/loader';
// import Cookies from './../utils/cookies';
// import Utils from './../utils/utils';

import './../styles/players_admin.scss';

interface PlayerPageState {
	loading: boolean;
	error?: string;
}

export default class extends React.Component<any, PlayerPageState> {

	state: PlayerPageState = {
		loading: false,//TODO - change to true,
		error: undefined,
	}

	constructor(props: any) {
		super(props);
	}

	onError(err_msg: string) {
		this.setState({
			error: err_msg, 
			loading: false
		});
	}

	/*componentDidMount() {
		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		Utils.postRequest(
			'get_whitelist_players', 
			{token: cookie_token}
		).then(res => res.json()).then((res: {result: string, players_data: PlayerData[]}) => {
			console.log(res);
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
					players_data: res['players_data'],
				});
			}
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}*/

	render() {
		//console.log(this.props.match);
		return <Content>
			<section className='container players_admin_main'>
				<article>
					{this.state.error && <span className='error'>{this.state.error}</span>}
					{this.state.loading && <Loader color='#f44336' />}
					ID: {this.props.match.params.id}<br />
					Panel zarządzania graczem w budowie
				</article>
			</section>
		</Content>;
	}
}