import * as React from 'react';

export default class extends React.Component<any, any> {
	constructor(props: any) {
		super(props);
	}

	render() {
		return <main className='content'>{this.props.children}</main>;
	}
}