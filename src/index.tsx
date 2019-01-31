import Config from './config';
if(process.env.NODE_ENV !== 'development' && location.hostname !== 'localhost' &&
	location.hostname.replace(/^www\./i, '') !== Config.hostname) 
{
	location.hostname = Config.hostname;
}

//disable logs and errors in production
if(process.env.NODE_ENV !== 'development') {
	console.log('%cLogi wyłączone. Nie ma testowania na produkcji.\n¯\\_(ツ)_/¯', 
		'color: #f44336; font-weight: bold; font-size: 25px;');
	console.log = console.error = console.info = console.trace = function(){};
}

import DiscordSession from './components/discord_session';
DiscordSession.restoreSession().then(res => {
	console.log('session:', res);
}).catch(e => {
	try {
		var info;
		if(document && (info = document.getElementById('server_status_info')))
		 	info.innerText = 'Brak połączenia z serwerem.';
	}
	catch(e) {
		console.error(e);
	}
});

import * as React from 'react';
import { render } from 'react-dom';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import './styles/main.scss';
import './styles/common.scss';

import Layout from './components/layout';
import Home from './pages/home';
import Whitelist from './pages/whitelist';

import NotFound from './pages/not_found';

import Loadable from "react-loadable";
import Loader from './components/loader';

function __async(_loader: () => any) {
	return Loadable({
		loader: _loader,
		loading: Loader
	});
}

const AsyncPages = {
	Rules: __async(
		() => import(/* webpackChunkName: "rules", webpackPrefetch: true */ "./pages/rules")),

	DiscordLogin: __async(
		() => import(/* webpackChunkName: "login", webpackPrefetch: true */ "./pages/discord_login")),

	WlRequests: __async(
		() => import(/* webpackChunkName: "wl_reqs", webpackPrefetch: true */ "./pages/wl_requests")),

	LogsManager: __async(
		() => import(/* webpackChunkName: "logs", webpackPrefetch: true */ "./pages/logs_manager")),

	AdminsManager: __async(
		() => import(/*webpackChunkName: "admins", webpackPrefetch: true */ "./pages/admins_manager")),

	Players: __async(
		() => import(/*webpackChunkName: "players", webpackPrefetch: true */ "./pages/players")),

	PlayerPage: __async(
		() => import(/*webpackChunkName: "player_pg", webpackPrefetch: true */ "./pages/player_page")),

	Gallery: __async(
		() => import(/* webpackChunkName: "gallery", webpackPrefetch: true */ "./pages/gallery")),

	SnakeGame: __async(
		() => import(/* webpackChunkName: "snake", webpackPrefetch: true */ "./pages/snake_game")),
	
	Statistics: __async(
		() => import(/* webpackChunkName: "stats", webpackPrefetch: true */ './pages/statistics'))
};

render(
    <BrowserRouter>
    	<Layout>
    		<Switch>
	    		<Route path="/" exact component={Home} />
	    		
	    		<Route path='/login_result' component={AsyncPages.DiscordLogin} />
	    		<Route path='/wl' component={Whitelist} />
	    		<Route path='/rules' component={AsyncPages.Rules} />
	    		<Route path='/wl_requests/:category' component={AsyncPages.WlRequests} />
	    		<Route path='/wl_requests' component={AsyncPages.WlRequests} />
	    		<Route path='/logs_mng' component={AsyncPages.LogsManager} />
	    		<Route path='/admins_mng' component={AsyncPages.AdminsManager} />
	    		<Route path='/players/:id' component={AsyncPages.PlayerPage}/>
	    		<Route path='/players' component={AsyncPages.Players} />
	    		<Route path='/statistics' component={AsyncPages.Statistics} />
	    		<Route path='/gallery' component={AsyncPages.Gallery} />
	    		<Route path='/snake' component={AsyncPages.SnakeGame} />

	    		<Route component={NotFound} />
    		</Switch>
    	</Layout>
  	</BrowserRouter>,
    document.getElementById('page'),
);