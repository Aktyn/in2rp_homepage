import * as React from 'react';
import Content from './../components/content';
import Cookies from './../utils/cookies';
import Config from './../config';
// import Loader from './../components/loader';

import {Line as LineChart} from 'react-chartjs-2';

import './../styles/statisitcs_admin.scss';

const CHART_OPTIONS: Chart.ChartOptions = {
	// maintainAspectRatio: false,
	title: {
		text: 'Odwiedziny strony',
		display: true,
		fontStyle: 'normal',
		padding: 10
	},
    scales: {
        yAxes: [{
            ticks: {
                beginAtZero: false
            },
            gridLines: {
            	display: true,
            	color: '#bbb',
            	lineWidth: 1,
            	zeroLineWidth: 0,
            	drawBorder: true
            }
        }],
        xAxes: [{
        	type: 'time',
        	time: {
	         	unit: 'day',
	         	displayFormats: { day: 'DD-MM-YYYY' },
	         	//minUnit: 'days'
            },
        	gridLines: {
            	display: false
            }
        }]
    },
    legend: {
    	display: true
    },
    // spanGaps
};

const DEFAULT_DATA = {
    datasets: [{
        label: 'Wszystkie',
        data: [{
		    x: new Date(Date.now()-1000*60*60*24*7),
		    y: 0
		}, {
		    x: new Date(),
		    y: 0
		}],
        backgroundColor: [
            '#e5393560',
        ],
        borderColor: [
            '#e53935',
        ],
        fill: 1,
        borderWidth: 1
    },
    {
    	label: 'Unikalne',
        data: [{
		    x: new Date(Date.now()-1000*60*60*24*7),
		    y: 0
		}, {
		    x: new Date(),
		    y: 0
		}],
        backgroundColor: [
            '#00695C60',
        ],
        borderColor: [
            '#00695C',
        ],
        borderWidth: 1
    }]
};

interface StatisticsState {
	loading: boolean;
	error?: string;
	date_from: string;
	date_to: string;
}

function fixedTo2(n: number) {
	return n < 10 ? ('0' + n) : n.toString();
}

function properFormat(timestamp: number) {//returns date in format: YYYY-MM-DD
	let dt = new Date(timestamp);
	return `${fixedTo2(dt.getFullYear())}-${fixedTo2(dt.getMonth()+1)}-${fixedTo2(dt.getDate())}`;
}

interface VisitJSON {
	count: number;
	distinct_ip: number;
	day: string;
}

export default class extends React.Component<any, StatisticsState> {
	private input_from: HTMLInputElement | null = null;
	private input_to: HTMLInputElement | null = null;
	private visits_chart: LineChart | null = null;

	state: StatisticsState = {
		loading: false,
		error: undefined,
		date_from: properFormat(Date.now() - 1000 * 60 * 60 * 24 * 7),//a week into the past
		date_to: properFormat(Date.now()),
	};

	constructor(props: any) {
		super(props);
	}

	onError(err_msg: string) {
		this.setState({
			error: err_msg, 
			loading: false
		});
	}

	refresh() {
		if(this.state.loading)
			return;
		this.setState({loading: true});
		if(this.input_from === null || this.input_to === null)
			return this.onError('Bardzo dziwny błąd');

		var cookie_token = Cookies.getCookie('discord_token');
		if(cookie_token === null)
			return this.onError('Wygląda na to, że nie jesteś zalogowany');

		//fetching data from server
		fetch(Config.api_server_url + '/get_visits', {
			method: "POST",
			mode: process.env.NODE_ENV === 'development' ? 'cors' : 'same-origin',
			headers: {"Content-Type": "application/json; charset=utf-8"},
			body: JSON.stringify({
				token: cookie_token, 
				from: this.input_from.value, 
				to: this.input_to.value
			})
		}).then(res => res.json()).then((res: {result: string; visits: VisitJSON[]}) => {
			//console.log(res);
			if(res['result'] !== 'SUCCESS' || res['visits'] === undefined) {
				let error_msg;
				switch(res['result']) {
					case 'INSUFICIENT_PERMISSIONS':
						error_msg = 'Nie masz uprawnień do tego kontentu.';
						break;
				}

				this.setState({error: error_msg || 'Nieznany błąd', loading: false});
			}
			else {
				try {
					if(this.visits_chart && this.visits_chart.chartInstance.data.datasets) {
						this.visits_chart.chartInstance.data.datasets[0].data = res['visits'].map(v=>{
							return {
								x: new Date( new Date(v.day).getTime() ),
								y: v.count
							}
						});
						this.visits_chart.chartInstance.data.datasets[1].data = res['visits'].map(v=>{
							return {
								x: new Date( new Date(v.day).getTime() ),
								y: v.distinct_ip
							}
						});
						this.visits_chart.chartInstance.update();
					}

					this.setState({
						error: undefined, 
						loading: false, 
					});
				}
				catch(e) {
					console.log(e);
					this.onError('Błąd podczas interpetacji danych z serwera');
				}
				
			}
		}).catch(e => {
			return this.onError('Niewłaściwa odpowiedź serwera');
			console.error(e);
		});
	}

	componentDidMount() {
		this.refresh();
	}

	render() {
		return <Content>
			<section className='statistics_admin_main container'>
				<article>
					{this.state.error && <span className='error'>{this.state.error}</span>}
					<div className='dates_grid'>
						<label>OD:</label>
						<input type='date' defaultValue={this.state.date_from}
							ref={el => this.input_from = el} />
						<label>DO:</label>
						<input type='date' defaultValue={this.state.date_to} 
							ref={el => this.input_to = el} />
					</div>
					<div>
						<button className='clean refresh_btn' onClick={this.refresh.bind(this)} >
							{this.state.loading ? 'Ładowanie' : 'Odśwież'}
						</button>
					</div>
					<LineChart width={600} height={400} ref={chart => this.visits_chart = chart}
						data={DEFAULT_DATA} options={CHART_OPTIONS} />
				</article>
			</section>
		</Content>;
	}
}