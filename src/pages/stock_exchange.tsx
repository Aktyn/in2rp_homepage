import * as React from 'react';
import { Link } from 'react-router-dom';
import Content from './../components/content';
import Loader from './../components/loader';
import Cookies from './../utils/cookies';
import Config from './../config';
import Utils from './../utils/utils';

import './../styles/stock_exchange.scss';

const enum PERMISSIONS {
	ADMIN, 
	USER
}

const enum STATUS {
	UNKNOWN,
	SENDING,
	ERROR,
	SUCCESS
}

const enum EDIT_STATUS {
	DISABLED,
	ENABLED,
	PENDING,
}

interface SortOption {
	//labels for ascending and descending modes
	labels: [string, string];
	sort_asc: (a: SchemaJSON, b: SchemaJSON) => number;
	sort_desc: (a: SchemaJSON, b: SchemaJSON) => number;
}

const SORT_OPTIONS: SortOption[] = [
	{
		labels: ['Najnowsze', 'Najstarsze'], 
		sort_asc: (a, b) => parseInt(b.timestamp) - parseInt(a.timestamp),
		sort_desc: (a, b) => parseInt(a.timestamp) - parseInt(b.timestamp)
	},
	{
		labels: ['Ilość osób ▲', 'Ilość osób ▼'],
		sort_asc: (a, b) => a.capacity - b.capacity,
		sort_desc: (a, b) => b.capacity - a.capacity
	},
	{
		labels: ['Cena ▲', 'Cena ▼'],
		sort_asc: (a, b) => parseInt(a.price) - parseInt(b.price),
		sort_desc: (a, b) => parseInt(b.price) - parseInt(a.price)
	},
	{
		labels: ['Model A-Z', 'Model Z-A'],
		sort_asc: (a, b) => a.model.localeCompare(b.model),
		sort_desc: (a, b) => b.model.localeCompare(a.model)
	},
	{
		labels: ['Marka A-Z', 'Marka Z-A'],
		sort_asc: (a, b) => a.mark.localeCompare(b.mark),
		sort_desc: (a, b) => b.mark.localeCompare(a.mark)
	}
];

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
	deleting_status: STATUS;
	data: SchemaJSON[];
	edit_result: STATUS;
	edit_status: EDIT_STATUS;

	delete_target_id?: number;

	previews: ({url: string | ArrayBuffer | null; file: File} | null)[];

	sorting?: SortOption;
	sort_mode: 0 | 1;
}

export default class extends React.Component<any, StockExchangeState> {
	state: StockExchangeState = {
		error: undefined,
		loading: true,
		permissions: PERMISSIONS.USER,
		adding_menu: false,
		sending_status: STATUS.UNKNOWN,
		deleting_status: STATUS.UNKNOWN,
		data: [],
		edit_result: STATUS.UNKNOWN,
		edit_status: EDIT_STATUS.DISABLED,
		delete_target_id: undefined,

		previews: [null],//determines number of possible screenshots

		sorting: undefined,
		sort_mode: 0
	};

	private mark: HTMLInputElement | null = null;
	private capacity: HTMLInputElement | null = null;
	private model: HTMLInputElement | null = null;
	private price: HTMLInputElement | null = null;

