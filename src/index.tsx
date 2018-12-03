import * as React from 'react';
import { render } from 'react-dom';
import { BrowserRouter, Route } from 'react-router-dom';

import './styles/normalize.css';
import './styles/main.scss';

import Layout from './pages/layout';
import Home from './pages/home';
import Whitelist from './pages/whitelist';
import Rules from './pages/rules';

render(
    <BrowserRouter>
    	<Layout>
    		<Route path="/" exact component={Home} />
    		<Route path="/wl" component={Whitelist} />
    		<Route path="/rules" component={Rules} />
    	</Layout>
  	</BrowserRouter>,
    document.getElementById('page'),
);