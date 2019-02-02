import * as React from 'react';

export enum QuestionType {
	DATE,
	INPUT, NUMBER_INPUT,
	TEXTAREA
}

const discord_invitation_link = 'https://discord.io/in2rp';

export interface QuestionsBlockSchema {
	[index: string]: {
		type: QuestionType, 
		content: string,
		maxlen?: number
	}
}

const CONFIG = {
	hostname: process.env.NODE_ENV === 'development' ? 'localhost' : 'in2rp.pl',
	api_server_url: process.env.NODE_ENV === 'development' ? 
		'http://localhost:1234' : 
		location.origin, //'https://in2rp.pl',

	discord_guild_id: '492333108679409674',
	discord_invitation_link: discord_invitation_link,

	short_description: <span>POLSKI SERWER ROLE&nbsp;PLAY<hr />Grand Theft Auto V</span>,

	long_description: <React.Fragment>
		<h4>Zapraszamy do wspólnej gry</h4>
		<h4>Oferujemy:</h4>
		<ul>
			<li>Profesjonalną administracje </li>
			<li>Dopracowany serwer</li>
			<li>Dużo dobrej zabawy</li>
		</ul>
	</React.Fragment>,

	short_info: <span>
		Planowana data startu: 15.02.2019 18:00.<br/>
		Zapraszamy na discord po więcej informacji.
	</span>,

	contacs: <React.Fragment>
		<h4>Pytania odnośnie serwera możesz kierować do administracji na <a target="_blank" href={discord_invitation_link}>discordzie</a>.</h4>
		<h4>Pytania odnośnie strony:</h4>
		<div>
			<span className='discord_user'>Aktyn#9473</span>
		</div>
	</React.Fragment>,

	WHITELIST_QUESTIONS: {
		OOC: {
			'imie': 	{type: QuestionType.INPUT, content: 'Imię', maxlen: 64},
			'data_ur': 	{type: QuestionType.DATE, content: 'Data urodzenia'},
			'steam_id': {type: QuestionType.NUMBER_INPUT, content: 'SteamID64', maxlen: 64},
			'o_rp': 	{type: QuestionType.TEXTAREA, content: 'Co wiesz o RP?', maxlen: 512},
		} as QuestionsBlockSchema,
		IC: {
			'imie_nazwisko': 	{type: QuestionType.INPUT, content: 'Imię i nazwisko', maxlen: 128},
			'wiek': 			{type: QuestionType.NUMBER_INPUT, content: 'Wiek', maxlen: 3},
			'historia': 		{type: QuestionType.TEXTAREA, content: 'Historia postaci', maxlen: 6000},
			'plan_na_postac': 	{type: QuestionType.TEXTAREA, content: 'Plan na postać', maxlen: 4096},
			'kreatywna_akcja': {
				type: QuestionType.TEXTAREA, 
				content: 'Jedna kreatywna akcja IC z udziałem twojej postaci',
				maxlen: 6000
			}
		} as {[index: string]: {type: QuestionType, content: string}}
	}
};

export default CONFIG;