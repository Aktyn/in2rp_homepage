const SHADOW_OFFSET = 3;
const MAX_NON_LINEAR_SPEED = 250;

export interface GameSettings {
	block_resolution: number;
	block_color_light: string;
	block_color_dark: string;

	snake_color: string;
	snake_line_thickness: number;

	food_color: string;
	food_scale: number;
	foods_count: number;

	help_text: string;
	game_over_text: string;

	step_times: number[];//defines game speed (delay between steps in miliseconds)
	acceleration_interval: number;//duration of each step_time
}

const defaultSettings: GameSettings = {
	block_resolution: 32,
	//just like chessboard grid - two colors needed
	block_color_light: '#607D8B',
	block_color_dark: '#546E7A',

	snake_color: '#ef5350',
	snake_line_thickness: 0.25,

	food_color: '#81C784',
	food_scale: 0.66,
	foods_count: 5,

	help_text: 'Use arrows to control snake.\nPress enter to start the game.',
	game_over_text: 'Game Over\nPress enter to start new game.',

	step_times: [450, 350, 300, 250, 200, 150],//speed levels
	acceleration_interval: 15000
};

interface GridPos {
	x: number;
	y: number;
}

interface FoodSchema extends GridPos {
	scale: number;
}

enum Direction {
	left, right, up, down
}

function mix(val1: number, val2: number, factor: number) {
	return val1 * factor + val2 * (1.0 - factor);
}

function darkenColor(color: string) {//assumption - string starts with #
	color = '#' + color.substring(1).split('').map(c => {
		return Math.max(0, parseInt('0x'+c)-4).toString(16);
	}).join('');
	return color;
}

export default class {
	private settings = defaultSettings;
	private onGameOver?: () => void;

	private running = false;
	private speed = 0;
	private timer = 0;

	private width: number;
	private height: number;

	private grid_w: number;
	private grid_h: number;

	private steering: number[] = [];//-1 => left; 1 => right
	private linear_moving = false;

	private ctx: CanvasRenderingContext2D;

	private player: SnakePlayer;
	private snake_color_dark: string;

	private foods: FoodSchema[] = [];
	private food_color_dark: string;

	private onKeyDown: (e: KeyboardEvent) => void;

	private time_to_next_step: number;

	constructor(canvas: HTMLCanvasElement, user_settings?: Partial<GameSettings>, onOver?: ()=>void) {
		this.settings = defaultSettings;
		if(user_settings)
			Object.assign(this.settings, user_settings);

		this.onGameOver = onOver;

		this.width = canvas.getBoundingClientRect().width;
		this.height = canvas.getBoundingClientRect().height;

		this.grid_w = (this.width / this.settings.block_resolution) | 0;
		this.grid_h = (this.height / this.settings.block_resolution) | 0;

		this.ctx = canvas.getContext('2d', {antialias: true}) as CanvasRenderingContext2D;
		this.ctx.lineWidth = this.settings.block_resolution * this.settings.snake_line_thickness;
		this.ctx.lineCap = 'round';
		this.ctx.lineJoin = 'round';

		this.player = new SnakePlayer((this.grid_w/2)|0, (this.grid_h-4)|0,
			this.settings.block_resolution, this.settings.snake_color);

		for(var i=0; i<this.settings.foods_count; i++)
			this.foods.push({
				x: (Math.random() * this.grid_w) | 0,
				y: (Math.random() * this.grid_h) | 0,
				scale: 0
			});

		this.snake_color_dark = darkenColor(this.settings.snake_color);
		this.food_color_dark = darkenColor(this.settings.food_color);

		this.drawGrid();
		this.drawPlayer();//bottom of the grid
		this.drawHelp();

		this.onKeyDown = e => this.onKey(e);

		this.time_to_next_step = this.settings.step_times[0];

		window.addEventListener('keydown', this.onKeyDown, true);

		//this.run();//for testing
	}

	destroy() {
		this.running = false;
		window.removeEventListener('keydown', this.onKeyDown, true);
	}

	private onKey(e: KeyboardEvent) {
		if(e.keyCode === 13 && this.running === false)
			this.run();
		
		if(this.steering.length < 3) {
			if(e.keyCode === 37 || e.keyCode == 65)
				this.steering.push(-1);
			else if(e.keyCode === 39 || e.keyCode === 68)
				this.steering.push(1);
		}

		if(e.keyCode >= 37 && e.keyCode <= 40)//arrow keys
			e.preventDefault();
	}

