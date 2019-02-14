import * as React from 'react';
import Content from './../components/content';

var notFoundIcon = require('../img/not_found_icon.png');

export default class extends React.Component<any, any> {
	constructor(props: any) {
		super(props);
	}

	render() {
		return <Content>
			<div style={{color: '#fff', margin: '20px', fontSize: '30px'}}>Page not found</div>
			<div style={{overflow: 'hidden'}}><img src={notFoundIcon} className='rolling_ball' /></div>
		</Content>;
	}
}