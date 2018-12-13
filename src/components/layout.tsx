import * as React from 'react';
import { withRouter } from 'react-router-dom';

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
	}

	componentDidMount() {
		this.update();
	}

	componentDidUpdate(prevProps: any) {
		if (this.props.location !== prevProps.location)//routed
			this.update();
	}

	update() {
		/*switch(this.props.location.pathname) {
			case '/': 	
				return this.setState({headerSize: 'large'});
			default:
				return this.setState({headerSize: 'small'});
		}*/
		if(this.props.location.pathname !== '/')
			this.setState({headerSize: 'small'});
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