	private run() {
		this.running = true;
		this.speed = this.settings.step_times[0];
		this.drawGrid();
		this.steering = [];
		this.timer = 0;
		this.linear_moving = false;
		//this.step_index = 0;
		this.player.setPos((this.grid_w/2)|0, (this.grid_h-2)|0);
		this.drawPlayer();

		var last = 0, dt = 0;
		var tick = (time: number) => {
			dt = time - last;
			last = time;
			if(this.running) {
				this.update(Math.min(dt, 1000));
				requestAnimationFrame(tick);
			}
		};

		//starting main game loop
		tick(0);
	}

	private gameOver() {
		this.running = false;

		this.drawText(this.settings.game_over_text);

		if(this.onGameOver)
			this.onGameOver();
	}

	private update(dt: number) {//dt - time since last frame in miliseconds
		//redrawing grid around current snake position and it's tail
		this.clearPlayer();
		this.timer += dt;

		if((this.time_to_next_step -= dt) < 0) {
			if(this.step()) {
				this.drawGrid();
				this.drawScore();
				this.drawPlayer();
				this.drawFoods(0);
			}
			
			let speed_level = Math.min(this.settings.step_times.length-1,
				(this.timer / this.settings.acceleration_interval) | 0);
			this.speed = this.settings.step_times[speed_level];
			this.time_to_next_step += this.speed;
			if(this.speed <= MAX_NON_LINEAR_SPEED)
				this.linear_moving = true;
		}
		else {
			let step_factor = 1.0 - this.time_to_next_step / this.speed;
			if(step_factor <= 0.5 && this.steering.length > 0 && this.player.canTurn()) {
				this.player.turn(this.steering.shift());
				//this.steering = 0;
			}
			this.drawScore();
			this.drawFoods(dt);
			this.drawPlayer(step_factor);
		}
	}

	private isGridEmpty(p: GridPos) {
		for(var food of this.foods)
			if(this.pointsEqual(p, food)) return false;
		for(var seg of this.player.segments)
			if(this.pointsEqual(p, seg)) return false;
		return true;
	}

	private onFoodCollected(food: FoodSchema) {
		var rand_x, rand_y;
		do {
			rand_x = (Math.random() * this.grid_w) | 0;
			rand_y = (Math.random() * this.grid_h) | 0;
		} while( this.isGridEmpty({x: rand_x, y: rand_y}) === false );

		food.x = rand_x;
		food.y = rand_y;
		food.scale = 0;

		this.player.grow();
	}

	private pointsEqual(p1: GridPos, p2: GridPos) {
		return p1.x === p2.x && p1.y === p2.y;
	}

	private step() {
		//this.step_index++;
		this.player.move();
		var crashed = false;
		for(var i=1; i<this.player.segments.length; i++) {
			if(this.pointsEqual(this.player.segments[i], this.player.pos))
				crashed = true;
		}
		
		if(this.player.pos.y < 0 || this.player.pos.y >= this.grid_h || 
			this.player.pos.x < 0 || this.player.pos.x >= this.grid_w || crashed) 
		{
			this.drawPlayer();
			this.gameOver();
			return false;
		}

		for(var food of this.foods) {
			if(this.pointsEqual(food, this.player.pos))
				this.onFoodCollected(food);
		}

		return true;
	}

	private drawBlock(x: number, y: number) {
		this.ctx.fillStyle = (x + y)%2 ? 
			this.settings.block_color_dark : this.settings.block_color_light;

		this.ctx.fillRect(this.settings.block_resolution*x, this.settings.block_resolution*y, 
			this.settings.block_resolution, this.settings.block_resolution);
	}

	private drawGrid() {
		for(var x=0; x<=this.grid_w; x++) {
			for(var y=0; y<=this.grid_h; y++) {
				this.drawBlock(x, y);
			}
		}
	}

	private drawCircle(x: number, y: number, radius: number, color: string, offsetY = 0) {
		this.ctx.fillStyle = color;
		this.ctx.beginPath();
			this.ctx.arc(
				this.blockC(x), 
				this.blockC(y) + offsetY,
				radius, 0, Math.PI*2, false
			);
		this.ctx.fill();
	}

	private drawFoods(delta: number) {
		for(var food of this.foods) {
			this.drawBlock(food.x, food.y);

			food.scale = Math.min(this.settings.food_scale, food.scale+delta*0.001);
			var r = this.settings.block_resolution/2 * food.scale;

			this.drawCircle(food.x, food.y, r, this.food_color_dark, SHADOW_OFFSET);
			this.drawCircle(food.x, food.y, r, this.settings.food_color);
		}
	}

