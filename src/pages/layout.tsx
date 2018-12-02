import * as React from 'react';
import { withRouter } from 'react-router-dom';

import Header from './header';

interface LayoutState {
	headerSize: string;
}

class Layout extends React.Component<any, LayoutState> {

	state = {
		headerSize: 'large'
	};

	constructor(props: any) {
		super(props);
	}

	componentDidUpdate(prevProps: any) {
		if (this.props.location !== prevProps.location) {//routed
			console.log('new path:', this.props.location.pathname);
			switch(this.props.location.pathname) {
				case '/': 	return this.setState({headerSize: 'large'});
				case '/wl': return this.setState({headerSize: 'small'});
			}
		}
	}

	render() {
		return <div className='layout_main'>
			<Header type={this.state.headerSize} />
			{this.props.children}
		</div>;
	}
}

export default withRouter(Layout);