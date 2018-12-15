import * as React from 'react';

export enum QuestionType {
	DATE,
	INPUT,
	TEXTAREA
}

export default {
	hostname: process.env.NODE_ENV === 'development' ? 'localhost' : 'in2rp.pl',
	api_server_url: process.env.NODE_ENV === 'development' ? 
		'http://localhost:1234' : 
		location.origin, //'http://in2rp.pl',

	short_description: <span>Polski serwer Role&nbsp;Play<br />Grand Theft Auto V</span>,

	long_description: <React.Fragment>
		<h4>Zapraszamy do wspólnej gry</h4>
		<h4>Oferujemy:</h4>
		<ul>
			<li>Dużo dobrej zabawy</li>
		</ul>
	</React.Fragment>,

	short_info: <span>
		Start wkrótce.<br/>
		Dołącz do naszego discorda by być na bieżąco.
	</span>,

	contacs: <React.Fragment>
		<h4>Pytania odnośnie serwera możesz kierować do:</h4>
		<div>
			<span className='discord_user'>Olka#1479</span><br/>
			<span className='discord_user'>Edennn#8791</span>
		</div>
		<h4>Pytania odnośnie strony:</h4>
		<div>
			<span className='discord_user'>Aktyn#9473</span>
		</div>
	</React.Fragment>,

	WHITELIST_QUESTIONS: {
		'data_ur': {
			type: QuestionType.DATE, 		
			content: 'Data urodzenia:'
		},
		'o_rp': { 		
			type: QuestionType.TEXTAREA, 	
			content: 'Co wiesz o RP?'
		},
		'dosw': { 		
			type: QuestionType.TEXTAREA, 	
			content: 'Jakie masz doświadczenie w RP i co odgrywałeś wcześniej?'
		},
		'postacie': { 	
			type: QuestionType.TEXTAREA,	
			content: 'Jakie postacie zamierzasz odgrywać na naszym serwerze?'
		},
		'czy_stream': {
			type: QuestionType.INPUT, 		
			content: 'Streamujesz lub nagrywasz? Jeżeli tak to poniżej wklej link do twojego kanału.'
		},
		'Q1_jps': { 	
			type: QuestionType.TEXTAREA, 	
			content: 'Jedziesz pojazdem sportowym, przed sobą widzisz ciężarówkę wypełnioną kasą. Postanawiasz ją ramować i finalnie udaje Ci się. Okradasz pojazd i uciekasz. Czy akcja została poprawnie wykonana? Odpowiedź uzasadnij.'
		},
		'Q2_uc': { 	
			type: QuestionType.TEXTAREA, 	
			content: 'Uciekasz samochodem osobowym przed policją. Zjeżdżasz z autostrady w stronę góry. Postanawiasz wyskoczyć z tej góry aby uciec przed policją. Udaję Ci się przeżyć ten skok, a także uciekłeś przed pościgiem. Czy akcja została poprawnie wykonana? Odpowiedź uzasadnij.'
		},
		'Q3_napad': { 	
			type: QuestionType.TEXTAREA, 	
			content: 'Planujesz napad na sklep. Aktualnie na wyspie przebywa dwóch policjantów. Postanawiasz razem z kolegą zacząć strzelać i zwabić do siebie policjantów. Udaje się wam to i bierzecie ich za zakładników. Po tym napadacie na trzy sklepy, a później ich zabijacie na tamie. Czy wszystko przebiegło poprawnie? Odpowiedź uzasadnij.'
		},
		'Q4_koledzy': {
			type: QuestionType.TEXTAREA, 	
			content: 'Robiłeś napad razem z sześcioma innymi kolegami. Wszystko przebiegało po waszej myśli. Napad się udał i uciekłeś z całą kasą. Kolega na steamie napisał żebyś podjechał pod eclipse, żebyś część kasy mu oddał. Czy akcja została poprawnie odegrana? Odpowiedź uzasadnij.'
		},
		'Q5_pg': { 	
			type: QuestionType.TEXTAREA, 	
			content: 'Co to jest PowerGaming oraz kto i w jaki sposób może go użyć? Napisz dwa przykłady akcji z PG, które mogą być użyte oraz dwie które zostały użyte w sposób nie adekwatny do regulaminu.'
		},
		'Q6_wu': { 	
			type: QuestionType.TEXTAREA, 	
			content: 'Bierzesz udział w wyścigu ulicznym. Jedziesz z bardzo szybką prędkością i niestety zahaczasz o auto przeciwnika. Skutkiem tego jest wielki karambol. Mimo to, tak bardzo zależy Ci na wygranej, że na szybko naprawiasz naprawką pojazd i dalej jedziesz w stronę mety. Czy mogłeś tak zrobić? Wyjaśnij.'
		},
	} as {[index: string]: {type: QuestionType, content: string}}
};