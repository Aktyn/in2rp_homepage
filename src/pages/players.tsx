import * as React from 'react';
import Content from './../components/content';
import Loader from './../components/loader';
import Cookies from './../utils/cookies';
import Utils from './../utils/utils';

import './../styles/players_admin.scss';

interface PlayerData {
	identifier: string;
	name: string;
	firstname: string;
	lastname: string;
	phone_number: string;
	money: string;
	job: string;
}

interface PlayersState {
	loading: boolean;
	error?: string;
	players_data?: PlayerData[]
}

export default class extends React.Component<any, PlayersState> {

	state: PlayersState = {
		loading: true,
		error: undefined,
		players_data: undefined
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

	componentDidMount() {
		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		Utils.postRequest(
			'get_whitelist_players', 
			{token: cookie_token}
		).then(res => res.json()).then((res: {result: string, players_data: PlayerData[]}) => {
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
					players_data: res['players_data'],
				});
			}
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}

	renderPlayerInfoBlock(data: PlayerData, index: number) {
		return <div key={index}>
			<h2>
				<div className='steam_nick'>{data.name}</div>
				<div>
					<span>{data.firstname} {data.lastname}</span>
				</div>
			</h2>
			<table><tbody>
				<tr>
					<td>SteamID:</td><td>{data.identifier.replace(/steam:/i, '')}</td>
				</tr>
				<tr>
					<td>Job:</td><td>{data.job}</td>
				</tr>
				<tr>
					<td>Telefon:</td><td>{data.phone_number}</td>
				</tr>
				<tr>
					<td>Kasa:</td><td>{data.money}</td>
				</tr>
			</tbody></table>
		</div>;
	}

	renderPlayersList(datas: PlayerData[]) {
		return <div className='players_list'>{datas.map(this.renderPlayerInfoBlock)}</div>;
	}

	render() {
		return <Content>
			<section className='container players_admin_main'>
				<article>
					{this.state.error && <span className='error'>{this.state.error}</span>}
					{this.state.loading && <Loader color='#f44336' />}
					{this.state.players_data && this.renderPlayersList(this.state.players_data)}
				</article>
			</section>
		</Content>;
	}
}