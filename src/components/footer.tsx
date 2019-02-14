import * as React from 'react';
import { Link } from 'react-router-dom';

import Config from '../config';

import './../styles/footer.scss';

var aktyn_logo = require('../img/aktyn_logo.png');

declare var _GLOBALS_: {//compile-time variable passed from webpack config
	update_time: number;
};

interface MemberJSON {
	avatar_url: string;
	discriminator: string;
	game: {name: string};
	id: string;
	status: string;
	username: string;
}

interface FooterState {
	revealed: boolean;
	instant_invite?: string;
	members: MemberJSON[];
}

function padZ(n: number) {//pad zero at the beginning
	return ('0'+n).slice(-2);
}

function trimDots(str: string, maxlen = 10) {
	if(str.length > maxlen)
		return str.substr(0, maxlen-3) + '...';
	return str;
}

export default class extends React.Component<any, FooterState> {

	state: FooterState = {
		revealed: false,
		instant_invite: undefined,
		members: []
	};

	constructor(props: any) {
		super(props);
	}

	componentDidMount() {
		this.refreshUsersList();
	}

	refreshUsersList() {
		fetch(`https://discordapp.com/api/guilds/${Config.discord_guild_id}/widget.json`, {
			method: 'GET',
			mode: 'cors',
			headers: {"Content-Type": "application/json; charset=utf-8"},
			cache: 'reload'
		}).then(res => res.json()).then(res => {
			//console.log(res);
			this.setState({
				members: res.members,
				instant_invite: res.instant_invite
			});
			setTimeout(() => this.refreshUsersList(), 1000*60*5);//each 5 minutes
		}).catch(console.error);
	}

	switchView() {
		this.setState({revealed: !this.state.revealed});
	}

	render() {//new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
		let dt = new Date(_GLOBALS_.update_time);

		let update_time = `${padZ(dt.getDate())}-${padZ(dt.getMonth()+1)}-${padZ(dt.getFullYear())} ` +
			`${padZ(dt.getHours())}:${padZ(dt.getMinutes())}`;

		return <div className='footer'>
			<div className='waves_container'>
				<div></div>
				<div></div>
				<div></div>
			</div>
			<section style={{width: '100%'}}>
				<div className='footer_bg_clipped'>
					<article>{Config.long_description}</article>
					<article>{Config.contacs}</article>
					<article className='discord_info'>
						<h3>
							Użytkownicy online ({this.state.members && this.state.members.length}):
							{this.state.instant_invite &&
								<a href={this.state.instant_invite} 
									target='_blank' className='clean small_button'>
									Otwórz Discord
								</a>
							}
						</h3>
						<div className='users_list'><table><tbody>
							{this.state.members.map((member, i) => {
								return <tr key={i}>
									<td>
										<span className={`d_avatar ${member.status}`} style={{
											backgroundImage: `url(${member.avatar_url}?size=32)`
										}}></span>
									</td>
									<td>{trimDots(member.username, 30)}</td>
									<td>{member.game && trimDots(member.game.name, 35)}</td>
								</tr>;
							})}
						</tbody></table></div>
					</article>
				</div>
			</section>
			<div className='footer_bottom'>
				<div>
					<span>Ostatnia aktualizacja: {update_time}</span>
					<span style={{marginLeft:'10px', color:'#e57373'}} id='server_status_info'></span>
				</div>
				<div>
					{this.state.revealed ? 
						<a target='_blank' href='https://github.com/Aktyn' rel="noreferrer" 
							style={{color: '#71c1bb'}} className='fader_in'>GitHub autora strony</a> 
						:
						<label className='fader_in'>
							<Link to='/snake'>Copyright &copy;</Link> 2018 - Aktyn 
							<img src={aktyn_logo} /> - All rights reserved
						</label>
					}
					<button aria-label="link do githuba autora"
						className={this.state.revealed ? 'clean close_icon' : 'clean more_icon'}
						onClick={this.switchView.bind(this)}></button>
				</div>
			</div>
		</div>;
	}
}