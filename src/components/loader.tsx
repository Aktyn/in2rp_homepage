import * as React from 'react';
import './../styles/common.scss';

export default class extends React.Component<{color: string}, any> {
	static defaultProps = {
		color: '#f4f4f4'
	};

	constructor(props: any) {
		super(props);
	}
	render() {
		const spin_style = { backgroundColor: this.props.color };
		return <div className='spinner'>
			<div className='double-bounce1' style={spin_style}></div>
			<div className='double-bounce2' style={spin_style}></div>
		</div>;
	}
}