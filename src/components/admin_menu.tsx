import * as React from 'react';
import { Link } from 'react-router-dom';
import './../styles/admin_menu.scss';

const LINKS = [
	{name: 'Podania', 		route: 'wl_requests'},
	{name: 'Gracze', 		route: 'players'},
	{name: 'Luvineribill', 		route: 'stock_exchange'},
	{name: 'Adminostwo', 	route: 'admins_mng'},
	{name: 'Logi', 			route: 'logs_mng'},
	{name: 'Statystyki', 	route: 'statistics'},
];

interface AdminMenuState {
	open: boolean;
}

export default class extends React.Component<any, AdminMenuState> {
	state: AdminMenuState = {
		open: false
	};

	constructor(props: any) {
		super(props);
	}

	switchMenu() {
		this.setState({
			open: !this.state.open
		});
	}

	render() {
		return <>
			<div data-ct='Moc admina' 
				className={`clean admin_btn small_button ${this.state.open ? 'open' : ''}`} 
				onClick={this.switchMenu.bind(this)}>
				Moc admina
				<div className='menu_icon'>
				  	<span></span>
				  	<span></span>
				  	<span></span>
				  	<span></span>
				</div>
				<div className='options_container' 
					style={{height: this.state.open ? `${25*(LINKS.length+1)+4}px` : 'inherit'}}>
					{LINKS.map((link, i) => <Link key={i} to={`/${link.route}`}>{link.name}</Link>)}
				</div>
			</div>
		</>;
	}
}