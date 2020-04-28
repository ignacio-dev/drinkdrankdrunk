// LIBS
const socket = io();

// PRE LOAD
window.addEventListener('load', () => {
	socket.on('imgCacheResp', precacher => {
		// PRE-CACHE CARDS
		for (let card of precacher) {
			let name = fileNameParse(card.name);
			let src = `../img/cards/${card.type}/${name}-min.jpg?v=1`;
			let img = new Image();
			img.src = src;
		}
		const SECRET = new Image();
		SECRET.src = '../img/cards/_secret-min.jpg';

		// PRE-CACHE SOUND OFF ICON
		const SOUND_OFF_ICON = new Image();
		SOUND_OFF_ICON.src = '../img/sound_off.png';

		// PRE-CACHE SPLATS
		const SPLAT1 = new Image();
		SPLAT1.src = '../img/power_splat.svg';
		const SPLAT2 = new Image();
		SPLAT2.src = '../img/weakness_splat.svg';
		const SPLAT3 = new Image();
		SPLAT3.src = '../img/special_splat.svg';
				
		// REMOVE LOADER & SOUND PRE-CACHER
		const LOADER = document.getElementById('LOADER');
		const SOUND_PRECACHER = document.getElementById('SOUND_PRECACHER');
		LOADER.parentNode.removeChild(LOADER);
		SOUND_PRECACHER.parentNode.removeChild(SOUND_PRECACHER);
	});
	socket.emit('imgPreCacheReq');
});

// TOOLS
var localID;

var firstMove = false;
socket.on('firstMove', () => {
	firstMove = true;
});

const SETTINGS = {
	sound: true
};

const ANIMLOG = {
	running: false,
	switchOn: () => ANIMLOG.running = true,
	switchOff: () => {
		ANIMLOG.running = false;
		ANIMLOG.onSwitchOff();
    },
    onSwitchOn: () => { return null; },
    onSwitchOff: () => { return null; },
};

// URL DATA
const { room, nickname, avatar } = Qs.parse(location.search, {
	ignoreQueryPrefix: true
});

// DOM
const APP = document.getElementById('APP');

const ROOMCODE_FIELD = document.getElementById('ROOMCODE_FIELD');
ROOMCODE_FIELD.innerText = room;

const SOUND_TOGGLER = document.getElementById('SOUND_TOGGLER');
SOUND_TOGGLER.onclick = () => {
	const ICON = document.querySelector('#SOUND_TOGGLER .icon');
	if (ICON.getAttribute('data-sound') === 'on') {
		ICON.setAttribute('data-sound', 'off');
		SETTINGS.sound = false;
	}
	else {
		ICON.setAttribute('data-sound', 'on');
		SETTINGS.sound = true;
	}	
};

const HELP = document.getElementById('HELP');
HELP.onclick = () => {
	const INSTRUCTIONS = document.querySelectorAll('.instructions');
	for (let instruction of INSTRUCTIONS) {
		if (instruction.classList.contains('hidden')) {
			instruction.classList.remove('hidden');
			animate(instruction, 'bounceIn');
		}
		else {
			animate(instruction, 'zoomOut', () => instruction.classList.add('hidden'), 'faster');
		}
	}
};

const CARDS_IN_STACK = document.querySelectorAll('#STACK .card');
const TOP_CARD_IN_STACK = CARDS_IN_STACK[CARDS_IN_STACK.length - 1];
(function createStackEffect() {
	let distance = 0;
	for (let card of CARDS_IN_STACK) {
		const OFFSET = 4;
		card.style.top  = `${distance}px`;
		card.style.left = `${distance}px`;
		distance += OFFSET; 
	}
})();

// COOKIES
function setCookie(name, value='') {
	let date = new Date();
	date.setTime((date.getTime()) + (12 * 60 * 60 * 1000));
	date = date.toGMTString();
	document.cookie = `${name}=${value};expires=${date};path=/`;
}