	private drawScore() {
		this.drawBlock(0, 0);
		this.drawBlock(1, 0);

		this.ctx.fillStyle = '#fff';
		this.ctx.font = `${10}px Helvetica`;
		this.ctx.textAlign = 'center';

		this.ctx.fillText(this.player.segments.length.toString(), 
			this.settings.block_resolution/2, this.settings.block_resolution/2);
	}

	private drawHelp() {
		this.drawText(this.settings.help_text);
	}

	private drawText(text: string) {
		let hh = Math.min(this.height/4, 20);

		this.ctx.fillStyle = '#fff';
		this.ctx.font = `${hh}px Helvetica`;
		this.ctx.textAlign = 'center';

		text.split('\n').forEach((line, i, lines) => {
			this.ctx.fillText(line, this.width/2, this.height/2 - (lines.length/2-i)*hh*1.2);
		});
	}

	private clearPlayer() {
		for(var segment of this.player.segments)
			this.drawBlock(segment.x, segment.y);
		let next_block = this.player.getNextBlock();
		this.drawBlock(next_block.x, next_block.y);
	}

	private blockC(index: number) {//shorthand function
		return this.settings.block_resolution * (index + 0.5);
	}

	private drawPlayer(transition_factor = 0) {
		this.drawPlayerLayer(transition_factor, this.snake_color_dark, SHADOW_OFFSET);
		this.drawPlayerLayer(transition_factor, this.settings.snake_color, 0);
	}

	private drawPlayerLayer(transition_factor: number, color: string, offsetTop: number) {
		//calculating head coords
		var move_factor, tail_factor;
		
		if(this.linear_moving) {
			move_factor = transition_factor;
			tail_factor = transition_factor;
		}
		else {
			var speed_factor = this.speed === 0 ? 0 : (this.speed - MAX_NON_LINEAR_SPEED) /
				(this.settings.step_times[0] - MAX_NON_LINEAR_SPEED);
			move_factor = Math.pow(transition_factor, 1 + speed_factor);
			tail_factor = Math.pow(transition_factor, 1 - speed_factor*0.5);
		}
		let next_block = this.player.getNextBlock();
		let px = mix(next_block.x, this.player.pos.x, move_factor);
		let py = mix(next_block.y, this.player.pos.y, move_factor);
		let xx = this.blockC(px);
		let yy = this.blockC(py);
		let rot_factor = Math.pow(transition_factor, 0.25);
		//let xx = this.settings.block_resolution * (this.player.pos.x+0.5);
		//let yy = this.settings.block_resolution * (this.player.pos.y+0.5);

		///////////////////////////////////////////////////////////////////////////////////

		if(this.player.getRot() > this.player.saved_rot+Math.PI)
			this.player.saved_rot = Math.PI*2 - this.player.saved_rot;
		else if(this.player.getRot()+Math.PI < this.player.saved_rot)
			this.player.saved_rot = this.player.saved_rot - Math.PI*2;
		
		let rot = mix(this.player.getRot(), this.player.saved_rot, rot_factor);

        ///////////////////////////////////////////////////////////////////////////////////

		this.ctx.strokeStyle = color;
		this.ctx.lineWidth = this.settings.block_resolution * this.settings.snake_line_thickness;
		
		this.ctx.beginPath();
		this.ctx.moveTo(xx, yy+offsetTop);

		for(var i=0; i<this.player.segments.length-1; i++) {
			let curr_x = this.blockC( this.player.segments[i].x );
			let curr_y = this.blockC( this.player.segments[i].y );

			let next_x = this.blockC( this.player.segments[i+1].x );
			let next_y = this.blockC( this.player.segments[i+1].y );
			
			if(i === this.player.segments.length-2) {
				next_x = mix(curr_x, next_x, tail_factor);
				next_y = mix(curr_y, next_y, tail_factor);
				this.ctx.quadraticCurveTo(curr_x, curr_y+offsetTop, next_x, next_y+offsetTop);
			}
			else {
				var xc = (curr_x + next_x) / 2;
      			var yc = (curr_y + next_y) / 2;
				this.ctx.quadraticCurveTo(curr_x, curr_y+offsetTop, xc, yc+offsetTop);
			}
		}
		
		this.ctx.stroke();

		///////////////////////////////////////////////////////////////////////////////////
		//drawing head
		this.ctx.save();
        this.ctx.translate(xx, yy);
        this.ctx.rotate(rot);
        this.ctx.translate(-xx, -yy);
        let fixX = Math.cos(rot) * SHADOW_OFFSET;
        let fixY = Math.sin(rot) * SHADOW_OFFSET;
        this.ctx.drawImage(this.player.texture_shadow,
        	xx-this.settings.block_resolution/2 + fixY, yy-this.settings.block_resolution/2 + fixX);
        this.ctx.drawImage(this.player.texture, 
        	xx-this.settings.block_resolution/2, yy-this.settings.block_resolution/2);
        
        this.ctx.restore();
	}
}

