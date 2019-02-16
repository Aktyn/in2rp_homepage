import * as React from 'react';
import Content from './../components/content';
import Config from './../config';

// import path from 'path';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';
import './../styles/gallery.scss';

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

enum STATUS {
	UNKNOWN,
	SUCCESS,
	ERROR
}

interface GalleryState {
	file_url?: string;
	avatar_upload_status: STATUS;
}

export default class extends React.Component<any, GalleryState> {
	private fileInput: HTMLInputElement | null = null;
	//private screenPrev: HTMLDivElement | null = null;

	state: GalleryState = {
		file_url: undefined,
		avatar_upload_status: STATUS.UNKNOWN
	}

	constructor(props: any) {
		super(props);
	}

	uploadScreenshot() {
		if(this.fileInput === null || this.fileInput.files === null)
			return;

		var file = this.fileInput.files[0];
        var reader = new FileReader();
        reader.onloadend = () => {
         	//if(this.screenPrev !== null)
         	//	this.screenPrev.style.backgroundImage = `url("${reader.result}")`;
         	this.setState({
         		file_url: reader.result as string,
         		avatar_upload_status: STATUS.UNKNOWN
         	});
        }
        if(file)
            reader.readAsDataURL(file);

		//console.log('test', this.fileInput);
	}

	sendFile() {
		if(this.fileInput === null || !this.fileInput.files || this.fileInput.files.length === 0)
			return;

		var file = this.fileInput.files[0];
		var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = () => {//Call a function when the state changes.
        	if(xhr.readyState === 4) {
        		if(xhr.status === 413)//error
        			this.setState({file_url: undefined, avatar_upload_status: STATUS.ERROR});
        		else if(xhr.status === 200)//seuccess
        			this.setState({file_url: undefined, avatar_upload_status: STATUS.SUCCESS});
        	}
		};

		xhr.open("post", Config.api_server_url + '/upload_screenshot_request', true);

		var formdata = new FormData();
       	formdata.append('screen_file', file, file.name);
		xhr.send(formdata);//file
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
		//ref={el => this.screenPrev = el}
		return <Content>
			<ImageGallery items={images} lazyLoad={true} showPlayButton={false} />
			<div>
				<h2 style={{fontWeight: 'normal', paddingTop: '30px'}}>
					Posiadasz ładny screen z naszego serwera?<br/>
					Zaproponuj dodanie go do galerii wysyłając do nas plik.
				</h2>
				<div className='screen_uploader' style={{
					backgroundImage: this.state.file_url ? `url("${this.state.file_url}")` : ''
				}}>{this.state.file_url ? 'Wybierz inny plik' : 'Wybierz plik'}
					<input ref={(input) => this.fileInput = input} name='screen_file'
						accept="image/png, image/jpeg" type='file' 
						onChange={ () => this.uploadScreenshot() } />
				</div>
				{this.state.avatar_upload_status === STATUS.ERROR && <div>
					Nie można wysłać pliku.<br/>
					Maksymalny rozmiar wynosi 1MB a wspierane rozszerzenia to: .png i .jpg
				</div>}
				{this.state.avatar_upload_status === STATUS.SUCCESS && <div>
					Plik pomyślnie wysłany na serwer
				</div>}
				{this.state.file_url && <button className='clean small_button' 
					onClick={this.sendFile.bind(this)}>Wyślij</button>}
			</div>
		</Content>;
	}
}