function getCookie(name) {
	let nameEQ = `${name}=`;
	let ca = document.cookie.split(';');
	for (let i = 0; i < ca.length; i++) {
		var c = ca[i];
		while(c.charAt(0) == ' ') c = c.substring(1, c.lenght);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
	}
	return null;
}

function checkSession() {
	let sesh = getCookie(`${room}_@dddsesh@_${nickname}`);
	return sesh ? { seshNick: nickname, seshID: sesh } : null;
}

// LOCAL ID
socket.once('localID', id => {
	localID = id;
	setCookie(`${room}_@dddsesh@_${nickname}`, localID);
});

// PLAYER JOIN
socket.emit('playerJoinReq', { room, nickname, avatar, session: checkSession() });

// UPDATE ROOM
socket.on('updateRoom', (roomData, card) => {
	renderPlayers(roomData.players, card);
	renderRules(roomData.cards.rule, card);
	renderActions(roomData.cards.action, card);
});

function renderPlayers(players, card) {
	const PLAYERS_LIST = document.getElementById('PLAYERS_LIST');
	PLAYERS_LIST.innerHTML = '';
	for (let player of players) {
		// LI
		var li = document.createElement('li');
		li.classList.add('player');
		li.setAttribute('data-id', player.id);
		li.setAttribute('data-nickname', player.nickname);
		li.setAttribute('data-moderator', player.moderator);
		li.setAttribute('data-order', player.order);
		li.setAttribute('data-turn', player.turn);
		if (player.turn) li.classList.add('active');
		PLAYERS_LIST.appendChild(li);

		// MODERATOR
		if (player.moderator) {
			let moderator = document.createElement('span');
			moderator.classList.add('moderator');
			moderator.innerText = 'Moderator';
			li.appendChild(moderator);
		}

		// AVATAR
		let avatar = document.createElement('div');
		avatar.classList.add('avatar', `av${player.avatar}`);
		li.appendChild(avatar);

		// NICKNAME
		let nickname = document.createElement('span');
		nickname.classList.add('nickname');
		nickname.innerText = player.nickname;
		li.appendChild(nickname);

		// DRINKS
		let drinks = document.createElement('span');
		drinks.classList.add('drinks');
		drinks.innerText = `(${player.drinks} drinks)`;
		li.appendChild(drinks);

		// STATE CARDS HOLDER
		let statesHolder = document.createElement('div');
		statesHolder.classList.add('state_cards');
		li.appendChild(statesHolder);

		// WEAKNESS
		for (let weakCard of player.cards.weakness) {
			appendCard(weakCard);
		}

		// POWER
		for (let powerCard of player.cards.power) {
			appendCard(powerCard);
		}

		// SPECIAL
		for (let specialCard of player.cards.special) {
			appendCard(specialCard);
		}

		function appendCard(stateCard) {
			let _card = document.createElement('div');
			_card.setAttribute('data-card-name', stateCard.name);
			_card.setAttribute('data-card-type', stateCard.type);
			_card.setAttribute('data-attached-to', player.id);
			_card.classList.add('card');
			_card.onclick = () => {
				zoomCard(_card);
			};
			if (stateCard.type !== 'Special' || stateCard.type == 'Special' && player.id === localID) {
				let type = stateCard.type;
				let file = fileNameParse(stateCard.name);
				_card.style.backgroundImage = `url('../img/cards/${type}/${file}-min.jpg')`;
			}
			else {
				_card.style.backgroundImage = `url('../img/cards/_secret-min.jpg')`;
			}			
			if (card) {
				if (card.name === stateCard.name) {
					_card.setAttribute('data-flip', 'true');
				}
			}
			statesHolder.appendChild(_card);
		}
	}
}

