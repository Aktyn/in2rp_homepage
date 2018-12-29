import * as React from 'react';
import { Link } from 'react-router-dom';
import './../styles/admin_menu.scss';

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
			<button data-ct='Moc admina' className={`clean admin_btn ${this.state.open ? 'open' : ''}`} 
				onClick={this.switchMenu.bind(this)}>
				Moc admina
				<div className='menu_icon'>
				  	<span></span>
				  	<span></span>
				  	<span></span>
				  	<span></span>
				</div>
				<div className='options_container'>
					<Link to='/wl_requests'>Podania</Link>
					<Link to='/logs_mng'>Logi</Link>
					<Link to='/gallery'>Galeria</Link>
				</div>
			</button>
		</>;
	}
}