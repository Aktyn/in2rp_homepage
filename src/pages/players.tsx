import * as React from 'react';
import { Link } from 'react-router-dom';
import Content from './../components/content';
import Loader from './../components/loader';
import Cookies from './../utils/cookies';
import Utils from './../utils/utils';

import './../styles/players_admin.scss';

function hexToDec(s: string) {
    var i, j, digits = [0], carry;
    for (i = 0; i < s.length; i += 1) {
        carry = parseInt(s.charAt(i), 16);
        for (j = 0; j < digits.length; j += 1) {
            digits[j] = digits[j] * 16 + carry;
            carry = digits[j] / 10 | 0;
            digits[j] %= 10;
        }
        while (carry > 0) {
            digits.push(carry % 10);
            carry = carry / 10 | 0;
        }
    }
    return digits.reverse().join('');
}

enum ConverterState {
	HEX_TO_DEC,
	DEC_TO_HEX
}

interface PlayerData {
	id: number;
	identifier: string;
	name: string;
	firstname: string;
	lastname: string;
	phone_number: string;
	money: string;
	job: string;
}

interface DiscordUserData {
	discord_nick: string;
	discord_discriminator: number;
	ooc_steam_id: string;
}

interface PlayersState {
	loading: boolean;
	error?: string;
	players_data?: PlayerData[];
	discord_users_candidats?: DiscordUserData[],

	converter_visible: boolean;
	converter_state: ConverterState;

	adding_result: any;
}

export default class extends React.Component<any, PlayersState> {
	private steamid_input: HTMLInputElement | null = null;
	private converter_input: HTMLInputElement | null = null;
	private converter_result: HTMLDivElement | null = null;

	state: PlayersState = {
		loading: true,
		error: undefined,
		players_data: undefined,
		discord_users_candidats: undefined,

		converter_visible: false,
		converter_state: ConverterState.DEC_TO_HEX,

		adding_result: undefined
	}

	constructor(props: any) {
		super(props);
	}

	onError(err_msg: string) {
		this.setState({
			error: err_msg, 
			loading: false,
			adding_result: undefined
		});
	}

	componentDidMount() {
		this.refresh();
	}

	refresh() {
		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		interface WlResultJSON {
			result: string;
			players_data: PlayerData[];
			discord_users_data: DiscordUserData[];
		}

		Utils.postRequest(//TODO - load also discord players with accepted whitelist request
			'get_whitelist_players', 
			{token: cookie_token}
		).then(res => res.json()).then((res: WlResultJSON) => {
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
					discord_users_candidats: res['discord_users_data']
				});
			}
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}

	addSteamID(id: string) {
		if(id.length < 1)
			return;

		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		this.setState({adding_result: <Loader color='#f44336' />});

		Utils.postRequest(
			'add_whitelist_player', 
			{token: cookie_token, steamid: id}
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
				let result_msg = (d_res => {
					switch(d_res) {
						case undefined: return 'Nie znaleziono użytkownika na discordzie';
						case 'ERRRRROR': return 'Nie udało się zmienić roli użytkownika na discordzie';
						default: return d_res + ' otrzymał rangę Obywatel';
					}
				})(res['discord_result']);
				this.setState({adding_result: result_msg});
				this.refresh();
			}
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}

	renderPlayerInfoBlock(data: PlayerData, index: number) {
		return <div key={index}>
			<h2>
				<div className='steam_nick'>{data.name || '---'}</div>
				<div>
					<span>{data.firstname || '---'} {data.lastname || '---'}</span>
				</div>
			</h2>
			<table><tbody>
				<tr>
					<td>Hex:</td><td>{data.identifier.replace(/steam:/i, '')}</td>
				</tr>
				<tr>
					<td>Job:</td><td>{data.job || '---'}</td>
				</tr>
				<tr>
					<td>Telefon:</td><td>{data.phone_number || '---'}</td>
				</tr>
				<tr>
					<td>Kasa:</td><td>{data.money || '---'}</td>
				</tr>
			</tbody></table>
			<Link aria-label='player more' className='clean small_button' to={`/players/${data.id}`}>
				OPCJE
			</Link>
		</div>;
	}

	renderPlayersList(datas: PlayerData[]) {
		return <>
			<div className={`converter_container ${this.state.converter_visible ? 'open' : ''}`}>
				<div className='switcher_container'>
					<button onClick={() => {
						this.setState({converter_visible: !this.state.converter_visible})
					}} className='clean small_button'></button>
				</div>
				<div className='input_field_container'>
					<span></span>
					<input type='text' maxLength={50} ref={el => this.converter_input = el} 
						placeholder={
							this.state.converter_state === ConverterState.DEC_TO_HEX ? 
							'STEAM ID64' : 'STEAM HEX'
						} onChange={(el) => {
							if(!this.converter_input || !this.converter_result)
								return;
							if(this.state.converter_state === ConverterState.DEC_TO_HEX) {
								this.converter_input.value = 
									this.converter_input.value.replace(/[^0-9]/gi, '');
								this.converter_result.innerText = 
									//@ts-ignore
									BigInt(this.converter_input.value).toString(16);
							}
							else {
								this.converter_input.value = 
									this.converter_input.value.replace(/[^0-9a-f]/gi, '');
								this.converter_result.innerText = hexToDec(this.converter_input.value);
							}
						}} 
					/>
					<button className='clean reverse_btn' onClick={() => {
						if(!this.converter_input || !this.converter_result)
							return;
						this.converter_input.value = '';
						this.converter_result.innerText = '';
						this.setState({//switch state
							converter_state: this.state.converter_state === ConverterState.DEC_TO_HEX ?
								ConverterState.HEX_TO_DEC : ConverterState.DEC_TO_HEX
						});
					}}></button>
				</div>
				<div style={{height: '18px'}} ref={el => this.converter_result = el}></div>
			</div>
			<hr style={{marginBottom: '15px'}} />
			<div className='wladd_panel'>
				<input type='number' placeholder='STEAM ID64' ref={el=>this.steamid_input=el} 
					onKeyDown={(e) => {
						if(e.keyCode === 13 && this.steamid_input)
							this.addSteamID(this.steamid_input.value);
					}} 
				/><br/>
				<button aria-label='wladd button' className='clean small_button' onClick={() => {
					if(this.steamid_input)
						this.addSteamID(this.steamid_input.value);
				}}>Dodaj do whitelisty </button>
				<div className='result_info'>{this.state.adding_result}</div>
			</div>
			<hr style={{marginBottom: '15px'}} />
			<div>
				<h4>Osoby z zaakceptowanym podaniem bez whitelisty na serwerze:</h4>
				<div className='discord_users_list'>{this.state.discord_users_candidats &&
					this.state.discord_users_candidats.map((d, i) => {
						return <button className='clean small_button' key={i} onClick={() => {
							if(this.steamid_input)
								this.steamid_input.value = d.ooc_steam_id;
						}}>
							{decodeURIComponent(d.discord_nick)}#{d.discord_discriminator}
						</button>;
					}
				)}</div>
			</div>
			<hr style={{marginBottom: '30px'}} />
			<div className='players_list'>{datas.map(this.renderPlayerInfoBlock)}</div>
		</>;
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