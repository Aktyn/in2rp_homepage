import * as React from 'react';
import './../styles/common.scss';
import Loadable from "react-loadable";

interface LoaderProps extends Loadable.LoadingComponentProps {
	color: string;
	isLoading: boolean;
    pastDelay: boolean;
    timedOut: boolean;
    error: any;
	retry: () => void;
}

export default class extends React.Component<LoaderProps, any> {
	static defaultProps = {
		color: '#f4f4f4',
		isLoading: true,
		pastDelay: false,
		timedOut: false,
		error: undefined,
		retry: () => {}
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