	private cancel_timeout: number | null = null;

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
        				this.setState({
    						adding_menu: false, 
        					sending_status: STATUS.UNKNOWN, 
        					previews: [null]
        				});
        				this.refresh();
        			}, 3000);
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

	deleteEntry(_id: number) {
		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		this.setState({deleting_status: STATUS.SENDING});

		if(this.cancel_timeout !== null)
			clearTimeout(this.cancel_timeout);

		Utils.postRequest(
			'delete_stock_exchange_entry', {token: cookie_token, id: _id}
		).then(res => res.json()).then((res: {result: string, admin: boolean, data: SchemaJSON[]}) => {
			//console.log(res);

			if(res['result'] !== 'SUCCESS')
				this.setState({deleting_status: STATUS.ERROR});
			else {
				this.setState({deleting_status: STATUS.SUCCESS});
				this.refresh();
			}
		}).catch(e => {
			this.setState({deleting_status: STATUS.ERROR});
			console.error(e);
		});
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

	editAction(status: EDIT_STATUS, _id: number) {
		if(status === EDIT_STATUS.PENDING)
			return;

		if(status === EDIT_STATUS.DISABLED)
			return this.setState({edit_status: EDIT_STATUS.ENABLED});

		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		//here we know that status === EDIT_STATUS.ENABLED
		this.setState({edit_status: EDIT_STATUS.PENDING, edit_result: STATUS.SENDING});

		Utils.postRequest(
			'edit_stock_exchange_entry', {
				token: cookie_token, 
				id: _id, 
				mark: this.mark === null ? '' : this.mark.value,
				capacity: this.capacity === null ? '' : this.capacity.value,
				model: this.model === null ? '' : this.model.value,
				price: this.price === null ? '' : this.price.value
			}
		).then(res => res.json()).then((res: any) => {
			//console.log(res);

			if(res['result'] !== 'SUCCESS')
				this.setState({edit_result: STATUS.ERROR, edit_status: EDIT_STATUS.DISABLED});
			else {
				this.setState({edit_result: STATUS.SUCCESS, edit_status: EDIT_STATUS.DISABLED});
				this.refresh();
			}
		}).catch(e => {
			this.setState({edit_result: STATUS.ERROR, edit_status: EDIT_STATUS.DISABLED});
			console.error(e);
		});
	}

	applySorting(options: SortOption) {
		let switch_mode = this.state.sorting === options;
		let new_mode = switch_mode ? (this.state.sort_mode === 0 ? 1 : 0) as (0|1) : 0;

		//apply sort on data array
		let sorted_data = this.state.data.sort(new_mode === 1 ? options.sort_desc : options.sort_asc);

		if(switch_mode) 
			this.setState({sort_mode: new_mode, data: sorted_data});
		else
			this.setState({sorting: options, sort_mode: 0, data: sorted_data});
	}

	renderFocused(focused?: SchemaJSON) {
		//<button className='clean small_button' 
		//	onClick={()=>{this.setState({focused: null})}}>Wróć</button>
		if(!focused) {
			return <div className='focused_container'>
				<div>
					Nie znaleziono&nbsp;
					<Link className='clean small_button' to='/stock_exchange'>Wróć</Link>
				</div>
			</div>;
		}
		var preview_srcs = focused.files ? focused.files.split(';') : [];

		return <div className='focused_container'>
			<div>
				<Link className='clean small_button' to='/stock_exchange' style={{
					marginBottom: '15px', display: 'inline-block'
				}} onClick={()=>this.setState({
					edit_result: STATUS.UNKNOWN,
					edit_status: EDIT_STATUS.DISABLED
				})}>Wróć</Link>
			</div>
			{this.state.edit_status === EDIT_STATUS.DISABLED ?
				<article className='input_grid'>
					<label>Marka:</label><div>{focused.mark}</div>
					<label>Model:</label><div>{focused.model}</div>
					<label>Cena:</label><div>
						{parseFloat(focused.price).toLocaleString('pl-PL')} PLN</div>
					<label>Ilość osób:</label><div>{focused.capacity}</div>
				</article>
				:
				<article className='input_grid'>
					<label>Marka:</label><input ref={el => this.mark=el} type='text'
						defaultValue={focused.mark}/>
					<label>Model:</label><input ref={el => this.model=el} type='text'
						defaultValue={focused.model}/>
					<label>Cena:</label><input ref={el => this.price=el} type='number'
						defaultValue={focused.price}/>
					<label>Ilość osób:</label><input ref={el => this.capacity=el} type='number'
						defaultValue={focused.capacity.toString()}/>
				</article>
			}
			<div>
				<button className='clean small_button' style={{backgroundColor: '#006064'}} 
					onClick={() => this.editAction(this.state.edit_status, focused.id)}>{
						this.state.edit_status === EDIT_STATUS.DISABLED ? 'Edycja' : 'Zatwierdź zmiany'
					}
				</button>
				{this.state.edit_status !== EDIT_STATUS.DISABLED && 
					<button className='clean small_button' style={{
						backgroundColor: '#006064', 
						marginLeft: '10px'
					}} onClick={()=>{
						if(this.state.edit_status !== EDIT_STATUS.PENDING)
							this.setState({edit_status: EDIT_STATUS.DISABLED});
					}}>Anuluj</button>
				}
				<div>{this.state.edit_result === STATUS.UNKNOWN ? '' : (
					this.state.edit_result === STATUS.SENDING ? 'Zatwierdzanie zmian...' : 
					( this.state.edit_result === STATUS.ERROR ? 'Błąd :(' : 'Sukces :)' )
				)}</div>
			</div>
			<div>{preview_srcs.map((_src, i) => {
				let path = `${Config.api_server_url}/uploaded/${_src}`;
				return <div key={i} className='large_preview'>
					<img src={path}></img>
					<a href={path} target='_blank' className='open'></a>
				</div>;
			})}</div>
			<div>
				<Link className='clean small_button' to='/stock_exchange' 
					onClick={()=>this.setState({
						edit_result: STATUS.UNKNOWN, 
						edit_status: EDIT_STATUS.DISABLED
					})}>Wróć</Link>
			</div>
		</div>;
	}

	renderEntry(entry: SchemaJSON, index: number) {
		var preview_src = (entry.files||'').split(';')[0];
		//console.log(entry);
		return <div className='entry' key={index} onClick={() => {
			this.props.history.push(`/stock_exchange/${entry.id}`);
		}}>
			<div className='mark'>{entry.mark}</div>
			<div className='capacity'>{entry.capacity}</div>
			<div className='preview'>
				<img src={`${Config.api_server_url}/uploaded/${preview_src}`} />
			</div>
			<div className='model'>{entry.model}</div>
			<div className='price'>{parseFloat(entry.price).toLocaleString('pl-PL')} PLN</div>
			{this.state.permissions === PERMISSIONS.ADMIN && <div className='options'>
				<button className='clean small_button' onClick={e => {
					if(this.state.deleting_status === STATUS.SENDING)
						return;
					if(this.state.delete_target_id === entry.id)
						this.deleteEntry(entry.id);
					else {
						this.setState({delete_target_id: entry.id, deleting_status: STATUS.UNKNOWN});
						if(this.cancel_timeout !== null)
							clearTimeout(this.cancel_timeout);
						this.cancel_timeout = setTimeout(() => {
							this.setState({delete_target_id: undefined});
						}, 5000) as never;
					}
					e.stopPropagation();
				}}>{this.state.delete_target_id !== entry.id ? 'USUŃ' : (
					this.state.deleting_status === STATUS.ERROR ? 'Błąd' : 'DEFINITYWNIE?'
				)}</button>
			</div>}
		</div>;
	}

	renderControls() {
		return <>
			<label>SORTOWANIE</label><br/>
			<div className='sort_controls'>
				{SORT_OPTIONS.map((opt, i) => {
					var is_active = this.state.sorting === opt;
					var label = opt.labels[ is_active ? this.state.sort_mode : 0 ];

					var class_name = is_active ? (this.state.sort_mode === 0 ? 'asc' : 'desc') : '';

					return <button key={i} className={class_name}
						onClick={()=>this.applySorting(opt)}>{label}</button>;
				})}
			</div>
		</>;
	}

	render() {
		if(this.state.adding_menu) {
			return <Content>
				<section className='stock_exchange_main container'>
					<article className='input_grid'>
						<label>Marka:</label><input ref={el => this.mark=el} type='text'/>
						<label>Model:</label><input ref={el => this.model=el} type='text'/>
						<label>Cena:</label><input ref={el => this.price=el} type='number'/>
						<label>Ilość osób:</label><input ref={el => this.capacity=el} type='number'/>
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
							onClick={()=>this.setState({adding_menu: false, previews: [null]})}>
							Anuluj
						</button>
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
					{!this.state.loading && (this.props.match.params.id ? 
							this.renderFocused(this.state.data.find(
								d => d.id === parseInt(this.props.match.params.id)
							)) :
							<>
								{this.renderControls()}
								<div className='entries_container'>
									{this.state.data.map(this.renderEntry.bind(this))}
								</div>
							</>
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