// ACTION CARDS
function renderActions(actionCards, card) {
	const DISCARDED_CARDS = document.getElementById('DISCARDED_CARDS');
	var top = 0;
	var left = 0;
	var zInd = 1;
	DISCARDED_CARDS.innerHTML = '';
	for (let _card of actionCards) {
		let div = document.createElement('div');
		let file = fileNameParse(_card.name);
		div.classList.add('card');
		div.style.backgroundImage = `url('../img/cards/Action/${file}-min.jpg')`;
		div.style.top  = `${top}px`;
		div.style.left = `${left}px`;
		div.style.zIndex = zInd;
		DISCARDED_CARDS.appendChild(div);
		if (card) {
			if (_card.name === card.name) {
				playSound('card_wiggle');
				animate(div, 'tada', () => {
					ANIMLOG.switchOff();
				});
			}
		}
		top++;
		left+=3;
		zInd++;
	}
}

// RULE CARDS
function renderRules(rules, card) {
	const RULE_HOLDERS = document.querySelectorAll('.rule_holder');
	RULE_HOLDERS[0].innerHTML = '<span>Rule</span>';
	RULE_HOLDERS[1].innerHTML = '<span>Rule</span>';
	for (let i = 0; i < rules.length; i++) {
		if (rules[i]) {
			let div = document.createElement('div');
			let file = fileNameParse(rules[i].name);
			div.classList.add('card');
			div.style.backgroundImage = `url('../img/cards/Rule/${file}-min.jpg')`;
			RULE_HOLDERS[i].innerHTML = '';
			RULE_HOLDERS[i].appendChild(div);
			if (card) {
				if (card.name === rules[i].name) {
					playSound('card_wiggle');
					animate(div, 'tada', () => {
						ANIMLOG.switchOff();
					});
				}
			}
		}
		else {
			let span = document.createElement('span');
			span.innerText = 'Rule';
			RULE_HOLDERS[i].appendChild(span);
		}
	}
}

