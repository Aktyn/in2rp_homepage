import * as React from 'react';
import { render } from 'react-dom';
import { BrowserRouter, Route } from 'react-router-dom';

import './styles/normalize.css';
import './styles/main.scss';

import Layout from './pages/layout';
import Home from './pages/home';
import Whitelist from './pages/whitelist';

render(
    <BrowserRouter>
    	<Layout>
    		<Route path="/" onLeave={() => console.log('home')} exact component={Home} />
    		<Route path="/wl" onLeave={() => console.log('wl')} component={Whitelist} />
    	</Layout>
  	</BrowserRouter>,
    document.getElementById('page'),
);