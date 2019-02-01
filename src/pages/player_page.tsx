import * as React from 'react';
import { Link } from 'react-router-dom';
import Content from './../components/content';
import Loader from './../components/loader';
import Cookies from './../utils/cookies';
import Utils from './../utils/utils';

import './../styles/players_admin.scss';

interface PlayerData {
	id: number;
	identifier: string;
	group: string;
	name: string;
	firstname: string;
	lastname: string;
	dateofbirth: number;
	height: string;
	phone_number: string;
	sex: 'K' | 'M';
	job: string;
	status: string;
	loadout: string;

	money: number;
	bank: number;
}

interface PlayerPageState {
	loading: boolean;
	error?: string;
	data?: PlayerData;
}

export default class extends React.Component<any, PlayerPageState> {

	state: PlayerPageState = {
		loading: true,
		error: undefined,
		data: undefined
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
			'get_whitelist_player_details', 
			{token: cookie_token, user_id: this.props.match.params.id}
		).then(res => res.json()).then((res: {result: string, player_data: PlayerData}) => {
			//console.log(res);
			if(res['result'] !== 'SUCCESS') {
				let error_msg;
				switch(res['result']) {
					case 'INSUFICIENT_PERMISSIONS':
						error_msg = 'Nie masz uprawnień do tego kontentu.';
						break;
					case 'DATABASE_ERROR':
						error_msg = 'Błąd bazy danych.';
						break;
				}

				this.setState({error: error_msg || 'Nieznany błąd', loading: false});
			}
			else {
				this.setState({
					error: undefined, 
					loading: false, 
					data: res['player_data'],
				});
			}
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}

	renderPlayerData(data: PlayerData) {
		//console.log(data);

		let status: {drunk?: number, hunger?: number, thirst?: number} = {};
		try {
			let status_json = JSON.parse(data.status);
			if(Array.isArray(status_json)) {
				status_json.forEach(st => {
					switch(st.name) {
						case 'drunk':
							status.drunk = st.percent;
							break;
						case 'hunger':
							status.hunger = st.percent;
							break;
						case 'thirst':
							status.thirst = st.percent;
							break;
					}
				});
			}
		}
		catch(e) {}//incorrect json

		let loadout: {ammo: number, name: string, label: string}[] = [];
		try { loadout = JSON.parse(data.loadout); }
		catch(e) {}//incorrect json

		return <>
			<table className='player_data'>
				<thead><tr><th colSpan={2}>{data.name}</th></tr></thead>
				<tbody>
					<tr><td>steam hex:</td><td>{data.identifier.replace(/^steam:/i, '')}</td></tr>
					<tr><td>grupa:</td><td>{data.group}</td></tr>
					<tr><td>imie i nazwisko:</td><td>{data.firstname} {data.lastname}</td></tr>
					<tr><td>data porodzenia:</td><td>{data.dateofbirth}</td></tr>
					<tr><td>wzrost:</td><td>{data.height}</td></tr>
					<tr><td>numer telefona:</td><td>{data.phone_number}</td></tr>
					<tr><td>płeć:</td><td>{data.sex}</td></tr>
					<tr><td>zawód:</td><td>{data.job}</td></tr>
					<tr><td>portfel:</td><td>{data.money}</td></tr>
					<tr><td>bank:</td><td>{data.bank}</td></tr>
					<tr><th colSpan={2} style={{paddingTop: '10px'}}>STATUS</th></tr>
					<tr><td>poziom upicia:</td><td>{status.drunk}%</td></tr>
					<tr><td>głód:</td><td>{status.hunger}%</td></tr>
					<tr><td>pragnienie:</td><td>{status.thirst}%</td></tr>
					<tr><th colSpan={2} style={{paddingTop: '10px'}}>BROŃKI</th></tr>
					<tr>
						<th style={{textAlign: 'right'}}>Nazwa</th>
						<th style={{textAlign: 'left'}}>Amunicja</th>
					</tr>
					{loadout.map((l, i) => {
						return <tr key={i}><td>{l.label}:</td><td>{l.ammo}</td></tr>
					})}
				</tbody>
			</table>
			<button className='clean simple_button remove_btn'>
				Usuń z whitelisty (w&nbsp;budowie)
			</button>
		</>;
	}

	render() {
		return <Content>
			<section className='container players_admin_main'>
				<article>
					<div style={{textAlign: 'left'}}>
						<Link className='clean small_button return_button' to='/players'>
							&lt;&lt;
						</Link>
					</div>
					{this.state.error && <span className='error'>{this.state.error}</span>}
					{this.state.loading && <Loader color='#f44336' />}
					{this.state.data && this.renderPlayerData(this.state.data)}
				</article>
			</section>
		</Content>;
	}
}