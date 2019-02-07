import * as React from 'react';
import Content from './../components/content';

import Snake from './../utils/snake';
import Utils from './../utils/utils';
import Cookies from './../utils/cookies';

interface SnakeGameState {
	resolution?: {w: number; h: number};
}

const topOffset = 150;
const gameW = 800;
const gameH = 416;

export default class SnakeGame extends React.Component<any, SnakeGameState> {
	state: SnakeGameState = {
		resolution: undefined
	};

	private static current_game: Snake | null = null;

	constructor(props: any) {
		super(props);
	}

	componentDidMount() {
		const res = { w: window.innerWidth, h: window.innerHeight };
		this.setState({resolution: res});
	}

	componentWillUnmount() {
		if(SnakeGame.current_game !== null) {
			SnakeGame.current_game.destroy();
			SnakeGame.current_game = null;
		}
	}

	init(canv: HTMLCanvasElement | null) {
		if(canv && SnakeGame.current_game === null)
			SnakeGame.current_game = new Snake(canv, {}, this.onGameOver);
	}

	onGameOver() {
		//stage two with discordbot
		var cookie_token = Cookies.getCookie('discord_token');
		Utils.postRequest(
			'snake_gameover', 
			{token: cookie_token}
		).catch();//ignore any errors here
	}

	render() {
		return <Content>
			{this.state.resolution && this.state.resolution.w >= gameW && 
				this.state.resolution.h > gameH+topOffset ? 
				<canvas ref={element => this.init.call(this, element)} 
					width={gameW} height={gameH}></canvas>
				: <div style={{padding: '30px'}}>
					Rozmiar strony jest zbyt mały.<br />
					Powiększ okno przeglądarki i odśwież stronę.
				</div>
			}
		</Content>;
	}
}