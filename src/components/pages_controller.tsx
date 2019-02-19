import * as React from 'react';

import './../styles/pages_controller.scss';

interface PagesLinkProps {
	page: number;
	page_capacity: number;
	items: number;
	onChange: (page: number) => void;
}

export default class extends React.Component<PagesLinkProps, any> {
	static defaultProps = {
		page: 0,
		page_capacity: 20
	};

	constructor(props: PagesLinkProps) {
		super(props);

		// console.log(this.props);
	}

	private makeBlock(i: number, is_current = false) {
		return <button key={i} className={is_current ? 'current' : ''}
			onClick={() => this.props.onChange(i)}>{i+1}</button>;
	}

	render() {
		let total_pages = Math.ceil(this.props.items / this.props.page_capacity);

		const visible_page_buttons = 5;//should be odd integer
		const page_shift = Math.floor(visible_page_buttons/2);
		const min_page = Math.max(0, this.props.page-page_shift);
		const max_page = Math.min(total_pages-1, this.props.page+page_shift);

		return <div className='pages_controller'>
			{min_page > 0 && this.makeBlock(0)}
			{min_page > 0 && <span>...</span>}
			{(() => {
				var out = [];
				for(let i=min_page; i<=max_page; i++)
					out.push( this.makeBlock(i, i === this.props.page) );
				return out;
			})()}
			{max_page < total_pages-1 && <span>...</span>}
			{max_page < total_pages-1 && this.makeBlock(total_pages-1)}
		</div>;
	}
}