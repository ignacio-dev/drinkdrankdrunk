const fs = require('fs');
const Deck = require('../lib/Deck');
const ROOMS = [];

class Room {
	constructor(code) {
		this.code = code;

		this.cards = {
			remaining: new Deck,
			action: [],
			rule: []
		};

		this.players = [];
		this.playersCache = [];
		this.totalConnections = 0;

		this.time = 3600;
		this.running = false;

		ROOMS.push(this);
	}

	static findByCode(code) {
		for (let room of ROOMS) {
			if (room.code === code) {
				room.sortPlayers();
				return room;
			}
		}
	}

	static findCardByName(cardName) {
		let stack = new Deck;
		let card = stack.find(c => c.name === cardName);
		return card;
	}

	sortPlayers() {
		this.players = this.players.sort((a, b) => {
			if (a.order < b.order) {
				return -1;
			}
			if (a.order > b.order) {
				return 1;
			}
			return 0;
		});	
	}

	startTimer(callback) {
		if (this.running) {
			return;
		}
		else {
			this.running = true;
			let interval = setInterval(() => {
				callback(this.time);
				this.time--;
				if (this.time === -1 || !this.running) clearInterval(interval);
			}, 1000);
		}	
	}

	gameOver() {
		// RESET ROOM
		this.cards = {
			remaining: new Deck,
			action: [],
			rule: []
		};

		this.players = [];
		this.playersCache = [];
		this.totalConnections = 0;

		this.time = 3600;
		this.running = false;
	}

	static findLoser(code) {
		for (let room of ROOMS) {
			if (room.code === code) {
				let array = room.players = room.players.sort((a, b) => {
					if (a.drinks < b.drinks) {
						return 1;
					}
					if (a.drinks > b.drinks) {
						return -1;
					}
					return 0;
				});
				return array[0];
			}
		}
	}

	static pickRandomForfeit() {
		let jsonFile = fs.readFileSync('./json/forfeit.json', 'utf8');
		let cards = JSON.parse(jsonFile);
		Deck.shuffle(cards);
		return cards[0];
	}
};

module.exports = {
	ROOMS,
	Room
};