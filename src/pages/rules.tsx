import * as React from 'react';
// import { Link } from 'react-router-dom';
import Content from './content';

import Rules from './../rules_template';
import './../styles/rules.scss';

export default class extends React.Component<any, any> {
	constructor(props: any) {
		super(props);
	}

	render() {
		return <Content>
			<main className='rules_main'>
				<Rules />
			</main>
		</Content>;
	}
}