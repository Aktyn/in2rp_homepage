import * as React from 'react';
import Content from './../components/content';
import Loader from './../components/loader';
import Cookies from './../utils/cookies';
import Utils from './../utils/utils';

import './../styles/stock_exchange.scss';

enum PERMISSIONS {
	ADMIN, 
	USER
}

interface StockExchangeState {
	error?: string;
	loading: boolean;
	permissions: PERMISSIONS;
	adding_menu: boolean;

	preview_urls: (string | ArrayBuffer | null)[];
}

export default class extends React.Component<any, StockExchangeState> {
	state: StockExchangeState = {
		error: undefined,
		loading: true,
		permissions: PERMISSIONS.USER,
		adding_menu: true,//false

		preview_urls: [null, null, null]//determines number of possible screenshots
	};

	constructor(props: any) {
		super(props);
	}

	componentDidMount() {
		this.refresh();
	}

	refresh() {
		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		this.setState({loading: true, error: undefined});

		Utils.postRequest(
			'get_stock_exchange', {token: cookie_token}
		).then(res => res.json()).then(res => {
			console.log(res);

			this.setState({
				loading: false, 
				permissions: res['admin'] ? PERMISSIONS.ADMIN : PERMISSIONS.USER
			});
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}

	onError(err_msg: string) {
		this.setState({
			error: err_msg, 
			loading: false,
		});
	}

	uploadScreenshot(event: React.ChangeEvent<HTMLInputElement>, index: number) {
		console.log(event.target);

		if(event.target.files === null)
			return;

		var file = event.target.files[0];
        var reader = new FileReader();
        reader.onloadend = () => {
         	let new_previews = this.state.preview_urls;
         	new_previews[index] = reader.result;
         	this.setState({
         		preview_urls: new_previews
         	});
        }
        if(file)
            reader.readAsDataURL(file);
	}

	render() {
		if(this.state.adding_menu) {
			return <Content>
				<section className='stock_exchange_main container'>
					<article className='input_grid'>
						<label>Marka:</label><input type='text'/>
						<label>Ilość osób:</label><input type='number'/>
						<label>Model:</label><input type='text'/>
						<label>Cena:</label><input type='number'/>
					</article>
					<div className='files_info'>Obrazy jpg/png, maksymalny rozmiar: 1MB.</div>
					<div>{this.state.preview_urls.map((p, i) => {
						//ref={(input) => this.fileInput = input}
						return <div key={i} className='screen_uploader' style={{
							backgroundImage: p!==null ? `url("${p}")` : ''
						}}>{p ? 'Wybierz inny plik' : 'Wybierz plik'}
							<input name='screen_file'
								accept="image/png, image/jpeg" type='file' 
								onChange={ (el) => this.uploadScreenshot(el, i) } />
						</div>;
					})}</div>
					<div>
						<button className='clean small_button' style={{backgroundColor: '#33691E'}}>
							Dodaj
						</button>
						<button className='clean small_button' style={{backgroundColor: '#b71c1c'}}
							onClick={()=>this.setState({adding_menu: false})}>Anuluj</button>
					</div>
				</section>
			</Content>;
		}
		return <Content>
			<section className='stock_exchange_main container'>
				<article>
					{this.state.error && <span className='error'>{this.state.error}</span>}
					{this.state.loading && <Loader color='#f44336' />}
				</article>
				{this.state.permissions === PERMISSIONS.ADMIN && <div style={{textAlign: 'right'}}>
					<button className='clean add_btn'
						onClick={()=>this.setState({adding_menu: true})}>+</button>
				</div>}
			</section>
		</Content>;
	}
}