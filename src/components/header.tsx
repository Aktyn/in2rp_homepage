import * as React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Utils from './../utils/utils';
import Config from './../config';

import './../styles/header.scss';
//@ts-ignore
// import GTA_Font from './../styles/pricedown.ttf';

import Discord from './discord_session';

const MENU_LINKS = [
	{name: 'STRONA GŁÓWNA', href: '/', icon: require(`../img/home.svg`)},
	{name: 'FORUM', href: '/forum', icon: require(`../img/forum_icon.png`)},
	{name: 'WHITELISTA', href: '/wl', icon: require(`../img/whitelist_icon.png`)},
	{name: 'REGULAMIN', href: '/rules', icon: require(`../img/rules_icon.png`)},
	{name: 'GALERIA', href: '/gallery', icon: require(`../img/gallery_icon.svg`)}
];

interface HeaderProps extends RouteComponentProps {
	type: string;//small, large
}

interface ServerData {
	online: boolean;
	players_online: string[];
}

interface ServerDataState {
	online: boolean;
	players_online1: string[];
	players_online2: string[];
}

interface HeaderState {
	server_data?: ServerDataState;
	list_open: boolean;
	menu_open: boolean;
}

const MAX_LIST_ITEMS = 7;

class Header extends React.Component<HeaderProps, HeaderState> {
	private static BG_ID = process.env.NODE_ENV === 'development' ? 
		(Math.random()*3)|0 : 
		(new Date().getHours() % 3);

	private players_list: HTMLDivElement | null = null;
	private actual_players_list: HTMLDivElement | null = null;

	static defaultProps = {
		type: 'small'
	}

	state: HeaderState = {
		server_data: undefined,
		list_open: false,
		menu_open: false
	}

	//private saved_online_players_count = 10;

	private blobs: JSX.Element[] = [];

	constructor(props: HeaderProps) {
		super(props);

		if(!Utils.IS_MOBILE) {//not for mobile devices
			const bubbles = 20;
			for(var i=0; i<bubbles; i++) {
				var r_size = (1 * (Math.random()*5+5))|0;
				this.blobs.push( <div key={i} className='header_blob' style={{
					left: `${i*100/bubbles + (Math.random()*100/bubbles)|0}%`,
					width: `${r_size}px`,
					height: `${r_size}px`,
					animationDuration: `${(Math.random()*21000+7000)|0}ms`,
					animationDelay: `${(-Math.random()*14000)|0}ms`
				}}></div> );
			}
		}
	}

	componentDidMount() {
		this.updateOnlinePlayersInfos();
	}

	componentDidUpdate(prevProps: any) {
		/*if(this.state.list_open && this.state.server_data && 
			this.state.server_data.players_online.length !== this.saved_online_players_count) 
		{
			this.saved_online_players_count = this.state.server_data.players_online.length;
			this.updatePlayersList();
		}*/

		if (this.props.location !== prevProps.location)
			this.setState({menu_open: false});//close menu on location change
	}

	updateOnlinePlayersInfos() {
		Utils.postRequest(
			'get_online_players', {}
		).then(res => res.json()).then((res: {result: string; data1: ServerData; data2: ServerData}) => 
		{
			//console.log(res);
			if(res.result === 'SUCCESS') {
				this.setState({
					server_data: {
						online: res.data1.online || res.data2.online,//true,//
						players_online1: res.data1.players_online,//['Aktyn', 'Peonik', 'Mepik']//
						players_online2: res.data2.players_online
					}
				});

				//refresh after 5 minutes if server is offline
				let delay = (res.data1.online || res.data2.online) ? 1 : 5;
				setTimeout(() => this.updateOnlinePlayersInfos(), 1000*60*delay);//refresh after minute
			}
			else
				this.setState({server_data: undefined});
		}).catch(()=>{
			this.setState({server_data: undefined});
		});
	}

