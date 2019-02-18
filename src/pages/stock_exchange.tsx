import * as React from 'react';
import Content from './../components/content';
import Loader from './../components/loader';
import Cookies from './../utils/cookies';
import Config from './../config';
import Utils from './../utils/utils';

import './../styles/stock_exchange.scss';

enum PERMISSIONS {
	ADMIN, 
	USER
}

enum STATUS {
	UNKNOWN,
	SENDING,
	ERROR,
	SUCCESS
}

interface SchemaJSON {
	id: number;
	timestamp: string;
	mark: string;
	capacity: number;
	model: string;
	price: string;
	files: string | null;
}

interface StockExchangeState {
	error?: string;
	loading: boolean;
	permissions: PERMISSIONS;
	adding_menu: boolean;
	sending_status: STATUS;
	data: SchemaJSON[];
	focused: SchemaJSON | null;

	previews: ({url: string | ArrayBuffer | null; file: File} | null)[];
}

export default class extends React.Component<any, StockExchangeState> {
	state: StockExchangeState = {
		error: undefined,
		loading: true,
		permissions: PERMISSIONS.USER,
		adding_menu: false,
		sending_status: STATUS.UNKNOWN,
		data: [],
		focused: null,

		previews: [null]//determines number of possible screenshots
	};

	private mark: HTMLInputElement | null = null;
	private capacity: HTMLInputElement | null = null;
	private model: HTMLInputElement | null = null;
	private price: HTMLInputElement | null = null;

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
		).then(res => res.json()).then((res: {result: string, admin: boolean, data: SchemaJSON[]}) => {
			//console.log(res);

			if(res['result'] !== 'SUCCESS')
				this.setState({error: 'Nieznany błąd', loading: false});
			else {
				this.setState({
					loading: false,
					data: res['data'],
					permissions: res['admin'] ? PERMISSIONS.ADMIN : PERMISSIONS.USER
				});
			}
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

	sendEntry() {
		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		this.setState({sending_status: STATUS.SENDING});

		var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = () => {//Call a function when the state changes.
        	if(xhr.readyState === 4) {
        		if(xhr.status === 413 || xhr.status === 404)//error
        			this.setState({sending_status: STATUS.ERROR});
        		else if(xhr.status === 200) {//success
        			this.setState({sending_status: STATUS.SUCCESS});
        			setTimeout(() => {
        				this.setState({adding_menu: false, sending_status: STATUS.UNKNOWN});
        				this.refresh();
        			}, 5000);
        		}
        	}
		};

		xhr.open("post", Config.api_server_url + '/add_stock_exchange_entry', true);

		var formdata = new FormData();
		formdata.append('token', cookie_token);
		if(this.mark)		formdata.append('mark', 	this.mark.value);
		if(this.capacity)	formdata.append('capacity',	this.capacity.value);
		if(this.model)		formdata.append('model', 	this.model.value);
		if(this.price)		formdata.append('price', 	this.price.value);
		for(var fi in this.state.previews) {
			let ff = this.state.previews[fi];
			if(!ff)
				continue;
	       	formdata.append('preview_file_'+fi, ff.file, ff.file.name);
      	}
      	//@ts-ignore
      	//formdata.append('prevfile', this.state.previews[0].file, this.state.previews[0].file.name);
		xhr.send(formdata);//file
	}

	uploadScreenshot(event: React.ChangeEvent<HTMLInputElement>, index: number) {
		if(event.target.files === null)
			return;

		var _file = event.target.files[0];
        var reader = new FileReader();
        reader.onloadend = () => {
         	let new_previews = this.state.previews;
         	new_previews[index] = {file: _file, url: reader.result};
         	this.setState({
         		previews: new_previews
         	});
        }
        if(_file)
            reader.readAsDataURL(_file);
	}

	renderFocused(focused: SchemaJSON) {
		var preview_srcs = focused.files ? focused.files.split(';') : [];

		return <div className='focused_container'>
			<div><button className='clean small_button' 
				onClick={()=>{this.setState({focused: null})}}>Wróć</button></div>
			<div className='input_grid'>
				<label>Marka:</label><div>{focused.mark}</div>
				<label>Model:</label><div>{focused.model}</div>
				<label>Cena:</label><div>{parseFloat(focused.price).toLocaleString('pl-PL')} PLN</div>
				<label>Ilość osób:</label><div>{focused.capacity}</div>
			</div>
			<div>{preview_srcs.map((_src, i) => {
				let path = `${Config.api_server_url}/uploaded/${_src}`;
				return <div key={i} className='large_preview'>
					<img src={path}></img>
					<a href={path} target='_blank' className='open'></a>
				</div>;
			})}</div>
			<div><button className='clean small_button' 
				onClick={()=>{this.setState({focused: null})}}>Wróć</button></div>
		</div>;
	}

	renderEntry(entry: SchemaJSON, index: number) {
		var preview_src = (entry.files||'').split(';')[0];
		//console.log(preview_src);
		return <div className='entry' key={index} onClick={() => this.setState({focused: entry})}>
			<div className='mark'>{entry.mark}</div>
			<div className='capacity'>{entry.capacity}</div>
			<div className='preview' style={{
				backgroundImage: `url('${Config.api_server_url}/uploaded/${preview_src}')`
			}}></div>
			<div className='model'>{entry.model}</div>
			<div className='price'>{parseFloat(entry.price).toLocaleString('pl-PL')} PLN</div>
		</div>;
	}

	render() {
		if(this.state.adding_menu) {
			return <Content>
				<section className='stock_exchange_main container'>
					<article className='input_grid'>
						<label>Marka:</label><input ref={el => this.mark=el} type='text'/>
						<label>Model:</label><input ref={el => this.model=el} type='text'/>
						<label>Ilość osób:</label><input ref={el => this.capacity=el} type='number'/>
						<label>Cena:</label><input ref={el => this.price=el} type='number'/>
					</article>
					<div className='files_info'>Obrazy jpg/png, maksymalny rozmiar: 1MB.</div>
					<div className='screens_input'>
						{this.state.previews.map((p, i) => {
							//ref={(input) => this.fileInput = input}
							return <div key={i} className='screen_uploader' style={{
								backgroundImage: p!==null ? `url("${p.url}")` : ''
							}}>{p ? 'Wybierz inny plik' : 'Wybierz plik'}
								<input name='screen_file'
									accept="image/png, image/jpeg" type='file' 
									onChange={ (el) => this.uploadScreenshot(el, i) } />
								{
									this.state.previews.length > 1 && 
										<button className='clean close_btn' onClick={() => {
											let new_previews = this.state.previews;
											if(new_previews.length > 1)
												new_previews.splice(i, 1);
											this.setState({previews: new_previews});
										}}></button>
								}
							</div>;
						})}
						<button className='clean add_btn' onClick={() => {
							let new_previews = this.state.previews;
							if(new_previews.length < 10)//maximum number of preview screens
								new_previews.push(null);
							this.setState({previews: new_previews});
						}}>+</button>
					</div>
					<div>
						<button className='clean small_button' style={{backgroundColor: '#33691E'}}
							onClick={this.sendEntry.bind(this)}>Dodaj</button>
						<button className='clean small_button' style={{backgroundColor: '#b71c1c'}}
							onClick={()=>this.setState({adding_menu: false})}>Anuluj</button>
					</div>
					<div>{this.state.sending_status===STATUS.UNKNOWN ? '' : (
						this.state.sending_status===STATUS.SENDING ? 'Wysyłanie...' : (
							this.state.sending_status===STATUS.ERROR ? 'Nie udało się :(' : 
								'Sukces :) Przekierowanie za chwilę.'
						)
					)}</div>
				</section>
			</Content>;
		}
		////////////////////////////////////////////////////////////////////////////
		return <Content>
			<section className='stock_exchange_main container'>
				<article>
					{this.state.error && <span className='error'>{this.state.error}</span>}
					{this.state.loading && <Loader color='#f44336' />}
					{!this.state.loading && (this.state.focused ? 
							this.renderFocused(this.state.focused) :
							<div className='entries_container'>
								{this.state.data.map(this.renderEntry.bind(this))}
							</div>
						)
					}
				</article>
				{this.state.permissions === PERMISSIONS.ADMIN && <div style={{textAlign: 'right'}}>
					<hr/>
					<button className='clean add_btn'
						onClick={()=>this.setState({adding_menu: true})}>+</button>
				</div>}
			</section>
		</Content>;
	}
}