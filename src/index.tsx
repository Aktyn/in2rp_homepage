import * as React from 'react';
import { render } from 'react-dom';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
// import Config from './config';

// import './styles/normalize.css';
import './styles/main.scss';
import './styles/common.scss';

import DiscordSession from './components/discord_session';

import Layout from './components/layout';
import Home from './pages/home';
import Whitelist from './pages/whitelist';
import Rules from './pages/rules';
import DiscordLogin from './pages/discord_login';
import WlRequests from './pages/wl_requests';
import LogsManager from './pages/logs_manager';
import AdminsManager from './pages/admins_manager';
import Gallery from './pages/gallery';
import Statistics from './pages/statistics';
import SnakeGame from './pages/snake_game';
import NotFound from './pages/not_found';

//if(location.hostname.replace(/^www\./i, '') !== Config.hostname)
//	location.hostname = Config.hostname;

render(
    <BrowserRouter>
    	<Layout>
    		<Switch>
	    		<Route path="/" exact component={Home} />
	    		
	    		<Route path='/login_result' component={DiscordLogin} />
	    		<Route path='/wl' component={Whitelist} />
	    		<Route path='/rules' component={Rules} />
	    		<Route path='/wl_requests' component={WlRequests} />
	    		<Route path='/logs_mng' component={LogsManager} />
	    		<Route path='/admins_mng' component={AdminsManager} />
	    		<Route path='/statistics' component={Statistics} />
	    		<Route path='/gallery' component={Gallery} />
	    		<Route path='/snake' component={SnakeGame} />

	    		<Route component={NotFound} />
    		</Switch>
    	</Layout>
  	</BrowserRouter>,
    document.getElementById('page'),
);

DiscordSession.restoreSession().then(res => {
	console.log('session:', res);
}).catch(e => console.error(e));