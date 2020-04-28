const fs = require('fs');

class Deck {
	constructor() {
		const JSON_FILE = fs.readFileSync('./json/cards.json');
		let cards = JSON.parse(JSON_FILE);
		return Deck.shuffle(cards);
	}

	static shuffle(cards) {
		cards = cards.sort(() => Math.random() - 0.5);
		return cards;
	}

	static getPreCacheData() {
		const JSON_FILE = fs.readFileSync('./json/cards.json');
		let cards = JSON.parse(JSON_FILE);
		let precacher = [];
		for (let card of cards) {
			precacher.push({
				name: card.name,
				type: card.type}
			);
		}
		return precacher;
	}
}

module.exports = Deck;