class SnakePlayer {
	static readonly scale = 0.8;//0.66;

	readonly texture: HTMLCanvasElement;
	readonly texture_shadow: HTMLCanvasElement;

	public saved_rot = 0;
	private turned = false;

	private direction = Direction.up;

	public segments: GridPos[] = [];

	constructor(_x: number, _y: number, resolution: number, color: string) {
		this.setPos(_x, _y);

		this.texture = document.createElement('canvas');
		let ctx = this.texture.getContext('2d', {antialias: true}) as CanvasRenderingContext2D;
		this.drawLayer(ctx, resolution, color, SnakePlayer.scale);
		this.drawLayer(ctx, resolution, '#fff', SnakePlayer.scale*0.66);

		this.texture_shadow = document.createElement('canvas');
		let ctx2 = this.texture_shadow.getContext('2d', {antialias: true}) as CanvasRenderingContext2D;
		this.drawLayer(ctx2, resolution, darkenColor(color), SnakePlayer.scale);
	}

	setPos(_x: number, _y: number) {
		this.direction = Direction.up;
		this.segments = [];
		for(let i=0; i<3; i++)
			this.segments.push({x: _x, y: _y+i});
	}

	private drawLayer(ctx: CanvasRenderingContext2D, resolution: number, color: string, scale: number){
		ctx.fillStyle = color;
		ctx.translate(resolution/2, resolution/2);
		ctx.scale(scale, scale);
		ctx.translate(-resolution/2, -resolution/2);
		ctx.beginPath();
			ctx.moveTo(resolution/2, 0);

			ctx.lineTo(resolution*0.85, resolution/3);
			ctx.lineTo(resolution*0.7, resolution);
			ctx.lineTo(resolution*0.3, resolution);
			ctx.lineTo(resolution*0.15, resolution/3);
			
		ctx.fill();
		ctx.resetTransform();
	}

	grow() {
		this.segments.push({
			x: this.segments[this.segments.length-1].x,
			y: this.segments[this.segments.length-1].y
		});
	}

	move() {
		for(var i=this.segments.length-1; i>0; i--) {
			this.segments[i].x = this.segments[i-1].x;
			this.segments[i].y = this.segments[i-1].y;
		}
		switch(this.direction) {
			case Direction.up:		this.segments[0].y--;	break;
			case Direction.down:	this.segments[0].y++;	break;
			case Direction.left:	this.segments[0].x--;	break;
			case Direction.right:	this.segments[0].x++;	break;
		}
		this.turned = false;
		this.saved_rot = this.getRot();
	}

	canTurn() {
		return !this.turned;
	}

	turn(dir = 0) {
		if(!this.canTurn())
			return;
		this.turned = true;
		if(dir === -1) {
			switch(this.direction) {
				case Direction.up:		this.direction = Direction.left;	break;
				case Direction.down:	this.direction = Direction.right;	break;
				case Direction.left:	this.direction = Direction.down;	break;
				case Direction.right:	this.direction = Direction.up;	break;
			}
		}
		if(dir === 1) {
			switch(this.direction) {
				case Direction.up:		this.direction = Direction.right;	break;
				case Direction.down:	this.direction = Direction.left;	break;
				case Direction.left:	this.direction = Direction.up;	break;
				case Direction.right:	this.direction = Direction.down;	break;
			}
		}
	}

	/*updateRotation() {
		switch(this.direction) {
			case Direction.up:		this.rot = 0;	break;
			case Direction.down:	this.rot = Math.PI;	break;
			case Direction.left:	this.rot = -Math.PI/2;	break;
			case Direction.right:	this.rot = Math.PI/2;	break;
		}
	}*/
	getRot() {
		switch(this.direction) {
			case Direction.up:		return 0;
			case Direction.down:	return Math.PI;
			case Direction.left:	return Math.PI/2*3;
			case Direction.right:	return Math.PI/2;
		}
	}

	get pos() {
		return this.segments[0];
	}

	getNextBlock() {
		switch(this.direction) {
			default:
			case Direction.up: return {x: this.pos.x, y: this.pos.y-1};
			case Direction.down: return {x: this.pos.x, y: this.pos.y+1};
			case Direction.left: return {x: this.pos.x-1, y: this.pos.y};
			case Direction.right: return {x: this.pos.x+1, y: this.pos.y};
		}
	}
}