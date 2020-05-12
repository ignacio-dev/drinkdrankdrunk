const { ROOMS, Room } = require('../lib/Room');

class Player {
	constructor(id, room, nickname, avatar, session) {
		this.id = id;
		this.room = room;
		this.nickname = nickname;
		this.avatar = avatar;
		this.moderator = false;
		this.turn = false;
		this.drinks = 0;
		this.cards = {
			power: [],
			weakness: [],
			special: []
		};	
		this.firstMove = false;
		this.setPlayerRoom();
	}

	static findById(id) {
		for (let room of ROOMS) {
			for (let player of room.players) {
				if (player.id === id) return player;
			}
		}
	}

	setPlayerRoom() {
		var roomFound = ROOMS.find(r => r.code === this.room);
		if (!roomFound || roomFound.players.length === 0) {
			new Room(this.room);
			this.makeModerator();
			this.turn = true;
			this.firstMove = true;
		}		
		let roomIndex = this.findRoomIndex();
		this.order = ROOMS[roomIndex].totalConnections;
		ROOMS[roomIndex].players.push(this);
		ROOMS[roomIndex].totalConnections++;
	}

	makeModerator() {
		let room = ROOMS[this.findRoomIndex()];
		for (let player of room.players) {
			player.moderator = false;
		}
		this.moderator = true;
	}

	findRoomIndex() {
		return ROOMS.findIndex(r => r.code === this.room);
	}

	findOwnIndex() {
		let roomIndex = this.findRoomIndex();
		let playerIndex = ROOMS[roomIndex].players.findIndex(p => p.id === this.id);
		return playerIndex;
	}

	findNextPlayer() {
		let playerIdx = this.findOwnIndex();
		let nextIdx =  playerIdx + 1;
		let roomIdx = this.findRoomIndex();
		let nextPlayer = ROOMS[roomIdx].players[nextIdx];
		if (nextPlayer) {
			return nextPlayer;
		}
		else {
			let firstPlayer = ROOMS[roomIdx].players[0];
			return firstPlayer;
		}
	}

	passTurn() {
		let nextPlayer = this.findNextPlayer();
		let roomIndex = this.findRoomIndex();
		for (let player of ROOMS[roomIndex].players) {
			player.turn = false;
		}
		nextPlayer.turn = true;
	}

	drink() {
		this.drinks++;
	}

	drawCard() {
		let roomIndex = this.findRoomIndex();
		let card = ROOMS[roomIndex].cards.remaining.pop();
		return card;
	}

	discardAction(card) {
		let roomIndex = this.findRoomIndex();
		ROOMS[roomIndex].cards.action.push(card);
	}

	discardRule(card) {
		let roomIndex = this.findRoomIndex();
		let roomRules = ROOMS[roomIndex].cards.rule;

		if (roomRules.length < 2) {
			ROOMS[roomIndex].cards.rule.push(card);
			return true;
		}
		else {
			return false;
		}
	}

	replaceRule(num, cardName) {
		let card = Room.findCardByName(cardName);
		let index = num - 1;
		ROOMS[this.findRoomIndex()].cards.rule[index] = card;
		return card;
	}

	appendCard(card) {
		switch(card.type) {
			case 'Power':
				this.cards.power.push(card);
				break;
			case 'Weakness':
				if (this.cards.weakness.length < 2) {
					this.cards.weakness.push(card);
				}
				else {
					this.cards.weakness.shift();
					this.cards.weakness.push(card);
				}
				break;
			case 'Special':
				this.cards.special.push(card);
				break;
		}
	}

