import * as React from 'react';
import Content from './../components/content';

// import path from 'path';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';

//@ts-ignore
// import homeIcon from '../img/gallery/1.png';

var img_sources: string[] = [];
for(var i=1; i<=1; i++)
	img_sources.push( require(`../img/gallery/${i}.png`) );

export default class extends React.Component<any, any> {
	constructor(props: any) {
		super(props);
	}

	render() {
		//const gallery_path = path.join('static', 'img', 'gallery');
		const images = img_sources.map(src => { 
			return{
				original: src,
	        	thumbnail: src,
	        	maxHeight: '200px'
			}
		});

		return <Content>
			<ImageGallery items={images} lazyLoad={true} showPlayButton={false} />
		</Content>;
	}
}