socket.on('mustReplaceRule', card => {
	let imgFile = `${fileNameParse(card.name)}-min.jpg`;
	let src = `../img/cards/Rule/${imgFile}`;

	let rule1 = document.querySelectorAll('.rule_holder .card')[0].style.backgroundImage;
	rule1 = rule1.replace(/"/g, "'");

	let rule2 = document.querySelectorAll('.rule_holder .card')[1].style.backgroundImage;
	rule2 = rule2.replace(/"/g, "'");
	playerAlert('playerAlert', `
<div class="group">
	<h1>Replace a rule!</h1>
	<p>
		You picked a rule card, but there are already two in use.<br>
		Pick which one you would like to replace:
	</p>
</div>
<div class="group"
	style="display:flex;">
		<div class="card new-rule"
			style="background-image:url('../img/cards/Rule/${imgFile}');margin-right:50px;">
				<span>NEW</span>
		</div>
		<div class="card pointer"
			 id="rule_pick1"
			 onclick="selectRule(1,'${card.name}');"
			 style="background-image:${rule1};">
		</div>
		<div class="card pointer"
			 id="rule_pick2"
			 onclick="selectRule(2,'${card.name}');"
			 style="background-image:${rule2};margin-left:12px;">
		</div>
</div>
<div class="group last">
	<button class="button disabled"
		id="rule_pickBtn"
		disabled>
			Replace!
	</button>
</div>`);
});

function selectRule(num, cardName) {
	const RUL1 = document.getElementById('rule_pick1');
	const RUL2 = document.getElementById('rule_pick2');
	const BTN  = document.getElementById('rule_pickBtn');

	if (num === 1) {
		RUL1.classList.add('selected');
		RUL2.classList.remove('selected');
	}
	else {
		RUL2.classList.add('selected');
		RUL1.classList.remove('selected');
	}

	BTN.removeAttribute('disabled');
	BTN.classList.remove('disabled');
	BTN.classList.add('bg-blue', 'shadow');
	BTN.onclick = () => {
		socket.emit('ruleReplaceReq', { num, cardName});
		closeAlert('playerAlert');
	};
}

// TURN
socket.on('turn', () => {
	playSound('turn');
	unlock();
});

function unlock() {
	function requestCard() {
		TOP_CARD_IN_STACK.onclick = null;
		TOP_CARD_IN_STACK.classList.remove('clickable');
		ANIMLOG.switchOn();
		ANIMLOG.onSwitchOff = () => {
			socket.emit('nextPlayerReq');
			ANIMLOG.onSwitchOff = () => { return null; }
		};
		
		if (firstMove) {
			firstMove = false;
			socket.emit('timerStartReq');
			const TIMER = document.getElementById('TIMER');
			TIMER.setAttribute('data-timer-permits', "false");
			TIMER.onclick = null;
		}
		
		socket.emit('cardReq');
	}

	animate(TOP_CARD_IN_STACK, 'wobble', () => {
	TOP_CARD_IN_STACK.classList.add('clickable');
	TOP_CARD_IN_STACK.onclick = requestCard;
	});	
}

// CARD REQUESTED
socket.on('cardRes', card => {
	playSound('card_draw');
	animate(TOP_CARD_IN_STACK, 'hinge', () => {
		switch(card.type) {
			case 'Action':
				socket.emit('actionReq', card);
				break;
			case 'Rule':
				socket.emit('ruleReq', card);
				break;
			case 'Power':
			case 'Weakness':
			case 'Special':
				socket.emit('stateReq', card);
				break;
		}
	});
});

// TIMER
socket.on('timerPermits', () => {
	firstMove = true;
	const TIMER = document.getElementById('TIMER');
	TIMER.setAttribute('data-timer-permits', "true");
	TIMER.onclick = () => {
		TIMER.setAttribute('data-timer-permits', "false");
		TIMER.onclick = null;
		socket.emit('timerStartReq');
	};
});

socket.on('time', time => {
	renderTime(time);
});

function renderTime(time) {
	const TIMER = document.getElementById('TIMER');
	const COUNTER = document.querySelector('#TIMER span');
	const MAXTIME = 3600; // seconds

	if (time === MAXTIME) {
		animate(TIMER, 'flash');
	}

	const COUNTDOWN = 5; // seconds
	const MIN45 = (MAXTIME / 4) * 3;
	const MIN30 = MAXTIME / 2;
	const MIN15 = MAXTIME / 4;

	if (time === (MIN45+COUNTDOWN) || time === (MIN30+COUNTDOWN) || time === (MIN15+COUNTDOWN)) {
		playSound('5_sec_countd');
		animate(TIMER, 'flash');
		setTimeout(everyoneDrinks, 5000);
	}

	if (time === COUNTDOWN) {
		COUNTER.classList.add('blink');
		animate(TIMER, 'flash');
	}

	if (time === 0) {
		COUNTER.classList.remove('blink');
		socket.emit('endGameReq');
	}
	
	let minutes = Math.floor(time / 60);
	let seconds = time % 60;
	seconds = seconds < 10 ? `0${seconds}` : seconds;
	COUNTER.innerText = `${minutes}:${seconds}`;
}

function everyoneDrinks() {
	playerAlert('drinkAlert', `
<div class="group">
	<h1 class="animated shake"
		style="font-size:60px;">
			EVERYONE DRINKS!!
	</h1>
</div>
<button class="button bg-blue shadow"
	onclick="closeAlert('drinkAlert')">
		Continue
</button>
`);
}

// I DRANK
const IDRANK = document.getElementById('IDRANK');

socket.on('IDrankRes', player => {
	playSound('drank');
	let drinks = (player.drinks === 1) ? 'drink' : 'drinks';
	let msg = document.createElement('p');
	msg.innerHTML = `${player.nickname} has had ${player.drinks} ${drinks}`;
	msg.classList.add('iDrankMsg');
	APP.appendChild(msg);
	animate(msg, 'slideOutUp', () => {
		msg.parentNode.removeChild(msg);
	}, 'slower');

});

IDRANK.addEventListener('click', () => {
	IDRANK.classList.add('clicked');
	setTimeout(() => {
		IDRANK.classList.remove('clicked');
	}, 150);
	socket.emit('IDrankReq');
});

// GAME END
socket.once('endGameResp', loser => {
	// REMOVE ALL MODALS
	let modals = document.querySelectorAll('.modal');
	for (let modal of modals) {
		modal.parentNode.removeChild(modal);
	}

	// EVERYTHING SHAKES
	animate(document.querySelector('body'), 'shake');

	// LOSER ALERT
	let func1 = loser.id === localID ? 'onclick="selectForfeit(1)"' : '';
	let func2 = loser.id === localID ? 'onclick="selectForfeit(2)"' : '';
	let func3 = loser.id === localID ? 'onclick="selectForfeit(3)"' : '';
	let func4 = loser.id === localID ? 'onclick="selectForfeit(4)"' : '';

	let pointer = loser.id === localID ? ' pointer' : '';

	playerAlert('endGame', `
<div class="group"
	 id="looser_text">
		<h1 style="font-size:2.5em">
			Time's up!!!
		</h1>
		<p>
			<span style="font-size:1.6em;">
				${loser.nickname}
			</span>
			 has had
			<span style="font-size:1.6em;">
				${loser.drinks} drinks
			</span> and is the loser (all point and laugh, lol!)
			<br>
		</p>
		<p>
			The loser must know pick one of the final forfeits to do from the cards below:
		</p>
</div>
<div class="loserPick">
	<div class="card back${pointer}" data-card-forfeit="1" ${func1}"></div>
	<div class="card back${pointer}" data-card-forfeit="2" ${func2}"></div>
	<div class="card back${pointer}" data-card-forfeit="3" ${func3}"></div>
	<div class="card back${pointer}" data-card-forfeit="4" ${func4}"></div>
</div>
	`);

	// PRE CACHE FORFEITS
	let forf1 = new Image();
		forf1.src = '../img/forfeit/debauchee.jpg';
	let forf2 = new Image();
		forf2.src = '../img/forfeit/dranky.jpg';
	let forf3 = new Image();
		forf3.src = '../img/forfeit/drinky.jpg';
	let forf4 = new Image();
		forf4.src = '../img/forfeit/drunky.jpg';
});

function selectForfeit(num) {
	socket.emit('forfeitReq', num);
}

socket.on('forfeitResp', ({ forfeit, num }) => {
	const cards = document.querySelectorAll('.loserPick .card');
	for (let card of cards) {
		if (card.getAttribute('data-card-forfeit') == num.toString()) {
			card.style.backgroundImage = `url('../img/forfeit/${forfeit.name.toLowerCase()}.jpg')`;
			animate(card, 'flip', () => {
				card.classList.remove('pointer');
				card.style.margin = '0 auto';
				card.classList.add('bigger');
				animate(card, 'tada');
				const text = document.getElementById('looser_text');
				text.innerHTML = `
				<h3 style="max-width:400px;text-align:center;">
					${forfeit.text}
				</h3>
				`;
			});
		}
		else {
			animate(card, 'fadeOut', () => {
				card.classList.add('hidden');
			});
		}
	}
	// CREDITS
	setTimeout(() => {
		let modals = document.querySelectorAll('.modal');
		for (let modal of modals) {
			modal.parentNode.removeChild(modal);
		}
		playerAlert('endGame', `
<div id="CREDITS">
	<div>
		<img src="img/game.jpg">
	</div>
	<div class="mw">
		<h1>That's all folks!</h1>
		<p class="group">
			Thanks for playing! If you enjoyed the game you will love our original card game!
			Made up of a whopping 200 cards and extra mechanics! perfect for when the bars open again!
			<a class="styled" href="https://www.drinkdrankdrunkthegame.com/shop">GET YOURS NOW!</a>
		</p>
		<p class="group">
			We also have some pretty lit, snatched, on fleek & dope MERCH available
			<a class="styled" href="https://www.drinkdrankdrunkthegame.com/shop">HERE.</a>
			You may have noticed that this game was free! So please help support us creators by spreading the word,
			buying our stuff or buying us a drink or 3! :)
		</p>
		<p class="group">
			Original game by Felix Mulder
			<a  href="" class="styled donate"
				href="https://www.paypal.me/felixbm"
				target="_blank">(donate)</a>
			<br>
			Illustrations & art by Kimbo Gruff 
			<a  href="https://paypal.me/kimbogruff?locale.x=en_US"
				target="_blank"
				class="styled donate">(donate)</a>
			<br>
			Online game development by Jury & Serena Paget 
			<a  href="https://paypal.me/juryserena?locale.x=en_GB"
				target="_blank"
				class="styled donate">(donate)</a>
		</p>
		<p class="group">
			If you want to drop us a line with questions, card ideas or pictures of your cat 
			you can reach us at 
			<a class="styled" href="mailto:contact@drinkdrankdrunkthegame.com">contact@drinkdrankdrunkthegame.com</a> 
			or just shout, really really loud.
		</p>
		<div>
			<a  class="button bg-blue shadow"
				href="index.html">
					Play again
			</a>
			<a  class="button bg-blue shadow"
				target="_blank"
				href="https://www.drinkdrankdrunkthegame.com/shop">
					Shop
			</a>
		</div>
	</div>
</div>
	`);
	}, 10000);
});

/*

	UX FUNCTIONS

*/

// ALERTS
function playerAlert(type='playerAlert', content='') {
	let modal = document.createElement('div');
		modal.classList.add(
			'modal',
			'full-height',
			'content-centered',
			type
	);

	let msgbox = document.createElement('div');
		msgbox.classList.add(
		  	'bg-white',
		  	'border',
		  	'border-radius',
		  	'shadow',
		  	'padding'
	);

	msgbox.innerHTML = content;
	modal.appendChild(msgbox);
	APP.appendChild(modal);
	animate(msgbox, 'rubberBand');
}

function closeAlert(type) {
	let msgbox = document.querySelector(`.modal.${type}>div`);
		msgbox.innerHTML = '';

	let modal = document.querySelector(`.modal.${type}`);
		modal.innerHTML =  '';
		modal.parentNode.removeChild(modal);
}

socket.on('stateResp', ({card, player}) => {
	stateCardAlert(card, player);
});

function stateCardAlert(card, player) {
	let modal = document.createElement('div');
		modal.classList.add('modal', 'full-height', 'stateAlert');
	APP.appendChild(modal);

	let innerModal = document.createElement('div');
		innerModal.classList.add('full-height', 'content-centered');
	modal.appendChild(innerModal);

	let splat = document.createElement('div');
		splat.classList.add('full-height', 'splat', card.type.toLowerCase());
	innerModal.appendChild(splat);

	let fileName = fileNameParse(card.name);
	let src = `'../img/cards/${card.type}/${fileName}-min.jpg'`;
	if (card.type === 'Special' && player.id !== localID) {
		src = '../img/cards/_secret-min.jpg';
	}

	let _card = document.createElement('div');
		_card.classList.add('card', 'bigger');
		_card.style.backgroundImage = `url(${src})`;
	innerModal.appendChild(_card);

	var soundFile = card.type.toLowerCase();
	playSound(soundFile);
	
	animate(splat, 'rubberBand');
	animate(innerModal, 'tada', () => {
		setTimeout(() => {
			animate(modal, 'fadeOut', function() {
				closeAlert('stateAlert');
				let attachedCard = document.querySelector('.card[data-flip="true"]');
				animate(attachedCard, 'flip', () => {
					ANIMLOG.switchOff();
				}, 'faster');
			});
		}, 5000);
	});
}

// ZOOM CARD
function zoomCard(card) {
	let name  = card.getAttribute('data-card-name');
	let file  = fileNameParse(name);
	let type  = card.getAttribute('data-card-type');
	let attachedToMe = card.getAttribute('data-attached-to') === localID;

	var url = `'../img/cards/${type}/${file}-min.jpg'`;	
	var content = '';

	//
	if (type !== 'Special') {
		content = `
<div class="group">
	<div class="card bigger"
		style="background-image:url(${url})";>
	</div>
</div>
<button class="button bg-blue shadow"
	onclick="closeAlert('zoomAlert')">
		Close
</button>`;
	}

	//
	if (type === 'Special' && !attachedToMe) {
		url = `'../img/cards/_secret-min.jpg'`;
		content = `
<div style="display:flex;justify-content:center;align-items:center;">
	<div class="card bigger"
		style="background-image:url(${url})";>
	</div>
	<div style="margin-left:25px;max-width:264px;">
		<p class="group">
			This is a special card.
			Only the one who drew it can see it and use it once at any point.
		</p>
		<button class="button bg-blue shadow"
		onclick="closeAlert('zoomAlert')">
			Close
		</button>
	</div>
</div>`;
	}

	//
	if (type === 'Special' && attachedToMe) {
		content = `
<div style="display:flex;justify-content:center;align-items:center;"
	id="specialMsg">
		<div class="card bigger"
			style="background-image:url(${url})";>
		</div>
		<div style="margin-left:25px;max-width:264px;">
			<p class="group">
				This is a special card.
				It's kept secret from other players and you can use it once at any point.
			</p>
			<button class="button bg-blue shadow"
				onclick="useCard('${name}');">
					Use now
			</button>
			<button class="button bg-blue shadow"
				onclick="closeAlert('zoomAlert')">
					Use later
			</button>
		</div>
</div>`;
	}
	playerAlert('zoomAlert', content);
}

function useCard(cardName) {
	closeAlert('zoomAlert');
	socket.emit('targetsReq', cardName);
}

socket.on('targetsResp', response => {
	// NO UI NEEDED
	if (response.action === 'anarchy') {
		socket.emit('anarchyReq', response.card);
		return;
	}

	if (response.action === 'show') {
		socket.emit('showReq', response.card);
		return;
	}

	// HEADING
	let heading = `<h2>${response.heading}</h2>`;
	// MYSELF
	let myself = '';
	if (response.myself) {
		//MY CARDS
		let cards = '';
		for (let card of response.myself_Cards) {
			let url = `../img/cards/${card.type}/${fileNameParse(card.name)}-min.jpg`;
			cards += `
			<div class="card pointer orig"
				 style="background-image:url('${url}')"
				 data-card-name="${card.name}"
				 data-card-type="${card.type}"
				 data-attached-to="${response.myself.id}"
				 onclick="select(this, '${response.card.name}')">
			</div>`;
		}
		myself = `
		<div class="playerToSteal">
			<p>${response.myself.nickname}(you)</p>
			<div class="cardsToSteal">${cards}</div>
		</div>
		`;
	}

	// TARGET PLAYERS
	let players = '';
	for (let player of response.targetPlayers) {
		// TARGET CARDS
		let cards = '';
		for (let card of player.cards) {
			let url = `../img/cards/${card.type}/${fileNameParse(card.name)}-min.jpg`;
			cards += `
			<div class="card pointer target"
				 style="background-image:url('${url}')"
				 data-card-name="${card.name}"
				 data-card-type="${card.type}"
				 data-attached-to="${player.id}"
				 onclick="select(this, '${response.card.name}')">
			</div>`;
		}
		players += `
		<div class="playerToSteal">
			<p>${player.nickname}</p>
			<div class="cardsToSteal">${cards}</div>
		</div>
		`;
	}

	// BUTTONS
	let buttons = `
	<div class="buttons" style="margin-top:15px">
		<button
			id="useBTN"
			class="button bg-blue shadow disabled"
			data-action="${response.action}">
				${response.button}
		</button>
		<button
			class="button bg-blue shadow"
			onclick="closeAlert('zoomAlert')">
				Cancel
		</button>
	</div>
	`;

	// FINAL OUTPUT
	playerAlert('zoomAlert', `
<div style="max-height:70vh;max-width:70vw;overflow-y:auto;">
	${heading}
	${myself}
	${players}
</div>
${buttons}`);
});

function select(selectedCard, specialName) {
	let button = document.getElementById('useBTN');
	let emitMsg = button.getAttribute('data-action');

	let origs = document.querySelectorAll('.orig');
	let selectedOrigs = document.querySelectorAll('.orig.selected');
	let selectedTargs = document.querySelectorAll('.target.selected');

	if (selectedCard.classList.contains('orig')) {
		if (selectedOrigs.length > 0) {
			for (let card of selectedOrigs) {
				card.classList.remove('selected');
			}
		}
	}
	else {			
		if (selectedTargs.length > 0) {
			for (let card of selectedTargs) {
				card.classList.remove('selected');
			}
		}
	}

	selectedCard.classList.add('selected');

	let targSelected = document.querySelector('.target.selected');
	let origSelected   = document.querySelector('.orig.selected');
	if (emitMsg !== 'swap') {		
		if (targSelected) enableButton();
	}
	else {
		if (targSelected && origSelected) enableButton();
	}

	function enableButton() {
		button.classList.remove('disabled');
		button.onclick = () => {
			let targCardName = targSelected.getAttribute('data-card-name');
			let targPlayerID = targSelected.getAttribute('data-attached-to')
			let origCardName = (emitMsg !== 'swap') ? null : origSelected.getAttribute('data-card-name');

			socket.emit(emitMsg, { targPlayerID, targCardName, origCardName, specialName });
			closeAlert('zoomAlert');
		};
	}
}

socket.on('specialCardUsed', ({ playerOrig, playerTarg, specialCard }) => {
	var msg;
	if (!playerTarg) {
		msg = `${playerOrig.nickname} used a special card`;
	}
	else {
		if (playerOrig.id === playerTarg.id) {
			msg = `${playerOrig.nickname} used a special card`;
		}
		else {
			msg = `${playerOrig.nickname} used a special card on ${playerTarg.nickname}`;
		}

	}
	let imgName = fileNameParse(specialCard.name);
	playerAlert('specialCardUsed', `
<h1 class="group"
	style="text-align:center;">
		${msg}
</h1>
<div class="group">
	<div class="card"
		style="background-image:url('../img/cards/Special/${imgName}-min.jpg');margin:0 auto;">
	</div>
</div>
<button class="button bg-blue shadow"
	onclick="closeAlert('specialCardUsed')">
		Ok
</button>
`);
});

// PLAY SOUND
function playSound(file) {
	if (SETTINGS.sound) {
		let sound = new Audio(`../sounds/${file}.mp3`);
		sound.play();
	}
}

// ANIMATE
function animate(elem, animationName, callback, speed='fast') {
	elem.classList.add('animated', animationName, speed);
	elem.addEventListener('animationend', function removeAnimation() {
		elem.classList.remove('animated', animationName);
		elem.removeEventListener('animationend', removeAnimation);

		if (typeof callback === 'function') {
			callback();
		}
	});
}

// FILE NAME PARSE
function fileNameParse(str) {
	str = str.replace(/ /g, '_');
	str = str.replace(/!/g, '');
	str = str.replace(/'/g, '');
	str = str.replace(/&/g, 'and');
	str = str.toLowerCase();
	return str;
}

// FAKE GAME END
// document.addEventListener('keypress', e => {
// 	if (e.code === 'KeyK') {
// 		socket.emit('endGameReq');
// 	}
// });