	getTargets(card) {
		let players = ROOMS[this.findRoomIndex()].players;
		let withPower = players.filter(p => p.cards.power.length > 0);
		let withWeakness = players.filter(p => p.cards.weakness.length > 0);
		let withAny = players.filter(p => p.cards.weakness.length > 0 || p.cards.power.length > 0);
		let rulesAsPlayer = {
			nickname: 'Rules',
			cards: []
		};
		for (let rule of ROOMS[this.findRoomIndex()].cards.rule) {
			rulesAsPlayer.cards.push(rule);
		}

		var response;
		var targetPlayers = [];
		switch(card.name) {
			// STEAL 1 POWER
			case '1Up':
				for (let player of withPower) {
					if (player.id !== this.id) {
						let copy =  {
							id: player.id,
							nickname: player.nickname,
							cards: player.cards.power
						};
						targetPlayers.push(copy);
					}
				}
				response = {
					action: 'steal',
					targetPlayers,
					targetType: 'Power',
					heading: 'Steal somebody\'s power!',
					button: 'Steal!',
					card,
				};
				break;
			// REMOVE 1 POWER FROM SOMEONE
			case 'Disarm':
				for (let player of withPower) {
					if (player.id !== this.id) {
						let copy =  {
							id: player.id,
							nickname: player.nickname,
							cards: player.cards.power
						};
						targetPlayers.push(copy);
					}
				}
				response = {
					action: 'remove',
					targetPlayers,
					targetType: 'Power',
					heading: 'Remove somebody else\'s power!',
					button: 'Remove!',
					card
				};
				break;
			// REMOVE 1 WEAKNESS FROM SOMEONE
			case 'Friend in Need':
				for (let player of withWeakness) {
					if (player.id !== this.id) {
						let copy =  {
							id: player.id,
							nickname: player.nickname,
							cards: player.cards.weakness
						};
						targetPlayers.push(copy);
					}	
				}
				response = {
					action: 'remove',
					targetPlayers,
					targetType: 'Weakness',
					heading: 'Remove somebody\'s weakness!',
					button: 'Remove!',
					card,
				};
				break;
			// REMOVE 1 OWN WEAKNESS
			case 'Paracetamol':
			case 'Medicine':
				let myselfCopy = {
					id: this.id,
					nickname: this.nickname,
					cards: this.cards.weakness
				};
				response = {
					action: 'remove',
					targetPlayers: [myselfCopy],
					targetType: 'Weakness',
					heading: 'Remove one of your weaknesses!',
					button: 'Remove!',
					card,
				};
				break;
			// SWAP 1 WEAKNESS FOR 1 POWER
			case 'Great Deal!':
				for (let player of withPower) {
					if (player.id !== this.id) {
						let copy =  {
							id: player.id,
							nickname: player.nickname,
							cards: player.cards.power
						};
						targetPlayers.push(copy);
					}
					
				}
				response = {
					action: 'swap',
					targetPlayers,
					targetType: 'Power',
					heading: 'Swap one weakness for one power!',
					button: 'Swap!',
					myself_Cards: this.cards.weakness,
					myself: this,
					card,
				};
				break;
			// REMOVE RULES & EVERYONE'S POWER/WEAKNESS
			case 'Anarchy':
				response =  {
					action: 'anarchy',
					card
				};
				break;
			// REMOVE 1 RULE, 1 POWER OR 1 WEAKNESS
			case 'Expelliarmus':
			case 'Sacrificial Altar':
				targetPlayers.push(rulesAsPlayer);
				for (let player of withAny) {
					let copy =  {
						id: player.id,
						nickname: player.nickname,
						cards: player.cards.power.concat(player.cards.weakness)
					};
					targetPlayers.push(copy);
				}
				response =  {
					action: 'abraKadabra',
					targetPlayers,
					targetCards: 'All',
					heading: 'Remove any of the following cards',
					button: 'Remove!',
					card,
				}
				break;
			// SHOW SPECIAL CARD
			default:
				response = {
					action: 'show',
					card
				};
		}
		return response;
	}

	removeSpecialCard(cardName) {
		let specCardIndex = this.cards.special.findIndex(c => c.name === cardName);
		this.cards.special.splice(specCardIndex, 1);
	}

	swapCard(playerTarg, targCardName, origCardName, specialName) {
		let roomIndex = this.findRoomIndex();
		
		let playOrigIndex = this.findOwnIndex();
		let origCardIndex = this.cards.weakness.findIndex(c => c.name === origCardName);

		let playTargIndex = playerTarg.findOwnIndex();
		let targCardIndex = ROOMS[roomIndex].players[playTargIndex].cards.power.findIndex(c => c.name === targCardName);

		let swapOrig = this.cards.weakness.splice(origCardIndex, 1)[0];
		let swapTarg = ROOMS[roomIndex].players[playTargIndex].cards.power.splice(targCardIndex, 1)[0];

		this.cards.power.push(swapTarg);
		ROOMS[roomIndex].players[playTargIndex].cards.weakness.push(swapOrig);
		this.removeSpecialCard(specialName);
	}

