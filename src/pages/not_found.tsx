import * as React from 'react';
import Content from './../components/content';

export default class extends React.Component<any, any> {
	constructor(props: any) {
		super(props);
	}

	render() {
		return <Content>
			<div style={{color: '#fff', margin: '20px', fontSize: '30px'}}>Page not found</div>
		</Content>;
	}
}