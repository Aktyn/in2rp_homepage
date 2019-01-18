import * as React from 'react';
import { Link } from 'react-router-dom';
import Config from './../config';

import './../styles/header.scss';
//@ts-ignore
// import GTA_Font from './../styles/pricedown.ttf';

import Discord from './discord_session';

const IS_MOBILE = (function() {
	var check = false;
	//@ts-ignore
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
})();

interface HeaderProps {
	type: string;//small, large
}

interface ServerData {
	online: boolean;
	players_online: string[];
}

interface HeaderState {
	server_data?: ServerData;
	list_open: boolean;
}

const MAX_LIST_ITEMS = 7;

export default class Header extends React.Component<HeaderProps, HeaderState> {
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
		list_open: false
	}

	private blobs: JSX.Element[] = [];

	constructor(props: HeaderProps) {
		super(props);

		if(!IS_MOBILE) {//not for mobile devices
			for(var i=0; i<50; i++) {
				var r_size = (1 * (Math.random()*60+40))|0;
				this.blobs.push( <div key={i} className='header_blob' style={{
					left: `${(Math.random()*100)|0}%`,
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

	updateOnlinePlayersInfos() {
		fetch(Config.api_server_url + '/get_online_players', {
			method: "POST",
			mode: process.env.NODE_ENV === 'development' ? 'cors' : 'same-origin',
			headers: {
	           "Content-Type": "application/json; charset=utf-8",
	        }
		}).then(res => res.json()).then((res: {result: string; data: ServerData}) => {
			//console.log(res);
			if(res.result === 'SUCCESS') {
				this.setState({
					server_data: {
						online: res.data.online,//true,//
						players_online: res.data.players_online//['Aktyn', 'Peonik', 'Mepik']//
					}
				});

				//TODO - refresh after 5 minutes when server is offline
				setTimeout(() => this.updateOnlinePlayersInfos(), 1000*60);//refresh after minute
			}
			else
				this.setState({server_data: undefined});
		}).catch(()=>{
			this.setState({server_data: undefined});
		});
	}

	switchList() {
		if(this.players_list && this.actual_players_list && this.state.server_data) {
			let h = 25*(this.state.server_data.players_online.length);
			this.players_list.style.height = !this.state.list_open ? 
				`${Math.min(24+h, 24+25*MAX_LIST_ITEMS)}px` : '24px';
			
			this.actual_players_list.style.height = `${Math.min(h, 25*MAX_LIST_ITEMS)}px`
		}

		this.setState({
			list_open: !this.state.list_open
		});
	}

	renderOnlinePlayersInfos(data: ServerData) {
		if(!data.online)
			return 'Serwer gry offline';

		return <div className={
				`clean slide_list_btn small_button ${this.state.list_open ? 'open' : ''} 
				${data.players_online.length > 0 ? '' : 'no_players'}`
			} 
			onClick={this.switchList.bind(this)}>

			<div className='list_head'>
				<span>Graczy online: {data.players_online.length}</span>
				<span className='slide_list_icon'></span>
			</div>
			
			<div className='players_list' ref={el => this.players_list = el}>
				<div ref={el => this.actual_players_list = el}>{
					data.players_online.map((p, i) => <div key={i}>{p}</div>)//TODO - turn it into links redirecting to fivem users data
				}</div>
			</div>
		</div>;
	}

	render() {
		return <React.Fragment>
			<h1 className={this.props.type + ' main_header_container'} data-bgid={Header.BG_ID}>
				<div className='header_fill'>
					{!IS_MOBILE && 
						<div className='blobs_container'>{this.blobs}</div>
					}
					<svg xmlns="http://www.w3.org/2000/svg" version="1.1">
						<defs>
							{/*<filter id="goo_old">
								<feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
								<feColorMatrix in="blur" mode="matrix" 
									values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" 
									result="goo" />
								<feGaussianBlur in="goo" stdDeviation="5" result="blur2" />
								<feComposite in="SourceGraphic" in2="goo" operator="atop"/>
							</filter>*/}
							<filter id="goo">
								<feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
								<feColorMatrix in="blur" mode="matrix" 
									values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 1" 
									result="goo" />
								<feComposite in="SourceGraphic" in2="blur" operator="atop"/>
							</filter>
						</defs>
					</svg>
				</div>
				<div className='header_fill header_gradient'>
					<Link aria-label='homepage link logo' to='/' style={{justifySelf: 'right'}} className='logo'></Link>
					<div style={{
						justifySelf: 'left', 
						// fontFamily: GTA_Font,
						fontWeight: 'bold',
						textShadow: `0px 1px 4px #0004`,
					}}>{Config.short_description}</div>
				</div>
			</h1>
			<div className='header_separator'>
				<Link to='/' className='homepage_icon' aria-label='homepage link' />
				<div className='players'>
					{this.state.server_data && this.renderOnlinePlayersInfos(this.state.server_data)}
				</div>
				<div className='short_info'>{Config.short_info}</div>
				<Discord.Widget />
			</div>
		</React.Fragment>;
	}
}