	removeCard(playerTarg, targCard, specCard) {
		let roomIndex = this.findRoomIndex();

		if (targCard.type === 'Power' && playerTarg) {
			let playTargIndex = playerTarg.findOwnIndex();
			let cardIndex = ROOMS[roomIndex].players[playTargIndex].cards.power.findIndex(c => c.name === targCard.name);
			ROOMS[roomIndex].players[playTargIndex].cards.power.splice(cardIndex, 1);
			this.removeSpecialCard(specCard.name);
			return;
		}

		if (targCard.type === 'Weakness' && playerTarg) {
			let playTargIndex = playerTarg.findOwnIndex();
			let cardIndex = ROOMS[roomIndex].players[playTargIndex].cards.weakness.findIndex(c => c.name === targCard.name);
			ROOMS[roomIndex].players[playTargIndex].cards.weakness.splice(cardIndex, 1);
			this.removeSpecialCard(specCard.name);
			return;
		}
	}

	stealCard(playerTarg, targCard, specCard) {
		let roomIndex = this.findRoomIndex();
		if (playerTarg) {
			let playTargIndex = playerTarg.findOwnIndex();
			let cardIndex = ROOMS[roomIndex].players[playTargIndex].cards.power.findIndex(c => c.name === targCard.name);
			let cardSteal = ROOMS[roomIndex].players[playTargIndex].cards.power.splice(cardIndex, 1)[0];
			this.cards.power.push(cardSteal);
			this.removeSpecialCard(specCard.name);
			return;
		}
	}

	anarchy(specialCard) {
		let roomIndex = this.findRoomIndex();
		ROOMS[roomIndex].cards.rule = [];
		for (let player of ROOMS[roomIndex].players) {
			player.cards.power = [];
			player.cards.weakness = [];
		}
		this.removeSpecialCard(specialCard.name);
	}

	abraKadabra(playerTarg, targCard, specCard) {
		if (targCard.type === 'Rule') {
			let roomIndex = this.findRoomIndex();
			let cardIndex = ROOMS[roomIndex].cards.rule.findIndex(c => c.name === targCard.name);
			ROOMS[roomIndex].cards.rule.splice(cardIndex, 1);
			this.removeSpecialCard(specCard.name);
			return;
		}
		else {
			this.removeCard(playerTarg, targCard, specCard);
		}
	}

	disconnect() {
		let roomIndex = this.findRoomIndex();
		let nextPlayer = this.findNextPlayer();
		let nextIndex = nextPlayer.findOwnIndex();

		// MODERATOR
		if (this.moderator && nextPlayer) {
			ROOMS[roomIndex].players[nextIndex].makeModerator();
		}

		// CACHE
		this.moveToCache();

		// REMOVE EMPTY ROOM
		if (ROOMS[roomIndex].players.length === 0) {
			ROOMS[roomIndex].gameOver();
			ROOMS[roomIndex] = null;
			ROOMS.splice(roomIndex, 1);
		}
	}

	moveToCache() {
		let roomIndex = this.findRoomIndex();
		let playerIdx = ROOMS[roomIndex].players.findIndex(p => p.id === this.id);
		let player = ROOMS[roomIndex].players.splice(playerIdx, 1)[0];
		ROOMS[roomIndex].playersCache.push(player);
	}

	recoverData(session) {
		let cachedID = session.seshID;
		let cachedNickname = session.seshNick;

		let playersCache = ROOMS[this.findRoomIndex()].playersCache;
		let player = playersCache.find(p => p.id === cachedID && p.nickname === cachedNickname);
		if (player) {
			this.drinks = player.drinks;
			this.order = player.order;
			this.cards.power = player.cards.power;
			this.cards.weakness = player.cards.weakness;
			this.cards.special = player.cards.special;
			if (this.order === 0) {
				this.makeModerator();
			}
		}
	}
};

module.exports = Player;