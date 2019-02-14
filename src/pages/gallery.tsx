import * as React from 'react';
import Content from './../components/content';

// import path from 'path';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';

//@ts-ignore
// import homeIcon from '../img/gallery/1.png';

/*var img_sources: string[] = [];
for(var i=1; i<=7; i++)
	img_sources.push( require(`../img/gallery/${i}.jpg`) );*/

function importAll(r: any) {
	let images: any = {};
	r.keys().forEach((item: any, index: any) => { images[item.replace('./', '')] = r(item); });
	return images;
}

//@ts-ignore
const img_sources: any[] = importAll(require.context('./../img/gallery', false, /\.(png|jpe?g|svg)$/));
//@ts-ignore
img_sources = Object.keys(img_sources).map(key => img_sources[key]);

//console.log(img_sources);

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