	updatePlayersList() {
		if(this.players_list && this.actual_players_list && this.state.server_data) {
			let total_online = this.state.server_data.players_online1.length + 
				this.state.server_data.players_online2.length;
			let offset = this.state.server_data.players_online1.length > 0 ? 1 : 0;
			offset += this.state.server_data.players_online2.length > 0 ? 1 : 0;

			let h = 25 * (total_online + offset);
			this.players_list.style.height = !this.state.list_open ? 
				`${Math.min(24+h, 24+25*MAX_LIST_ITEMS)}px` : '24px';
			
			this.actual_players_list.style.height = `${Math.min(h, 25*MAX_LIST_ITEMS)}px`
		}
	}

	switchList() {
		this.updatePlayersList();

		this.setState({
			list_open: !this.state.list_open
		});
	}

	switchMenu() {
		this.setState({
			menu_open: !this.state.menu_open
		});
	}

	renderOnlinePlayersInfos(data: ServerDataState) {
		//TODO - add splayers_online2 list
		//TODO - turn it into links redirecting to fivem users data
		if(!data.online)
			return 'Serwer gry offline';

		let total_online = data.players_online1.length+data.players_online2.length;

		return <div className={
				`clean slide_list_btn small_button ${this.state.list_open ? 'open' : ''} 
				${total_online > 0 ? '' : 'no_players'}`
			} 
			onClick={this.switchList.bind(this)}>

			<div className='list_head'>
				<span>Graczy online: {total_online}</span>
				<span className='slide_list_icon'></span>
			</div>
			
			<div className='players_list' ref={el => this.players_list = el}>
				<div ref={el => this.actual_players_list = el}>
					{data.players_online1.length > 0 && 
						<span className='separator'>WYSPA 1 ({data.players_online1.length})</span>}
					{data.players_online1.map((p, i) => <div key={i}>{Utils.deepUriDecode(p)}</div>)}
					{data.players_online2.length > 0 && 
						<span className='separator'>WYSPA 2 ({data.players_online2.length})</span>}
					{data.players_online2.map((p, i) => <div key={i}>{Utils.deepUriDecode(p)}</div>)}
				</div>
			</div>
		</div>;
	}

	render() {//removed - <Link to='/' className='homepage_icon' aria-label='homepage link' />
		return <React.Fragment>
			<h1 className={`${this.props.type} main_header_container`} data-bgid={Header.BG_ID}>
				<div className='header_fill'>
					{!Utils.IS_MOBILE && 
						<div className='blobs_container'>{this.blobs}</div>
					}
				</div>
				<div className='header_fill header_gradient'>
					<div className='header_text'>{Config.short_description}</div>
					<Link aria-label='homepage link logo' to='/' className='logo'></Link>
					<div className='line1'></div>
					<div className='line2'></div>
				</div>
			</h1>
			<div className='header_separator'>
				<div className='menu_slider'>
					<div className={`switcher ${this.state.menu_open?'open':''}`} 
						onClick={this.switchMenu.bind(this)}>
						<div className='menu_icon'>
							<span></span>
							<span></span>
							<span></span>
							<span></span>
						</div>
					</div>
					<div className={`slide_menu_content ${this.state.menu_open?'open':''}`}>
						<div className='menu_links'>{MENU_LINKS.map((link, i) => {
							var curr = '';
							//console.log(this.props.location.pathname);
							if( (link.href === '/' && this.props.location.pathname === '/') ||
							(link.href!=='/' && this.props.location.pathname.startsWith(link.href)) ) 
							{
								curr = 'current';
							}
							if(link.name === 'FORUM') {
								return <a href={link.href} key={i}>
									<img src={link.icon}/>{link.name}
								</a>;
							}
							return <Link className={curr} to={link.href} key={i}>
								<img src={link.icon} />
								{link.name}
							</Link>;
						})}</div>
						<div className='cutter'></div>
					</div>
				</div>
				<div className='players'>
					{this.state.server_data && this.renderOnlinePlayersInfos(this.state.server_data)}
				</div>
				<div className='short_info'>{Config.short_info}</div>
				<Discord.Widget />
			</div>
		</React.Fragment>;
	}
}

export default withRouter(Header);