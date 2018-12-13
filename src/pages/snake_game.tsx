import * as React from 'react';
import Content from './../components/content';

import Snake from './../utils/snake';

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

	private snake?: Snake;

	constructor(props: any) {
		super(props);
	}

	componentDidMount() {
		const res = { w: window.innerWidth, h: window.innerHeight };
		this.setState({resolution: res});
	}

	componentWillUnmount() {
		if(this.snake)
			this.snake.destroy();
	}

	init(canv: HTMLCanvasElement | null) {
		if(canv)
			this.snake = new Snake(canv);
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