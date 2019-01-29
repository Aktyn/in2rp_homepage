import * as React from 'react';
import { withRouter } from 'react-router-dom';
const runtime = require('serviceworker-webpack-plugin/lib/runtime');//no types for this package

import Header from './header';
import Footer from './footer';

interface LayoutState {
	headerSize: string;
}

class Layout extends React.Component<any, LayoutState> {

	state: LayoutState = {
		headerSize: 'large'
	};

	constructor(props: any) {
		super(props);
		//disabled in dev mode
		if(process.env.NODE_ENV !== 'development' && 'serviceWorker' in navigator && 
			(window.location.protocol === 'https:' || window.location.hostname === 'localhost'))
		{ 
			runtime.register();
		}
	}

	componentDidMount() {
		this.update();
	}

	componentDidUpdate(prevProps: any) {
		if (this.props.location !== prevProps.location)//routed
			this.update();
	}

	update() {
		if(this.props.location.pathname !== '/')
			this.setState({headerSize: 'small'});
		//else
		//	this.setState({headerSize: 'large'});
	}

	render() {
		return <div className='layout_main'>
			<Header type={this.state.headerSize} />
			{this.props.children}
			<Footer />
		</div>;
	}
}

export default withRouter(Layout);